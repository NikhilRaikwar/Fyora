import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AuthType, type UserInfo } from "@particle-network/auth-core";
import {
  AuthCoreContextProvider,
  useAuthCore,
  useConnect,
  useEthereum,
} from "@particle-network/authkit";
import { arbitrum, base, bsc, mainnet, solana } from "@particle-network/authkit/chains";
import type { FyoraIdentity } from "./types";

type AuthContextValue = {
  identity: FyoraIdentity | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshIdentity: () => Promise<FyoraIdentity>;
  signOut: () => Promise<void>;
  openWallet: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function emailFor(userInfo: UserInfo) {
  return (
    userInfo.email ??
    userInfo.google_email ??
    userInfo.apple_email ??
    userInfo.github_email ??
    userInfo.discord_email ??
    null
  );
}

function solanaAddressFor(userInfo: UserInfo) {
  return (
    userInfo.wallets.find((wallet) => wallet.chain_name === "solana")?.public_address?.trim() ??
    null
  );
}

function encodeParticleSession(userInfo: UserInfo) {
  return JSON.stringify({
    provider: "particle",
    uuid: userInfo.uuid,
    token: userInfo.token,
  });
}

function missingIdentityError() {
  return new Error("Particle Auth wallet is still getting ready. Try again in a moment.");
}

function FyoraAuthProviderInner({ children }: { children: ReactNode }) {
  const { connect, disconnect, connected, connectionStatus } = useConnect();
  const { userInfo, openWallet: openParticleWallet } = useAuthCore();
  const { address, enable } = useEthereum();
  const [identity, setIdentity] = useState<FyoraIdentity | null>(null);

  const buildIdentity = useCallback(async (): Promise<FyoraIdentity> => {
    if (!connected || !userInfo) throw missingIdentityError();
    const evmAddress = address || (await enable());
    if (!evmAddress) throw missingIdentityError();
    return {
      didToken: encodeParticleSession(userInfo),
      issuer: `particle:${userInfo.uuid}`,
      email: emailFor(userInfo),
      evmAddress: evmAddress.toLowerCase(),
      solanaAddress: solanaAddressFor(userInfo),
    };
  }, [address, connected, enable, userInfo]);

  useEffect(() => {
    let active = true;
    if (!connected || !userInfo) {
      setIdentity(null);
      return;
    }
    buildIdentity()
      .then((next) => {
        if (active) setIdentity(next);
      })
      .catch((error) => {
        console.error("Particle identity refresh failed:", error);
        if (active) setIdentity(null);
      });
    return () => {
      active = false;
    };
  }, [buildIdentity, connected, userInfo]);

  const refreshIdentity = useCallback(async () => {
    const next = await buildIdentity();
    setIdentity(next);
    return next;
  }, [buildIdentity]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      await connect(email ? { email } : undefined);
    },
    [connect],
  );

  const signInWithGoogle = useCallback(async () => {
    await connect({ socialType: "google", prompt: "select_account" });
  }, [connect]);

  const signOut = useCallback(async () => {
    await disconnect();
    setIdentity(null);
  }, [disconnect]);

  const openWallet = useCallback(() => {
    openParticleWallet({ windowSize: "small", topMenuType: "close" });
  }, [openParticleWallet]);

  const value = useMemo(
    () => ({
      identity,
      loading:
        connectionStatus === "loading" ||
        connectionStatus === "connecting" ||
        (connected && !identity),
      signInWithEmail,
      signInWithGoogle,
      refreshIdentity,
      signOut,
      openWallet,
    }),
    [
      connected,
      connectionStatus,
      identity,
      openWallet,
      refreshIdentity,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function FyoraAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthCoreContextProvider
      options={{
        projectId: env("VITE_PARTICLE_PROJECT_ID"),
        clientKey: env("VITE_PARTICLE_CLIENT_KEY"),
        appId: env("VITE_PARTICLE_APP_ID"),
        chains: [base, arbitrum, mainnet, bsc, solana],
        authTypes: [AuthType.email, AuthType.google],
        themeType: "light",
        fiatCoin: "USD",
        language: "en",
        promptSettingConfig: {
          promptPaymentPasswordSettingWhenSign: false,
        },
        customStyle: {
          projectName: "Fyora",
          subtitle: "One login. One Universal Balance.",
          logo: "https://www.fyora.app/fyora-favicon.png",
          primaryBtnBorderRadius: 999,
          modalBorderRadius: 24,
          cardBorderRadius: 18,
          theme: {
            light: {
              accentColor: "#C6F24E",
              primaryBtnBackgroundColor: "#C6F24E",
              primaryBtnColor: "#141313",
              themeBackgroundColor: "#FBF7EE",
              modalBackgroundColor: "#FBF7EE",
              textColor: "#141313",
              secondaryTextColor: "#625F58",
              cardBorderColor: "#141313",
              inputBorderColor: "#141313",
              inputBackgroundColor: "#FFFDF7",
            },
          },
        },
        wallet: {
          visible: false,
          themeType: "light",
        },
      }}
    >
      <FyoraAuthProviderInner>{children}</FyoraAuthProviderInner>
    </AuthCoreContextProvider>
  );
}

export function useFyoraAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useFyoraAuth must be used inside FyoraAuthProvider.");
  return value;
}
