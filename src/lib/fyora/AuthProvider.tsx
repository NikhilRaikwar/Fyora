import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PrivyProvider,
  useCreateWallet,
  usePrivy,
  useWallets,
  type User,
} from "@privy-io/react-auth";
import type { FyoraIdentity } from "./types";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "cmrjpk5nm00490cl2w5go8pq4";

type AuthContextValue = {
  identity: FyoraIdentity | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshIdentity: () => Promise<FyoraIdentity>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPrivyEmbeddedWallet(wallet: { type: string; walletClientType: string }) {
  return (
    wallet.type === "ethereum" &&
    (wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2")
  );
}

function emailFor(user: User) {
  return user.email?.address ?? user.google?.email ?? null;
}

function missingIdentityError() {
  return new Error("Privy embedded wallet is still getting ready. Try again in a moment.");
}

function FyoraAuthProviderInner({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const [identity, setIdentity] = useState<FyoraIdentity | null>(null);
  const creatingWallet = useRef(false);

  const embeddedWallet = useMemo(
    () => (wallets ?? []).find(isPrivyEmbeddedWallet) ?? null,
    [wallets],
  );

  const buildIdentity = useCallback(async (): Promise<FyoraIdentity> => {
    if (!authenticated || !user || !embeddedWallet) throw missingIdentityError();
    const didToken = await getAccessToken();
    if (!didToken) throw new Error("Privy session token is unavailable. Please sign in again.");
    return {
      didToken,
      issuer: user.id,
      email: emailFor(user),
      evmAddress: embeddedWallet.address.toLowerCase(),
      solanaAddress: null,
    };
  }, [authenticated, embeddedWallet, getAccessToken, user]);

  useEffect(() => {
    if (
      !ready ||
      !authenticated ||
      !user ||
      !walletsReady ||
      embeddedWallet ||
      creatingWallet.current
    ) {
      return;
    }
    creatingWallet.current = true;
    createWallet()
      .catch((error) => {
        console.error("Privy embedded wallet creation failed:", error);
      })
      .finally(() => {
        creatingWallet.current = false;
      });
  }, [authenticated, createWallet, embeddedWallet, ready, user, walletsReady]);

  useEffect(() => {
    let active = true;
    if (!ready || !authenticated || !user) {
      setIdentity(null);
      return;
    }
    if (!embeddedWallet) return;
    buildIdentity()
      .then((next) => {
        if (active) setIdentity(next);
      })
      .catch((error) => {
        console.error("Privy identity refresh failed:", error);
        if (active) setIdentity(null);
      });
    return () => {
      active = false;
    };
  }, [authenticated, buildIdentity, embeddedWallet, ready, user]);

  const refreshIdentity = useCallback(async () => {
    const next = await buildIdentity();
    setIdentity(next);
    return next;
  }, [buildIdentity]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      login({
        loginMethods: ["email", "google"],
        prefill: email ? { type: "email", value: email } : undefined,
      });
    },
    [login],
  );

  const signInWithGoogle = useCallback(async () => {
    login({ loginMethods: ["google", "email"] });
  }, [login]);

  const signOut = useCallback(async () => {
    await logout();
    setIdentity(null);
  }, [logout]);

  const value = useMemo(
    () => ({
      identity,
      loading: !ready || (authenticated && !identity),
      signInWithEmail,
      signInWithGoogle,
      refreshIdentity,
      signOut,
    }),
    [authenticated, identity, ready, refreshIdentity, signInWithEmail, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function FyoraAuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        appearance: {
          walletChainType: "ethereum-only",
          accentColor: "#C6F24E",
          landingHeader: "Sign in to Fyora",
          loginMessage: "Create your embedded wallet and pay from one Universal Balance.",
        },
      }}
    >
      <FyoraAuthProviderInner>{children}</FyoraAuthProviderInner>
    </PrivyProvider>
  );
}

export function useFyoraAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useFyoraAuth must be used inside FyoraAuthProvider.");
  return value;
}
