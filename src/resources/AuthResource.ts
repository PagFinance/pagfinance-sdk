import { type HttpClient } from '../http/HttpClient';
import { type ResolvedConfig } from '../config';
import { type RegistrationType, type AuthorizedWallet } from '../types/kyc';

export interface AuthLoginResult {
  tokenJWT: string;
  registration?: RegistrationType[];
  authorizedWallets?: AuthorizedWallet[];
  isCurrentWalletAuthorized?: boolean;
  firebaseUid?: string | null;
  uid?: string | null;
}

/** Desafio devolvido por `/api/auth/challenge`. */
export interface AuthChallenge {
  /** String que o cliente deve assinar com a carteira. */
  challenge: string;
  /** Blob opaco (HMAC) que deve ser devolvido em `verify`. */
  state: string;
  /** Epoch (s) em que o desafio expira. */
  expiresAt: number;
}

/** Assinatura produzida pela carteira (bytes ou string, conforme a chain). */
export type WalletSignature = string | number[] | Uint8Array;

/**
 * Callback fornecido pelo app host: recebe o `challenge` e devolve a assinatura
 * da carteira. É a ÚNICA peça de cripto fora do servidor.
 */
export type WalletSigner = (
  challenge: string,
) => Promise<WalletSignature> | WalletSignature;

export interface SignInParams {
  address: string;
  blockchain: string;
  /** Necessário em algumas chains (ex.: XRPL). */
  publicKey?: string;
  /** Firebase ID token para vincular a sessão Web3 a um usuário Firebase. */
  idToken?: string;
}

/** Resposta de `otpSend`. Erros são lançados como `PagFinanceError`. */
export interface OtpSendResult {
  ok: boolean;
  message?: string;
}

/** Resposta de `otpVerify`. Erros são lançados como `PagFinanceError`. */
export interface OtpVerifyResult {
  ok: boolean;
  /** Custom token do Firebase para `signInWithCustomToken` no app host. */
  customToken: string;
  /** UID do usuário Firebase. */
  uid: string;
}

/**
 * Autenticação Web3 via challenge–response (estilo SIWS), sem criptografia.
 *
 * Fluxo encapsulado em uma chamada:
 * ```ts
 * const { tokenJWT } = await client.auth.signIn(
 *   { address, blockchain: 'solana' },
 *   (challenge) => wallet.signMessage(new TextEncoder().encode(challenge)),
 * );
 * ```
 * O SDK chama `/challenge`, repassa o desafio ao `signer`, chama `/verify` e
 * guarda o `tokenJWT`. Toda a lógica (nonce, verificação, emissão) vive no
 * servidor - o mesmo contrato vale para o app hoje ou um BFF dedicado amanhã.
 */
export class AuthResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedConfig,
  ) {}

  /** Passo 1: obtém um desafio para assinar. */
  challenge(params: { address: string; blockchain?: string }): Promise<AuthChallenge> {
    return this.http.request<AuthChallenge>('/api/auth/challenge', {
      method: 'POST',
      skipAuth: true,
      body: {
        address: params.address,
        blockchain: params.blockchain ?? this.config.defaultBlockchain,
      },
    });
  }

  /** Passo 2: troca a assinatura pelo tokenJWT (e o persiste). */
  async verify(params: {
    address: string;
    blockchain?: string;
    signature: WalletSignature;
    state: string;
    publicKey?: string;
    idToken?: string;
  }): Promise<AuthLoginResult> {
    const signature =
      params.signature instanceof Uint8Array ? Array.from(params.signature) : params.signature;

    const result = await this.http.request<AuthLoginResult>('/api/auth/verify', {
      method: 'POST',
      skipAuth: true,
      body: {
        address: params.address,
        blockchain: params.blockchain ?? this.config.defaultBlockchain,
        signature,
        state: params.state,
        publicKey: params.publicKey,
      },
      headers: { 'id-token': params.idToken },
    });

    if (result?.tokenJWT) this.config.tokenStore.set(result.tokenJWT);
    return result;
  }

  /** Fluxo completo: challenge → assina → verify. */
  async signIn(params: SignInParams, signer: WalletSigner): Promise<AuthLoginResult> {
    const ch = await this.challenge({ address: params.address, blockchain: params.blockchain });
    const signature = await signer(ch.challenge);
    return this.verify({
      address: params.address,
      blockchain: params.blockchain,
      signature,
      state: ch.state,
      publicKey: params.publicKey,
      idToken: params.idToken,
    });
  }

  /** Define manualmente o tokenJWT (obtido fora do SDK). */
  setToken(token: string | null): void {
    this.config.tokenStore.set(token);
  }

  /** Token atual. */
  getToken(): string | null {
    return this.config.tokenStore.get();
  }

  /** Limpa o token (logout local). */
  clearToken(): void {
    this.config.tokenStore.set(null);
  }

  /**
   * Habilita re-login transparente em 401. O `relogin` deve refazer o login
   * (tipicamente chamando `signIn`) e devolver `true` em caso de sucesso.
   */
  enableAutoRelogin(relogin: () => Promise<boolean>): void {
    this.http.setUnauthorizedHandler(relogin);
  }

  /**
   * Envia código OTP por e-mail - `/api/auth/otp-send`.
   *
   * A lógica (geração, rate limit, persistência e envio) roda no servidor
   * (BFF). Rate limit / e-mail inválido são lançados como `PagFinanceError`.
   */
  otpSend(email: string): Promise<OtpSendResult> {
    return this.http.request<OtpSendResult>('/api/auth/otp-send', {
      method: 'POST',
      skipAuth: true,
      body: { email },
    });
  }

  /**
   * Verifica o código OTP recebido por e-mail - `/api/auth/otp-verify`.
   *
   * Em caso de sucesso devolve o `customToken` do Firebase; a troca por uma
   * sessão (via `signInWithCustomToken`) é responsabilidade do app host - a
   * SDK é agnóstica a Firebase. Código inválido/expirado, excesso de
   * tentativas e rate limit são lançados como `PagFinanceError`.
   */
  otpVerify(email: string, code: string): Promise<OtpVerifyResult> {
    return this.http.request<OtpVerifyResult>('/api/auth/otp-verify', {
      method: 'POST',
      skipAuth: true,
      body: { email, code },
    });
  }
}
