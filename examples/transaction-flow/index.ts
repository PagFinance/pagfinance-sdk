/**
 * Exemplo ponta-a-ponta de uma transação usando @pagfinance/sdk.
 *
 * O SDK é token-agnóstico: este exemplo NÃO assina carteira. Forneça um
 * TOKEN_JWT já obtido (ver examples/auth-token). A transmissão on-chain da
 * instrução (passo 5) também é do host.
 *
 * Ajuste as constantes abaixo e rode:
 *   pnpm --filter @pagfinance/sdk-example-transaction-flow start
 */
import { PagFinanceClient, PagFinanceError } from '@pagfinance/sdk';

// ── Configuração (edite estes valores) ──────────────────────────────────────
const PAGFINANCE_BASE_URL = 'https://app.pag.finance';
const PAGFINANCE_CLIENT_ID = 'sdk-example';
const TOKEN_JWT = ''; // tokenJWT obtido fora do SDK (ver examples/auth-token)
const PAYMENT_CODE = ''; // pix copia-e-cola / código de boleto
const SENDER_WALLET = ''; // endereço da carteira pagadora
const TX_HASH = ''; // hash on-chain, após o host assinar/transmitir
const ASSET_ID = 1;
const FIAT_CURRENCY = 'BRL';
const AMOUNT_BRL = 10; // usado quando o código não traz valor embutido (ex.: chave PIX)
const BLOCKCHAIN = 'solana';
// ─────────────────────────────────────────────────────────────────────────────

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
  const price = await client.assets.getAssetPrice({ assetId: ASSET_ID, fiatCurrency: FIAT_CURRENCY });
  console.log('   price:', price);

  if (!PAYMENT_CODE) {
    console.log('\n(PAYMENT_CODE vazio — encerrando após os passos públicos)');
    return;
  }

  // 2. Valida e classifica o código (público)
  console.log('\n› 2. validateCode');
  const transfer = await client.payments.validateCode({ code: PAYMENT_CODE });
  console.log('   transfer:', transfer);

  if (!TOKEN_JWT || !SENDER_WALLET) {
    console.log('\n(TOKEN_JWT/SENDER_WALLET vazios — encerrando antes da cotação autenticada)');
    return;
  }

  // externalId é gerado pelo client, estável por sessão de invoice (regenera se
  // o código muda). Mesmo padrão do hook useBffQuote do app.
  const externalId = `pag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 3. Cotação (autenticada)
  console.log('\n› 3. quote');
  const quote = await client.payments.quote({
    invoiceCode: PAYMENT_CODE,
    invoiceType: transfer.type,
    invoiceTransferType: transfer.type,
    assetId: ASSET_ID,
    fiatCurrency: FIAT_CURRENCY,
    amount: transfer.amount || AMOUNT_BRL,
    externalId,
    sender: SENDER_WALLET,
  });
  console.log('   quoteId:', quote.quoteId);

  // 4. Cria a instrução de pagamento
  console.log('\n› 4. create');
  const instruction = await client.payments.create({ quoteId: quote.quoteId, sender: SENDER_WALLET });
  console.log('   instruction:', instruction);

  // 5. PLACEHOLDER (app host): assinar e transmitir a instrução na blockchain.
  console.log('\n› 5. [host] assinar + transmitir on-chain (fora do SDK)');

  // 6. Submeter (se o app/BFF expõe /api/payment/submit) — opcional
  if (TX_HASH) {
    console.log('\n› 6. submit');
    const payment = await client.payments.submit({
      quoteId: quote.quoteId,
      txHash: TX_HASH,
      sender: SENDER_WALLET,
      blockchain: BLOCKCHAIN,
    });
    console.log('   payment status:', payment.status);

    // 7. Recibo (agnóstico ao tipo)
    console.log('\n› 7. receipt');
    const receipt = await client.receipts.get({ type: transfer.type, tx: TX_HASH });
    console.log('   receipt:', receipt);
  } else {
    console.log('\n(TX_HASH vazio — pulei submit/receipt)');
  }
}

main().catch((e) => {
  if (e instanceof PagFinanceError) {
    console.error('PagFinanceError:', e.httpStatus, e.code, e.messages, e.fieldErrors);
  } else {
    console.error(e);
  }
});
