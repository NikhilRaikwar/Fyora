import type { SettlementAsset } from "./types";

type ChainMeta = Omit<
  SettlementAsset,
  "tokenId" | "tokenSymbol" | "tokenName" | "tokenEmoji" | "tokenAddress" | "tokenDecimals"
>;

export const CHAIN_IDS = {
  ethereum: 1,
  bsc: 56,
  solana: 101,
  xlayer: 196,
  base: 8453,
  arbitrum: 42161,
} as const;

const CHAIN_META: Record<number, ChainMeta> = {
  [CHAIN_IDS.ethereum]: {
    networkType: "evm",
    chainId: 1,
    chainSlug: "ethereum",
    chainName: "Ethereum",
    chainShort: "ETH",
    chainColor: "#627EEA",
    chainEmoji: "💎",
  },
  [CHAIN_IDS.bsc]: {
    networkType: "evm",
    chainId: 56,
    chainSlug: "bsc",
    chainName: "BNB Chain",
    chainShort: "BNB",
    chainColor: "#F0B90B",
    chainEmoji: "🟡",
  },
  [CHAIN_IDS.base]: {
    networkType: "evm",
    chainId: 8453,
    chainSlug: "base",
    chainName: "Base",
    chainShort: "BASE",
    chainColor: "#0052FF",
    chainEmoji: "🔵",
  },
  [CHAIN_IDS.arbitrum]: {
    networkType: "evm",
    chainId: 42161,
    chainSlug: "arbitrum",
    chainName: "Arbitrum One",
    chainShort: "ARB",
    chainColor: "#28A0F0",
    chainEmoji: "🔷",
  },
  [CHAIN_IDS.xlayer]: {
    networkType: "evm",
    chainId: 196,
    chainSlug: "xlayer",
    chainName: "X Layer",
    chainShort: "XL",
    chainColor: "#111111",
    chainEmoji: "✕",
  },
  [CHAIN_IDS.solana]: {
    networkType: "solana",
    chainId: 101,
    chainSlug: "solana",
    chainName: "Solana",
    chainShort: "SOL",
    chainColor: "#14F195",
    chainEmoji: "☀️",
  },
};

const TOKEN_META: Record<string, { name: string; emoji: string }> = {
  eth: { name: "Ether", emoji: "💎" },
  usdc: { name: "USD Coin", emoji: "💵" },
  usdt: { name: "Tether", emoji: "💰" },
  bnb: { name: "BNB", emoji: "🟡" },
  sol: { name: "Solana", emoji: "☀️" },
};

// Synced with SUPPORTED_PRIMARY_TOKENS in Particle UA SDK 2.0.3.
const PARTICLE_ASSETS = [
  ["eth", 8453, "0x0000000000000000000000000000000000000000", 18],
  ["eth", 1, "0x0000000000000000000000000000000000000000", 18],
  ["eth", 42161, "0x0000000000000000000000000000000000000000", 18],
  ["eth", 56, "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", 18],
  ["usdt", 42161, "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 6],
  ["usdt", 1, "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6],
  ["usdt", 56, "0x55d398326f99059fF775485246999027B3197955", 18],
  ["usdt", 101, "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", 6],
  ["usdc", 8453, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 6],
  ["usdc", 1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6],
  ["usdc", 42161, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 6],
  ["usdc", 56, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 18],
  ["usdc", 101, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 6],
  ["sol", 101, "0x0000000000000000000000000000000000000000", 9],
  ["bnb", 56, "0x0000000000000000000000000000000000000000", 18],
] as const;

export const PRIMARY_ASSETS: SettlementAsset[] = PARTICLE_ASSETS.map(
  ([tokenId, chainId, tokenAddress, tokenDecimals]) => ({
    ...CHAIN_META[chainId],
    tokenId,
    tokenSymbol: tokenId.toUpperCase(),
    tokenName: TOKEN_META[tokenId].name,
    tokenEmoji: TOKEN_META[tokenId].emoji,
    tokenAddress,
    tokenDecimals,
  }),
);

// Fyora amounts are USD-denominated. Stablecoin destinations keep token units aligned with UI amounts.
export const SETTLEMENT_ASSETS = PRIMARY_ASSETS.filter(
  (asset) => asset.tokenId === "usdc" || asset.tokenId === "usdt",
);

export const SETTLEMENT_CHAINS = Object.values(CHAIN_META).filter((chain) =>
  SETTLEMENT_ASSETS.some((asset) => asset.chainId === chain.chainId),
);

export function settlementAssetsForChain(chainId: number) {
  return SETTLEMENT_ASSETS.filter((asset) => asset.chainId === chainId);
}

export function resolveSettlementAsset(chainId: number, tokenAddress: string) {
  return SETTLEMENT_ASSETS.find(
    (asset) =>
      asset.chainId === chainId && asset.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
  );
}

export const DEFAULT_SETTLEMENT =
  SETTLEMENT_ASSETS.find(
    (asset) => asset.chainId === CHAIN_IDS.arbitrum && asset.tokenId === "usdt",
  ) ?? SETTLEMENT_ASSETS[0];

export function chainMetaBySlug(slug: string) {
  return Object.values(CHAIN_META).find((chain) => chain.chainSlug === slug);
}
