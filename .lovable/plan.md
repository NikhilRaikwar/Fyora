## Rebrand Kivo → Fyora

Full text rebrand across the app. Folder `src/components/kivo/` stays put (rename would touch 12 import paths for zero user-visible gain); only user-visible strings, wordmarks, URLs, and metadata change.

### 1. Wordmark & handle URL
`src/components/kivo/Logo.tsx`
- `BrandLink` wordmark: `kivo.` → `fyora.` (keep coral dot, italic Fraunces)
- `HandleUrl` prefix: `kivo.app` → `fyora.app`

### 2. Metadata (`src/routes/__root.tsx`)
- Title: `Fyora — Get paid from anywhere, land anywhere`
- Description: swap Kivo → Fyora
- Author, `og:title`, `og:description`, `twitter:*` → Fyora

### 3. Per-route head() titles
- `src/routes/$handle.tsx`: `Support @handle on Fyora`
- `src/routes/dashboard.tsx`, `dashboard.edit.tsx`, `onboard.tsx`, `explore.tsx`: Kivo → Fyora
- Any share/copy URLs (`https://kivo.app/...` → `https://fyora.app/...`)

### 4. In-app copy
- Landing (`index.tsx`), onboarding, dashboard, payment sheet, explore, "Powered by Kivo" sticker → "Powered by Fyora"
- Seed supporter note in `creators.ts`: "loved your Kivo build!" → "loved your Fyora build!"

### 5. Store & persistence
`src/lib/mock/store.ts`
- Persist key: `kivo-demo-v2` → `fyora-demo-v1` (forces fresh seed so old cached "Kivo" strings clear on next load)
- Leave hook names (`useKivo`) alone — internal identifier, not user-visible. Renaming touches every route with zero UX benefit.

### 6. What stays (intentional)
- Folder `src/components/kivo/` and hook name `useKivo` — pure code identifiers, invisible to users. Can be renamed later if desired.
- Favicon — no new brand mark yet (you removed the K icon). Keep default until you want a Fyora mark generated.
- Color palette, fonts, layout — untouched.

### 7. Verification
- `rg -i "kivo"` across `src/routes` and `src/lib` should return zero matches after the pass (aside from the folder/hook identifier by design).
- Load `/`, `/nikhil`, `/dashboard`, `/onboard` and confirm wordmark reads **fyora.** and handle URLs read **fyora.app/nikhil**.

After approval I'll do all edits in one batch.
