// Particle UniversalX transaction status enum, shared by the client wallet UI
// (poller + activity list) and the server-side payment verification so both
// agree on the same mapping. Pure module — no framework imports — safe to load
// in either the browser or the Cloudflare Workers server graph.

export type UniversalTxStatus = "confirmed" | "refunded" | "refunding" | "failed" | "submitted";

export const PARTICLE_STATUS = {
  WAIT_TO_REFUND: 3,
  EXECUTION_FAILED: 6,
  FINISHED: 7,
  REFUND_LOCAL: 8,
  REFUND_PENDING: 9,
  REFUND_FAILED: 10,
  REFUND_FINISHED: 11,
  PENNY_FAILED: 14,
} as const;

const UNIVERSAL_STATUS_BY_CODE: Record<number, UniversalTxStatus> = {
  [PARTICLE_STATUS.WAIT_TO_REFUND]: "refunding",
  [PARTICLE_STATUS.EXECUTION_FAILED]: "failed",
  [PARTICLE_STATUS.FINISHED]: "confirmed",
  [PARTICLE_STATUS.REFUND_LOCAL]: "refunding",
  [PARTICLE_STATUS.REFUND_PENDING]: "refunding",
  [PARTICLE_STATUS.REFUND_FAILED]: "failed",
  [PARTICLE_STATUS.REFUND_FINISHED]: "refunded",
  [PARTICLE_STATUS.PENNY_FAILED]: "failed",
};

export function mapUniversalStatusCode(code: number): UniversalTxStatus {
  return UNIVERSAL_STATUS_BY_CODE[code] ?? "submitted";
}
