-- Below Market Apartments conversion event tracking
-- Run this in Supabase SQL Editor.

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  event_type text not null,
  property_id text,
  property_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_id_idx
  on public.lead_events(lead_id);

create index if not exists lead_events_event_type_idx
  on public.lead_events(event_type);

create index if not exists lead_events_created_at_idx
  on public.lead_events(created_at desc);

alter table public.lead_events enable row level security;

drop policy if exists "Allow public lead event inserts" on public.lead_events;
create policy "Allow public lead event inserts"
  on public.lead_events
  for insert
  with check (true);

drop policy if exists "Allow public lead event reads" on public.lead_events;
create policy "Allow public lead event reads"
  on public.lead_events
  for select
  using (true);

notify pgrst, 'reload schema';
