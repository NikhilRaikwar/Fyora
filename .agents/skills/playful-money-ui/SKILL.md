---
name: playful-money-ui
description: Build playful neo-brutalist "friendly money" UIs — warm off-white canvas, chunky ink borders, hard offset sticker shadows, editorial italic serif headlines, lime/coral/lilac accents, spring motion. Use when the user asks for a Kivo-style, Cash App × Linktree × Duolingo aesthetic, or any playful creator / payments / directory product that should feel tactile, warm, and personality-driven rather than clean-corporate.
---

# Playful Money UI

A concrete, opinionated design system. Follow it end-to-end — the aesthetic collapses if half the rules are dropped.

## The commitment

- Warm off-white paper canvas, not white. Deep ink text, not gray.
- Editorial italic serif for headlines. Every screen has at least one italic phrase.
- Every meaningful surface has a **2px ink border** and a **hard offset drop-shadow** ("sticker shadow"). No soft blurred shadows. No borderless cards.
- Bold blocks of color. Pick one accent per section; don't blend the palette evenly.
- Motion is springy and playful — never linear, never over 400ms for UI.

## Design tokens (drop into `src/styles.css`)

```css
@theme inline {
  --font-display: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;

  --color-ink: var(--ink);
  --color-paper: var(--paper);
  --color-lime: var(--lime);
  --color-coral: var(--coral);
  --color-lilac: var(--lilac);
  --color-sky: var(--sky);
  --color-butter: var(--butter);
}

:root {
  --radius: 1rem;

  --paper: oklch(0.972 0.02 90);   /* #FBF7EE-ish warm off-white */
  --ink:   oklch(0.18 0.01 60);    /* near-black warm */
  --lime:  oklch(0.92 0.19 122);   /* signature #C6F24E */
  --coral: oklch(0.72 0.19 30);    /* #FF6B4A */
  --lilac: oklch(0.78 0.11 300);   /* #B8A6FF */
  --sky:   oklch(0.85 0.08 230);
  --butter:oklch(0.93 0.11 90);

  --background: var(--paper);
  --foreground: var(--ink);
  --card: oklch(1 0 0);
  --primary: var(--ink);
  --primary-foreground: var(--paper);
  --secondary: oklch(0.94 0.02 90);
  --muted: oklch(0.94 0.015 90);
  --muted-foreground: oklch(0.45 0.02 60);
  --accent: var(--lime);
  --border: var(--ink);
}
```

Load fonts via `<link>` in the root route head — never `@import` a remote font in `styles.css` (Lightning CSS fails):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

## Signature utilities

```css
@utility chunky       { border: 2px solid var(--ink); }
@utility chunky-thick { border: 3px solid var(--ink); }
@utility shadow-sticker    { box-shadow: 4px 4px 0 0 var(--ink); }
@utility shadow-sticker-sm { box-shadow: 2px 2px 0 0 var(--ink); }
@utility shadow-sticker-lg { box-shadow: 6px 6px 0 0 var(--ink); }
@utility press {
  transition: transform 120ms ease, box-shadow 120ms ease;
  &:hover  { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 0 var(--ink); }
  &:active { transform: translate(2px,2px);  box-shadow: 2px 2px 0 0 var(--ink); }
}
@utility grid-paper {
  background-image: radial-gradient(circle at 1px 1px, oklch(0.18 0.01 60 / 0.08) 1px, transparent 0);
  background-size: 24px 24px;
}
```

Every button, chip, card gets `chunky` + a `shadow-sticker*` + `press`. That's the entire button system.

## Type rules

- Headlines: `font-display italic` — Instrument Serif. Never bold-weighted display; italic + large is the voice.
- One "underline swoosh" per hero: an inline SVG scribble under the key italic noun, stroked in `--lime`, 8px round-cap.
- Body/UI: DM Sans 400–600. All caps micro-labels use `text-xs uppercase font-bold tracking-wider text-muted-foreground` — this is a repeating motif above every card section.
- Numbers (money totals) use `font-display italic` — never a tabular sans.
- Odometer/rolling-count animation on any large number.

## Composition patterns

- **Cards**: `rounded-3xl bg-card chunky-thick shadow-sticker-lg p-6 sm:p-8`. Slight `rotate(-1deg…1deg)` on grid items for hand-placed feel.
- **Sticker chips**: pill, uppercase, 2px border, small offset shadow, `transform: rotate(-4deg)` on mount via spring. One per section as a tag/eyebrow.
- **Amount picker**: 4-col grid of chunky rounded tiles, italic serif number, selected = filled `bg-lime` + full sticker shadow, unselected = `bg-card` + small shadow.
- **Emoji avatar**: circle with 2px ink border, 2-stop diagonal gradient background, emoji ~55% of size, mounted with spring `rotate: -6 → 0`.
- **Dividers**: wiggly inline SVG path — never a straight `<hr>`.
- **Empty states**: single large emoji + italic serif line + one chunky CTA. No stock illustrations.
- **Confirmations**: `canvas-confetti` burst using palette colors `["#C6F24E", "#FF6B4A", "#B8A6FF", "#FFD166"]`.

## Motion (framer-motion / motion/react)

- Buttons: `whileTap={{ scale: 0.95 }}`. Nothing else needed.
- Card entry: `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}` — 220ms.
- Stickers/avatars on mount: `type: "spring", stiffness: 200, damping: 12` with a small rotation.
- Multi-step flows (payment, wizard): `AnimatePresence mode="wait"` between steps, `y: 10 → 0 → -10`.
- Loading: rotating emoji disc (⚡ / 🚀) inside a chunky lime circle, `duration: 2, repeat: Infinity, linear`.
- Floating decorative coins/stickers in hero: slow `y` sine loop, 4–8s.

## Anti-patterns (do NOT do these)

- Soft blurred `shadow-lg` / `shadow-xl` — replaces the sticker shadow and kills the aesthetic.
- Gray borders (`border-gray-200`) — always `border-ink` / the `chunky` utility.
- Pure white page background — always the warm `--paper`.
- Inter / Poppins / any generic sans as the display face.
- Purple-to-blue gradients on white — the generic AI look this system explicitly rejects.
- `text-white` / `bg-black` hardcodes in components — use `text-paper` / `bg-ink` semantic tokens.
- Rounded-full ghost buttons with no border and no shadow — every button must feel like a physical sticker.

## Responsive rules

- Display headlines: step `text-4xl sm:text-5xl md:text-6xl` (rarely `text-7xl+`) — italic serif at 60px+ needs mobile downshifts or it clips.
- Top-of-page action rows: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`, with `flex-wrap gap-2` on button clusters.
- Text next to a fixed avatar: wrap in `min-w-0` and `truncate` the handle/URL line so long handles don't overflow.
- Modals/sheets: `w-[calc(100vw-1.5rem)] sm:w-full max-w-md`, inner padding `p-4 sm:p-6`.
- Stat card numerals: `text-3xl sm:text-5xl` — the huge display sizes must shrink on mobile or two cards side-by-side collide.
- Grid tiles (amount picker, chain picker): `grid-cols-4` on mobile stays fine because tiles are square; keep py `py-3 sm:py-4`.

## Required packages

```
motion            # or framer-motion
canvas-confetti
qrcode.react      # if the product surfaces shareable URLs
zustand           # for local mock state (demo builds)
lucide-react      # icons — thin, monoline, they sit well against chunky borders
sonner            # toasts
```

## Sanity checklist before shipping a screen

1. Background is warm paper, not white.
2. At least one italic serif phrase visible.
3. Every card has 2–3px ink border + a hard offset shadow.
4. One sticker chip per section as an eyebrow label.
5. Primary CTA is a full-width pill with `bg-ink text-paper chunky-thick shadow-sticker-lg press`.
6. Mobile: headlines don't clip, cards don't have side-scroll, buttons don't overflow their container.
7. Any success moment fires confetti in the palette colors.
