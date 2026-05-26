import { type HttpClient } from '../http/HttpClient';
import { type ResolvedConfig } from '../config';
import { type Transfer, type ValidateCodeRequest } from '../types/transfer';
import {
  type QuoteRequest,
  type QuoteResponse,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
  type SubmitPaymentRequest,
  type Payment,
  type PaymentListResult,
  type PaymentListFormat,
} from '../types/payment';

/**
 * Fluxo de pagamento: validar código → cotar → criar instrução → (assinar no
 * app host) → submeter → listar/consultar.
 *
 * IMPORTANTE: a assinatura/transmissão da transação on-chain é responsabilidade
 * do app host. `create()` devolve a instrução; a SDK não assina nada.
 */
export class PaymentsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedConfig,
  ) {}

  /** Valida e classifica um código (pix/boleto/doc/ted) — `/api/validate-code`. */
  validateCode(input: ValidateCodeRequest): Promise<Transfer> {
    return this.http.request<Transfer>('/api/validate-code', {
      method: 'POST',
      skipAuth: true,
      body: { code: input.code, method: input.method ?? 'input' },
    });
  }

  /** Cotação autoritativa (taxas + valor em cripto) — `/api/payment/quote`. */
  quote(input: QuoteRequest): Promise<QuoteResponse> {
    return this.http.request<QuoteResponse>('/api/payment/quote', {
      method: 'POST',
      body: input,
    });
  }

  /** Cria a instrução de pagamento a partir de um `quoteId` — `/api/payment/create`. */
  create(input: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.http.request<CreatePaymentResponse>('/api/payment/create', {
      method: 'POST',
      body: input,
    });
  }

  /**
   * Submete a transação já assinada/transmitida pelo app host.
   *
   * NOTA: requer rota `/api/payment/submit` exposta pelo app/BFF. Em muitos
   * fluxos a transmissão é direta na blockchain e o status é acompanhado via
   * `list()` / `receipt`.
   */
  submit(input: SubmitPaymentRequest): Promise<Payment> {
    return this.http.request<Payment>('/api/payment/submit', {
      method: 'POST',
      body: input,
      headers: { blockchain: input.blockchain ?? this.config.defaultBlockchain },
    });
  }

  /** Lista pagamentos do usuário/carteira — `/api/wallet-lists`. */
  list(
    params: { format?: PaymentListFormat; blockchain?: string } = {},
  ): Promise<PaymentListResult> {
    return this.http.request<PaymentListResult>('/api/wallet-lists', {
      query: { format: params.format ?? 'raw' },
      headers: { blockchain: params.blockchain ?? this.config.defaultBlockchain },
    });
  }

  /**
   * Consulta um pagamento por id. Deriva da listagem `raw` e filtra localmente
   * (o app não expõe rota dedicada `/api/payment/:id`).
   */
  async get(id: string, params: { blockchain?: string } = {}): Promise<Payment | null> {
    const result = await this.list({ format: 'raw', blockchain: params.blockchain });
    return (result.payments ?? []).find((p) => p.id === id) ?? null;
  }
}
