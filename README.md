# @pagfinance/sdk

SDK cliente, **framework-agnóstico**, para integrar apps externos com a API do
PagFinance (pagamentos cripto → PIX/boleto/giftcard, KYC e cotações).

Projetada para ser **plugável em qualquer app** (Node 18+, browsers, bundlers) e
para **não conter nenhum segredo, chave ou lógica de criptografia/assinatura** -
toda essa parte permanece no app host, protegendo a propriedade intelectual e a
segurança do PagFinance.

## Instalação

```bash
npm install @pagfinance/sdk
# ou: pnpm add @pagfinance/sdk
```

## Uso

```ts
import { PagFinanceClient } from '@pagfinance/sdk';

const client = new PagFinanceClient({
  baseUrl: 'https://app.pag.finance', // host da API (proxy Next.js)
  clientId: 'meu-app',
  appMeta: { name: 'meu-app', version: '1.0.0', domain: 'meuapp.com' },
  defaultBlockchain: 'solana',
});

// Endpoints públicos (sem auth)
const config = await client.assets.acceptedCryptos();
const price = await client.assets.getAssetPrice({ assetId: 1, fiatCurrency: 'BRL' });
const transfer = await client.payments.validateCode({ code: '00020101...' });

// Endpoints autenticados: forneça o tokenJWT obtido FORA da SDK
client.setToken(tokenJWT);
const me = await client.user.me();
```

## Modelo de autenticação (challenge–response, sem cripto)

O login Web3 é um challenge–response (estilo SIWS). O SDK orquestra tudo; o app
host só fornece um `signer` que assina o desafio com a carteira:

```ts
import nacl from 'tweetnacl';

const { tokenJWT } = await client.auth.signIn(
  { address, blockchain: 'solana' },
  (challenge) => wallet.signMessage(new TextEncoder().encode(challenge)),
);
// tokenJWT já fica salvo no client (tokenStore)
```

Internamente: `POST /api/auth/challenge` → `signer(challenge)` → `POST /api/auth/verify`.
Não há criptografia nem chave no cliente - a única prova é a assinatura, e toda a
lógica (nonce, verificação, emissão do token) vive no servidor. O mesmo contrato
vale apontando o `baseUrl` para o app hoje ou para um BFF dedicado amanhã.

Token obtido por fora (ou reaproveitado):

```ts
client.setToken(tokenJWT);
```

Re-login transparente em 401 (opcional):

```ts
client.auth.enableAutoRelogin(async () => {
  await client.auth.signIn({ address, blockchain }, signer);
  return true;
});
```

## Recursos

| Recurso | Métodos |
| --- | --- |
| `assets` | `acceptedCryptos`, `gatewayConfig`, `assets`, `getAssetPrice` |
| `payments` | `validateCode`, `quote`, `create`, `submit`, `list`, `get` |
| `receipts` | `get({ type, tx, chain })` - agnóstico (pix/boleto/giftcard) |
| `kyc` | `naturalProposal`, `legalProposal`, `documentUrl`, `check`, `cpfValidate`, `userData` |
| `user` | `me` |
| `auth` | `signIn`, `challenge`, `verify`, `setToken`, `getToken`, `clearToken`, `otpSend`, `otpVerify`, `enableAutoRelogin` |

## Erros

Toda falha lança `PagFinanceError` com `messages`, `fieldErrors`, `httpStatus` e
`code`, já normalizados a partir dos dois envelopes (`{ success, data }` e
`{ ok, error }`).

```ts
import { PagFinanceError } from '@pagfinance/sdk';

try {
  await client.payments.quote(req);
} catch (e) {
  if (e instanceof PagFinanceError) {
    console.error(e.messages, e.fieldErrors, e.httpStatus);
  }
}
```

## Exemplo executável

Veja `examples/transaction-flow` - fluxo ponta-a-ponta real (cotação → criação →
recibo) usando um `TOKEN_JWT` de variável de ambiente.

```bash
pnpm --filter @pagfinance/sdk build
PAGFINANCE_BASE_URL=https://app.pag.finance \
PAGFINANCE_CLIENT_ID=exemplo \
TOKEN_JWT=... \
PAYMENT_CODE='00020101...' \
SENDER_WALLET=7NaNvh... \
npx tsx examples/transaction-flow/index.ts
```
