/**
 * Como gerar um TOKEN_JWT do PagFinance e usá-lo no SDK.
 *
 * O SDK é livre de criptografia/assinatura — ESTE script (lado "host")
 * demonstra a parte que fica fora do SDK:
 *   1. monta a mensagem de atestado;
 *   2. assina com a carteira (aqui: Solana / Ed25519);
 *   3. cifra o payload com o ProtocolEncryptor v0.2 (AES-256-CBC);
 *   4. envia para `POST {baseUrl}/api/auth` via SDK e recebe o `tokenJWT`.
 *
 * A chave `NEXT_PUBLIC_KEY_CRYPTO_v0_2` é pública (vai para o browser no app),
 * por isso pode ser usada aqui — não é um segredo de servidor.
 *
 * Variáveis de ambiente:
 *   PAGFINANCE_BASE_URL         host da API (default: https://app.pag.finance)
 *   NEXT_PUBLIC_KEY_CRYPTO_v0_2 chave de cifra v0.2 (obrigatória)
 *   SOLANA_SECRET_KEY           secret key base58 (64 bytes, ex.: export do Phantom).
 *                               Se ausente, gera um par efêmero (sem KYC).
 *
 * Execução:
 *   pnpm --filter @pagfinance/sdk-example-auth-token start
 */
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PagFinanceClient, PagFinanceError } from '@pagfinance/sdk';

const {
  PAGFINANCE_BASE_URL = 'https://app.pag.finance',
  NEXT_PUBLIC_KEY_CRYPTO_v0_2 = '',
  SOLANA_SECRET_KEY,
} = process.env;

const BLOCKCHAIN = 'solana';
const MAX_AGE_WEB3_JWT_TOKEN = 24 * 60 * 60; // 24h, igual ao app

/** Mensagem de atestado — idêntica a getMessageAttestation() do app. */
function getMessageAttestation(iat: number, pubkey: string): string {
  return [`PagCrypto`, `iat:${iat}`, `pubkey:${pubkey}`].join('\n');
}

/**
 * Cifra v0.2 — espelha DataEncryptorV0.encrypt do app (AES-256-CBC).
 * Chave = Buffer.alloc(32, key) (preenche 32 bytes repetindo a string).
 */
function encryptV02(data: unknown, key: string) {
  const keyBuffer = Buffer.alloc(32, key);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  return {
    v: 0.2,
    iv: iv.toString('hex'),
    encryptedData: encrypted.toString('hex'),
  };
}

function loadKeypair(): nacl.SignKeyPair {
  if (SOLANA_SECRET_KEY) {
    const secret = bs58.decode(SOLANA_SECRET_KEY); // 64 bytes
    return nacl.sign.keyPair.fromSecretKey(secret);
  }
  console.log('⚠️  SOLANA_SECRET_KEY ausente — gerando par efêmero (sem KYC).');
  return nacl.sign.keyPair();
}

async function main() {
  if (!NEXT_PUBLIC_KEY_CRYPTO_v0_2) {
    throw new Error('Defina NEXT_PUBLIC_KEY_CRYPTO_v0_2 (chave de cifra v0.2).');
  }

  // 1. Carteira + mensagem
  const keypair = loadKeypair();
  const address = bs58.encode(keypair.publicKey); // pubkey base58
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + MAX_AGE_WEB3_JWT_TOKEN;
  const message = getMessageAttestation(iat, address);

  // 2. Assina a mensagem (Ed25519)
  const signature = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);

  // 3. Monta o payload (mesmo shape do useWalletLogin do app)
  const req = {
    blockchain: BLOCKCHAIN,
    blockchainKey: BLOCKCHAIN,
    address,
    publicKey: undefined,
    message,
    signature: Array.from(signature), // server aceita array p/ Solana
    sig: null,
    iat,
    exp,
  };

  // 4. Cifra v0.2 → envelope { v, iv, encryptedData }
  const envelope = encryptV02(req, NEXT_PUBLIC_KEY_CRYPTO_v0_2);

  // 5. Envia ao app via SDK e recebe o tokenJWT
  const client = new PagFinanceClient({
    baseUrl: PAGFINANCE_BASE_URL,
    clientId: 'sdk-example-auth',
    appMeta: { name: 'sdk-example', version: '0.1.0', domain: 'example.local' },
    defaultBlockchain: BLOCKCHAIN,
  });

  console.log(`› Autenticando wallet ${address.slice(0, 8)}… em ${PAGFINANCE_BASE_URL}`);
  const result = await client.auth.login(envelope, { blockchain: BLOCKCHAIN });

  console.log('\n✅ tokenJWT obtido:\n', result.tokenJWT);
  console.log('\nregistration:', result.registration ?? []);

  // O token já fica salvo no client (tokenStore). Uso imediato:
  const me = await client.user.me({ loginProvider: 'login-wallet' });
  console.log('\n/api/me:', JSON.stringify(me, null, 2));

  // Para reutilizar noutro lugar: client.auth.getToken() ou client.setToken(token)
}

main().catch((e) => {
  if (e instanceof PagFinanceError) {
    console.error('PagFinanceError:', e.httpStatus, e.code, e.messages);
  } else {
    console.error(e);
  }
  process.exit(1);
});
