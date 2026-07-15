import { createClientOnlyFn } from "@tanstack/react-start";
import type { IAssetsResponse, ITransaction } from "@particle-network/universal-account-sdk";
import { createUniversalAccount, resolveUniversalAddresses } from "./particle-addresses";
import { PRIMARY_ASSETS } from "./settlement";
import type { PaymentIntent } from "./types";

export type WalletTransferInput = {
  chainId: number;
  tokenAddress: string;
  amount: string;
  receiver: string;
};

export type WalletActivity = {
  id: string;
  status: string;
  createdAt?: string;
  receiver?: string;
  amountInUSD?: number;
  raw: unknown;
};

export type UniversalAccountAddresses = {
  ownerAddress: string;
  evmUaAddress: string;
  solanaUaAddress: string | null;
  mode: "separateSmartAccount" | "eip7702OwnerAddress";
  lookupWarning?: string;
};

export const loadPrimaryAssets = createClientOnlyFn(
  async (ownerAddress: string): Promise<IAssetsResponse> =>
    (await createUniversalAccount(ownerAddress)).getPrimaryAssets(),
);

export const loadUniversalAccountAddresses = createClientOnlyFn(
  async (ownerAddress: string): Promise<UniversalAccountAddresses> =>
    resolveUniversalAddresses(ownerAddress),
);

export const createPaymentQuote = createClientOnlyFn(
  async (ownerAddress: string, intent: PaymentIntent) => {
    const account = await createUniversalAccount(ownerAddress);
    const transaction = await account.createTransferTransaction({
      token: {
        chainId: intent.destination.chainId,
        address: intent.destination.tokenAddress,
      },
      amount: String(intent.amountUsd),
      receiver: intent.destination.address,
    });
    return { account, transaction };
  },
);

export const createWalletTransferQuote = createClientOnlyFn(
  async (ownerAddress: string, input: WalletTransferInput) => {
    const account = await createUniversalAccount(ownerAddress);
    const transaction = await account.createTransferTransaction({
      token: { chainId: input.chainId, address: input.tokenAddress },
      amount: input.amount,
      receiver: input.receiver,
    });
    return { account, transaction };
  },
);

function activityRows(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response.filter((row) => row && typeof row === "object");
  if (!response || typeof response !== "object") return [];
  const record = response as Record<string, unknown>;
  for (const key of ["transactions", "items", "list", "data", "result"]) {
    const nested = record[key];
    const rows = activityRows(nested);
    if (rows.length) return rows;
  }
  return [];
}

function activityValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
}

function normalizeActivity(row: Record<string, unknown>): WalletActivity {
  const id = String(activityValue(row, ["transactionId", "transaction_id", "id"]) ?? "");
  const status = String(activityValue(row, ["status", "state", "transactionStatus"]) ?? "pending");
  const amount = Number(activityValue(row, ["amountInUSD", "amount_in_usd", "totalAmountInUSD"]));
  return {
    id,
    status: status.toLowerCase(),
    createdAt:
      String(activityValue(row, ["createdAt", "created_at", "timestamp"]) ?? "") || undefined,
    receiver: String(activityValue(row, ["receiver", "to", "recipient"]) ?? "") || undefined,
    amountInUSD: Number.isFinite(amount) ? amount : undefined,
    raw: row,
  };
}

export const loadWalletActivity = createClientOnlyFn(async (ownerAddress: string) => {
  const response = await (await createUniversalAccount(ownerAddress)).getTransactions(1, 20);
  return activityRows(response)
    .map(normalizeActivity)
    .filter((row) => row.id);
});

export const loadWalletTransaction = createClientOnlyFn(
  async (ownerAddress: string, transactionId: string) =>
    (await createUniversalAccount(ownerAddress)).getTransaction(transactionId) as Promise<unknown>,
);

export type OnchainTokenBalance = {
  chainId: number;
  chainName: string;
  tokenId: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  ownerAddress: string;
  rawAmount: string;
  amount: number;
  amountInUSD: number;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVM_RPC_ENV_BY_CHAIN_ID: Record<number, string> = {
  1: "VITE_ETHEREUM_RPC_URL",
  56: "VITE_BNB_RPC_URL",
  196: "VITE_XLAYER_RPC_URL",
  8453: "VITE_BASE_RPC_URL",
  42161: "VITE_ARBITRUM_RPC_URL",
};
const PUBLIC_RPC_BY_CHAIN_ID: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  56: "https://bsc-dataseed.binance.org",
  196: "https://rpc.xlayer.tech",
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
};

function evmAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("A valid EVM address is required.");
  }
  return normalized;
}

function encodeBalanceOf(address: string) {
  return `0x70a08231${address.slice(2).padStart(64, "0")}`;
}

function rpcUrlFor(chainId: number) {
  const envName = EVM_RPC_ENV_BY_CHAIN_ID[chainId];
  return (
    (envName ? (import.meta.env[envName] as string | undefined)?.trim() : "") ||
    PUBLIC_RPC_BY_CHAIN_ID[chainId]
  );
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC request failed with ${response.status}.`);
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || "RPC request failed.");
  if (payload.result === undefined) throw new Error("RPC request returned no result.");
  return payload.result;
}

function formatUnits(raw: bigint, decimals: number) {
  return Number(raw) / 10 ** decimals;
}

export const loadEvmOnchainBalances = createClientOnlyFn(
  async (ownerAddress: string): Promise<OnchainTokenBalance[]> => {
    const address = evmAddress(ownerAddress);
    const evmAssets = PRIMARY_ASSETS.filter((asset) => asset.networkType === "evm");
    const results = await Promise.allSettled(
      evmAssets.map(async (asset) => {
        const rpcUrl = rpcUrlFor(asset.chainId);
        if (!rpcUrl) throw new Error(`No RPC URL configured for ${asset.chainName}.`);
        const rawHex =
          asset.tokenAddress.toLowerCase() === ZERO_ADDRESS
            ? await rpcCall<string>(rpcUrl, "eth_getBalance", [address, "latest"])
            : await rpcCall<string>(rpcUrl, "eth_call", [
                { to: asset.tokenAddress, data: encodeBalanceOf(address) },
                "latest",
              ]);
        const raw = BigInt(rawHex || "0x0");
        const amount = formatUnits(raw, asset.tokenDecimals);
        return {
          chainId: asset.chainId,
          chainName: asset.chainName,
          tokenId: asset.tokenId,
          tokenSymbol: asset.tokenSymbol,
          tokenAddress: asset.tokenAddress,
          tokenDecimals: asset.tokenDecimals,
          ownerAddress: address,
          rawAmount: raw.toString(),
          amount,
          amountInUSD: asset.tokenId === "usdc" || asset.tokenId === "usdt" ? amount : 0,
        };
      }),
    );
    return results
      .flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
      .filter((balance) => balance.amount > 0);
  },
);
