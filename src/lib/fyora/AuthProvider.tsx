import { ClientOnly } from "@tanstack/react-router";
import { createContext, lazy, Suspense, useContext, type ReactNode } from "react";
import type { FyoraIdentity } from "./types";

const MagicAuthProvider = lazy(async () => {
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
  signRootHash: (rootHash: string) => Promise<string>;
  signEip7702Authorization: (authorization: {
    address: string;
    chainId: number;
    nonce: number;
  }) => Promise<{ r: string; s: string; v: number; signature?: string }>;
  ensureEip7702Delegated: (ownerAddress: string, chainId?: number) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function FyoraAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <MagicAuthProvider>{children}</MagicAuthProvider>
      </Suspense>
    </ClientOnly>
  );
}

export function useFyoraAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useFyoraAuth must be used inside FyoraAuthProvider.");
  return value;
}
