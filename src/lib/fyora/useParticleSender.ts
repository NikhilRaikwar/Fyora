import { useCallback, useRef } from "react";
import { useEthereum } from "@particle-network/authkit";
import type { ITransaction, UniversalAccount } from "@particle-network/universal-account-sdk";

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function errorRecord(error: unknown) {
  return error && typeof error === "object" ? (error as Record<string, unknown>) : {};
}

function particleError(error: unknown, context: Record<string, unknown>) {
  const record = errorRecord(error);
  const message = error instanceof Error ? error.message : String(error || "Particle send failed.");
  const code = record.code;
  const data = record.data;
  console.error("[Fyora] Particle send failed", { message, code, data, ...context });
  if (data || code) {
    return new Error(
      `${message}${code ? ` (code ${String(code)})` : ""}${
        data ? ` - ${typeof data === "string" ? data : JSON.stringify(data)}` : ""
      }`,
    );
  }
  return error instanceof Error ? error : new Error(message);
}

function hasUnsupportedAuthorization(transaction: ITransaction) {
  return transaction.userOps.some(
    (operation) => operation.eip7702Auth && !operation.eip7702Delegated,
  );
}

export function useParticleSender() {
  const { address, signMessage } = useEthereum();
  const sendInFlight = useRef(false);

  const sendPaymentQuote = useCallback(
    async (account: UniversalAccount, transaction: ITransaction) => {
      if (!address) {
        throw new Error("Particle Auth wallet is not ready yet.");
      }
      if (sendInFlight.current) {
        throw new Error("This transfer is already waiting for confirmation.");
      }

      sendInFlight.current = true;
      try {
        const signerAddress = address.toLowerCase();
        const ownerAddress =
          transaction.smartAccountOptions?.ownerAddress?.toLowerCase() ?? signerAddress;
        if (!sameAddress(signerAddress, ownerAddress)) {
          throw new Error(
            `Particle Auth is signed in as ${signerAddress}, but this quote belongs to ${ownerAddress}. Refresh and rebuild the quote.`,
          );
        }

        if (hasUnsupportedAuthorization(transaction)) {
          throw new Error(
            "Particle returned an EIP-7702 authorization step that this browser signer cannot complete yet. Refresh the quote, then try again after the Particle wallet is fully initialized.",
          );
        }

        const { getBytes, verifyMessage } = await import("ethers");
        const rootSignature = await signMessage(transaction.rootHash);
        const recoveredRootAddress = verifyMessage(
          getBytes(transaction.rootHash),
          rootSignature,
        ).toLowerCase();
        if (!sameAddress(recoveredRootAddress, ownerAddress)) {
          throw new Error(
            `Particle signature recovered ${recoveredRootAddress}, but the Universal Account owner is ${ownerAddress}. Refresh and rebuild the quote.`,
          );
        }

        try {
          return (await account.sendTransaction(transaction, rootSignature)) as {
            transactionId: string;
          };
        } catch (error) {
          throw particleError(error, {
            signerProvider: "particle-auth",
            ownerAddress,
            signerAddress,
            recoveredRootAddress,
            userOps: transaction.userOps.map((operation) => ({
              chainId: operation.chainId,
              userOpHash: operation.userOpHash,
              delegated: operation.eip7702Delegated,
              hasAuthorization: Boolean(operation.eip7702Auth),
            })),
          });
        }
      } finally {
        sendInFlight.current = false;
      }
    },
    [address, signMessage],
  );

  return {
    embeddedWallet: address ? { address } : null,
    signerLabel: "Particle Auth wallet",
    sendPaymentQuote,
  };
}
