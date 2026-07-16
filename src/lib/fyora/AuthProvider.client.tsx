import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { EVMExtension } from "@magic-ext/evm";
import { Magic as MagicBase, type MagicUserMetadata } from "magic-sdk";
import { BrowserProvider, getBytes } from "ethers";
import { AuthContext, type AuthContextValue } from "./AuthProvider";
import { getBaseEip7702DelegationFn } from "./particle-functions";
import type { FyoraIdentity } from "./types";

type MagicClient = MagicBase<[EVMExtension]> & {
  wallet: {
    showUI?: () => Promise<void>;
    sign7702Authorization: (authorization: {
      contractAddress: string;
      chainId: number;
      nonce?: number;
    }) => Promise<{ r: string; s: string; v: number; signature?: string }>;
    send7702Transaction: (transaction: {
      to: string;
      data?: string;
      value?: string;
      authorizationList: Array<{ r: string; s: string; v: number; signature?: string }>;
    }) => Promise<unknown>;
  };
};

const BASE_CHAIN_ID = 8453;
let magicClient: MagicClient | null = null;

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return (import.meta.env[name] as string | undefined)?.trim() || fallback;
}

function getMagicClient() {
  if (!magicClient) {
    magicClient = new MagicBase(env("VITE_MAGIC_PUBLISHABLE_KEY"), {
      extensions: [
        new EVMExtension([
          {
            rpcUrl: optionalEnv("VITE_BASE_RPC_URL", "https://mainnet.base.org"),
            chainId: BASE_CHAIN_ID,
            default: true,
          },
        ]),
      ],
    }) as MagicClient;
  }
  return magicClient;
}

function metadataAddress(metadata: MagicUserMetadata) {
  return metadata.wallets?.ethereum?.publicAddress?.trim().toLowerCase() ?? null;
}

function metadataEmail(metadata: MagicUserMetadata) {
  return metadata.email?.trim().toLowerCase() ?? null;
}

function metadataSolanaAddress(metadata: MagicUserMetadata) {
  return metadata.wallets?.solana?.publicAddress?.trim() ?? null;
}

async function signerAddress(magic: MagicClient) {
  const provider = new BrowserProvider(magic.rpcProvider);
  const signer = await provider.getSigner();
  return (await signer.getAddress()).toLowerCase();
}

function missingIdentityError() {
  return new Error("Magic wallet is still getting ready. Try again in a moment.");
}

function isDelegationResponse(value: unknown): value is {
  delegated: boolean;
  authorization?: { address: string; chainId: number; nonce: number };
} {
  return Boolean(value && typeof value === "object" && "delegated" in value);
}

function FyoraAuthProviderInner({ children }: { children: ReactNode }) {
  const [magic] = useState(() => getMagicClient());
  const [identity, setIdentity] = useState<FyoraIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const buildIdentity = useCallback(async (): Promise<FyoraIdentity> => {
    const loggedIn = await magic.user.isLoggedIn();
    if (!loggedIn) throw missingIdentityError();
    const metadata = await magic.user.getInfo();
    const didToken = await magic.user.getIdToken({ lifespan: 60 * 60 * 24 * 7 });
    const evmAddress = metadataAddress(metadata) ?? (await signerAddress(magic));
    if (!evmAddress) throw missingIdentityError();
    return {
      didToken,
      issuer: metadata.issuer ?? `magic:${evmAddress}`,
      email: metadataEmail(metadata),
      evmAddress,
      solanaAddress: metadataSolanaAddress(metadata),
    };
  }, [magic]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    buildIdentity()
      .then((next) => {
        if (active) setIdentity(next);
      })
      .catch(() => {
        if (active) setIdentity(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildIdentity]);

  const refreshIdentity = useCallback(async () => {
    const next = await buildIdentity();
    setIdentity(next);
    return next;
  }, [buildIdentity]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        await magic.auth.loginWithEmailOTP({ email, showUI: true });
        await refreshIdentity();
      } finally {
        setLoading(false);
      }
    },
    [magic, refreshIdentity],
  );

  const signOut = useCallback(async () => {
    await magic.user.logout();
    setIdentity(null);
  }, [magic]);

  const openWallet = useCallback(async () => {
    if (!magic.wallet.showUI) {
      throw new Error("Magic Wallet UI is not enabled for this app.");
    }
    await magic.wallet.showUI();
  }, [magic]);

  const signRootHash = useCallback(
    async (rootHash: string) => {
      const provider = new BrowserProvider(magic.rpcProvider);
      const signer = await provider.getSigner();
      return signer.signMessage(getBytes(rootHash));
    },
    [magic],
  );

  const signEip7702Authorization = useCallback(
    async (authorization: { address: string; chainId: number; nonce: number }) =>
      magic.wallet.sign7702Authorization({
        contractAddress: authorization.address,
        chainId: authorization.chainId,
        nonce: authorization.nonce,
      }),
    [magic],
  );

  const ensureEip7702Delegated = useCallback(
    async (ownerAddress: string) => {
      const normalizedOwner = ownerAddress.toLowerCase();
      const currentIdentity = identity?.didToken ? identity : await buildIdentity();
      const delegation = await getBaseEip7702DelegationFn({
        data: { didToken: currentIdentity.didToken, ownerAddress: normalizedOwner },
      });
      if (!isDelegationResponse(delegation)) {
        throw new Error("Particle returned an invalid EIP-7702 delegation response.");
      }
      if (delegation.delegated) return;
      const auth = delegation.authorization;
      if (!auth?.address) throw new Error("Particle did not return a Base EIP-7702 auth.");

      await magic.evm.switchChain(BASE_CHAIN_ID);
      const authorization = await magic.wallet.sign7702Authorization({
        contractAddress: auth.address,
        chainId: auth.chainId || BASE_CHAIN_ID,
        nonce: auth.nonce,
      });
      await magic.wallet.send7702Transaction({
        to: normalizedOwner,
        data: "0x",
        authorizationList: [authorization],
      });
    },
    [buildIdentity, identity, magic],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      identity,
      loading,
      signInWithEmail,
      refreshIdentity,
      signOut,
      openWallet,
      signRootHash,
      signEip7702Authorization,
      ensureEip7702Delegated,
    }),
    [
      ensureEip7702Delegated,
      identity,
      loading,
      openWallet,
      refreshIdentity,
      signEip7702Authorization,
      signInWithEmail,
      signOut,
      signRootHash,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function MagicAuthProvider({ children }: { children: ReactNode }) {
  return <FyoraAuthProviderInner>{children}</FyoraAuthProviderInner>;
}
