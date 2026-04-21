create table if not exists public.apollo_phone_cache (
  apollo_id text primary key,
  phone text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists apollo_phone_cache_created_at_idx
  on public.apollo_phone_cache (created_at desc);

alter table public.apollo_phone_cache enable row level security;

create policy "Enable read access for all users" on public.apollo_phone_cache
  for select using (true);

create policy "Enable insert for all users" on public.apollo_phone_cache
  for insert with check (true);

create policy "Enable update for all users" on public.apollo_phone_cache
  for update using (true);
