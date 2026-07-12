import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { MagicIdentity } from "./types";

const getClientApi = createClientOnlyFn(() => import("./magic.client"));

type MagicContextValue = {
  identity: MagicIdentity | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<MagicIdentity>;
  signInWithGoogle: () => Promise<void>;
  finishGoogleSignIn: () => Promise<MagicIdentity>;
  refreshIdentity: () => Promise<MagicIdentity>;
  signOut: () => Promise<void>;
};

const MagicContext = createContext<MagicContextValue | null>(null);

export function MagicProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<MagicIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getClientApi()
      .then((api) => api.restoreMagicIdentity())
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
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const next = await (await getClientApi()).loginWithEmailOtp(email);
    setIdentity(next);
    return next;
  }, []);

  const finishGoogleSignIn = useCallback(async () => {
    const next = await (await getClientApi()).completeGoogleLogin();
    setIdentity(next);
    return next;
  }, []);

  const refreshIdentity = useCallback(async () => {
    const next = await (await getClientApi()).getCurrentMagicIdentity();
    setIdentity(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await (await getClientApi()).logoutMagic();
    } catch (error) {
      console.error("Magic logout failed:", error);
    }
    setIdentity(null);
  }, []);

  const value = useMemo(
    () => ({
      identity,
      loading,
      signInWithEmail,
      signInWithGoogle: async () => (await getClientApi()).loginWithGoogle(),
      finishGoogleSignIn,
      refreshIdentity,
      signOut,
    }),
    [finishGoogleSignIn, identity, loading, refreshIdentity, signInWithEmail, signOut],
  );

  return <MagicContext.Provider value={value}>{children}</MagicContext.Provider>;
}

export function useMagic() {
  const value = useContext(MagicContext);
  if (!value) throw new Error("useMagic must be used inside MagicProvider.");
  return value;
}
