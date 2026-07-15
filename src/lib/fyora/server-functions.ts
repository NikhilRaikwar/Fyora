import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const didSchema = z.string().min(20).max(4096);
const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscores.");
const chainSchema = z.object({
  chainId: z.number().int().positive(),
  tokenAddress: z.string().trim().min(1).max(128),
});
const universalAddressesSchema = z.object({
  evmUaAddress: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{40}$/),
  solanaUaAddress: z
    .string()
    .trim()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    .nullable(),
  mode: z.enum(["separateSmartAccount", "eip7702OwnerAddress"]),
});
const socialSchema = z.object({
  kind: z.enum(["x", "github", "site", "youtube", "ig"]),
  url: z.string().url().max(500),
});

async function identityFor(didToken: string) {
  const { verifyFyoraIdentity } = await import("./particle-auth.server");
  return verifyFyoraIdentity(didToken);
}

export const listPublicCreatorsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listPublicCreators } = await import("./data.server");
  return listPublicCreators();
});

export const getPublicCreatorFn = createServerFn({ method: "GET" })
  .validator(z.object({ handle: handleSchema }))
  .handler(async ({ data }) => {
    const { getPublicCreator } = await import("./data.server");
    return getPublicCreator(data.handle);
  });

export const getMyCreatorFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { getCreatorForIdentity } = await import("./data.server");
    return getCreatorForIdentity(identity);
  });

export const claimCreatorFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        didToken: didSchema,
        handle: handleSchema,
        name: z.string().trim().min(1).max(60),
        bio: z.string().trim().max(240),
        emoji: z.string().trim().min(1).max(16),
        gradient: z.tuple([z.string().max(32), z.string().max(32)]),
        socials: z.array(socialSchema).max(8),
        universalAddresses: universalAddressesSchema,
      })
      .and(chainSchema),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { claimCreator } = await import("./data.server");
    return claimCreator({ identity, ...data });
  });

export const updateCreatorFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        didToken: didSchema,
        name: z.string().trim().min(1).max(60),
        bio: z.string().trim().max(240),
        emoji: z.string().trim().min(1).max(16),
        universalAddresses: universalAddressesSchema,
      })
      .and(chainSchema),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { updateCreator } = await import("./data.server");
    return updateCreator({ identity, ...data });
  });

export const refreshCreatorSettlementFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema, universalAddresses: universalAddressesSchema }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { refreshCreatorSettlement } = await import("./data.server");
    return refreshCreatorSettlement({ identity, universalAddresses: data.universalAddresses });
  });

export const refreshCreatorShareCardFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { refreshCreatorShareCard } = await import("./data.server");
    return refreshCreatorShareCard(identity);
  });

export const updateCreatorAvatarFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      didToken: didSchema,
      fileName: z.string().trim().min(1).max(180),
      contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
      base64: z.string().min(10).max(3_000_000),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { updateCreatorAvatar } = await import("./data.server");
    return updateCreatorAvatar({ identity, ...data });
  });

export const createPaymentIntentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      didToken: didSchema,
      handle: handleSchema,
      amountUsd: z.number().finite().min(0.01).max(500),
      note: z.string().trim().max(280).optional(),
      supporterName: z.string().trim().max(60).optional(),
      supporterEmoji: z.string().trim().min(1).max(16),
      idempotencyKey: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { createPaymentIntent } = await import("./data.server");
    return createPaymentIntent({ identity, ...data });
  });

export const recordPaymentSubmissionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      didToken: didSchema,
      intentId: z.string().uuid(),
      transactionId: z.string().trim().min(4).max(256),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { recordPaymentSubmission } = await import("./data.server");
    return recordPaymentSubmission({ identity, ...data });
  });

export const refreshPaymentFn = createServerFn({ method: "POST" })
  .validator(z.object({ didToken: didSchema, intentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await identityFor(data.didToken);
    const { getPaymentForIdentity, updatePaymentVerification } = await import("./data.server");
    const { verifyParticlePayment } = await import("./particle.server");
    const payment = await getPaymentForIdentity(data.intentId, identity);
    if (["confirmed", "refunded", "failed"].includes(payment.status)) {
      return {
        id: payment.id,
        amountUsd: Number(payment.amount_usd),
        destination: {
          networkType:
            payment.destination_network_type === "solana" ? ("solana" as const) : ("evm" as const),
          chain: payment.destination_chain_slug,
          chainId: payment.destination_chain_id,
          token: payment.destination_token_symbol.toLowerCase(),
          tokenAddress: payment.destination_token_address,
          tokenDecimals: payment.destination_token_decimals,
          address: payment.destination_receiver_address,
        },
        status: payment.status as "confirmed" | "refunded" | "failed",
        transactionId: payment.particle_transaction_id,
        universalxUrl: payment.universalx_url,
      };
    }
    const verified = await verifyParticlePayment(payment);
    return updatePaymentVerification(payment.id, verified);
  });
