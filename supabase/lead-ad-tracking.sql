-- Below Market Apartments lead ad tracking fields
-- Run this in Supabase SQL Editor so Google Ads/UTM details save on new leads.

alter table public.leads
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists landing_page text,
  add column if not exists referrer text;

create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_utm_campaign_idx on public.leads(utm_campaign);
create index if not exists leads_gclid_idx on public.leads(gclid);

-- Force PostgREST/Supabase API to reload its schema cache.
notify pgrst, 'reload schema';
