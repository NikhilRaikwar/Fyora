import { installBrowserPolyfills } from "./browser-polyfills";
import type { UniversalAuthorization, UniversalTransaction } from "./particle-types";

type UniversalAccountClient = {
  createTransferTransaction: (input: {
    token: { chainId: number; address: string };
    amount: string;
    receiver: string;
  }) => Promise<UniversalTransaction>;
  createUniversalTransaction: (input: {
    chainId: number;
    expectTokens: Array<{ type: unknown; amount: string }>;
    transactions: Array<{ to: string; data: string; value?: string }>;
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
  tokenType?: string;
  tokenDecimals?: number;
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
    const { SUPPORTED_TOKEN_TYPE, UniversalAccount, UNIVERSAL_ACCOUNT_VERSION } =
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
        usePrimaryTokens: [SUPPORTED_TOKEN_TYPE.USDC],
      },
    }) as UniversalAccountClient;
  })();

  accountCache.set(owner, accountPromise);
  return accountPromise;
}

export async function createBrowserTransferTransaction(ownerAddress: string, input: TransferInput) {
  const account = await getBrowserUniversalAccount(ownerAddress);
  try {
    return await account.createTransferTransaction({
      token: {
        chainId: input.chainId,
        address: input.tokenAddress,
      },
      amount: input.amount,
      receiver: input.receiver,
    });
  } catch (error) {
    if (!/insufficient primary token balance/i.test(error instanceof Error ? error.message : "")) {
      throw error;
    }

    const tokenType = input.tokenType?.toLowerCase();
    if (tokenType !== "usdc" && tokenType !== "usdt") throw error;

    const { Interface, parseUnits } = await import("ethers");
    const { SUPPORTED_TOKEN_TYPE } = await import("@particle-network/universal-account-sdk");
    const supportedTokenType =
      tokenType === "usdc" ? SUPPORTED_TOKEN_TYPE.USDC : SUPPORTED_TOKEN_TYPE.USDT;
    const decimals = input.tokenDecimals ?? 6;
    const erc20 = new Interface(["function transfer(address to,uint256 value)"]);

    console.error("[Fyora] Falling back to Particle universal payout transaction", {
      chainId: input.chainId,
      tokenType,
      tokenAddress: input.tokenAddress,
      amount: input.amount,
      receiver: input.receiver,
    });

    return account.createUniversalTransaction({
      chainId: input.chainId,
      expectTokens: [{ type: supportedTokenType, amount: input.amount }],
      transactions: [
        {
          to: input.tokenAddress,
          data: erc20.encodeFunctionData("transfer", [
            input.receiver,
            parseUnits(input.amount, decimals),
          ]),
        },
      ],
    });
  }
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
