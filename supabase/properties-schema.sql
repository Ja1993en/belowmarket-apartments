-- Below Market Apartments required database tables
-- Run this first in Supabase SQL Editor. This creates the shared property database.

create table if not exists public.management_companies (
  id text primary key,
  name text not null,
  contact_name text,
  phone text,
  email text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  name text not null default '',
  status text not null default 'Draft',
  city text,
  state text,
  zipcode text,
  management_company_id text references public.management_companies(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_city_state_idx on public.properties(city, state);
create index if not exists properties_management_company_idx on public.properties(management_company_id);

alter table public.management_companies enable row level security;
alter table public.properties enable row level security;

drop policy if exists "Allow anon read management companies" on public.management_companies;
create policy "Allow anon read management companies"
  on public.management_companies
  for select
  to anon
  using (true);

drop policy if exists "Allow anon write management companies" on public.management_companies;
create policy "Allow anon write management companies"
  on public.management_companies
  for insert
  to anon
  with check (true);

drop policy if exists "Allow anon update management companies" on public.management_companies;
create policy "Allow anon update management companies"
  on public.management_companies
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon delete management companies" on public.management_companies;
create policy "Allow anon delete management companies"
  on public.management_companies
  for delete
  to anon
  using (true);

drop policy if exists "Allow anon read properties" on public.properties;
create policy "Allow anon read properties"
  on public.properties
  for select
  to anon
  using (true);

drop policy if exists "Allow anon write properties" on public.properties;
create policy "Allow anon write properties"
  on public.properties
  for insert
  to anon
  with check (true);

drop policy if exists "Allow anon update properties" on public.properties;
create policy "Allow anon update properties"
  on public.properties
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon delete properties" on public.properties;
create policy "Allow anon delete properties"
  on public.properties
  for delete
  to anon
  using (true);

-- Force PostgREST/Supabase API to reload its schema cache.
notify pgrst, 'reload schema';
