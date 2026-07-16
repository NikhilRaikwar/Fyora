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

function evmAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Magic did not return a valid EVM owner address yet.");
  }
  return normalized;
}

export async function createUniversalAccount(ownerAddress: string) {
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
      ownerAddress: evmAddress(ownerAddress),
    },
    tradeConfig: { slippageBps: 100, universalGas: true },
  });
}

export async function resolveUniversalAddresses(
  ownerAddress: string,
): Promise<ResolvedUniversalAddresses> {
  const fallbackOwner = evmAddress(ownerAddress);
  try {
    const options = await (await createUniversalAccount(fallbackOwner)).getSmartAccountOptions();
    const smartAccountAddress = String(options.smartAccountAddress ?? "")
      .trim()
      .toLowerCase();
    return {
      ownerAddress: fallbackOwner,
      evmUaAddress: /^0x[a-f0-9]{40}$/.test(smartAccountAddress)
        ? smartAccountAddress
        : fallbackOwner,
      solanaUaAddress: options.solanaSmartAccountAddress ?? null,
      mode: /^0x[a-f0-9]{40}$/.test(smartAccountAddress)
        ? "separateSmartAccount"
        : "eip7702OwnerAddress",
      lookupWarning: /^0x[a-f0-9]{40}$/.test(smartAccountAddress)
        ? undefined
        : "Using the Magic EIP-7702 owner address as the Universal receive address.",
    };
  } catch (error) {
    console.warn("[Fyora] Falling back to EIP-7702 owner address for Universal receive", {
      ownerAddress: fallbackOwner,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return {
    ownerAddress: fallbackOwner,
    evmUaAddress: fallbackOwner,
    solanaUaAddress: null,
    mode: "eip7702OwnerAddress",
    lookupWarning: "Using the Magic EIP-7702 owner address as the Universal receive address.",
  };
}
