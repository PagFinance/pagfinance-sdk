import { type HttpClient } from '../http/HttpClient';
import {
  type NaturalProposalInput,
  type LegalProposalInput,
  type KycCheckResponse,
  type CpfValidateResponse,
  type RegistrationType,
} from '../types/kyc';

/** Operações de KYC / onboarding. */
export class KycResource {
  constructor(private readonly http: HttpClient) {}

  /** Submete proposta de Pessoa Física - `/api/kyc/natural-proposal`. */
  naturalProposal(input: NaturalProposalInput): Promise<unknown> {
    return this.http.request('/api/kyc/natural-proposal', {
      method: 'POST',
      body: input,
    });
  }

  /** Submete proposta de Pessoa Jurídica - `/api/kyc/legal-proposal`. */
  legalProposal(input: LegalProposalInput): Promise<unknown> {
    return this.http.request('/api/kyc/legal-proposal', {
      method: 'POST',
      body: input,
    });
  }

  /** URL de verificação documental - `/api/kyc/document?proposalId=`. */
  documentUrl(proposalId: string): Promise<{ url: string }> {
    return this.http.request<{ url: string }>('/api/kyc/document', {
      skipAuth: true,
      query: { proposalId },
    });
  }

  /**
   * Status de KYC do usuário autenticado — `/api/kyc/check`.
   *
   * Aceita override de Bearer para esta chamada e o header `id-token` opcional,
   * permitindo o fluxo do app que autentica com wallet JWT OU Firebase id-token.
   */
  check(opts: { idToken?: string; bearer?: string } = {}): Promise<KycCheckResponse> {
    return this.http.request<KycCheckResponse>('/api/kyc/check', {
      authToken: opts.bearer,
      headers: { 'id-token': opts.idToken },
    });
  }

  /** Validação de CPF - `/api/kyc/cpf-validate`. */
  cpfValidate(cpf: string): Promise<CpfValidateResponse> {
    return this.http.request<CpfValidateResponse>('/api/kyc/cpf-validate', {
      skipAuth: true,
      query: { cpf },
    });
  }

  /** Histórico de propostas/registros do usuário - `/api/kyc/user-data`. */
  userData(): Promise<{ registration: RegistrationType[] }> {
    return this.http.request<{ registration: RegistrationType[] }>(
      '/api/kyc/user-data',
    );
  }
}
