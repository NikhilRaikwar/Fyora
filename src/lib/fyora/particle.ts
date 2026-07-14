import { createClientOnlyFn } from "@tanstack/react-start";
import type { IAssetsResponse, ITransaction } from "@particle-network/universal-account-sdk";
import { createUniversalAccount, resolveUniversalAddresses } from "./particle-addresses";
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
