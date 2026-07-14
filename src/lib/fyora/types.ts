export type NetworkType = "evm" | "solana";

export type Social = {
  kind: "x" | "github" | "site" | "youtube" | "ig";
  url: string;
};

export type Payment = {
  id: string;
  amountUsd: number;
  supporterName: string;
  supporterEmoji: string;
  fromChain: string;
  fromToken: string;
  note?: string;
  txId: string;
  universalxUrl?: string;
  createdAt: number;
  status: "confirmed" | "pending" | "failed";
};

export type Settlement = {
  networkType: NetworkType;
  chain: string;
  chainId: number;
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  address: string;
};

export type Creator = {
  profileId: string;
  updatedAt: number;
  handle: string;
  name: string;
  bio: string;
  emoji: string;
  avatarUrl: string | null;
  gradient: [string, string];
  socials: Social[];
  settlement: Settlement;
  payments: Payment[];
};

export type FyoraIdentity = {
  didToken: string;
  issuer: string;
  email: string | null;
  evmAddress: string;
  solanaAddress: string | null;
};

export type SettlementAsset = {
  networkType: NetworkType;
  chainId: number;
  chainSlug: string;
  chainName: string;
  chainShort: string;
  chainColor: string;
  chainEmoji: string;
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  tokenEmoji: string;
  tokenAddress: string;
  tokenDecimals: number;
};

export type PaymentIntent = {
  id: string;
  amountUsd: number;
  destination: Settlement;
  status: "created" | "submitted" | "refunding" | "refunded" | "confirmed" | "failed";
  transactionId: string | null;
  universalxUrl: string | null;
};
