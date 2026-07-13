/**
 * Como gerar um TOKEN_JWT do PagFinance e usá-lo no SDK - fluxo simplificado
 * (challenge–response, sem criptografia).
 *
 * O SDK faz todo o trabalho: pede um desafio, repassa ao seu `signer`, troca a
 * assinatura pelo tokenJWT e o guarda. O host só assina a string com a carteira
 * (aqui: Solana / Ed25519).
 *
 * Ajuste as constantes abaixo e rode:
 *   pnpm --filter @pagfinance/sdk-example-auth-token start
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PagFinanceClient, PagFinanceError } from '@pagfinance/sdk';

// ── Configuração (edite estes valores) ──────────────────────────────────────
const PAGFINANCE_BASE_URL = 'https://app.pag.finance';
const SOLANA_SECRET_KEY = ''; // base58 (64 bytes, ex.: export do Phantom). Vazio = par efêmero
const BLOCKCHAIN = 'solana';
// ─────────────────────────────────────────────────────────────────────────────

function loadKeypair(): nacl.SignKeyPair {
  if (SOLANA_SECRET_KEY) return nacl.sign.keyPair.fromSecretKey(bs58.decode(SOLANA_SECRET_KEY));
  console.log('⚠️  SOLANA_SECRET_KEY vazio - gerando par efêmero (sem KYC).');
  return nacl.sign.keyPair();
}

async function main() {
  const keypair = loadKeypair();
  const address = bs58.encode(keypair.publicKey);

  const client = new PagFinanceClient({
    baseUrl: PAGFINANCE_BASE_URL,
    clientId: 'sdk-example-auth',
    appMeta: { name: 'sdk-example', version: '0.1.0', domain: 'example.local' },
    defaultBlockchain: BLOCKCHAIN,
  });

  console.log(`› signIn da wallet ${address.slice(0, 8)}… em ${PAGFINANCE_BASE_URL}`);

  // O signer é a ÚNICA peça do host: assina o desafio e devolve os bytes.
  const result = await client.auth.signIn({ address, blockchain: BLOCKCHAIN }, (challenge) =>
    nacl.sign.detached(new TextEncoder().encode(challenge), keypair.secretKey),
  );

  console.log('\n✅ tokenJWT obtido:\n', result.tokenJWT);
  console.log('\nregistration:', result.registration ?? []);

  // Token já salvo no client (tokenStore). Uso imediato:
  const me = await client.user.me({ loginProvider: 'login-wallet' });
  console.log('\n/api/me:', JSON.stringify(me, null, 2));
}

main().catch((e) => {
  if (e instanceof PagFinanceError) {
    console.error('PagFinanceError:', e.httpStatus, e.code, e.messages);
  } else {
    console.error(e);
  }
});
