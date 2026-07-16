import type { Json, Tables } from "./database.types";
import { mapUniversalStatusCode } from "./particle-status";

const UNIVERSALX_RPC_URL = "https://universal-rpc-proxy.particle.network";

async function getParticleTransaction(transactionId: string) {
  const projectId = process.env.VITE_PARTICLE_PROJECT_ID;
  const projectClientKey = process.env.VITE_PARTICLE_CLIENT_KEY;
  if (!projectId || !projectClientKey) {
    throw new Error("Particle server configuration is missing.");
  }
  const response = await fetch(process.env.PARTICLE_RPC_URL || UNIVERSALX_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: Date.now(),
      jsonrpc: "2.0",
      method: "universal_getTransaction",
      params: [transactionId],
      deviceId: crypto.randomUUID(),
      projectId,
      projectClientKey,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Particle verification failed (${response.status}).`);
  const payload = (await response.json()) as {
    result?: unknown;
    error?: { code?: number; message?: string };
  };
  if (payload.error) {
    throw new Error(payload.error.message || `Particle error ${payload.error.code ?? "unknown"}.`);
  }
  return payload.result;
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function sameAddress(left: string, right: string, networkType: string) {
  return networkType === "solana" ? left === right : left.toLowerCase() === right.toLowerCase();
}

export async function verifyParticlePayment(payment: Tables<"payments">) {
  if (!payment.particle_transaction_id) throw new Error("Payment has not been submitted.");
  const result = await getParticleTransaction(payment.particle_transaction_id);
  if (!result || typeof result !== "object") throw new Error("Particle transaction was not found.");
  const transaction = result as Record<string, unknown>;
  const owner =
    typeof transaction.sender === "string"
      ? transaction.sender
      : ((transaction.smartAccountOptions as Record<string, unknown> | undefined)?.ownerAddress as
          string | undefined);
  const allowedOwner = payment.supporter_evm_address;
  if (owner && owner.toLowerCase() !== allowedOwner.toLowerCase()) {
    throw new Error("Particle transaction owner does not match the supporter.");
  }
  const statusCode = Number(transaction.status);
  const status = mapUniversalStatusCode(statusCode);
  const tokenChanges = transaction.tokenChanges as Record<string, unknown> | undefined;
  const toChains = Array.isArray(tokenChanges?.toChains) ? tokenChanges?.toChains.map(Number) : [];
  if (status === "confirmed") {
    const receiver = typeof tokenChanges?.to === "string" ? tokenChanges.to : "";
    const increments = Array.isArray(tokenChanges?.incr) ? tokenChanges.incr : [];
    const destinationIncrement = increments.find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const token = (entry as Record<string, unknown>).token as Record<string, unknown> | undefined;
      return (
        Number(token?.chainId) === payment.destination_chain_id &&
        typeof token?.address === "string" &&
        sameAddress(
          token.address,
          payment.destination_token_address,
          payment.destination_network_type,
        )
      );
    }) as Record<string, unknown> | undefined;
    const receivedUsd = Number(destinationIncrement?.amountInUSD ?? 0);
    if (
      !receiver ||
      !sameAddress(
        receiver,
        payment.destination_receiver_address,
        payment.destination_network_type,
      ) ||
      !toChains.includes(payment.destination_chain_id) ||
      !destinationIncrement ||
      receivedUsd < Number(payment.amount_usd) * 0.95
    ) {
      throw new Error("Particle transaction does not match the payment destination and amount.");
    }
  }
  const sourceEvidence = Array.isArray(tokenChanges?.decr) ? tokenChanges.decr : [];
  return {
    status,
    source_evidence: asJson(sourceEvidence),
    raw_result: asJson(transaction),
    confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    error_code: status === "failed" ? String(statusCode) : null,
    error_message: status === "failed" ? "Particle reported that the transaction failed." : null,
  };
}
