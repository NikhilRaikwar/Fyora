import { createFileRoute } from "@tanstack/react-router";
import { SEED_CREATORS } from "@/lib/mock/creators";

export const Route = createFileRoute("/api/public/og/$handle")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rawHandle = (params.handle ?? "").replace(/\.(png|jpg|svg)$/i, "").toLowerCase();
        const creator = SEED_CREATORS.find((c) => c.handle === rawHandle);

        const name = creator?.name ?? "Get paid from anywhere";
        const handle = creator?.handle ?? rawHandle ?? "yourname";
        const bio =
          creator?.bio ??
          "One link. Any chain. Your supporters pay in a tap — you receive on the chain you love.";
        const emoji = creator?.emoji ?? "✨";
        const g0 = creator?.gradient?.[0] ?? "#C6F24E";
        const g1 = creator?.gradient?.[1] ?? "#B8A6FF";

        const svg = renderCardSvg({ name, handle, bio, emoji, g0, g1 });

        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = cur ? cur + " " : "";
      cur += w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const joined = lines.join(" ");
  if (joined.length < text.replace(/\s+/g, " ").length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] =
      (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last) + "…";
  }
  return lines;
}

function renderCardSvg(o: {
  name: string;
  handle: string;
  bio: string;
  emoji: string;
  g0: string;
  g1: string;
}) {
  const nameLines = wrap(o.name, 16, 2);
  const bioLines = wrap(o.bio, 44, 3);

  const nameStartY = nameLines.length === 1 ? 335 : 285;
  const bioStartY = nameStartY + (nameLines.length - 1) * 90 + 62;

  // handle pill sizing
  const pillTextChars = `fyora.app/${o.handle}`.length;
  const pillW = Math.min(760, 60 + pillTextChars * 22);
  const pillX = 1136 - pillW;
  const pillY = 76;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg1" cx="90%" cy="10%" r="60%">
      <stop offset="0%" stop-color="${o.g0}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${o.g0}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bg2" cx="5%" cy="95%" r="60%">
      <stop offset="0%" stop-color="${o.g1}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${o.g1}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="avatarG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${o.g0}"/>
      <stop offset="100%" stop-color="${o.g1}"/>
    </linearGradient>
    <pattern id="dots" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1.6" cy="1.6" r="1.6" fill="#141313" fill-opacity="0.05"/>
    </pattern>
  </defs>

  <!-- Paper background -->
  <rect width="1200" height="630" fill="#FBF7EE"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#bg1)"/>
  <rect width="1200" height="630" fill="url(#bg2)"/>

  <!-- Brand wordmark -->
  <text x="64" y="128" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="68" fill="#141313" letter-spacing="-1.5">fyora<tspan fill="#FF6B4A">.</tspan></text>

  <!-- Handle pill shadow -->
  <rect x="${pillX + 8}" y="${pillY + 8}" width="${pillW}" height="72" rx="36" fill="#141313"/>
  <!-- Handle pill -->
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="72" rx="36" fill="#ffffff" stroke="#141313" stroke-width="4"/>
  <text x="${pillX + pillW / 2}" y="${pillY + 48}" text-anchor="middle" font-family="'Arial Black','Helvetica Neue',sans-serif" font-weight="900" font-size="32" fill="#141313" letter-spacing="-1">
    <tspan>fyora</tspan><tspan fill="#FF6B4A">.</tspan><tspan>app/</tspan><tspan font-family="'Courier New',ui-monospace,monospace" font-weight="700" dx="4">${esc(o.handle)}</tspan>
  </text>

  <!-- Avatar tile shadow -->
  <rect x="74" y="234" width="220" height="220" rx="44" fill="#141313"/>
  <!-- Avatar tile -->
  <rect x="64" y="224" width="220" height="220" rx="44" fill="url(#avatarG)" stroke="#141313" stroke-width="5"/>
  <text x="174" y="386" text-anchor="middle" font-size="130" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${esc(o.emoji)}</text>

  <!-- Name -->
  ${nameLines
    .map(
      (l, i) =>
        `<text x="326" y="${nameStartY + i * 90}" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-weight="700" font-size="90" fill="#141313" letter-spacing="-2.5">${esc(l)}</text>`,
    )
    .join("\n  ")}

  <!-- Bio -->
  ${bioLines
    .map(
      (l, i) =>
        `<text x="326" y="${bioStartY + i * 38}" font-family="Helvetica,Arial,sans-serif" font-size="28" fill="#4a4a4a">${esc(l)}</text>`,
    )
    .join("\n  ")}

  <!-- CTA shadow -->
  <rect x="72" y="512" width="320" height="82" rx="41" fill="#141313"/>
  <!-- CTA -->
  <rect x="64" y="504" width="320" height="82" rx="41" fill="#C6F24E" stroke="#141313" stroke-width="5"/>
  <text x="224" y="558" text-anchor="middle" font-family="'Arial Black','Helvetica Neue',sans-serif" font-weight="900" font-size="34" fill="#141313" letter-spacing="-1">Send a tip →</text>

  <!-- Tagline right -->
  <text x="1136" y="558" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="22" fill="#141313">Any chain in · your chain out</text>
</svg>`;
}
