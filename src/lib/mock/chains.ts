export type Chain = {
  id: string;
  name: string;
  short: string;
  color: string; // tailwind bg class OR hex used inline
  emoji: string;
};

export const CHAINS: Chain[] = [
  { id: "arbitrum", name: "Arbitrum One", short: "ARB", color: "#28A0F0", emoji: "🔷" },
  { id: "base", name: "Base", short: "BASE", color: "#0052FF", emoji: "🔵" },
  { id: "optimism", name: "Optimism", short: "OP", color: "#FF0420", emoji: "🔴" },
  { id: "polygon", name: "Polygon", short: "POL", color: "#8247E5", emoji: "🟣" },
  { id: "ethereum", name: "Ethereum", short: "ETH", color: "#627EEA", emoji: "💎" },
  { id: "solana", name: "Solana", short: "SOL", color: "#14F195", emoji: "☀️" },
  { id: "bsc", name: "BNB Chain", short: "BNB", color: "#F0B90B", emoji: "🟡" },
];

export const TOKENS = [
  { id: "usdc", symbol: "USDC", name: "USD Coin", emoji: "💵" },
  { id: "usdt", symbol: "USDT", name: "Tether", emoji: "💰" },
  { id: "eth", symbol: "ETH", name: "Ether", emoji: "💎" },
  { id: "sol", symbol: "SOL", name: "Solana", emoji: "☀️" },
];

export const chainById = (id: string) => CHAINS.find((c) => c.id === id) ?? CHAINS[0];
export const tokenById = (id: string) => TOKENS.find((t) => t.id === id) ?? TOKENS[0];
