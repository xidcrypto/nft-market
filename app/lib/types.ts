import type { BigNumberish } from "ethers";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  provider: any | null;
  signer: any | null;
}

export interface MintStatus {
  totalMinted: number;
  hasMinted: boolean;
  agentIdBalance: number;
  challenge: string | null;
  nonceFound: number | null;
  isMining: boolean;
  miningProgress: number;
  mintedTokenId: number | null;
  mintedTier: number | null;
}

export interface Listing {
  tokenId: number;
  seller: string;
  price: string;
  active: boolean;
  tier: number;
}

export interface TransactionPreview {
  to: string;
  value: string;
  gasLimit: string;
  data?: string;
  description: string;
}

export interface TierInfo {
  name: string;
  power: number;
  item: string;
  rarity: number;
  color: string;
  image: string;
}

export type LogLevel = "info" | "success" | "error" | "warning";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}