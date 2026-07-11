import { createClientOnlyFn } from "@tanstack/react-start";
import type {
  EIP7702Authorization,
  IAssetsResponse,
  ITransaction,
  UniversalAccount,
} from "@particle-network/universal-account-sdk";
import type { PaymentIntent } from "./types";

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

async function createAccount(ownerAddress: string) {
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
      ownerAddress,
    },
    tradeConfig: { slippageBps: 100 },
  });
}

export const loadPrimaryAssets = createClientOnlyFn(
  async (ownerAddress: string): Promise<IAssetsResponse> =>
    (await createAccount(ownerAddress)).getPrimaryAssets(),
);

export const createPaymentQuote = createClientOnlyFn(
  async (ownerAddress: string, intent: PaymentIntent) => {
    const account = await createAccount(ownerAddress);
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

type Magic7702Wallet = {
  sign7702Authorization(input: {
    contractAddress: string;
    chainId: number;
    nonce?: number;
  }): Promise<{ r: string; s: string; v: number }>;
};

export const sendPaymentQuote = createClientOnlyFn(
  async (account: UniversalAccount, transaction: ITransaction) => {
    const [{ BrowserProvider, Signature, getBytes }, { getMagicClient }] = await Promise.all([
      import("ethers"),
      import("./magic.client"),
    ]);
    const magic = getMagicClient();
    const wallet = magic.wallet as unknown as Magic7702Wallet;
    const authorizations: EIP7702Authorization[] = [];
    const signatures = new Map<string, string>();

    for (const operation of transaction.userOps) {
      const authorization = operation.eip7702Auth;
      if (!authorization || operation.eip7702Delegated) continue;
      const key = `${authorization.chainId}:${authorization.address.toLowerCase()}:${authorization.nonce}`;
      let serialized = signatures.get(key);
      if (!serialized) {
        const signed = await wallet.sign7702Authorization({
          contractAddress: authorization.address,
          chainId: authorization.chainId || operation.chainId,
          nonce: authorization.nonce,
        });
        serialized = Signature.from(signed).serialized;
        signatures.set(key, serialized);
      }
      authorizations.push({ userOpHash: operation.userOpHash, signature: serialized });
    }

    const provider = new BrowserProvider(magic.rpcProvider);
    const signer = await provider.getSigner();
    const rootSignature = await signer.signMessage(getBytes(transaction.rootHash));
    return account.sendTransaction(
      transaction,
      rootSignature,
      authorizations.length ? authorizations : undefined,
    ) as Promise<{ transactionId: string }>;
  },
);
