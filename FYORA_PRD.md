# Fyora PRD

Last updated: 2026-07-14

## Product

Fyora is a creator money page for chain-abstracted payments.

Creators get a public page at `https://www.fyora.app/{handle}`. Supporters open the page, choose an amount, sign in with Privy email or Google, and pay through Particle Universal Accounts in EIP-7702 mode. The supporter sees one login and one Universal Balance. Fyora handles chain routing, gas abstraction, transaction proof, and confirmed-payment metrics. The creator receives their selected token on their selected settlement chain.

Brand handles:

- Website: `https://www.fyora.app/`
- X/Twitter: `https://x.com/getfyora`

One-line pitch:

```txt
Fyora lets creators receive money from anyone, on any chain, through one beautiful page.
```

## Hackathon Strategy

### Primary Track: Particle Universal Accounts Track

Submit Fyora to the Universal Accounts Track.

| Requirement                                            | Fyora response                                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Use Universal Accounts SDK in EIP-7702 mode            | Payment and wallet flows initialize Particle Universal Accounts with the Privy embedded EOA owner.         |
| At least one cross-chain operation moving value via UA | Supporter payments and Wallet Center sends use `createTransferTransaction()` and `sendTransaction()`.      |
| Functional deployed or runnable demo                   | Demo is deployed to `https://www.fyora.app/` and runnable locally with documented env vars.                |

Judging alignment:

| Criteria                     | Weight | Fyora strategy                                                                                                     |
| ---------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------ |
| UX excellence                |    40% | Public creator page, embedded login, no bridge UI, no gas explanation in the main path.                            |
| Prominent UA + EIP-7702 use  |    30% | Universal Balance, EIP-7702 authorization, cross-chain transfer, and UniversalX proof are visible in the demo.     |
| Adoption potential           |    20% | Creators already share bio links; Fyora turns that behavior into global crypto receiving.                          |
| Technical quality and polish |    10% | Supabase-backed production state, dynamic social cards, verified transaction records, and focused error handling.  |

## Architecture

### Identity And Signing

- Privy React SDK provides email/Google login.
- Privy creates an embedded Ethereum wallet for every user on login.
- The Privy embedded EOA is the Universal Account owner.
- Fyora verifies Privy access tokens server-side with `@privy-io/node`.
- Supabase Auth is not used.
- Existing Supabase columns keep their current names for demo speed; Privy user IDs are mapped into the legacy owner issuer column until a post-demo schema cleanup.

### Particle Universal Accounts

- Particle Universal Accounts SDK is the source of balances, receive addresses, transfer quotes, transaction submission, and transaction history.
- `getSmartAccountOptions()` resolves Universal receive addresses.
- `getPrimaryAssets()` powers the Wallet Center Universal Balance and primary-asset cards.
- `createTransferTransaction()` builds supporter payments and wallet sends.
- Privy signs the EIP-7702 authorization and Particle transaction root.
- `sendTransaction()` submits to Particle and returns a UniversalX transaction ID/link.

### Supabase

Supabase stores:

- Creator profiles and handles.
- Uploaded creator avatar URL.
- Settlement chain/token/address configuration.
- Payment intents and confirmed transaction receipts.
- Source-chain evidence from verified Particle transactions.

Supabase Storage includes a public `creator-avatars` bucket.

## User Flows

### Creator Onboarding

1. Creator signs in with Privy email or Google.
2. Privy creates the embedded EOA.
3. Fyora resolves Particle Universal receive addresses.
4. Creator claims a handle, adds profile details/photo, and chooses settlement token/chain.
5. Fyora stores the settlement receiver as the Universal receive address where possible.

### Supporter Payment

1. Supporter opens `fyora.app/{handle}`.
2. Supporter enters an amount and optional note.
3. Supporter signs in with Privy.
4. Fyora loads Particle Universal Balance.
5. Fyora creates a Particle transfer transaction to the creator's settlement receiver.
6. Privy signs the EIP-7702 authorization and root hash.
7. Particle executes the route.
8. Fyora verifies the transaction through Particle RPC and records confirmed metrics.

### Wallet Center

1. User opens `/wallet`.
2. Fyora shows the Universal receive address and signer address.
3. User can fund the Universal receive address with a tiny Base USDC/ETH amount for demo.
4. Fyora refreshes `getPrimaryAssets()`.
5. User sends from Universal Balance to any supported destination token/chain.
6. Fyora shows pending/confirmed/failed/refunded states and UniversalX proof.

## Dynamic Social Cards

Every profile exposes an absolute, versioned PNG card:

```txt
https://www.fyora.app/api/public/og/{handle}.png?v={updatedAt}
```

Cards use Supabase profile data, uploaded creator photo when present, emoji/gradient fallback, warm paper styling, creator handle, CTA, and Fyora branding. The endpoint returns PNG, never SVG, for social crawler compatibility.

## Required Env Vars

```env
VITE_FYORA_PUBLIC_URL=
VITE_PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_VERIFICATION_KEY=
VITE_PARTICLE_PROJECT_ID=
VITE_PARTICLE_CLIENT_KEY=
VITE_PARTICLE_APP_ID=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
PARTICLE_RPC_URL=
```

## Demo Checklist

- Privy email/Google login creates an embedded wallet.
- Wallet Center shows Universal receive address.
- Base USDC/ETH funding appears in Particle Universal Balance.
- A tiny payment or wallet send signs through Privy and submits through Particle.
- UniversalX link opens for the transaction.
- Creator dashboard metrics count confirmed payments only.
- Public profile card unfurls as a personalized PNG.

## Non-Targets

- No private-key demo signer.
- No server-owned transfer fallback.
- No Supabase Auth.
- No additional account abstraction provider in the final demo path.
