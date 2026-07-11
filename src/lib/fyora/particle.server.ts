import type { Json, Tables } from "./database.types";

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

const PARTICLE_STATUS = {
  WAIT_TO_REFUND: 3,
  EXECUTION_FAILED: 6,
  FINISHED: 7,
  REFUND_LOCAL: 8,
  REFUND_PENDING: 9,
  REFUND_FAILED: 10,
  REFUND_FINISHED: 11,
  PENNY_FAILED: 14,
} as const;

function statusForParticle(code: number) {
  if (code === PARTICLE_STATUS.FINISHED) return "confirmed" as const;
  if (code === PARTICLE_STATUS.REFUND_FINISHED) return "refunded" as const;
  if (
    code === PARTICLE_STATUS.WAIT_TO_REFUND ||
    code === PARTICLE_STATUS.REFUND_LOCAL ||
    code === PARTICLE_STATUS.REFUND_PENDING
  ) {
    return "refunding" as const;
  }
  if (
    code === PARTICLE_STATUS.EXECUTION_FAILED ||
    code === PARTICLE_STATUS.REFUND_FAILED ||
    code === PARTICLE_STATUS.PENNY_FAILED
  ) {
    return "failed" as const;
  }
  return "submitted" as const;
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
  if (owner && owner.toLowerCase() !== payment.supporter_evm_address) {
    throw new Error("Particle transaction owner does not match the supporter.");
  }
  const statusCode = Number(transaction.status);
  const status = statusForParticle(statusCode);
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
