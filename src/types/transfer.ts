// Tipos de transferência / código de pagamento (pix, boleto, doc, ted).

export type PaymentRail = 'boleto' | 'pix' | 'doc' | 'ted' | 'unknown' | (string & {});

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | (string & {});
export type AccountType = 'checking' | 'savings';
export type TransferStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface TransferBase {
  id?: string | null;
  amount: number;
  currency: CurrencyCode;
  type: PaymentRail;
  status?: TransferStatus;
  invoiceCode?: string | null;
  invoiceValue?: number;
}

export interface PixTransfer extends TransferBase {
  type: 'pix';
  pixKey?: string;
  description?: string;
  payerName?: string | null;
  payerDocument?: string;
}

export interface BoletoTransfer extends TransferBase {
  type: 'boleto';
  barcode?: string;
  expirationDate?: string;
  payerName?: string | null;
  payerDocument?: string;
}

export interface DocTedTransfer extends TransferBase {
  type: 'doc' | 'ted';
  bankCode?: string;
  agency?: string;
  accountNumber?: string;
  accountType?: AccountType;
  recipientName?: string;
  recipientDocument?: string;
}

export type Transfer = PixTransfer | BoletoTransfer | DocTedTransfer;

/** Resultado de POST /api/validate-code. `data` é o transfer já classificado. */
export interface ValidateCodeRequest {
  code: string;
  /** Origem do código, ex.: `qrcode_scanner`, `input`. */
  method?: string;
}
