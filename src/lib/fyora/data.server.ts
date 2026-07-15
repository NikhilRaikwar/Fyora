import type { Tables, TablesUpdate } from "./database.types";
import { getSupabaseServerClient } from "./supabase.server";
import { resolveSettlementAsset } from "./settlement";
import type {
  Creator,
  FyoraIdentity,
  Payment,
  PaymentIntent,
  SettlementAsset,
  Social,
} from "./types";

type ProfileRow = Tables<"profiles">;
type SettlementRow = Tables<"settlement_configs">;
type PaymentRow = Tables<"payments">;
type UniversalSettlementAddresses = {
  evmUaAddress: string;
  solanaUaAddress: string | null;
};

function normalizedEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

function asGradient(value: unknown): [string, string] {
  return Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "string")
    ? [value[0], value[1]]
    : ["#C6F24E", "#B8A6FF"];
}

function asSocials(value: unknown): Social[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Social => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    return (
      ["x", "github", "site", "youtube", "ig"].includes(String(entry.kind)) &&
      typeof entry.url === "string"
    );
  });
}

function paymentSource(payment: PaymentRow) {
  const first = Array.isArray(payment.source_evidence) ? payment.source_evidence[0] : undefined;
  if (!first || typeof first !== "object") return { chain: "unknown", token: "unknown" };
  const source = first as Record<string, unknown>;
  return {
    chain: String(source.chainSlug ?? source.chain ?? source.chainId ?? "unknown"),
    token: String(source.tokenId ?? source.symbol ?? "unknown").toLowerCase(),
  };
}

function mapPayment(row: PaymentRow): Payment {
  const source = paymentSource(row);
  return {
    id: row.id,
    amountUsd: Number(row.amount_usd),
    supporterName: row.supporter_name || "Anon",
    supporterEmoji: row.supporter_emoji,
    fromChain: source.chain,
    fromToken: source.token,
    note: row.note ?? undefined,
    txId: row.particle_transaction_id ?? "",
    universalxUrl: row.universalx_url ?? undefined,
    createdAt: Date.parse(row.confirmed_at ?? row.created_at),
    status:
      row.status === "confirmed" ? "confirmed" : row.status === "failed" ? "failed" : "pending",
  };
}

function mapCreator(
  profile: ProfileRow,
  settlement: SettlementRow,
  payments: PaymentRow[],
): Creator {
  return {
    profileId: profile.id,
    updatedAt: Date.parse(profile.updated_at),
    handle: profile.handle,
    name: profile.display_name,
    bio: profile.bio,
    emoji: profile.avatar_emoji,
    avatarUrl: profile.avatar_url,
    gradient: asGradient(profile.gradient),
    socials: asSocials(profile.socials),
    settlement: {
      networkType: settlement.network_type === "solana" ? "solana" : "evm",
      chain: settlement.chain_slug,
      chainId: settlement.chain_id,
      token: settlement.token_symbol.toLowerCase(),
      tokenAddress: settlement.token_address,
      tokenDecimals: settlement.token_decimals,
      address: settlement.receiver_address,
    },
    payments: payments.map(mapPayment),
  };
}

async function loadCreator(profile: ProfileRow, includePrivatePayments = false) {
  const supabase = getSupabaseServerClient();
  const [{ data: settlement, error: settlementError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase.from("settlement_configs").select("*").eq("profile_id", profile.id).single(),
      supabase
        .from("payments")
        .select("*")
        .eq("profile_id", profile.id)
        .in(
          "status",
          includePrivatePayments
            ? ["created", "submitted", "refunding", "refunded", "confirmed", "failed"]
            : ["confirmed"],
        )
        .order("created_at", { ascending: false })
        .limit(includePrivatePayments ? 100 : 20),
    ]);
  if (settlementError || !settlement) throw new Error("Creator settlement is unavailable.");
  if (paymentsError) throw paymentsError;
  return mapCreator(profile, settlement, payments ?? []);
}

async function updateProfileOwner(profile: ProfileRow, identity: FyoraIdentity) {
  const ownerEmail = normalizedEmail(identity.email);
  if (
    profile.owner_particle_uuid === identity.issuer &&
    profile.owner_evm_address === identity.evmAddress &&
    profile.owner_solana_address === identity.solanaAddress &&
    profile.owner_email === ownerEmail
  ) {
    return profile;
  }
  const { data, error } = await getSupabaseServerClient()
    .from("profiles")
    .update({
      owner_particle_uuid: identity.issuer,
      owner_evm_address: identity.evmAddress,
      owner_solana_address: identity.solanaAddress,
      owner_email: ownerEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getPublicCreator(handle: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("profiles")
    .select("*")
    .eq("handle", handle.toLowerCase())
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? loadCreator(data) : null;
}

export async function listPublicCreators() {
  const { data, error } = await getSupabaseServerClient()
    .from("profiles")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return Promise.all((data ?? []).map((profile) => loadCreator(profile)));
}

export async function getCreatorForIdentity(identity: FyoraIdentity) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_particle_uuid", identity.issuer)
    .maybeSingle();
  if (error) throw error;
  if (data) return loadCreator(data, true);

  const { data: evmProfile, error: evmError } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_evm_address", identity.evmAddress)
    .maybeSingle();
  if (evmError) throw evmError;
  if (evmProfile) return loadCreator(await updateProfileOwner(evmProfile, identity), true);

  const ownerEmail = normalizedEmail(identity.email);
  if (!ownerEmail) return null;
  const { data: emailProfile, error: emailError } = await supabase
    .from("profiles")
    .select("*")
    .eq("owner_email", ownerEmail)
    .maybeSingle();
  if (emailError) throw emailError;
  if (!emailProfile) return null;
  return loadCreator(await updateProfileOwner(emailProfile, identity), true);
}

function receiverFor(asset: SettlementAsset, addresses: UniversalSettlementAddresses) {
  if (asset.networkType === "solana") {
    if (!addresses.solanaUaAddress) {
      throw new Error("Particle did not return a Solana Universal receive address yet.");
    }
    return addresses.solanaUaAddress;
  }
  return addresses.evmUaAddress;
}

async function settlementInsert(
  profileId: string,
  asset: SettlementAsset,
  universalAddresses: UniversalSettlementAddresses,
) {
  return {
    profile_id: profileId,
    network_type: asset.networkType,
    chain_id: asset.chainId,
    chain_slug: asset.chainSlug,
    token_symbol: asset.tokenSymbol,
    token_address: asset.tokenAddress,
    token_decimals: asset.tokenDecimals,
    receiver_address: receiverFor(asset, universalAddresses),
  } as const;
}

export async function claimCreator(input: {
  identity: FyoraIdentity;
  handle: string;
  name: string;
  bio: string;
  emoji: string;
  gradient: [string, string];
  socials: Social[];
  chainId: number;
  tokenAddress: string;
  universalAddresses: UniversalSettlementAddresses;
}) {
  const asset = resolveSettlementAsset(input.chainId, input.tokenAddress);
  if (!asset) throw new Error("That settlement token is not supported by Particle.");
  const existing = await getCreatorForIdentity(input.identity);
  if (existing) return existing;
  const supabase = getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      owner_particle_uuid: input.identity.issuer,
      owner_evm_address: input.identity.evmAddress,
      owner_solana_address: input.identity.solanaAddress,
      owner_email: normalizedEmail(input.identity.email),
      handle: input.handle,
      display_name: input.name,
      bio: input.bio,
      avatar_emoji: input.emoji,
      gradient: input.gradient,
      socials: input.socials,
    })
    .select("*")
    .single();
  if (error) throw error;
  const { error: settlementError } = await supabase
    .from("settlement_configs")
    .insert(await settlementInsert(profile.id, asset, input.universalAddresses));
  if (settlementError) {
    await supabase.from("profiles").delete().eq("id", profile.id);
    throw settlementError;
  }
  return loadCreator(profile, true);
}

export async function updateCreator(input: {
  identity: FyoraIdentity;
  name: string;
  bio: string;
  emoji: string;
  chainId: number;
  tokenAddress: string;
  universalAddresses: UniversalSettlementAddresses;
}) {
  const current = await getCreatorForIdentity(input.identity);
  if (!current) throw new Error("Creator profile not found.");
  const asset = resolveSettlementAsset(input.chainId, input.tokenAddress);
  if (!asset) throw new Error("That settlement token is not supported by Particle.");
  const supabase = getSupabaseServerClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: input.name, bio: input.bio, avatar_emoji: input.emoji })
    .eq("id", current.profileId)
    .eq("owner_particle_uuid", input.identity.issuer);
  if (profileError) throw profileError;
  const { error: settlementError } = await supabase
    .from("settlement_configs")
    .update(await settlementInsert(current.profileId, asset, input.universalAddresses))
    .eq("profile_id", current.profileId);
  if (settlementError) throw settlementError;
  return getCreatorForIdentity(input.identity);
}

export async function refreshCreatorSettlement(input: {
  identity: FyoraIdentity;
  universalAddresses: UniversalSettlementAddresses;
}) {
  const current = await getCreatorForIdentity(input.identity);
  if (!current) throw new Error("Creator profile not found.");
  const asset = resolveSettlementAsset(current.settlement.chainId, current.settlement.tokenAddress);
  if (!asset) throw new Error("That settlement token is not supported by Particle.");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("settlement_configs")
    .update(await settlementInsert(current.profileId, asset, input.universalAddresses))
    .eq("profile_id", current.profileId);
  if (error) throw error;
  return getCreatorForIdentity(input.identity);
}

export async function refreshCreatorShareCard(identity: FyoraIdentity) {
  const current = await getCreatorForIdentity(identity);
  if (!current) throw new Error("Creator profile not found.");
  const { error } = await getSupabaseServerClient()
    .from("profiles")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", current.profileId)
    .eq("owner_particle_uuid", identity.issuer);
  if (error) throw error;
  return getCreatorForIdentity(identity);
}

export async function updateCreatorAvatar(input: {
  identity: FyoraIdentity;
  fileName: string;
  contentType: string;
  base64: string;
}) {
  const current = await getCreatorForIdentity(input.identity);
  if (!current) throw new Error("Creator profile not found.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(input.contentType)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }
  const bytes = Uint8Array.from(Buffer.from(input.base64, "base64"));
  if (bytes.byteLength > 2_097_152) throw new Error("Avatar image must be smaller than 2 MB.");
  const extension =
    input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
  const supabase = getSupabaseServerClient();
  const objectPath = `${current.profileId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("creator-avatars")
    .upload(objectPath, bytes, {
      contentType: input.contentType,
      upsert: true,
    });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("creator-avatars").getPublicUrl(objectPath);
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", current.profileId)
    .eq("owner_particle_uuid", input.identity.issuer);
  if (profileError) throw profileError;
  return getCreatorForIdentity(input.identity);
}

export async function createPaymentIntent(input: {
  identity: FyoraIdentity;
  handle: string;
  amountUsd: number;
  note?: string;
  supporterName?: string;
  supporterEmoji: string;
  idempotencyKey: string;
}): Promise<PaymentIntent> {
  const creator = await getPublicCreator(input.handle);
  if (!creator) throw new Error("Creator not found.");
  const { data, error } = await getSupabaseServerClient()
    .from("payments")
    .upsert(
      {
        idempotency_key: input.idempotencyKey,
        profile_id: creator.profileId,
        supporter_evm_address: input.identity.evmAddress,
        supporter_name: input.supporterName || null,
        supporter_emoji: input.supporterEmoji,
        note: input.note || null,
        amount_usd: input.amountUsd,
        destination_network_type: creator.settlement.networkType,
        destination_chain_id: creator.settlement.chainId,
        destination_chain_slug: creator.settlement.chain,
        destination_token_symbol: creator.settlement.token.toUpperCase(),
        destination_token_address: creator.settlement.tokenAddress,
        destination_token_decimals: creator.settlement.tokenDecimals,
        destination_receiver_address: creator.settlement.address,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    )
    .select("*")
    .single();
  if (error) {
    const { data: existing, error: existingError } = await getSupabaseServerClient()
      .from("payments")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .eq("supporter_evm_address", input.identity.evmAddress)
      .single();
    if (existingError) throw error;
    return rowToIntent(existing);
  }
  return rowToIntent(data);
}

function rowToIntent(row: PaymentRow): PaymentIntent {
  return {
    id: row.id,
    amountUsd: Number(row.amount_usd),
    destination: {
      networkType: row.destination_network_type === "solana" ? "solana" : "evm",
      chain: row.destination_chain_slug,
      chainId: row.destination_chain_id,
      token: row.destination_token_symbol.toLowerCase(),
      tokenAddress: row.destination_token_address,
      tokenDecimals: row.destination_token_decimals,
      address: row.destination_receiver_address,
    },
    status: row.status as PaymentIntent["status"],
    transactionId: row.particle_transaction_id,
    universalxUrl: row.universalx_url,
  };
}

export async function recordPaymentSubmission(input: {
  identity: FyoraIdentity;
  intentId: string;
  transactionId: string;
}) {
  const { data, error } = await getSupabaseServerClient()
    .from("payments")
    .update({
      status: "submitted",
      particle_transaction_id: input.transactionId,
      universalx_url: `https://universalx.app/activity/details?id=${encodeURIComponent(input.transactionId)}`,
      submitted_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    })
    .eq("id", input.intentId)
    .eq("supporter_evm_address", input.identity.evmAddress)
    .in("status", ["created", "submitted"])
    .select("*")
    .single();
  if (error) throw error;
  return rowToIntent(data);
}

export async function getPaymentForIdentity(intentId: string, identity: FyoraIdentity) {
  const { data, error } = await getSupabaseServerClient()
    .from("payments")
    .select("*")
    .eq("id", intentId)
    .eq("supporter_evm_address", identity.evmAddress)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentVerification(id: string, update: TablesUpdate<"payments">) {
  const { data, error } = await getSupabaseServerClient()
    .from("payments")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToIntent(data);
}
