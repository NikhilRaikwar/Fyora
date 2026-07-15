import { ClientOnly } from "@tanstack/react-router";
import { createContext, lazy, Suspense, useContext, useMemo, type ReactNode } from "react";
import type { FyoraIdentity } from "./types";

const ParticleAuthProvider = lazy(async () => {
  const { installBrowserPolyfills } = await import("./browser-polyfills");
  installBrowserPolyfills();
  return import("./AuthProvider.client");
});

export type AuthContextValue = {
  identity: FyoraIdentity | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  refreshIdentity: () => Promise<FyoraIdentity>;
  signOut: () => Promise<void>;
  openWallet: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function createFallbackValue(): AuthContextValue {
  const unavailable = async () => {
    throw new Error("Particle Auth is loading. Try again in a moment.");
  };

  return {
    identity: null,
    loading: true,
    signInWithEmail: unavailable,
    refreshIdentity: unavailable,
    signOut: unavailable,
    openWallet: unavailable,
  };
}

function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => createFallbackValue(), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function FyoraAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<FallbackAuthProvider>{children}</FallbackAuthProvider>}>
      <Suspense fallback={<FallbackAuthProvider>{children}</FallbackAuthProvider>}>
        <ParticleAuthProvider>{children}</ParticleAuthProvider>
      </Suspense>
    </ClientOnly>
  );
}

export function useFyoraAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useFyoraAuth must be used inside FyoraAuthProvider.");
  return value;
}
