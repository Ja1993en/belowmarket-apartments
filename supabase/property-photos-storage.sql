-- Below Market Apartments property photo storage
-- Run this in Supabase SQL Editor so the live app can upload public property photos.

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'property-photos');

drop policy if exists "Public upload property photos" on storage.objects;
create policy "Public upload property photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'property-photos');

drop policy if exists "Public update property photos" on storage.objects;
create policy "Public update property photos"
  on storage.objects
  for update
  to anon
  using (bucket_id = 'property-photos')
  with check (bucket_id = 'property-photos');

drop policy if exists "Public delete property photos" on storage.objects;
create policy "Public delete property photos"
  on storage.objects
  for delete
  to anon
  using (bucket_id = 'property-photos');
