-- Candidatech — schéma initial - Version 1.0.0

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (id, user_id),
  name text not null check (char_length(trim(name)) between 1 and 120),
  sector text check (char_length(sector) <= 140),
  location text check (char_length(location) <= 120),
  career_url text,
  teams text check (char_length(teams) <= 200),
  offers text check (char_length(offers) <= 800),
  contract_compatibility text not null default 'À vérifier'
    check (contract_compatibility in ('À vérifier', 'Oui', 'Non', 'Non précisé')),
  contact text check (char_length(contact) <= 120),
  linkedin_url text,
  verified_on date,
  next_action text check (char_length(next_action) <= 180),
  prospecting_status text not null default 'À rechercher'
    check (prospecting_status in ('À rechercher', 'À contacter', 'Contacté', 'Relance à faire', 'Offre repérée', 'Candidature envoyée', 'Pas de cible pour le moment')),
  notes text check (char_length(notes) <= 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (id, user_id),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null check (char_length(trim(company_name)) between 1 and 120),
  role_title text not null check (char_length(trim(role_title)) between 1 and 160),
  applied_on date,
  offer_url text,
  contract_type text not null default 'À vérifier'
    check (contract_type in ('À vérifier', 'Contrat de professionnalisation confirmé', 'Contrat d’apprentissage', 'CDD/CDI', 'Non compatible')),
  cv_version text check (char_length(cv_version) <= 100),
  application_channel text check (char_length(application_channel) <= 80),
  contact_name text check (char_length(contact_name) <= 120),
  status text not null default 'À préparer'
    check (status in ('À préparer', 'À envoyer', 'Envoyée', 'Contacté', 'Relance à faire', 'Entretien', 'Refus', 'Sans réponse', 'Offre obtenue', 'Clôturée')),
  contacted_on date,
  follow_up_due_on date,
  follow_up_done_on date,
  next_action text not null default '' check (char_length(next_action) <= 180),
  next_action_due_on date,
  notes text check (char_length(notes) <= 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_company_owner_match
    foreign key (company_id, user_id)
    references public.companies(id, user_id)
    on delete set null (company_id)
);

-- Met à niveau la clé primaire de l'ancien schéma (id seul) sans toucher aux lignes.
do $$
declare
  constraint_name text;
  constraint_definition text;
begin
  select conname, pg_get_constraintdef(oid)
    into constraint_name, constraint_definition
    from pg_constraint
   where conrelid = 'public.companies'::regclass
     and contype = 'p';
  if constraint_definition <> 'PRIMARY KEY (id, user_id)' then
    execute format('alter table public.companies drop constraint %I', constraint_name);
    alter table public.companies
      add constraint companies_pkey primary key (id, user_id);
  end if;

  select conname, pg_get_constraintdef(oid)
    into constraint_name, constraint_definition
    from pg_constraint
   where conrelid = 'public.applications'::regclass
     and contype = 'p';
  if constraint_definition <> 'PRIMARY KEY (id, user_id)' then
    execute format('alter table public.applications drop constraint %I', constraint_name);
    alter table public.applications
      add constraint applications_pkey primary key (id, user_id);
  end if;
end;
$$;

-- La clé étrangère composite garantit qu'une candidature ne peut référencer
-- qu'une entreprise appartenant au même utilisateur.

create index if not exists companies_user_updated_idx
  on public.companies (user_id, updated_at desc);
create index if not exists applications_user_updated_idx
  on public.applications (user_id, updated_at desc);
create index if not exists applications_user_status_idx
  on public.applications (user_id, status);
create index if not exists applications_user_due_idx
  on public.applications (user_id, next_action_due_on);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

-- Le propriétaire des lignes est fixé par la session côté base, pas par le client.
create or replace function public.set_record_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists companies_set_owner on public.companies;
create trigger companies_set_owner
before insert or update on public.companies
for each row execute function public.set_record_owner();

drop trigger if exists applications_set_owner on public.applications;
create trigger applications_set_owner
before insert or update on public.applications
for each row execute function public.set_record_owner();

-- Création automatique du profil à la création d'un compte Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS : aucune ligne n'est accessible sans authentification et propriété.
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.applications enable row level security;

-- L'API expose uniquement les opérations nécessaires aux comptes authentifiés.
revoke all on public.profiles, public.companies, public.applications from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete
  on public.companies, public.applications to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can manage own companies" on public.companies;
create policy "Users can manage own companies"
on public.companies for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own applications" on public.applications;
create policy "Users can manage own applications"
on public.applications for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);