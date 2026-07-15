# Fyora PRD

Fyora is a Linktree-style creator money page for chain-abstracted support.

Creators claim `https://www.fyora.app/{handle}`. Supporters sign in with Particle email or Google, review one Universal Balance, and send value through Particle Universal Accounts in EIP-7702 mode. Fyora handles profile data, settlement preferences, social cards, and confirmed-payment metrics through Supabase.

## Main Track Fit

| Requirement | Fyora implementation |
| --- | --- |
| Universal Accounts SDK in EIP-7702 mode | Wallet and payment flows create Particle Universal Accounts from the Particle Auth EOA owner. |
| Cross-chain operation moving value via UA | Supporter payments and wallet sends use `createTransferTransaction()` and `sendTransaction()`. |
| Functional demo | Live app at `https://www.fyora.app`, runnable locally with env vars. |

## Product Flow

1. User signs in with Particle email or Google.
2. Particle Auth creates/loads the EOA.
3. Fyora resolves the Particle Universal receive address.
4. Creator claims a handle and chooses settlement chain/token.
5. Supporter opens the profile and creates a payment intent.
6. Fyora builds a Particle UA transfer.
7. Particle Auth signs the transaction root.
8. Particle executes the route and returns a UniversalX proof.
9. Supabase records the confirmed payment and dashboard metrics update.

## Data Model

- `profiles.owner_particle_uuid` is the active creator owner key.
- `profiles.owner_magic_issuer` remains nullable only for legacy schema compatibility.
- `settlement_configs.receiver_address` stores the resolved Universal receive address.
- `payments` stores intents, submitted Particle transaction ids, UniversalX links, and confirmed status.

## Demo Priorities

1. Smooth Particle social login.
2. Fresh handle claim from reset Supabase data.
3. Wallet center showing Universal Balance and receive QR.
4. One tiny real Particle UA transfer with UniversalX proof.
5. Public profile and automatic PNG share card.
