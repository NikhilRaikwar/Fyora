import type { FyoraIdentity } from "./types";

type ParticleSession = {
  provider: "particle";
  uuid: string;
  token: string;
};

type ParticleWallet = {
  chain_name?: string;
  chainName?: string;
  chain?: string;
  public_address?: string;
  publicAddress?: string;
};

type ParticleUserInfo = {
  uuid?: string;
  token?: string;
  email?: string;
  google_email?: string;
  googleEmail?: string;
  apple_email?: string;
  appleEmail?: string;
  github_email?: string;
  githubEmail?: string;
  discord_email?: string;
  discordEmail?: string;
  wallets?: ParticleWallet[];
};

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function parseSession(didToken: string): ParticleSession {
  try {
    const parsed = JSON.parse(didToken) as Partial<ParticleSession>;
    if (parsed.provider !== "particle" || !parsed.uuid || !parsed.token) {
      throw new Error("Invalid Particle session payload.");
    }
    return {
      provider: "particle",
      uuid: parsed.uuid,
      token: parsed.token,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Particle session payload.") {
      throw error;
    }
    throw new Error("Invalid Particle session payload.");
  }
}

function authHeader() {
  const projectId = env("VITE_PARTICLE_PROJECT_ID");
  const serverKey = env("PARTICLE_SERVER_KEY");
  return `Basic ${Buffer.from(`${projectId}:${serverKey}`).toString("base64")}`;
}

async function getParticleUserInfo(session: ParticleSession) {
  const response = await fetch("https://api.particle.network/server/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "getUserInfo",
      params: [session.uuid, session.token],
    }),
  });

  if (!response.ok) {
    throw new Error(`Particle session verification failed (${response.status}).`);
  }

  const body = (await response.json()) as {
    result?: ParticleUserInfo;
    error?: { message?: string };
  };
  if (body.error) throw new Error(body.error.message || "Particle session verification failed.");
  if (!body.result?.uuid) throw new Error("Particle session verification returned no user.");
  if (body.result.uuid !== session.uuid) throw new Error("Particle session user mismatch.");
  return body.result;
}

function userEmail(user: ParticleUserInfo) {
  return (
    user.email ??
    user.google_email ??
    user.googleEmail ??
    user.apple_email ??
    user.appleEmail ??
    user.github_email ??
    user.githubEmail ??
    user.discord_email ??
    user.discordEmail ??
    null
  );
}

function walletChain(wallet: ParticleWallet) {
  return String(wallet.chain_name ?? wallet.chainName ?? wallet.chain ?? "").toLowerCase();
}

function walletAddress(wallet: ParticleWallet) {
  return String(wallet.public_address ?? wallet.publicAddress ?? "").trim();
}

function evmAddress(user: ParticleUserInfo) {
  const wallet = (user.wallets ?? []).find((entry) => {
    const chain = walletChain(entry);
    const address = walletAddress(entry);
    return address.startsWith("0x") && (!chain || chain.includes("evm") || chain.includes("eth"));
  });
  if (!wallet) throw new Error("Particle EVM wallet is unavailable.");
  return walletAddress(wallet).toLowerCase();
}

function solanaAddress(user: ParticleUserInfo) {
  const wallet = (user.wallets ?? []).find((entry) => walletChain(entry).includes("solana"));
  return wallet ? walletAddress(wallet) || null : null;
}

export async function verifyFyoraIdentity(didToken: string): Promise<FyoraIdentity> {
  const session = parseSession(didToken);
  const user = await getParticleUserInfo(session);
  return {
    didToken,
    issuer: `particle:${session.uuid}`,
    email: userEmail(user),
    evmAddress: evmAddress(user),
    solanaAddress: solanaAddress(user),
  };
}
