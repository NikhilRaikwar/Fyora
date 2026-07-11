import { Magic } from "@magic-sdk/admin";
import type { MagicIdentity } from "./types";

let admin: Awaited<ReturnType<typeof Magic.init>> | undefined;

async function getMagicAdmin() {
  const secretKey = process.env.MAGIC_SECRET_KEY;
  if (!secretKey) throw new Error("Magic server configuration is missing.");
  admin ??= await Magic.init(secretKey);
  return admin;
}

function readSolanaAddress(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const data = metadata as Record<string, unknown>;
  const wallets = data.wallets;
  if (wallets && typeof wallets === "object" && !Array.isArray(wallets)) {
    const solana = (wallets as Record<string, unknown>).solana;
    if (solana && typeof solana === "object") {
      const address = (solana as Record<string, unknown>).publicAddress;
      return typeof address === "string" ? address : null;
    }
  }
  if (Array.isArray(wallets)) {
    const wallet = wallets.find((item) => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return (
        String(value.blockchain ?? value.chain ?? value.walletType ?? "").toLowerCase() === "solana"
      );
    }) as Record<string, unknown> | undefined;
    const address = wallet?.publicAddress ?? wallet?.public_address;
    return typeof address === "string" ? address : null;
  }
  return null;
}

export async function verifyMagicIdentity(didToken: string): Promise<MagicIdentity> {
  const magic = await getMagicAdmin();
  await magic.token.validate(didToken);
  const issuer = magic.token.getIssuer(didToken);
  const evmAddress = magic.token.getPublicAddress(didToken).toLowerCase();
  const response = await magic.users.getMetadataByToken(didToken);
  const metadata = response as unknown;
  const record =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return {
    didToken,
    issuer,
    email: typeof record.email === "string" ? record.email : null,
    evmAddress,
    solanaAddress: readSolanaAddress(metadata),
  };
}
