import { PRIMARY_ASSETS, SETTLEMENT_CHAINS } from "./settlement";

export type Chain = {
  id: string;
  chainId: number;
  name: string;
  short: string;
  color: string;
  emoji: string;
};

export const CHAINS: Chain[] = SETTLEMENT_CHAINS.map((chain) => ({
  id: chain.chainSlug,
  chainId: chain.chainId,
  name: chain.chainName,
  short: chain.chainShort,
  color: chain.chainColor,
  emoji: chain.chainEmoji,
}));

export const TOKENS = Array.from(
  new Map(
    PRIMARY_ASSETS.map((token) => [
      token.tokenId,
      {
        id: token.tokenId,
        symbol: token.tokenSymbol,
        name: token.tokenName,
        emoji: token.tokenEmoji,
      },
    ]),
  ).values(),
);

export const chainById = (id: string) =>
  CHAINS.find((chain) => chain.id === id || String(chain.chainId) === id) ?? CHAINS[0];

export const tokenById = (id: string) => TOKENS.find((token) => token.id === id) ?? TOKENS[0];
