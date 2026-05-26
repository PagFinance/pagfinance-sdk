import { type HttpClient } from '../http/HttpClient';
import { type ResolvedConfig } from '../config';
import { type RegistrationType, type AuthorizedWallet } from '../types/kyc';

/**
 * Envelope JÁ criptografado (ProtocolEncryptor v0.2) produzido pelo app host.
 * A SDK NÃO criptografa nem assina — apenas transporta.
 */
export interface EncryptedAuthEnvelope {
  v: number;
  iv: string;
  data: string;
}

export interface AuthLoginResult {
  tokenJWT: string;
  registration?: RegistrationType[];
  authorizedWallets?: AuthorizedWallet[];
  isCurrentWalletAuthorized?: boolean;
  firebaseUid?: string;
  uid?: string;
}

/**
 * Autenticação Web3. A criptografia e a assinatura da carteira ficam FORA da
 * SDK (responsabilidade do app host). A SDK só:
 *  - transporta o envelope cifrado para `/api/auth`;
 *  - guarda o `tokenJWT` resultante no `tokenStore`;
 *  - (opcional) registra um re-login transparente em respostas 401.
 */
export class AuthResource {
  private reloginProvider: (() => Promise<EncryptedAuthEnvelope | null>) | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedConfig,
  ) {}

  /**
   * Faz login enviando o envelope criptografado pelo host. Em caso de sucesso,
   * persiste o `tokenJWT` no `tokenStore`.
   */
  async login(envelope: EncryptedAuthEnvelope): Promise<AuthLoginResult> {
    const result = await this.http.request<AuthLoginResult>('/api/auth', {
      method: 'POST',
      skipAuth: true,
      body: envelope,
    });
    if (result?.tokenJWT) this.config.tokenStore.set(result.tokenJWT);
    return result;
  }

  /** Define manualmente o tokenJWT (obtido fora da SDK). */
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
   * Habilita re-login transparente em 401. O `provider` deve devolver um novo
   * envelope criptografado (assinando a carteira novamente no host) ou `null`.
   */
  enableAutoRelogin(
    provider: () => Promise<EncryptedAuthEnvelope | null>,
  ): void {
    this.reloginProvider = provider;
    this.http.setUnauthorizedHandler(async () => {
      const envelope = await this.reloginProvider?.();
      if (!envelope) return false;
      try {
        await this.login(envelope);
        return true;
      } catch {
        return false;
      }
    });
  }

  /** Envia código OTP por e-mail — `/api/auth/otp-send`. */
  otpSend(email: string): Promise<{ ok: boolean; message?: string }> {
    return this.http.request('/api/auth/otp-send', {
      method: 'POST',
      skipAuth: true,
      body: { email },
    });
  }
}
