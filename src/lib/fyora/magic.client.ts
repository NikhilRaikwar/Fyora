import { EVMExtension } from "@magic-ext/evm";
import { OAuthExtension } from "@magic-ext/oauth2";
import { SolanaExtension } from "@magic-ext/solana";
import { Magic } from "magic-sdk";
import type { MagicIdentity } from "./types";

function env(name: string) {
  return (import.meta.env[name] as string | undefined)?.trim();
}

function createMagicClient() {
  const apiKey = env("VITE_MAGIC_PUBLISHABLE_KEY");
  if (!apiKey) throw new Error("Magic publishable key is missing.");
  return new Magic(apiKey, {
    extensions: [
      new OAuthExtension(),
      new EVMExtension([
        {
          chainId: 1,
          rpcUrl: env("VITE_ETHEREUM_RPC_URL") ?? "https://ethereum-rpc.publicnode.com",
          default: true,
        },
        { chainId: 56, rpcUrl: env("VITE_BNB_RPC_URL") ?? "https://bsc-rpc.publicnode.com" },
        { chainId: 8453, rpcUrl: env("VITE_BASE_RPC_URL") ?? "https://mainnet.base.org" },
        { chainId: 42161, rpcUrl: env("VITE_ARBITRUM_RPC_URL") ?? "https://arb1.arbitrum.io/rpc" },
        { chainId: 196, rpcUrl: env("VITE_XLAYER_RPC_URL") ?? "https://rpc.xlayer.tech" },
      ]),
      new SolanaExtension({
        rpcUrl: env("VITE_SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com",
      }),
    ],
  });
}

let magic: ReturnType<typeof createMagicClient> | null = null;

export function getMagicClient() {
  magic ??= createMagicClient();
  return magic;
}

export async function getCurrentMagicIdentity(didToken?: string): Promise<MagicIdentity> {
  const client = getMagicClient();
  const token = didToken ?? (await client.user.generateIdToken());
  const info = await client.user.getInfo();
  const evmAddress = info.wallets?.ethereum?.publicAddress;
  if (!info.issuer || !evmAddress) throw new Error("Magic did not return an EVM wallet.");
  let solanaAddress = info.wallets?.solana?.publicAddress ?? null;
  if (!solanaAddress) {
    try {
      solanaAddress = await client.solana.getPublicAddress();
    } catch {
      solanaAddress = null;
    }
  }
  return {
    didToken: token,
    issuer: info.issuer,
    email: info.email ?? null,
    evmAddress: evmAddress.toLowerCase(),
    solanaAddress,
  };
}

export async function loginWithEmailOtp(email: string) {
  const didToken = await getMagicClient().auth.loginWithEmailOTP({ email, showUI: true });
  if (!didToken) throw new Error("Magic sign-in was cancelled.");
  return getCurrentMagicIdentity(didToken);
}

export async function loginWithGoogle() {
  const redirectURI =
    env("VITE_MAGIC_GOOGLE_REDIRECT_URL") ?? `${window.location.origin}/auth/callback`;
  await getMagicClient().oauth2.loginWithRedirect({
    provider: "google",
    redirectURI,
  });
}

export async function completeGoogleLogin() {
  const result = await getMagicClient().oauth2.getRedirectResult();
  return getCurrentMagicIdentity(result.magic.idToken);
}

export async function restoreMagicIdentity() {
  const client = getMagicClient();
  return (await client.user.isLoggedIn()) ? getCurrentMagicIdentity() : null;
}

export async function logoutMagic() {
  const client = getMagicClient();
  if (await client.user.isLoggedIn()) await client.user.logout();
}
