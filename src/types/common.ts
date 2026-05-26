/** Envelope genérico de resposta do BFF/app PagFinance. */
export type BaseResult<T = unknown> =
  | { success: true; message?: string | null; data: T; error?: null }
  | { success: false; message?: string | null; data?: unknown; error?: unknown };
