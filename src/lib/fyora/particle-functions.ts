import { createServerFn } from "@tanstack/react-start";
import { getBytes, verifyMessage } from "ethers";
import { z } from "zod";
import { getPaymentForIdentity } from "./data.server";
import { verifyFyoraIdentity } from "./particle-auth.server";
import type { UniversalTransaction } from "./particle-types";

const didSchema = z.string().min(20).max(4096);
const evmAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/);
const chainSchema = z.object({
  chainId: z.number().int().positive(),
  tokenAddress: z.string().trim().min(1).max(128),
});
const walletTransferSchema = chainSchema.extend({
  amount: z.string().trim().min(1).max(80),
  receiver: z.string().trim().min(1).max(128),
});

async function identityFor(didToken: string) {
  return verifyFyoraIdentity(didToken);
}

export const loadPrimaryAssetsFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { getServerPrimaryAssets } = await import("./particle-universal.server");
    return getServerPrimaryAssets(identity.evmAddress);
  });

export const getBaseEip7702DelegationFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema, ownerAddress: evmAddressSchema }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    if (identity.evmAddress.toLowerCase() !== data.ownerAddress.toLowerCase()) {
      throw new Error("This delegation request belongs to a different wallet.");
    }
    const { getServerBaseEip7702Delegation } = await import("./particle-universal.server");
    return getServerBaseEip7702Delegation(identity.evmAddress);
  });

export const loadWalletTransactionFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema, transactionId: z.string().trim().min(4).max(256) }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { getServerTransaction } = await import("./particle-universal.server");
    return getServerTransaction(identity.evmAddress, data.transactionId);
  });

export const loadWalletActivityFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      didToken: didSchema,
      page: z.number().int().min(1).max(100).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { getServerTransactions } = await import("./particle-universal.server");
    return getServerTransactions(identity.evmAddress, data.page ?? 1, data.limit ?? 20);
  });

export const createPaymentQuoteFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema, intentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const payment = await getPaymentForIdentity(data.intentId, identity);
    const { createPaymentTransferTransaction } = await import("./particle-universal.server");
    return createPaymentTransferTransaction(identity.evmAddress, payment);
  });

export const createWalletTransferQuoteFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema }).and(walletTransferSchema))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { createWalletTransferTransaction } = await import("./particle-universal.server");
    return createWalletTransferTransaction(identity.evmAddress, data);
  });

export const submitUniversalTransactionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      didToken: didSchema,
      transaction: z.unknown(),
      signature: z.string().trim().min(20).max(512),
      authorizations: z
        .array(
          z.object({
            userOpHash: z.string().trim().min(10).max(256),
            signature: z.string().trim().min(20).max(512),
          }),
        )
        .max(32)
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const transaction = data.transaction as UniversalTransaction;
    const ownerAddress =
      transaction.smartAccountOptions?.ownerAddress?.toLowerCase() ?? identity.evmAddress;
    if (ownerAddress !== identity.evmAddress.toLowerCase()) {
      throw new Error("This Particle quote belongs to a different wallet. Refresh and try again.");
    }
    const recovered = verifyMessage(getBytes(transaction.rootHash), data.signature).toLowerCase();
    if (recovered !== ownerAddress) {
      throw new Error("Particle signature does not match the Universal Account owner.");
    }
    const { submitUniversalTransaction } = await import("./particle-universal.server");
    return submitUniversalTransaction(
      identity.evmAddress,
      transaction,
      data.signature,
      data.authorizations ?? [],
    );
  });
