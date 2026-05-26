import { type AssetType } from './asset';
import { type PaymentRail } from './transfer';

export enum PaymentStatusEnum {
  // ── Legacy (persistido como número no Firestore) ──
  PENDING = 0,
  SUCCESS = 1,
  ERROR = 2,
  ANALISE = 3,
  REFUSED = 4,
  INITIAL = 9,

  // ── Fluxo público (user-facing) ──
  RECEIVED = 'received',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',

  // ── Operacional ──
  AWAITING_DEPOSIT = 'awaiting_deposit',
  DEPOSIT_DETECTED = 'deposit_detected',
  DEPOSIT_CONFIRMED = 'deposit_confirmed',
  PIX_QUEUED = 'pix_queued',
  PIX_SENT = 'pix_sent',
  PIX_CONFIRMED = 'pix_confirmed',
  REFUND_REQUESTED = 'refund_requested',
  REFUND_PROCESSING = 'refund_processing',
  REFUND_SENT = 'refund_sent',
  MANUAL_REVIEW = 'manual_review',
}

/** Breakdown de valores e taxas (fiat BRL + crypto). */
export interface PaymentValuesType {
  paymentInFiat: number;
  networkFeeFiat: number;
  processingFeeFiat: number;
  totalFeeFiat: number;
  totalFiat: number;

  paymentInCrypto: number;
  networkFeeCrypto: number;
  processingFeeCrypto: number;
  totalFeeCrypto: number;
  totalCrypto: number;
}

export interface PaymentApp {
  version: string | number;
  name: string;
  domain: string;
}

/** Representação leve de um pagamento (subset público do IPayment do app). */
export interface Payment {
  id?: string | null;
  app?: PaymentApp | null;
  name?: string;
  message?: string | null;
  createdAt?: string | null;
  asset?: AssetType | null;
  blockchain?: string;
  currency?: string;
  currencyBlockchainTx?: string;
  currencyPrice?: number;
  currencyDepositAmount?: number;
  invoice?: unknown | null;
  invoiceCode?: string;
  invoiceType?: string | null;
  invoiceUrl?: string;
  invoiceValue?: number;
  invoiceCurrency?: string;
  invoiceTransferType?: PaymentRail | null;
  proofUrl?: string | null;
  correlationID?: string | null;
  valuesAndFees?: PaymentValuesType | null;
  status: PaymentStatusEnum;
  ipfsHash?: string | null;
  sender?: string | null;
}

// ── Requests/Responses dos endpoints de pagamento ──

export interface QuoteRequest {
  sender?: string;
  invoice?: string;
  invoiceCode: string;
  invoiceType?: string;
  invoiceTransferType?: PaymentRail;
  invoiceName?: string;
  userCpf?: string;
  userEmail?: string;
  assetId: number;
  fiatCurrency: string;
  amount: number;
  externalId?: string;
}

export interface QuoteResponse {
  quoteId: string;
  valuesAndFees?: PaymentValuesType;
  [key: string]: unknown;
}

export interface CreatePaymentRequest {
  quoteId: string;
  sender: string;
}

/** Instrução blockchain a ser assinada/transmitida pela carteira (app host). */
export interface CreatePaymentResponse {
  memo?: string;
  blockchain?: string;
  instruction?: string;
  minContextSlot?: number;
  receiver?: string;
  amount?: string;
  [key: string]: unknown;
}

export interface SubmitPaymentRequest {
  quoteId?: string;
  /** Hash/assinatura da transação on-chain transmitida pelo app host. */
  txHash?: string;
  blockchain?: string;
  sender?: string;
  [key: string]: unknown;
}

export type PaymentListFormat = 'raw' | 'grouped';

export interface PaymentListResult {
  format: PaymentListFormat;
  payments?: Payment[];
  lists?: unknown[];
}
