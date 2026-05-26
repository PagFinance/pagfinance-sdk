/**
 * Identifica o app consumidor da SDK. Enviado em todo request via headers
 * `x-app-name` / `x-app-version` / `x-app-domain`.
 */
export interface AppMeta {
  name: string;
  version: string;
  domain: string;
}

/**
 * Armazena o `tokenJWT` obtido pelo app host (a SDK NÃO assina nem criptografa
 * nada). Pode ser plugado a localStorage, cookies, etc.
 */
export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

/** TokenStore padrão em memória (não persiste entre reloads). */
export class MemoryTokenStore implements TokenStore {
  private token: string | null = null;
  get(): string | null {
    return this.token;
  }
  set(token: string | null): void {
    this.token = token;
  }
}

export interface PagFinanceConfig {
  /** Host da API (proxy Next.js do PagFinance), ex.: `https://app.pag.finance`. */
  baseUrl: string;
  /** Identificador do cliente, enviado como `x-client-id`. */
  clientId: string;
  /** Metadados do app consumidor. */
  appMeta: AppMeta;
  /** Implementação de fetch. Default: `globalThis.fetch` (Node 18+ / browser). */
  fetch?: typeof fetch;
  /** Onde guardar o tokenJWT. Default: `MemoryTokenStore`. */
  tokenStore?: TokenStore;
  /** Blockchain default para endpoints que exigem o header `blockchain`. */
  defaultBlockchain?: string;
}

export interface ResolvedConfig {
  baseUrl: string;
  clientId: string;
  appMeta: AppMeta;
  fetch: typeof fetch;
  tokenStore: TokenStore;
  defaultBlockchain?: string;
}

export function resolveConfig(config: PagFinanceConfig): ResolvedConfig {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'PagFinance SDK: nenhum `fetch` disponível. Forneça `config.fetch` em runtimes sem fetch global.',
    );
  }
  return {
    baseUrl: config.baseUrl.replace(/\/+$/, ''),
    clientId: config.clientId,
    appMeta: config.appMeta,
    fetch: fetchImpl.bind(globalThis),
    tokenStore: config.tokenStore ?? new MemoryTokenStore(),
    defaultBlockchain: config.defaultBlockchain,
  };
}
