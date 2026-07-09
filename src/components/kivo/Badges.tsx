import { chainById, tokenById } from "@/lib/mock/chains";

export function ChainBadge({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const c = chainById(id);
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold chunky ${px}`}
      style={{ background: c.color + "22", color: "#141313", borderColor: "#141313" }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: c.color, boxShadow: "0 0 0 1px #141313" }}
      />
      {c.short}
    </span>
  );
}

export function TokenBadge({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const t = tokenById(id);
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-butter chunky font-semibold ${px}`}
    >
      <span>{t.emoji}</span>
      {t.symbol}
    </span>
  );
}
