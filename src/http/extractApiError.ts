// Portado de packages/core/src/lib/http/extractApiError.ts — função pura, sem
// dependências. Entende os dois envelopes de erro do BFF/app PagFinance.

export type ApiIssue = {
  code?: string;
  message?: string;
  path?: (string | number)[] | string;
};

export type ApiErrorPayload = {
  httpStatus?: number;
  code?: string;
  message?: string;
  source?: string;
  details?: {
    issues?: ApiIssue[];
    [key: string]: unknown;
  };
  traceId?: string;
  at?: string;
};

export type ApiError = {
  ok?: boolean;
  success?: boolean;
  error?: string | ApiErrorPayload;
  message?: string;
  issues?: ApiIssue[];
  fieldErrors?: Record<string, string>;
};

export function extractApiError(err: ApiError): {
  messages: string[];
  fieldErrors: Record<string, string>;
} {
  const messages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const errorObj = typeof err?.error === 'object' ? err.error : null;
  const errorMessage =
    errorObj?.message || (typeof err?.error === 'string' ? err.error : null);
  const errorIssues = errorObj?.details?.issues;

  if (errorIssues && Array.isArray(errorIssues)) {
    for (const issue of errorIssues) {
      const msg = issue?.message || errorMessage || 'Erro de validação';
      messages.push(msg);
      if (issue?.path) {
        const pathStr =
          typeof issue.path === 'string'
            ? issue.path.replace(/^body\./, '')
            : Array.isArray(issue.path)
              ? issue.path.filter((p) => p !== 'body').join('.')
              : '';
        if (pathStr) fieldErrors[pathStr] = msg;
      }
    }
  } else if (err?.issues && Array.isArray(err.issues)) {
    for (const issue of err.issues) {
      const msg = issue?.message || err.message || 'Erro de validação';
      messages.push(msg);
      if (issue?.path && (Array.isArray(issue.path) ? issue.path.length : issue.path)) {
        const key = Array.isArray(issue.path) ? issue.path.join('.') : issue.path;
        fieldErrors[key] = msg;
      }
    }
  } else if (err?.fieldErrors) {
    for (const [k, v] of Object.entries(err.fieldErrors)) {
      fieldErrors[k] = v;
      messages.push(v);
    }
  } else if (errorMessage) {
    messages.push(getUserFriendlyMessage(errorObj?.code, errorMessage));
  } else if (err?.message) {
    messages.push(err.message);
  }

  if (messages.length === 0) messages.push('Falha ao enviar. Tente novamente.');
  return { messages, fieldErrors };
}

function getUserFriendlyMessage(code?: string, originalMessage?: string): string {
  if (!code) return originalMessage || 'Erro desconhecido';

  switch (code) {
    case 'BAD_GATEWAY':
      return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
    case 'CONFLICT':
      return 'Já existe uma proposta em andamento para este CPF.';
    case 'VALIDATION_ERROR':
      return originalMessage || 'Erro de validação nos dados informados.';
    case 'UNAUTHORIZED':
      return 'Sessão expirada. Faça login novamente.';
    case 'RATE_LIMITED':
      return 'Muitas tentativas. Aguarde alguns minutos.';
    default:
      return originalMessage || 'Erro ao processar solicitação.';
  }
}
