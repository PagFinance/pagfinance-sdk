// Tipos de KYC / sessão de usuário, espelhados do app (puros).

export type KycProvider = 'email' | 'celcoin' | 'ZKPASSPORT' | 'legacy';
export type KycMethod = 'login' | 'document' | 'proposal';
export type KycLevel = 'KYC-0' | 'KYC-1' | 'KYC-2' | 'KYC-3';
export type KycPersonType = 'PF' | 'PJ';

export interface AddressType {
  postalCode?: string;
  street?: string;
  number?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface RegistrationType {
  id?: string;
  status: string;
  type: KycPersonType;
  socialName?: string;
  fullName?: string;
  documentNumber?: string;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  proposalId?: string;
  clientCode?: string;
  sessionId?: string;
  birthDate?: string;
  email?: string;
  onboardingType?: string | null;
  lastError?: string;
  motherName?: string;
  address?: AddressType | null;
  isPoliticallyExposedPerson?: boolean;
  walletAddress?: string | null;
}

export interface UserType {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  phoneNumber?: string | null;
  referCode?: string | null;
  picture?: string;
  wallet?: unknown | null;
  blockchain?: unknown | null;
}

export interface KYCSession {
  status: string;
  provider?: KycProvider | null;
  method?: KycMethod | null;
}

export interface AuthorizedWallet {
  address: string;
  blockchain: string;
  createdAt: string;
  verified: boolean;
  active: boolean;
}

export interface UserSession {
  isAuthenticated: boolean;
  wallet?: string | null;
  kyc?: KYCSession | null;
  user?: UserType | null;
  registration?: RegistrationType[];
  authorizedWallets?: AuthorizedWallet[];
  isCurrentWalletAuthorized?: boolean;
}

export interface KycCheckResponse {
  ok: boolean;
  action?: string | null;
  hasRegistration?: boolean;
  canOperate?: boolean;
  status: string | null;
  level?: KycLevel;
  provider?: string | null;
  disclosedData?: unknown;
  verifiedAt?: string | null;
}

export interface CpfValidateResponse {
  isValid: boolean;
  status: string;
  hasObitIndication: boolean;
}

// ── Status enums (Celcoin / interno) ──

export enum ProposalStatus {
  CREATED = 'Created',
  PENDING = 'Pending',
  PENDING_DOCUMENTSCOPY = 'Pending_Documentscopy',
  PROCESSING_DOCUMENTSCOPY = 'Processing_Documentscopy',
  REPROVED = 'Reproved',
  RESOURCE_ERROR = 'Resource_error',
  RESOURCE_CREATED = 'Resource_Created',
}

export enum DocumentscopyStatus {
  CREATED = 'Created',
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  REPROVED = 'Reproved',
  APPROVED = 'Approved',
}

export enum InternalProposalStatus {
  RECEIVED = 'RECEIVED',
  SENT_TO_CELCOIN = 'SENT_TO_CELCOIN',
  ERROR_SENDING_TO_CELCOIN = 'ERROR_SENDING_TO_CELCOIN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

const COMPLETE = new Set<string>([
  ProposalStatus.RESOURCE_CREATED,
  DocumentscopyStatus.APPROVED,
  InternalProposalStatus.APPROVED,
  'GREEN',
  'APPROVED',
]);
const REJECTED = new Set<string>([
  ProposalStatus.REPROVED,
  DocumentscopyStatus.REPROVED,
  InternalProposalStatus.REJECTED,
  'REJECTED',
]);

export function isKycComplete(status?: string | null): boolean {
  return !!status && COMPLETE.has(status);
}
export function isKycRejected(status?: string | null): boolean {
  return !!status && REJECTED.has(status);
}
export function isKycPending(status?: string | null): boolean {
  return !!status && !isKycComplete(status) && !isKycRejected(status);
}

// ── Inputs de proposta (PF / PJ) ──

export interface NaturalProposalInput {
  documentNumber: string; // CPF
  fullName: string;
  motherName: string;
  email?: string;
  phoneNumber?: string;
  socialName?: string;
  birthDate?: string;
  address?: AddressType;
  isPoliticallyExposedPerson?: boolean;
  referCode?: string;
  userId?: string;
  onboardingQuickId?: string;
}

export type LegalOwnerType = 'REPRESENTANTE' | 'SOCIO' | 'DEMAIS_SOCIOS';

export interface LegalOwnerInput {
  ownerType: LegalOwnerType;
  documentNumber: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  isPoliticallyExposedPerson?: boolean;
  address?: AddressType;
}

export interface LegalProposalInput {
  documentNumber: string; // CNPJ
  businessName: string;
  tradingName: string;
  contactNumber: string;
  email?: string;
  owner: LegalOwnerInput[];
  userId?: string;
}
