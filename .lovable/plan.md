## Goal
Remove the "Your share card" preview section from the dashboard, and replace the two hardcoded static images (`/og-nikhil.jpg`, `/og-default.jpg`) with a share card that's **auto-generated per creator** from their live info (name, handle, emoji, gradient, settlement chain).

## Changes

### 1. Dashboard cleanup (`src/routes/dashboard.index.tsx`)
Delete the entire "Share card preview" block (lines ~150–175). The QR + copy-link card above it already covers sharing UX on the dashboard.

### 2. Dynamic OG image endpoint
Create a public server route:

```text
src/routes/api/public/og.$handle[.png].ts   →   /api/public/og/{handle}.png
```

The route:
- Reads `handle` from params, looks up the creator in the same mock store data (`src/lib/mock/creators.ts`).
- Renders a 1200×630 share card using **Satori** (JSX → SVG) + **@resvg/resvg-wasm** (SVG → PNG). Both are Cloudflare Worker–compatible; no native binaries.
- Card layout matches current sticker aesthetic: paper background, big italic serif name, `fyora.app/handle` pill in Archivo Black, emoji avatar tile with the creator's gradient, tagline, "Send a tip →" CTA, chain badge for settlement.
- Returns `image/png` with `Cache-Control: public, max-age=3600`.
- Unknown handle → renders a generic "Get paid from anywhere" card (same template, default copy).

Font loading: fetch Fraunces + Archivo Black + DM Sans from Google Fonts once at module scope (cached by Worker).

### 3. Wire the OG tag (`src/routes/$handle.tsx`)
Replace the static `/og-nikhil.jpg | /og-default.jpg` branch with:

```ts
{ property: "og:image", content: `/api/public/og/${params.handle}.png` }
{ property: "twitter:image", content: `/api/public/og/${params.handle}.png` }
```

Every user's link now unfurls with a card built from their own profile — no per-user asset needed.

### 4. Cleanup
- Delete `public/og-nikhil.jpg` and `public/og-default.jpg` (no longer referenced).
- Remove the default `og:image` from `src/routes/__root.tsx` if it points at one of those files (leaf routes own og:image per project guidance).

## Technical notes
- Packages to add: `satori`, `@resvg/resvg-wasm`.
- Route lives under `/api/public/*` so it bypasses auth and is scrapable by Twitter/Facebook/iMessage/Discord/WhatsApp.
- Social platforms cache OG images aggressively; first share after a change may need a debugger refresh (Twitter Card Validator, Facebook Sharing Debugger). We'll mention this in the response, not in UI.
- Non-existent handles still return a valid 200 PNG (generic card) so scrapers never see a broken image.

## Out of scope
- Persisting real creator data (still using the mock store for the demo).
- Auth on the OG endpoint (must remain public for crawlers).