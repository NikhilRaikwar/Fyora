import type { ISmartAccountOptions } from "@particle-network/universal-account-sdk";

export type UniversalAddressMode = "separateSmartAccount" | "eip7702OwnerAddress";

export type ResolvedUniversalAddresses = {
  ownerAddress: string;
  evmUaAddress: string;
  solanaUaAddress: string | null;
  mode: UniversalAddressMode;
  lookupWarning?: string;
};

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

export async function createUniversalAccount(ownerAddress: string) {
  const normalizedOwner = ownerAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalizedOwner)) {
    throw new Error("Particle Auth did not return a valid EVM owner address yet.");
  }
  if (typeof window !== "undefined") {
    const { installBrowserPolyfills } = await import("./browser-polyfills");
    installBrowserPolyfills();
  }
  const { UniversalAccount, UNIVERSAL_ACCOUNT_VERSION } =
    await import("@particle-network/universal-account-sdk");
  return new UniversalAccount({
    projectId: env("VITE_PARTICLE_PROJECT_ID"),
    projectClientKey: env("VITE_PARTICLE_CLIENT_KEY"),
    projectAppUuid: env("VITE_PARTICLE_APP_ID"),
    smartAccountOptions: {
      useEIP7702: true,
      name: "UNIVERSAL",
      version: UNIVERSAL_ACCOUNT_VERSION,
      ownerAddress: normalizedOwner,
    },
    tradeConfig: { slippageBps: 100 },
  });
}

export async function resolveUniversalAddresses(
  ownerAddress: string,
): Promise<ResolvedUniversalAddresses> {
  const fallbackOwner = ownerAddress.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(fallbackOwner)) {
    throw new Error("Particle Auth did not return a valid EVM owner address yet.");
  }
  try {
    const options = (await (
      await createUniversalAccount(fallbackOwner)
    ).getSmartAccountOptions()) as ISmartAccountOptions;
    const owner = (options.ownerAddress || fallbackOwner).trim().toLowerCase();
    const smartAccount = options.smartAccountAddress?.trim().toLowerCase();
    return {
      ownerAddress: owner,
      evmUaAddress: smartAccount || owner,
      solanaUaAddress: options.solanaSmartAccountAddress?.trim() || null,
      mode: smartAccount ? "separateSmartAccount" : "eip7702OwnerAddress",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Particle address error";
    console.warn("[Fyora] Falling back to EIP-7702 owner address for Universal receive", {
      ownerAddress: fallbackOwner,
      message,
    });
    return {
      ownerAddress: fallbackOwner,
      evmUaAddress: fallbackOwner,
      solanaUaAddress: null,
      mode: "eip7702OwnerAddress",
      lookupWarning: message,
    };
  }
}
