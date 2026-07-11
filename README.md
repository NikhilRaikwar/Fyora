# Fyora

Fyora is a creator money page where supporters pay from a Particle Universal Balance and creators receive their selected asset on their selected chain.

- Website: https://www.fyora.app/
- X: https://x.com/getfyora
- Primary hackathon track: Particle Universal Accounts, EIP-7702 mode
- Bonus target: Magic embedded wallets

## Production Stack

- TanStack Start, React, and Vite
- Magic email OTP and Google social login with embedded EVM and Solana wallets
- Particle Universal Accounts SDK 2.0.3 in explicit EIP-7702 mode
- Supabase Postgres for profiles, settlement configuration, payment intents, and receipts
- Cloudflare-compatible server build

Supabase Auth is intentionally not used. Magic is the product identity and wallet layer; Supabase is the server-only database.

## Supported Settlement Destinations

Destination choices come from Particle's supported primary-token registry pinned for SDK 2.0.3:

- Ethereum: USDT, USDC
- BNB Chain: USDT, USDC
- Base: USDC
- Arbitrum One: USDT, USDC
- Solana: USDT, USDC

Supporters can still fund Particle routes from supported native assets such as ETH, BNB, and SOL. Creator destinations are stablecoin-only because Fyora support amounts are denominated in USD.

Arbitrum USDT is the default hackathon settlement. X Layer is supported by Particle UA but is hidden until the SDK exposes a supported primary settlement token for it.

## Run Locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Fill every required Magic, Particle, and server-only key in `.env.local`. Never expose `SUPABASE_SECRET_KEY` or `MAGIC_SECRET_KEY` as `VITE_*` variables.

## Demo Flow

1. Sign in with Magic by email or Google.
2. Claim a creator page and select a destination chain/token.
3. Open the public creator page in a supporter session.
4. Select `$0.10` or enter a small custom amount.
5. View the real Particle Universal Balance.
6. Sign the EIP-7702 authorization and root hash.
7. Wait for Particle server verification before Fyora marks the payment confirmed.
8. Open the transaction in UniversalX and view it in the creator dashboard.

The Supabase migration is in `supabase/migrations`. Product requirements and the hackathon implementation checklist are in [FYORA_PRD.md](./FYORA_PRD.md).
