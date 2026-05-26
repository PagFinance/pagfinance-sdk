// @pagfinance/sdk — SDK cliente para integração com a API do PagFinance.
// Token-agnóstica e livre de criptografia/segredos.

export { PagFinanceClient } from './PagFinanceClient';

// Config
export {
  MemoryTokenStore,
  resolveConfig,
  type PagFinanceConfig,
  type ResolvedConfig,
  type AppMeta,
  type TokenStore,
} from './config';

// HTTP / erros
export { HttpClient, type HttpMethod, type RequestOptions } from './http/HttpClient';
export { PagFinanceError } from './http/PagFinanceError';
export {
  extractApiError,
  type ApiError,
  type ApiErrorPayload,
  type ApiIssue,
} from './http/extractApiError';

// Recursos (tipos auxiliares)
export {
  AuthResource,
  type EncryptedAuthEnvelope,
  type AuthLoginOptions,
  type AuthLoginResult,
} from './resources/AuthResource';
export { AssetsResource } from './resources/AssetsResource';
export { PaymentsResource } from './resources/PaymentsResource';
export { ReceiptsResource, type ReceiptParams } from './resources/ReceiptsResource';
export { KycResource } from './resources/KycResource';
export { UserResource } from './resources/UserResource';

// Tipos de domínio
export * from './types/common';
export * from './types/asset';
export * from './types/transfer';
export * from './types/payment';
export * from './types/kyc';
