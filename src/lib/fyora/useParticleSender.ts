import { useCallback, useRef } from "react";
import { useFyoraAuth } from "./AuthProvider";
import { submitUniversalTransactionFn } from "./particle-functions";
import type { UniversalAuthorization, UniversalTransaction } from "./particle-types";

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

export function useParticleSender() {
  const { identity, signRootHash, signEip7702Authorization, ensureEip7702Delegated } =
    useFyoraAuth();
  const sendInFlight = useRef(false);

  const sendPaymentQuote = useCallback(
    async (transaction: UniversalTransaction, didToken: string) => {
      if (!identity?.evmAddress) {
        throw new Error("Magic wallet is not ready yet.");
      }
      if (sendInFlight.current) {
        throw new Error("This transfer is already waiting for confirmation.");
      }

      sendInFlight.current = true;
      try {
        const signerAddress = identity.evmAddress.toLowerCase();
        const ownerAddress =
          transaction.smartAccountOptions?.ownerAddress?.toLowerCase() ?? signerAddress;
        if (!sameAddress(signerAddress, ownerAddress)) {
          throw new Error(
            `Magic is signed in as ${signerAddress}, but this quote belongs to ${ownerAddress}. Refresh and rebuild the quote.`,
          );
        }

        await ensureEip7702Delegated(ownerAddress);

        const authorizations: UniversalAuthorization[] = [];
        const authorizationCache = new Map<string, string>();
        for (const operation of transaction.userOps) {
          if (!operation.eip7702Auth || operation.eip7702Delegated) continue;
          const cacheKey = `${operation.eip7702Auth.chainId}:${operation.eip7702Auth.nonce}:${operation.eip7702Auth.address.toLowerCase()}`;
          let signature = authorizationCache.get(cacheKey);
          if (!signature) {
            const authorization = await signEip7702Authorization({
              address: operation.eip7702Auth.address,
              chainId: operation.eip7702Auth.chainId || operation.chainId,
              nonce: operation.eip7702Auth.nonce,
            });
            const { Signature } = await import("ethers");
            signature =
              authorization.signature ??
              Signature.from({
                r: authorization.r,
                s: authorization.s,
                v: authorization.v,
              }).serialized;
            authorizationCache.set(cacheKey, signature);
          }
          authorizations.push({
            userOpHash: operation.userOpHash,
            signature,
          });
        }

        const { getBytes, verifyMessage } = await import("ethers");
        const rootSignature = await signRootHash(transaction.rootHash);
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
          return await submitUniversalTransactionFn({
            data: { didToken, transaction, signature: rootSignature, authorizations },
          });
        } catch (error) {
          throw particleError(error, {
            signerProvider: "magic",
            ownerAddress,
            signerAddress,
            recoveredRootAddress,
            authorizations: authorizations.length,
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
    [ensureEip7702Delegated, identity?.evmAddress, signEip7702Authorization, signRootHash],
  );

  return {
    embeddedWallet: identity?.evmAddress ? { address: identity.evmAddress } : null,
    signerLabel: "Magic embedded wallet",
    sendPaymentQuote,
  };
}
