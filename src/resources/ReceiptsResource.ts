import { type HttpClient } from '../http/HttpClient';
import { type ResolvedConfig } from '../config';

export interface ReceiptParams {
  /** Tipo de recibo: `pix`, `boleto`, `giftcard`, ... (agnóstico). */
  type: string;
  /** Hash/ID da transação. */
  tx: string;
  /** Blockchain (opcional). */
  chain?: string;
}

/**
 * Recibos de pagamento. Agnóstico ao tipo: `/api/receipt/:type` (ex.: `pix`).
 * Requer autenticação (Bearer token).
 */
export class ReceiptsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedConfig,
  ) {}

  get<T = unknown>(params: ReceiptParams): Promise<T> {
    const type = encodeURIComponent(params.type);
    return this.http.request<T>(`/api/receipt/${type}`, {
      query: {
        tx: params.tx,
        chain: params.chain ?? this.config.defaultBlockchain,
      },
    });
  }
}
