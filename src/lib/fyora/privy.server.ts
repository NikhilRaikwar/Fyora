import { PrivyClient } from "@privy-io/node";
import type { FyoraIdentity } from "./types";

let client: PrivyClient | null = null;

function getPrivyClient() {
  const appId = process.env.VITE_PRIVY_APP_ID || "cmrjpk5nm00490cl2w5go8pq4";
  const appSecret = process.env.PRIVY_APP_SECRET;
  const jwtVerificationKey = process.env.PRIVY_VERIFICATION_KEY;
  if (!appSecret || !jwtVerificationKey) {
    throw new Error("Privy server configuration is missing.");
  }
  client ??= new PrivyClient({ appId, appSecret, jwtVerificationKey });
  return client;
}

type PrivyUser = Awaited<ReturnType<ReturnType<PrivyClient["users"]>["_get"]>>;

type WalletLike = {
  address?: string | null;
  type?: string | null;
  chain_type?: string | null;
  chainType?: string | null;
  connector_type?: string | null;
  connectorType?: string | null;
  wallet_client?: string | null;
  walletClient?: string | null;
  wallet_client_type?: string | null;
  walletClientType?: string | null;
};

type PrivyUserWithWallets = PrivyUser & {
  linked_accounts?: WalletLike[];
  linkedAccounts?: WalletLike[];
  wallet?: WalletLike | null;
};

function emailFromUser(user: PrivyUser) {
  return user.email?.address ?? user.google?.email ?? null;
}

function isEmbeddedEthereumWallet(account: WalletLike) {
  const chainType = account.chain_type ?? account.chainType;
  const connectorType = account.connector_type ?? account.connectorType;
  const walletClient = account.wallet_client ?? account.walletClient;
  const walletClientType = account.wallet_client_type ?? account.walletClientType;
  return (
    account.type === "wallet" &&
    chainType === "ethereum" &&
    (connectorType === "embedded" ||
      walletClient === "privy" ||
      walletClientType === "privy" ||
      walletClientType === "privy-v2")
  );
}

function embeddedEvmAddress(user: PrivyUser) {
  const userWithWallets = user as unknown as PrivyUserWithWallets;
  const linkedAccounts = [
    ...(userWithWallets.linked_accounts ?? []),
    ...(userWithWallets.linkedAccounts ?? []),
  ];
  const wallet = linkedAccounts.find(isEmbeddedEthereumWallet) ?? userWithWallets.wallet;
  if (!wallet?.address) throw new Error("Privy embedded EVM wallet is unavailable.");
  return wallet.address.toLowerCase();
}

export async function verifyFyoraIdentity(didToken: string): Promise<FyoraIdentity> {
  const privy = getPrivyClient();
  const verified = await privy.utils().auth().verifyAccessToken(didToken);
  const user = await privy.users()._get(verified.user_id);
  return {
    didToken,
    issuer: verified.user_id,
    email: emailFromUser(user),
    evmAddress: embeddedEvmAddress(user),
    solanaAddress: null,
  };
}
