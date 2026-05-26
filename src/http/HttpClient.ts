import { type ResolvedConfig } from '../config';
import { buildHeaders } from './headers';
import { PagFinanceError } from './PagFinanceError';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  /** Query string params (serializados e codificados). */
  query?: Record<string, string | number | boolean | undefined>;
  /** Corpo JSON. */
  body?: unknown;
  /** Pular o `Authorization` header (ex.: endpoints públicos / login). */
  skipAuth?: boolean;
  /** Headers extras (ex.: `blockchain`, `login-provider`, `id-token`). */
  headers?: Record<string, string | undefined>;
}

/**
 * Camada de transporte: monta headers, serializa, desempacota o envelope do
 * BFF/app e converte erros em `PagFinanceError`.
 *
 * O PagFinance usa DOIS envelopes de sucesso/erro:
 *   - `{ success, data, message }`  (pagamentos, assets, receipt, ...)
 *   - `{ ok, data, error }`         (KYC, auth/otp, e-mail, ...)
 * Alguns endpoints (ex.: `/api/gatewayConfig`) retornam o objeto cru, sem
 * envelope. O cliente trata os três casos.
 *
 * Refresh em 401: se um callback `onUnauthorized` estiver registrado (pelo
 * `AuthResource`), tenta UM re-login transparente e repete a request.
 */
export class HttpClient {
  private onUnauthorized: (() => Promise<boolean>) | null = null;

  constructor(private readonly config: ResolvedConfig) {}

  /** Registrado pelo AuthResource para permitir re-login automático. */
  setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void {
    this.onUnauthorized = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.doRequest<T>(path, options, true);
  }

  private async doRequest<T>(
    path: string,
    options: RequestOptions,
    allowRefresh: boolean,
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const token = options.skipAuth ? null : this.config.tokenStore.get();

    let res: Response;
    try {
      res = await this.config.fetch(url, {
        method: options.method ?? 'GET',
        headers: buildHeaders({
          clientId: this.config.clientId,
          appMeta: this.config.appMeta,
          token,
          extra: options.headers,
        }),
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (e) {
      throw PagFinanceError.local(
        `Network error: ${e instanceof Error ? e.message : String(e)}`,
        'NETWORK_ERROR',
      );
    }

    if (res.status === 401 && allowRefresh && !options.skipAuth && this.onUnauthorized) {
      const refreshed = await this.onUnauthorized();
      if (refreshed) return this.doRequest<T>(path, options, false);
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    const isObject = body && typeof body === 'object';
    const failedEnvelope =
      isObject && (body.success === false || body.ok === false);

    if (!res.ok || failedEnvelope) {
      throw PagFinanceError.fromApiBody(body, res.status);
    }

    // Desempacota `data` quando presente (envelope success/ok). Caso contrário
    // devolve o corpo cru (ex.: gatewayConfig, getAssetPrice).
    return (isObject && 'data' in body ? body.data : body) as T;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = `${this.config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.append(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
}
