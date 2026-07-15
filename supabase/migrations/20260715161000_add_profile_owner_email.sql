alter table public.profiles
  add column if not exists owner_email text;

update public.profiles
set owner_email = lower(trim(owner_email))
where owner_email is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_owner_email_lowercase'
  ) then
    alter table public.profiles
      add constraint profiles_owner_email_lowercase
      check (owner_email is null or owner_email = lower(trim(owner_email)));
  end if;
end $$;

create unique index if not exists profiles_owner_email_key
  on public.profiles (owner_email)
  where owner_email is not null;
