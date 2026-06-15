-- Below Market Apartments lead quality field
-- Run this in Supabase SQL Editor so admin lead quality can persist.

alter table public.leads
  add column if not exists lead_quality text not null default 'New';

create index if not exists leads_lead_quality_idx on public.leads(lead_quality);

-- Backfill any older rows that may have a blank value.
update public.leads
set lead_quality = 'New'
where lead_quality is null or trim(lead_quality) = '';

-- Force PostgREST/Supabase API to reload its schema cache.
notify pgrst, 'reload schema';
