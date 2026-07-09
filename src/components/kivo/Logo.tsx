import { Link } from "@tanstack/react-router";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      {/* sticker tile */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="11"
        fill="var(--lime)"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      {/* K glyph — geometric, chunky */}
      <path
        d="M13 10 V30"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M13 21 L26 10"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M17.5 20.5 L28 30"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* coin dot */}
      <circle cx="29.5" cy="11.5" r="2.6" fill="var(--coral)" stroke="var(--ink)" strokeWidth="1.6" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`leading-none tracking-tight ${className}`}
      style={{
        fontFamily: "var(--font-brand)",
        fontWeight: 800,
        fontStyle: "italic",
        letterSpacing: "-0.04em",
      }}
    >
      fyora<span style={{ color: "var(--coral)" }}>.</span>
    </span>
  );
}

export function BrandLink() {
  return (
    <Link to="/" className="flex items-center group">
      <Wordmark className="text-3xl" />
    </Link>
  );
}


/** Styled fyora.app/handle URL — brand prefix + mono handle */
export function HandleUrl({
  handle,
  size = "md",
  tone = "chip",
}: {
  handle: string;
  size?: "sm" | "md" | "lg";
  tone?: "chip" | "plain";
}) {
  const sz =
    size === "lg" ? "text-base" : size === "sm" ? "text-[11px]" : "text-xs sm:text-sm";
  const wrap =
    tone === "chip"
      ? "inline-flex items-center gap-0.5 rounded-full bg-secondary chunky px-3 py-1 max-w-full"
      : "inline-flex items-center gap-0.5 max-w-full";
  return (
    <span className={`${wrap} ${sz}`}>
      <span
        className="italic"
        style={{
          fontFamily: "var(--font-brand)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        fyora<span style={{ color: "var(--coral)" }}>.</span>app
      </span>
      <span className="text-muted-foreground">/</span>
      <span
        className="font-semibold truncate"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.01em" }}
      >
        {handle}
      </span>
    </span>
  );
}
