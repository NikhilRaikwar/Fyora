alter table public.profiles
  add column if not exists owner_particle_uuid text;

alter table public.profiles
  alter column owner_magic_issuer drop not null;

alter table public.profiles
  drop constraint if exists profiles_owner_magic_issuer_key;

drop index if exists profiles_owner_magic_issuer_key;

create unique index if not exists profiles_owner_particle_uuid_key
  on public.profiles(owner_particle_uuid)
  where owner_particle_uuid is not null;

truncate table public.payments, public.settlement_configs, public.profiles restart identity cascade;

alter table public.profiles
  alter column owner_particle_uuid set not null;
