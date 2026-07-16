import { Magic, WalletType, type MagicUserMetadata } from "@magic-sdk/admin";
import type { FyoraIdentity } from "./types";

let magicPromise: Promise<Awaited<ReturnType<typeof Magic.init>>> | null = null;

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function getMagicAdmin() {
  magicPromise ??= Magic.init(env("MAGIC_SECRET_KEY"));
  return magicPromise;
}

function walletAddress(metadata: MagicUserMetadata, walletType: WalletType) {
  const wallet = metadata.wallets?.find((entry) => entry.walletType === walletType);
  return wallet?.publicAddress?.trim() ?? null;
}

export async function verifyFyoraIdentity(didToken: string): Promise<FyoraIdentity> {
  const magic = await getMagicAdmin();
  try {
    magic.token.validate(didToken);
  } catch {
    throw new Error("Invalid Magic session.");
  }

  const [metadata, solanaMetadata] = await Promise.all([
    magic.users.getMetadataByTokenAndWallet(didToken, WalletType.ETH),
    magic.users
      .getMetadataByTokenAndWallet(didToken, WalletType.SOLANA)
      .catch(() => null as MagicUserMetadata | null),
  ]);
  const evmAddress =
    walletAddress(metadata, WalletType.ETH) ?? metadata.publicAddress?.trim().toLowerCase();
  if (!evmAddress || !/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
    throw new Error("Magic EVM wallet is unavailable.");
  }

  return {
    didToken,
    issuer: metadata.issuer ?? magic.token.getIssuer(didToken),
    email: metadata.email?.trim().toLowerCase() ?? null,
    evmAddress: evmAddress.toLowerCase(),
    solanaAddress: solanaMetadata ? walletAddress(solanaMetadata, WalletType.SOLANA) : null,
  };
}
