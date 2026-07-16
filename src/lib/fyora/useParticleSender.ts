import { useCallback, useRef } from "react";
import { useFyoraAuth } from "./AuthProvider";
import type { UniversalAuthorization, UniversalTransaction } from "./particle-types";
import {
  createBrowserTransferTransaction,
  sendBrowserUniversalTransaction,
} from "./magic-universal-client";

type TransferInput = {
  chainId: number;
  tokenAddress: string;
  amount: string;
  receiver: string;
};

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

async function serializeVerifiedEip7702Authorization(
  authorization: { r: string; s: string; v: number },
  request: { address: string; chainId: number; nonce: number },
  ownerAddress: string,
) {
  const { Signature, hashAuthorization, recoverAddress } = await import("ethers");
  const digest = hashAuthorization(request);
  const rawVSignature = { r: authorization.r, s: authorization.s, v: authorization.v };
  const yParitySignature = {
    r: authorization.r,
    s: authorization.s,
    v: authorization.v + 27,
  };

  let recoveredWithRawV: string | null = null;
  let recoveredWithYParity: string | null = null;
  try {
    recoveredWithRawV = recoverAddress(digest, rawVSignature).toLowerCase();
  } catch {
    recoveredWithRawV = null;
  }
  try {
    recoveredWithYParity = recoverAddress(digest, yParitySignature).toLowerCase();
  } catch {
    recoveredWithYParity = null;
  }

  const expectedOwner = ownerAddress.toLowerCase();
  if (sameAddress(recoveredWithRawV ?? undefined, expectedOwner)) {
    console.error("[Fyora] EIP-7702 authorization signature verified", {
      chainId: request.chainId,
      nonce: request.nonce,
      authAddress: request.address,
      convention: "raw-v",
      recoveredAddress: recoveredWithRawV,
      ownerAddress: expectedOwner,
    });
    return Signature.from(rawVSignature).serialized;
  }
  if (sameAddress(recoveredWithYParity ?? undefined, expectedOwner)) {
    console.error("[Fyora] EIP-7702 authorization signature verified", {
      chainId: request.chainId,
      nonce: request.nonce,
      authAddress: request.address,
      convention: "y-parity",
      recoveredAddress: recoveredWithYParity,
      ownerAddress: expectedOwner,
    });
    return Signature.from(yParitySignature).serialized;
  }

  console.error("[Fyora] EIP-7702 authorization signature mismatch", {
    chainId: request.chainId,
    nonce: request.nonce,
    authAddress: request.address,
    ownerAddress: expectedOwner,
    recoveredWithRawV,
    recoveredWithYParity,
    magicV: authorization.v,
  });
  throw new Error(
    "EIP-7702 authorization signature did not recover to the expected owner address — check Magic wallet.sign7702Authorization output format.",
  );
}

export function useParticleSender() {
  const { identity, signRootHash, signEip7702Authorization, ensureEip7702Delegated } =
    useFyoraAuth();
  const sendInFlight = useRef(false);

  const createTransferQuote = useCallback(
    async (input: TransferInput) => {
      if (!identity?.evmAddress) {
        throw new Error("Magic wallet is not ready yet.");
      }
      await ensureEip7702Delegated(identity.evmAddress);
      return createBrowserTransferTransaction(identity.evmAddress, input);
    },
    [ensureEip7702Delegated, identity?.evmAddress],
  );

  const sendPaymentQuote = useCallback(
    async (transaction: UniversalTransaction) => {
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
          const authorizationChainId =
            operation.eip7702Auth.chainId === 0
              ? operation.chainId
              : (operation.eip7702Auth.chainId ?? operation.chainId);
          const cacheKey = `${authorizationChainId}:${operation.eip7702Auth.nonce}:${operation.eip7702Auth.address.toLowerCase()}`;
          let signature = authorizationCache.get(cacheKey);
          if (!signature) {
            const authorizationRequest = {
              address: operation.eip7702Auth.address,
              chainId: authorizationChainId,
              nonce: operation.eip7702Auth.nonce,
            };
            const authorization = await signEip7702Authorization({
              address: authorizationRequest.address,
              chainId: authorizationRequest.chainId,
              nonce: authorizationRequest.nonce,
            });
            signature = await serializeVerifiedEip7702Authorization(
              authorization,
              authorizationRequest,
              ownerAddress,
            );
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
          return await sendBrowserUniversalTransaction(
            ownerAddress,
            transaction,
            rootSignature,
            authorizations,
          );
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

  const sendTransfer = useCallback(
    async (input: TransferInput) => {
      const transaction = await createTransferQuote(input);
      const result = await sendPaymentQuote(transaction);
      return { transaction, result };
    },
    [createTransferQuote, sendPaymentQuote],
  );

  return {
    embeddedWallet: identity?.evmAddress ? { address: identity.evmAddress } : null,
    signerLabel: "Magic embedded wallet",
    createTransferQuote,
    sendPaymentQuote,
    sendTransfer,
  };
}
