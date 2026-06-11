-- Below Market Apartments Supabase setup
-- Run this in Supabase SQL Editor before using the live admin property form.

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

drop policy if exists "Public read management companies" on public.management_companies;
create policy "Public read management companies"
  on public.management_companies
  for select
  to anon
  using (true);

drop policy if exists "Public write management companies" on public.management_companies;
create policy "Public write management companies"
  on public.management_companies
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "Public read properties" on public.properties;
create policy "Public read properties"
  on public.properties
  for select
  to anon
  using (true);

drop policy if exists "Public write properties" on public.properties;
create policy "Public write properties"
  on public.properties
  for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'property-photos');

drop policy if exists "Public write property photos" on storage.objects;
create policy "Public write property photos"
  on storage.objects
  for all
  to anon
  using (bucket_id = 'property-photos')
  with check (bucket_id = 'property-photos');
