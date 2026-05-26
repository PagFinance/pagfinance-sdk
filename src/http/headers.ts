import { type AppMeta } from '../config';

/**
 * Monta os headers padrão de toda request ao BFF/app PagFinance.
 *
 * NOTA: `x-client-id` ainda NÃO é validado server-side hoje. É enviado de forma
 * consistente para destravar o enforcement futuro no BFF.
 */
export function buildHeaders(params: {
  clientId: string;
  appMeta: AppMeta;
  token?: string | null;
  json?: boolean;
  /** Headers extras por request (ex.: `blockchain`, `login-provider`, `id-token`). */
  extra?: Record<string, string | undefined>;
}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-client-id': params.clientId,
    'x-app-name': params.appMeta.name,
    'x-app-version': params.appMeta.version,
    'x-app-domain': params.appMeta.domain,
    'x-origin-domain': params.appMeta.domain,
  };
  if (params.json !== false) headers['Content-Type'] = 'application/json';
  if (params.token) headers['Authorization'] = `Bearer ${params.token}`;
  if (params.extra) {
    for (const [k, v] of Object.entries(params.extra)) {
      if (v !== undefined && v !== null && v !== '') headers[k] = v;
    }
  }
  return headers;
}
