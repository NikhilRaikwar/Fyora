import { createFileRoute } from "@tanstack/react-router";
import React from "react";

const WIDTH = 1200;
const HEIGHT = 630;
const INK = "#141313";
const PAPER = "#FBF7EE";
const CORAL = "#FF6B4A";
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
  avatarUrl: string | null;
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
const imageCache = new Map<string, Promise<string | null>>();

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
              avatarUrl: creator.avatarUrl,
              gradient: creator.gradient,
            }
          : {
              name: "Get paid from anywhere",
              handle: rawHandle || "yourname",
              bio: "Create your Fyora profile and share one clean creator link.",
              emoji: "F",
              avatarUrl: null,
              gradient: ["#C6F24E", "#B8A6FF"],
            };

        try {
          const png = await renderPng(input, request.url);
          return new Response(png as unknown as BodyInit, {
            headers: pngHeaders(input.handle),
          });
        } catch (error) {
          console.error("[fyora-og] PNG render failed", error);
          return fallbackPng(request.url, input.handle, "render-error");
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

function getBaseUrl(requestUrl: string) {
  return new URL(requestUrl).origin;
}

async function loadFonts(requestUrl: string): Promise<SatoriFont[]> {
  if (fontsPromise) return fontsPromise;
  const baseUrl = getBaseUrl(requestUrl);
  fontsPromise = Promise.all(
    FONT_PATHS.map(async ([name, relativePath, weight, style]) => {
      const targetUrl = new URL(relativePath, baseUrl).toString();
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Could not load ${name} (${response.status}) from ${targetUrl}`);
      }
      return { name, data: await response.arrayBuffer(), weight, style };
    }),
  );
  return fontsPromise;
}

async function initializeResvg(requestUrl: string) {
  if (resvgPromise) return resvgPromise;
  const baseUrl = getBaseUrl(requestUrl);
  resvgPromise = (async () => {
    const { initWasm } = await import("@resvg/resvg-wasm");
    const targetUrl = new URL("/resvg/index_bg.wasm", baseUrl).toString();
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error(`Could not load resvg WASM (${response.status})`);
    try {
      await initWasm(await response.arrayBuffer());
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

async function loadImageDataUrl(url: string | null) {
  if (!url) return null;
  const existing = imageCache.get(url);
  if (existing) return existing;
  const pending = (async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) return null;
      return `data:${contentType};base64,${encodeBase64Bytes(await response.arrayBuffer())}`;
    } catch {
      return null;
    }
  })();
  imageCache.set(url, pending);
  return pending;
}

async function renderPng(input: CardInput, requestUrl: string) {
  const [{ default: satori }, fonts, emoji, avatarImage, { Resvg }] = await Promise.all([
    import("satori"),
    loadFonts(requestUrl),
    loadEmoji(input.emoji),
    loadImageDataUrl(input.avatarUrl),
    (async () => {
      await initializeResvg(requestUrl);
      return import("@resvg/resvg-wasm");
    })(),
  ]);
  const svg = await satori(buildCard(input, emoji, avatarImage), {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
}

function buildCard(input: CardInput, emojiUrl: string | null, avatarImageUrl: string | null) {
  const h = React.createElement;
  const [g0, g1] = input.gradient;
  const nameSize = input.name.length <= 18 ? 86 : input.name.length <= 30 ? 68 : 52;
  const handleSize = input.handle.length <= 14 ? 31 : input.handle.length <= 22 ? 25 : 20;
  const bioLines = wrapText(input.bio, 48, 2);
  const chunky = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `5px solid ${INK}`,
    boxShadow: `9px 9px 0 ${INK}`,
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
        padding: "56px 60px",
        color: INK,
        backgroundColor: PAPER,
        backgroundImage: `radial-gradient(circle at 89% 12%, ${g0}88 0%, ${g0}00 34%), radial-gradient(circle at 5% 92%, ${g1}88 0%, ${g1}00 42%), radial-gradient(${INK}16 1.5px, transparent 1.5px)`,
        backgroundSize: "auto, auto, 24px 24px",
        border: `9px solid ${INK}`,
        borderRadius: 22,
        fontFamily: "DM Sans",
      },
    },
    h(
      "div",
      { style: { display: "flex", width: "100%", flexDirection: "column" } },
      h(
        "div",
        { style: { display: "flex", justifyContent: "flex-end" } },
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `6px 6px 0 ${INK}` }),
              display: "flex",
              alignItems: "baseline",
              maxWidth: 610,
              marginRight: 98,
              padding: "12px 24px",
              borderRadius: 22,
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
            { style: { marginLeft: 5, fontFamily: "JetBrains Mono", fontSize: handleSize - 2 } },
            shorten(input.handle, 29),
          ),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", gap: 42, marginTop: 48, alignItems: "center" } },
        h(
          "div",
          {
            style: {
              ...chunky({ boxShadow: `11px 11px 0 ${INK}` }),
              width: 250,
              height: 250,
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              borderRadius: 42,
              background: `linear-gradient(135deg, ${g0}, ${g1})`,
            },
          },
          avatarImageUrl
            ? h("img", {
                src: avatarImageUrl,
                width: 250,
                height: 250,
                style: { objectFit: "cover" },
              })
            : emojiUrl
              ? h("img", {
                  src: emojiUrl,
                  width: 154,
                  height: 154,
                  style: { objectFit: "contain" },
                })
              : h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontFamily: "Archivo Black",
                      fontSize: 126,
                      color: "#fff",
                      textShadow: `5px 5px 0 ${INK}`,
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
                maxHeight: 180,
                overflow: "hidden",
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: nameSize,
                fontWeight: 700,
                lineHeight: 0.96,
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
                marginTop: 20,
                fontSize: 30,
                fontWeight: 500,
                lineHeight: 1.24,
                color: "#34312f",
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
            right: 64,
            bottom: 70,
            display: "flex",
            alignItems: "baseline",
            fontFamily: "Archivo Black",
            fontSize: 70,
          },
        },
        "fyora",
        h("span", { style: { color: CORAL } }, "."),
      ),
    ),
    h(
      "div",
      {
        style: {
          position: "absolute",
          right: 58,
          top: 42,
          width: 86,
          height: 86,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `5px solid ${INK}`,
          borderRadius: 999,
          background: "#FFD166",
          boxShadow: `6px 6px 0 ${INK}`,
          fontFamily: "Archivo Black",
          fontSize: 38,
          transform: "rotate(12deg)",
        },
      },
      "$",
    ),
  );
}

async function fallbackPng(requestUrl: string, handle: string, reason: string) {
  const fallback = await fetch(new URL("/fyora-share-fallback.png", getBaseUrl(requestUrl)));
  return new Response(fallback.body, {
    headers: {
      ...pngHeaders(handle),
      "x-fyora-og-fallback": reason,
    },
  });
}

function pngHeaders(handle: string) {
  return {
    "content-type": "image/png",
    "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    "content-disposition": `inline; filename="fyora-${safeFilename(handle)}.png"`,
    "x-content-type-options": "nosniff",
  };
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
  return encodeBase64Bytes(new TextEncoder().encode(value));
}

function encodeBase64Bytes(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
