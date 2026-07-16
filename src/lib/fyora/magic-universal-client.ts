import { installBrowserPolyfills } from "./browser-polyfills";
import type { UniversalAuthorization, UniversalTransaction } from "./particle-types";

type UniversalAccountClient = {
  createTransferTransaction: (input: {
    token: { chainId: number; address: string };
    amount: string;
    receiver: string;
  }) => Promise<UniversalTransaction>;
  sendTransaction: (
    transaction: UniversalTransaction,
    signature: string,
    authorizations?: UniversalAuthorization[],
  ) => Promise<{ transactionId: string }>;
};

type TransferInput = {
  chainId: number;
  tokenAddress: string;
  amount: string;
  receiver: string;
};

const accountCache = new Map<string, Promise<UniversalAccountClient>>();

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function normalizedOwner(ownerAddress: string) {
  const normalized = ownerAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Magic did not return a valid EVM owner address.");
  }
  return normalized;
}

export async function getBrowserUniversalAccount(ownerAddress: string) {
  const owner = normalizedOwner(ownerAddress);
  const cached = accountCache.get(owner);
  if (cached) return cached;

  const accountPromise = (async () => {
    installBrowserPolyfills();
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
        ownerAddress: owner,
      },
      tradeConfig: {
        slippageBps: 100,
        universalGas: false,
      },
    }) as UniversalAccountClient;
  })();

  accountCache.set(owner, accountPromise);
  return accountPromise;
}

export async function createBrowserTransferTransaction(ownerAddress: string, input: TransferInput) {
  const account = await getBrowserUniversalAccount(ownerAddress);
  return account.createTransferTransaction({
    token: {
      chainId: input.chainId,
      address: input.tokenAddress,
    },
    amount: input.amount,
    receiver: input.receiver,
  });
}

export async function sendBrowserUniversalTransaction(
  ownerAddress: string,
  transaction: UniversalTransaction,
  signature: string,
  authorizations: UniversalAuthorization[],
) {
  const account = await getBrowserUniversalAccount(ownerAddress);
  return account.sendTransaction(
    transaction,
    signature,
    authorizations.length > 0 ? authorizations : undefined,
  );
}
