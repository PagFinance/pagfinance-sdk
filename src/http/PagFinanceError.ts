import { extractApiError, type ApiError } from './extractApiError';

/**
 * Erro tipado lançado por todas as operações da SDK em caso de falha.
 *
 * Constrói `messages` e `fieldErrors` reaproveitando `extractApiError`, que
 * entende o envelope de erro do BFF/app (`{ ok:false, error:{ message, code,
 * details:{ issues } } }`, `{ success:false, message }`, `fieldErrors`, etc.).
 */
export class PagFinanceError extends Error {
  readonly messages: string[];
  readonly fieldErrors: Record<string, string>;
  readonly httpStatus?: number;
  readonly code?: string;

  constructor(params: {
    messages: string[];
    fieldErrors?: Record<string, string>;
    httpStatus?: number;
    code?: string;
  }) {
    super(params.messages[0] ?? 'PagFinance request failed');
    this.name = 'PagFinanceError';
    this.messages = params.messages;
    this.fieldErrors = params.fieldErrors ?? {};
    this.httpStatus = params.httpStatus;
    this.code = params.code;
    Object.setPrototypeOf(this, PagFinanceError.prototype);
  }

  /** Constrói a partir do corpo de erro do BFF/app + status HTTP. */
  static fromApiBody(body: ApiError, httpStatus?: number): PagFinanceError {
    const { messages, fieldErrors } = extractApiError(body ?? {});
    const code =
      typeof body?.error === 'object' && body.error
        ? (body.error as { code?: string }).code
        : undefined;
    return new PagFinanceError({ messages, fieldErrors, httpStatus, code });
  }

  /** Constrói para erro local (sem resposta do servidor). */
  static local(message: string, code?: string): PagFinanceError {
    return new PagFinanceError({ messages: [message], code });
  }
}
