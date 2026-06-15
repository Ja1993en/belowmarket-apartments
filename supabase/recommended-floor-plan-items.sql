alter table public.leads
add column if not exists recommended_floor_plan_items jsonb not null default '[]'::jsonb;
