-- Below Market Apartments lead workflow fields
-- Run this in the Supabase SQL Editor before relying on SMS consent or follow-up dates.

alter table public.leads
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_consent_at timestamptz,
  add column if not exists next_follow_up_at timestamptz;

create index if not exists leads_next_follow_up_at_idx
  on public.leads(next_follow_up_at)
  where status <> 'Archived';

notify pgrst, 'reload schema';
