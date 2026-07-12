import { createFileRoute } from "@tanstack/react-router";
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import React from "react";

const WIDTH = 1200;
const HEIGHT = 630;
const INK = "#141313";
const PAPER = "#FBF7EE";
const CORAL = "#FF6B4A";
const LIME = "#C6F24E";
const FONT_PATHS = [
  ["Fraunces", "/fonts/Fraunces-Italic-700.ttf", 700, "italic"],
  ["Archivo Black", "/fonts/ArchivoBlack-Regular.ttf", 900, "normal"],
  ["DM Sans", "/fonts/DMSans-Medium.ttf", 500, "normal"],
  ["JetBrains Mono", "/fonts/JetBrainsMono-Bold.ttf", 700, "normal"],
] as const;

type CardInput = {
  name: string;
  handle: string;
  bio: string;
  emoji: string;
  gradient: [string, string];
};

type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 700 | 900;
  style: "normal" | "italic";
};

let fontsPromise: Promise<SatoriFont[]> | null = null;
let resvgPromise: Promise<void> | null = null;
const emojiCache = new Map<string, Promise<string | null>>();

export const Route = createFileRoute("/api/public/og/$handle")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const rawHandle = (params.handle ?? "")
          .replace(/\.(png|jpg|jpeg|svg)$/i, "")
          .trim()
          .toLowerCase();
        const creator = await loadCreator(rawHandle);
        const input: CardInput = creator
          ? {
              name: creator.name,
              handle: creator.handle,
              bio: creator.bio,
              emoji: creator.emoji,
              gradient: creator.gradient,
            }
          : {
              name: "Get paid from anywhere",
              handle: rawHandle || "yourname",
              bio: "One link. Any chain. Supporters pay in a tap and creators receive where they want.",
              emoji: "✨",
              gradient: ["#C6F24E", "#B8A6FF"],
            };

        try {
          const png = await renderPng(input, request.url);
          return new Response(png as unknown as BodyInit, {
            headers: {
              "content-type": "image/png",
              "cache-control":
                "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
              "content-disposition": `inline; filename="fyora-${safeFilename(input.handle)}.png"`,
              "x-content-type-options": "nosniff",
            },
          });
        } catch (error) {
          console.error("[fyora-og] PNG render failed", error);
          return fetch(new URL("/fyora-share-fallback.png", request.url));
        }
      },
    },
  },
});

async function loadCreator(handle: string) {
  if (!handle || handle === "fyora") return null;
  try {
    const { getPublicCreator } = await import("@/lib/fyora/data.server");
    return await getPublicCreator(handle);
  } catch {
    return null;
  }
}

async function loadFonts(requestUrl: string): Promise<SatoriFont[]> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = Promise.all(
    FONT_PATHS.map(async ([name, path, weight, style]) => {
      const response = await fetch(new URL(path, requestUrl));
      if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
      return { name, data: await response.arrayBuffer(), weight, style };
    }),
  );
  return fontsPromise;
}

async function initializeResvg(requestUrl: string) {
  if (resvgPromise) return resvgPromise;
  resvgPromise = (async () => {
    const { initWasm } = await import("@resvg/resvg-wasm");
    const response = await fetch(new URL(resvgWasmUrl, requestUrl));
    if (!response.ok) throw new Error(`Could not load resvg WASM (${response.status}).`);
    const bytes = await response.arrayBuffer();
    try {
      await initWasm(bytes);
    } catch (error) {
      if (!String(error).toLowerCase().includes("already initialized")) throw error;
    }
  })();
  return resvgPromise;
}

async function loadEmoji(emoji: string) {
  const existing = emojiCache.get(emoji);
  if (existing) return existing;
  const pending = (async () => {
    const codePoint = Array.from(emoji)
      .map((character) => character.codePointAt(0)?.toString(16))
      .filter((value): value is string => Boolean(value) && value !== "fe0f")
      .join("-");
    if (!codePoint) return null;
    try {
      const response = await fetch(
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`,
        { signal: AbortSignal.timeout(2500) },
      );
      if (!response.ok) return null;
      const svg = await response.text();
      return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
    } catch {
      return null;
    }
  })();
  emojiCache.set(emoji, pending);
  return pending;
}

async function renderPng(input: CardInput, requestUrl: string) {
  const [{ default: satori }, fonts, emoji, { Resvg }] = await Promise.all([
    import("satori"),
    loadFonts(requestUrl),
    loadEmoji(input.emoji),
    (async () => {
      await initializeResvg(requestUrl);
      return import("@resvg/resvg-wasm");
    })(),
  ]);
  const svg = await satori(buildCard(input, emoji), { width: WIDTH, height: HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
}

function buildCard(input: CardInput, emojiUrl: string | null) {
  const h = React.createElement;
  const [g0, g1] = input.gradient;
  const nameSize = input.name.length <= 18 ? 78 : input.name.length <= 30 ? 62 : 48;
  const handleSize = input.handle.length <= 14 ? 27 : input.handle.length <= 22 ? 22 : 18;
  const bioLines = wrapText(input.bio, 46, 3);
  const chunky = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `4px solid ${INK}`,
    boxShadow: `7px 7px 0 ${INK}`,
    ...extra,
  });

  return h(
    "div",
    {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        padding: "48px 58px",
        color: INK,
        backgroundColor: PAPER,
        backgroundImage: `radial-gradient(circle at 94% 8%, ${g0}88 0%, ${g0}00 38%), radial-gradient(circle at 2% 98%, ${g1}88 0%, ${g1}00 45%), radial-gradient(${INK}12 1.4px, transparent 1.4px)`,
        backgroundSize: "auto, auto, 25px 25px",
        border: `7px solid ${INK}`,
        borderRadius: 18,
        fontFamily: "DM Sans",
      },
    },
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", width: "100%" } },
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        h(
          "div",
          {
            style: {
              display: "flex",
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 69,
              fontWeight: 700,
              lineHeight: 1,
            },
          },
          "fyora",
          h("span", { style: { color: CORAL } }, "."),
        ),
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `5px 5px 0 ${INK}` }),
              display: "flex",
              alignItems: "baseline",
              maxWidth: 610,
              padding: "13px 24px",
              borderRadius: 999,
              background: "#fff",
              fontFamily: "Archivo Black",
              fontSize: handleSize,
              whiteSpace: "nowrap",
            },
          },
          "fyora",
          h("span", { style: { color: CORAL } }, "."),
          "app/",
          h(
            "span",
            { style: { marginLeft: 4, fontFamily: "JetBrains Mono", fontSize: handleSize - 1 } },
            shorten(input.handle, 28),
          ),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", gap: 42, marginTop: 42, alignItems: "center" } },
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `9px 9px 0 ${INK}` }),
              width: 220,
              height: 220,
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              borderRadius: 44,
              background: `linear-gradient(135deg, ${g0}, ${g1})`,
            },
          },
          emojiUrl
            ? h("img", { src: emojiUrl, width: 142, height: 142, style: { objectFit: "contain" } })
            : h(
                "div",
                {
                  style: {
                    display: "flex",
                    fontFamily: "Archivo Black",
                    fontSize: 118,
                    color: "#fff",
                    textShadow: `4px 4px 0 ${INK}`,
                  },
                },
                creatorInitial(input.name),
              ),
        ),
        h(
          "div",
          { style: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column" } },
          h(
            "div",
            {
              style: {
                display: "flex",
                maxHeight: 160,
                overflow: "hidden",
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: nameSize,
                fontWeight: 700,
                lineHeight: 0.98,
                letterSpacing: "-1px",
              },
            },
            input.name,
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                marginTop: 16,
                fontSize: 25,
                lineHeight: 1.28,
                color: "#46433f",
              },
            },
            ...bioLines.map((line, index) => h("div", { key: `${line}-${index}` }, line)),
          ),
        ),
      ),
      h(
        "div",
        {
          style: {
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 48,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          },
        },
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `8px 8px 0 ${INK}` }),
              display: "flex",
              padding: "16px 34px 18px",
              borderRadius: 999,
              background: LIME,
              fontFamily: "Archivo Black",
              fontSize: 32,
            },
          },
          "Send a tip →",
        ),
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `6px 6px 0 ${INK}` }),
              display: "flex",
              transform: "rotate(-2deg)",
              padding: "14px 22px",
              borderRadius: 16,
              background: CORAL,
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 25,
              fontWeight: 700,
            },
          },
          "Any chain in · any chain out",
        ),
      ),
    ),
    h(
      "div",
      {
        style: {
          position: "absolute",
          right: 38,
          top: 168,
          width: 72,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `4px solid ${INK}`,
          borderRadius: 999,
          background: "#FFD166",
          boxShadow: `5px 5px 0 ${INK}`,
          fontFamily: "Archivo Black",
          fontSize: 33,
          transform: "rotate(8deg)",
        },
      },
      "$",
    ),
    h("div", {
      style: {
        position: "absolute",
        right: 48,
        top: 255,
        display: "flex",
        color: "#FFD166",
        fontFamily: "DM Sans",
        fontSize: 42,
        textShadow: `2px 2px 0 ${INK}`,
      },
      children: "✦",
    }),
  );
}

function wrapText(value: string, maxCharacters: number, maxLines: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return ["Creator on Fyora"];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(" ").length < normalized.length && lines.length) {
    lines[lines.length - 1] = `${shorten(lines[lines.length - 1], maxCharacters - 1)}…`;
  }
  return lines.slice(0, maxLines);
}

function creatorInitial(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || "F";
}

function shorten(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "-") || "share";
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
