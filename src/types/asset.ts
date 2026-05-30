// Tipos de ativos espelhados de @pagfinance/core (puros, sem dependências).

export type TokenVariant =
  | 'spl'
  | 'spl-2022'
  | 'trc20'
  | 'erc20'
  | 'erc721'
  | 'erc1155'
  | 'wrapped-native'
  | 'xc20'
  | 'issued'
  | 'xrpl-iou'
  | 'xrpl-nft'
  | 'credit_alphanum4'
  | 'credit_alphanum12'
  | 'cw20'
  | 'cw721'
  | 'cosmos-bank'
  | 'nep-141'
  | 'nep-171'
  | 'move-coin'
  | 'move-object'
  | 'native'
  | 'unknown';

export interface AssetMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  twitter: string;
}

export interface AssetType {
  id: number;
  symbol: string;
  name: string;
  icon: string;
  address: string;
  decimals: number;
  order: number;
  status: boolean;
  wrappedKey?: string | null;
  chainName: string;
  oracleId?: string | null;
  coinGeckoId: string;
  tokenVariant?: TokenVariant | null;
  chainId?: number | null;
  price?: number | null;
  color?: string | null;
  fixedRate?: number | null;
  metadataUri?: string | null;
  metadata?: AssetMetadata | null;
}

export interface AssetFee {
  chainId: number;
  assetSymbol: string;
  assetAddress: string;
  discountRate?: number | null;
  increaseRate?: number | null;
  fixedRate?: number | null;
}

export interface BlockchainType {
  id: number;
  evmChainId?: number;
  name: string;
  symbol: string;
  icon: string;
  explorer: string;
  status?: boolean;
  assets: AssetType[];
  key?: string;
  family?: string;
  order: number;
}

export interface GatewayConfigType {
  chains: BlockchainType[];
}

export interface AssetPrice {
  assetId: string | number;
  fiatCurrency: string;
  price: number;
  [key: string]: unknown;
}
