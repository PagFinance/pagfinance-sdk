/**
 * Exemplo ponta-a-ponta de uma transação usando @pagfinance/sdk.
 *
 * A SDK é token-agnóstica: este exemplo NÃO assina carteira nem criptografa o
 * payload de auth. Forneça um `TOKEN_JWT` já obtido via `/api/auth` (passo do
 * app host). A transmissão on-chain da instrução (passo 5) também é do host.
 *
 * Variáveis de ambiente:
 *   PAGFINANCE_BASE_URL   host da API (default: https://app.pag.finance)
 *   PAGFINANCE_CLIENT_ID  identificador do app (default: sdk-example)
 *   TOKEN_JWT             token Web3 (opcional p/ passos autenticados)
 *   PAYMENT_CODE          pix copia-e-cola / código de boleto
 *   SENDER_WALLET         endereço da carteira pagadora
 *   ASSET_ID              id do ativo (default: 1)
 *   FIAT_CURRENCY         moeda fiat (default: BRL)
 *   BLOCKCHAIN            chain (default: solana)
 *
 * Execução:
 *   pnpm --filter @pagfinance/sdk build
 *   npx tsx examples/transaction-flow/index.ts
 */
import { PagFinanceClient, PagFinanceError } from '@pagfinance/sdk';

const {
  PAGFINANCE_BASE_URL = 'https://app.pag.finance',
  PAGFINANCE_CLIENT_ID = 'sdk-example',
  TOKEN_JWT,
  PAYMENT_CODE,
  SENDER_WALLET,
  ASSET_ID = '1',
  FIAT_CURRENCY = 'BRL',
  BLOCKCHAIN = 'solana',
} = process.env;

async function main() {
  const client = new PagFinanceClient({
    baseUrl: PAGFINANCE_BASE_URL,
    clientId: PAGFINANCE_CLIENT_ID,
    appMeta: { name: 'sdk-example', version: '0.1.0', domain: 'example.local' },
    defaultBlockchain: BLOCKCHAIN,
  });

  if (TOKEN_JWT) client.setToken(TOKEN_JWT);

  // 1. Ativos aceitos + cotação (público)
  console.log('› 1. acceptedCryptos / getAssetPrice');
  const config = await client.assets.acceptedCryptos();
  console.log(`   chains: ${config.chains.map((c) => c.name).join(', ')}`);
  const price = await client.assets.getAssetPrice({
    assetId: ASSET_ID,
    fiatCurrency: FIAT_CURRENCY,
  });
  console.log('   price:', price);

  if (!PAYMENT_CODE) {
    console.log('\n(sem PAYMENT_CODE — encerrando após os passos públicos)');
    return;
  }

  // 2. Valida e classifica o código (público)
  console.log('\n› 2. validateCode');
  const transfer = await client.payments.validateCode({ code: PAYMENT_CODE });
  console.log('   transfer:', transfer);

  if (!TOKEN_JWT || !SENDER_WALLET) {
    console.log('\n(sem TOKEN_JWT/SENDER_WALLET — encerrando antes da cotação autenticada)');
    return;
  }

  // 3. Cotação (autenticada)
  console.log('\n› 3. quote');
  const quote = await client.payments.quote({
    invoiceCode: PAYMENT_CODE,
    invoiceType: transfer.type,
    invoiceTransferType: transfer.type,
    assetId: Number(ASSET_ID),
    fiatCurrency: FIAT_CURRENCY,
    amount: transfer.amount,
    sender: SENDER_WALLET,
  });
  console.log('   quoteId:', quote.quoteId);

  // 4. Cria a instrução de pagamento
  console.log('\n› 4. create');
  const instruction = await client.payments.create({
    quoteId: quote.quoteId,
    sender: SENDER_WALLET,
  });
  console.log('   instruction:', instruction);

  // 5. PLACEHOLDER (app host): assinar e transmitir a instrução na blockchain.
  //    A SDK não assina nada. Aqui o host usaria sua carteira/adapter.
  console.log('\n› 5. [host] assinar + transmitir on-chain (fora da SDK)');
  const txHash = process.env.TX_HASH;

  // 6. Submeter (se o app/BFF expõe /api/payment/submit) — opcional
  if (txHash) {
    console.log('\n› 6. submit');
    const payment = await client.payments.submit({
      quoteId: quote.quoteId,
      txHash,
      sender: SENDER_WALLET,
      blockchain: BLOCKCHAIN,
    });
    console.log('   payment status:', payment.status);

    // 7. Recibo (agnóstico ao tipo)
    console.log('\n› 7. receipt');
    const receipt = await client.receipts.get({ type: transfer.type, tx: txHash });
    console.log('   receipt:', receipt);
  } else {
    console.log('\n(sem TX_HASH — pulei submit/receipt)');
  }
}

main().catch((e) => {
  if (e instanceof PagFinanceError) {
    console.error('PagFinanceError:', e.httpStatus, e.code, e.messages, e.fieldErrors);
  } else {
    console.error(e);
  }
  process.exit(1);
});
