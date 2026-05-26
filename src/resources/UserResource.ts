import { type HttpClient } from '../http/HttpClient';
import { type UserSession } from '../types/kyc';

/** Sessão do usuário atual. */
export class UserResource {
  constructor(private readonly http: HttpClient) {}

  /** Sessão atual (auth + wallet + KYC) — `/api/me`. */
  me(
    params: {
      loginProvider?: 'login-email' | 'login-wallet';
      idToken?: string;
    } = {},
  ): Promise<UserSession> {
    return this.http.request<UserSession>('/api/me', {
      headers: {
        'login-provider': params.loginProvider,
        'id-token': params.idToken,
      },
    });
  }
}
