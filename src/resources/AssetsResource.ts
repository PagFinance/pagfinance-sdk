import { type HttpClient } from '../http/HttpClient';
import {
  type GatewayConfigType,
  type AssetType,
  type AssetPrice,
} from '../types/asset';

/**
 * Ativos e cotações. Endpoints públicos (sem auth).
 *
 * A fonte da verdade de chains/assets é `/api/gatewayConfig`; `acceptedCryptos`
 * e `assets` derivam dele (filtragem client-side) para conveniência.
 */
export class AssetsResource {
  constructor(private readonly http: HttpClient) {}

  /** Configuração completa de chains + assets (`/api/gatewayConfig`). */
  gatewayConfig(chain?: string): Promise<GatewayConfigType> {
    return this.http.request<GatewayConfigType>('/api/gatewayConfig', {
      skipAuth: true,
      query: chain ? { chain } : undefined,
    });
  }

  /** Alias de `gatewayConfig` - chains/cryptos aceitas. */
  acceptedCryptos(chain?: string): Promise<GatewayConfigType> {
    return this.gatewayConfig(chain);
  }

  /** Lista achatada de todos os assets (opcionalmente filtrada por chain). */
  async assets(chain?: string): Promise<AssetType[]> {
    const config = await this.gatewayConfig();
    const chains = chain
      ? config.chains.filter((c) => c.name.toLowerCase() === chain.toLowerCase())
      : config.chains;
    return chains.flatMap((c) => c.assets ?? []);
  }

  /** Cotação cripto→fiat (`/api/getAssetPrice`). */
  getAssetPrice(params: {
    assetId: string | number;
    fiatCurrency: string;
  }): Promise<AssetPrice> {
    return this.http.request<AssetPrice>('/api/getAssetPrice', {
      skipAuth: true,
      query: {
        assetId: params.assetId,
        fiatCurrency: params.fiatCurrency,
      },
    });
  }
}
