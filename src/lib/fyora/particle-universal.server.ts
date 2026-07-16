import type { ITransaction } from "@particle-network/universal-account-sdk";
import type { Json, Tables } from "./database.types";
import type { UniversalAuthorization, UniversalTransaction } from "./particle-types";

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function evmAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Magic did not return a valid EVM owner address.");
  }
  return normalized;
}

export async function createUniversalAccountServer(ownerAddress: string) {
  const { UniversalAccount, UNIVERSAL_ACCOUNT_VERSION } =
    await import("@particle-network/universal-account-sdk");
  return new UniversalAccount({
    projectId: env("VITE_PARTICLE_PROJECT_ID"),
    projectClientKey: env("VITE_PARTICLE_CLIENT_KEY"),
    projectAppUuid: env("VITE_PARTICLE_APP_ID"),
    smartAccountOptions: {
      useEIP7702: true,
      name: "UNIVERSAL",
      version: UNIVERSAL_ACCOUNT_VERSION,
      ownerAddress: evmAddress(ownerAddress),
    },
    tradeConfig: { slippageBps: 100, universalGas: false },
  });
}

export async function getServerPrimaryAssets(ownerAddress: string) {
  return (await createUniversalAccountServer(ownerAddress)).getPrimaryAssets();
}

export async function getServerTransaction(
  ownerAddress: string,
  transactionId: string,
): Promise<Json> {
  const account = await createUniversalAccountServer(ownerAddress);
  const result = await account.getTransaction(transactionId);
  return JSON.parse(JSON.stringify(result ?? null)) as Json;
}

export async function getServerTransactions(
  ownerAddress: string,
  page = 1,
  limit = 20,
): Promise<Json> {
  const account = await createUniversalAccountServer(ownerAddress);
  const result = await account.getTransactions(page, limit);
  return JSON.parse(JSON.stringify(result ?? null)) as Json;
}

export async function createPaymentTransferTransaction(
  ownerAddress: string,
  payment: Tables<"payments">,
) {
  const account = await createUniversalAccountServer(ownerAddress);
  return account.createTransferTransaction({
    token: {
      chainId: payment.destination_chain_id,
      address: payment.destination_token_address,
    },
    amount: String(Number(payment.amount_usd)),
    receiver: payment.destination_receiver_address,
  });
}

export async function createWalletTransferTransaction(
  ownerAddress: string,
  input: { chainId: number; tokenAddress: string; amount: string; receiver: string },
) {
  const account = await createUniversalAccountServer(ownerAddress);
  return account.createTransferTransaction({
    token: { chainId: input.chainId, address: input.tokenAddress },
    amount: input.amount,
    receiver: input.receiver,
  });
}

export async function submitUniversalTransaction(
  ownerAddress: string,
  transaction: UniversalTransaction,
  signature: string,
  authorizations: UniversalAuthorization[] = [],
) {
  const account = await createUniversalAccountServer(ownerAddress);
  return account.sendTransaction(transaction as ITransaction, signature, authorizations);
}
