import { useCallback, useMemo, useRef } from "react";
import { useSign7702Authorization, useSignMessage, useWallets } from "@privy-io/react-auth";
import type {
  EIP7702Authorization,
  ITransaction,
  UniversalAccount,
} from "@particle-network/universal-account-sdk";

function sameAddress(left?: string, right?: string) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function isPrivyEmbeddedWallet(wallet: { type: string; walletClientType: string }) {
  return (
    wallet.type === "ethereum" &&
    (wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2")
  );
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
      `${message}${code ? ` (code ${String(code)})` : ""}${data ? ` - ${typeof data === "string" ? data : JSON.stringify(data)}` : ""}`,
    );
  }
  return error instanceof Error ? error : new Error(message);
}

export function useParticleSender() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signMessage } = useSignMessage();
  const sendInFlight = useRef(false);
  const embeddedWallet = useMemo(() => wallets.find(isPrivyEmbeddedWallet) ?? null, [wallets]);

  const sendPaymentQuote = useCallback(
    async (account: UniversalAccount, transaction: ITransaction) => {
      if (!embeddedWallet) {
        throw new Error("Privy embedded wallet is not ready yet.");
      }
      if (sendInFlight.current) {
        throw new Error("This transfer is already waiting for confirmation.");
      }

      sendInFlight.current = true;
      try {
        const { Signature, getBytes, verifyAuthorization, verifyMessage } = await import("ethers");
        const signerAddress = embeddedWallet.address.toLowerCase();
        const ownerAddress =
          transaction.smartAccountOptions?.ownerAddress?.toLowerCase() ?? signerAddress;
        if (!sameAddress(signerAddress, ownerAddress)) {
          throw new Error(
            `Privy is signed in as ${signerAddress}, but this Particle quote belongs to ${ownerAddress}. Please refresh and rebuild the quote.`,
          );
        }

        const authorizations: EIP7702Authorization[] = [];
        const nonceMap = new Map<
          string,
          { signature: string; address: string; chainId: number; recoveredAddress: string }
        >();

        for (const operation of transaction.userOps) {
          const authorization = operation.eip7702Auth;
          if (!authorization || operation.eip7702Delegated) continue;

          const key = `${authorization.chainId}-${authorization.nonce}`;
          let cached = nonceMap.get(key);
          if (!cached) {
            const signed = await signAuthorization(
              {
                contractAddress: authorization.address as `0x${string}`,
                chainId: Number(authorization.chainId),
                nonce: authorization.nonce,
              },
              { address: embeddedWallet.address },
            );
            const serialized = Signature.from({
              r: signed.r,
              s: signed.s,
              v: signed.v ?? BigInt(signed.yParity),
              yParity: signed.yParity as 0 | 1,
            }).serialized;
            const recoveredAuthorizationAddress = verifyAuthorization(
              {
                address: authorization.address,
                chainId: authorization.chainId,
                nonce: authorization.nonce,
              },
              serialized,
            ).toLowerCase();
            if (!sameAddress(recoveredAuthorizationAddress, ownerAddress)) {
              throw new Error(
                `Privy authorization recovered ${recoveredAuthorizationAddress}, but Particle expects ${ownerAddress}. Please sign out, sign in again, and rebuild the quote.`,
              );
            }
            cached = {
              signature: serialized,
              address: authorization.address.toLowerCase(),
              chainId: authorization.chainId,
              recoveredAddress: recoveredAuthorizationAddress,
            };
            nonceMap.set(key, cached);

            // Only push the authorization for the FIRST userOp that needs it
            authorizations.push({
              userOpHash: operation.userOpHash,
              signature: serialized,
            });
          } else {
            const recoveredAuthorizationAddress = verifyAuthorization(
              {
                address: authorization.address,
                chainId: authorization.chainId,
                nonce: authorization.nonce,
              },
              cached.signature,
            ).toLowerCase();
            if (!sameAddress(recoveredAuthorizationAddress, ownerAddress)) {
              throw new Error(
                "Particle returned conflicting EIP-7702 authorization data for the same nonce. Rebuild the quote and try again.",
              );
            }
          }
        }

        const { signature: rootSignature } = await signMessage(
          { message: transaction.rootHash },
          {
            address: embeddedWallet.address,
            uiOptions: { title: "Confirm Fyora transfer" },
          },
        );
        const recoveredRootAddress = verifyMessage(
          getBytes(transaction.rootHash),
          rootSignature,
        ).toLowerCase();
        if (!sameAddress(recoveredRootAddress, ownerAddress)) {
          throw new Error(
            `Privy root signature recovered ${recoveredRootAddress}, but Particle expects ${ownerAddress}. Please refresh and rebuild the quote.`,
          );
        }

        try {
          return (await account.sendTransaction(
            transaction,
            rootSignature,
            authorizations.length ? authorizations : undefined,
          )) as { transactionId: string };
        } catch (error) {
          throw particleError(error, {
            signerProvider: "privy-useSignMessage",
            ownerAddress,
            signerAddress,
            recoveredRootAddress,
            authorizations: authorizations.length,
            uniqueAuthorizationNonces: nonceMap.size,
            authorizationChecks: [...nonceMap.entries()].map(([nonce, value]) => ({
              nonce,
              chainId: value.chainId,
              contractAddress: value.address,
              recoveredAddress: value.recoveredAddress,
            })),
            userOps: transaction.userOps.map((operation) => ({
              chainId: operation.chainId,
              userOpHash: operation.userOpHash,
              delegated: operation.eip7702Delegated,
              authChainId: operation.eip7702Auth?.chainId,
              authNonce: operation.eip7702Auth?.nonce,
              authAddress: operation.eip7702Auth?.address,
            })),
          });
        }
      } finally {
        sendInFlight.current = false;
      }
    },
    [embeddedWallet, signAuthorization, signMessage],
  );

  return {
    embeddedWallet,
    signerLabel: "Privy embedded wallet",
    sendPaymentQuote,
  };
}
