create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_magic_issuer text not null unique,
  owner_evm_address text not null unique,
  owner_solana_address text,
  handle text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_emoji text not null default '✨',
  gradient jsonb not null default '["#C6F24E", "#B8A6FF"]'::jsonb,
  socials jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle = lower(handle) and handle ~ '^[a-z0-9_]{2,30}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 80),
  constraint profiles_bio_length check (char_length(bio) <= 280),
  constraint profiles_evm_address_format check (owner_evm_address ~ '^0x[0-9a-f]{40}$'),
  constraint profiles_solana_address_format check (
    owner_solana_address is null
    or owner_solana_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  ),
  constraint profiles_gradient_shape check (
    jsonb_typeof(gradient) = 'array' and jsonb_array_length(gradient) = 2
  ),
  constraint profiles_socials_shape check (jsonb_typeof(socials) = 'array')
);

create table public.settlement_configs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  network_type text not null,
  chain_id integer not null,
  chain_slug text not null,
  token_symbol text not null,
  token_address text not null,
  token_decimals integer not null,
  receiver_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_network_type check (network_type in ('evm', 'solana')),
  constraint settlement_chain_id check (chain_id in (1, 56, 101, 196, 8453, 42161)),
  constraint settlement_token_symbol check (token_symbol in ('ETH', 'USDC', 'USDT', 'BNB', 'SOL')),
  constraint settlement_token_decimals check (token_decimals between 0 and 30),
  constraint settlement_receiver_present check (char_length(receiver_address) between 32 and 64)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  supporter_evm_address text not null,
  supporter_name text,
  supporter_emoji text not null default '✨',
  note text,
  amount_usd numeric(12, 6) not null,
  status text not null default 'created',
  destination_network_type text not null,
  destination_chain_id integer not null,
  destination_chain_slug text not null,
  destination_token_symbol text not null,
  destination_token_address text not null,
  destination_token_decimals integer not null,
  destination_receiver_address text not null,
  particle_transaction_id text unique,
  universalx_url text,
  source_evidence jsonb not null default '[]'::jsonb,
  raw_result jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint payments_supporter_evm_address_format check (supporter_evm_address ~ '^0x[0-9a-f]{40}$'),
  constraint payments_supporter_name_length check (supporter_name is null or char_length(supporter_name) <= 80),
  constraint payments_note_length check (note is null or char_length(note) <= 240),
  constraint payments_amount_range check (amount_usd between 0.001 and 500),
  constraint payments_status check (
    status in ('created', 'submitted', 'refunding', 'refunded', 'confirmed', 'failed')
  ),
  constraint payments_destination_network_type check (destination_network_type in ('evm', 'solana')),
  constraint payments_destination_chain_id check (
    destination_chain_id in (1, 56, 101, 196, 8453, 42161)
  ),
  constraint payments_source_evidence_shape check (jsonb_typeof(source_evidence) = 'array')
);

create index profiles_published_created_at_idx
  on public.profiles (created_at desc)
  where published = true;

create index payments_profile_created_at_idx
  on public.payments (profile_id, created_at desc);

create index payments_supporter_created_at_idx
  on public.payments (supporter_evm_address, created_at desc);

create index payments_confirmed_profile_created_at_idx
  on public.payments (profile_id, created_at desc)
  where status = 'confirmed';

create index payments_reconciliation_idx
  on public.payments (updated_at)
  where status in ('submitted', 'refunding');

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger settlement_configs_set_updated_at
before update on public.settlement_configs
for each row execute function private.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.settlement_configs enable row level security;
alter table public.payments enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.settlement_configs from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.settlement_configs to service_role;
grant select, insert, update, delete on table public.payments to service_role;

revoke execute on function private.set_updated_at() from public, anon, authenticated;
grant execute on function private.set_updated_at() to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
