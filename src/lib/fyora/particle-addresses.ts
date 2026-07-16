export type UniversalAddressMode = "separateSmartAccount" | "eip7702OwnerAddress";

export type ResolvedUniversalAddresses = {
  ownerAddress: string;
  evmUaAddress: string;
  solanaUaAddress: string | null;
  mode: UniversalAddressMode;
  lookupWarning?: string;
};

function evmAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Magic did not return a valid EVM owner address yet.");
  }
  return normalized;
}

export async function resolveUniversalAddresses(
  ownerAddress: string,
): Promise<ResolvedUniversalAddresses> {
  const fallbackOwner = evmAddress(ownerAddress);
  return {
    ownerAddress: fallbackOwner,
    evmUaAddress: fallbackOwner,
    solanaUaAddress: null,
    mode: "eip7702OwnerAddress",
    lookupWarning: "Using the Magic EIP-7702 owner address as the Universal receive address.",
  };
}
