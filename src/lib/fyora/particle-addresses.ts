import type { ISmartAccountOptions } from "@particle-network/universal-account-sdk";

export type UniversalAddressMode = "separateSmartAccount" | "eip7702OwnerAddress";

export type ResolvedUniversalAddresses = {
  ownerAddress: string;
  evmUaAddress: string;
  solanaUaAddress: string | null;
  mode: UniversalAddressMode;
};

function env(name: string) {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

export async function createUniversalAccount(ownerAddress: string) {
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
      ownerAddress,
    },
    tradeConfig: { slippageBps: 100, universalGas: true },
  });
}

export async function resolveUniversalAddresses(
  ownerAddress: string,
): Promise<ResolvedUniversalAddresses> {
  const options = (await (
    await createUniversalAccount(ownerAddress)
  ).getSmartAccountOptions()) as ISmartAccountOptions;
  const owner = options.ownerAddress || ownerAddress;
  const smartAccount = options.smartAccountAddress?.trim();
  return {
    ownerAddress: owner,
    evmUaAddress: smartAccount || owner,
    solanaUaAddress: options.solanaSmartAccountAddress?.trim() || null,
    mode: smartAccount ? "separateSmartAccount" : "eip7702OwnerAddress",
  };
}
