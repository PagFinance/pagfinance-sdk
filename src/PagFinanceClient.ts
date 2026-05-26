import {
  resolveConfig,
  type PagFinanceConfig,
  type ResolvedConfig,
} from './config';
import { HttpClient } from './http/HttpClient';
import { AssetsResource } from './resources/AssetsResource';
import { PaymentsResource } from './resources/PaymentsResource';
import { ReceiptsResource } from './resources/ReceiptsResource';
import { KycResource } from './resources/KycResource';
import { UserResource } from './resources/UserResource';
import { AuthResource } from './resources/AuthResource';

/**
 * Ponto de entrada da SDK. Compõe os recursos sobre um único `HttpClient`.
 *
 * ```ts
 * const client = new PagFinanceClient({
 *   baseUrl: 'https://app.pag.finance',
 *   clientId: 'meu-app',
 *   appMeta: { name: 'meu-app', version: '1.0.0', domain: 'meuapp.com' },
 * });
 * client.setToken(tokenJWT); // obtido fora da SDK
 * const cfg = await client.assets.acceptedCryptos();
 * ```
 */
export class PagFinanceClient {
  readonly config: ResolvedConfig;
  readonly http: HttpClient;
  readonly assets: AssetsResource;
  readonly payments: PaymentsResource;
  readonly receipts: ReceiptsResource;
  readonly kyc: KycResource;
  readonly user: UserResource;
  readonly auth: AuthResource;

  constructor(config: PagFinanceConfig) {
    this.config = resolveConfig(config);
    this.http = new HttpClient(this.config);
    this.assets = new AssetsResource(this.http);
    this.payments = new PaymentsResource(this.http, this.config);
    this.receipts = new ReceiptsResource(this.http, this.config);
    this.kyc = new KycResource(this.http);
    this.user = new UserResource(this.http);
    this.auth = new AuthResource(this.http, this.config);
  }

  /** Define o tokenJWT usado no header Authorization. */
  setToken(token: string | null): void {
    this.config.tokenStore.set(token);
  }
}
