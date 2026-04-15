-- Activity log table for audit + dashboard analytics
-- Tracks who did what, when, and via which channel (email/phone/linkedin/etc.)

create table if not exists public.activity_log (
  id uuid not null default gen_random_uuid(),
  occurred_at timestamp with time zone not null default timezone('utc'::text, now()),

  actor_user_id uuid null references public.users (id) on delete set null,
  actor_email text null,
  actor_name text null,

  entity_type text not null check (entity_type in ('contact', 'organization', 'task')),
  entity_id uuid not null,

  action_type text not null,
  channel text null check (channel in ('email', 'phone', 'linkedin', 'meeting', 'other') or channel is null),

  -- optional denormalized links for convenience
  contact_id uuid null references public.contacts (id) on delete set null,
  org_id uuid null references public.organizations (org_id) on delete set null,

  metadata jsonb null default '{}'::jsonb,

  constraint activity_log_pkey primary key (id)
);

create index if not exists activity_log_occurred_at_idx on public.activity_log (occurred_at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index if not exists activity_log_actor_idx on public.activity_log (actor_user_id);
create index if not exists activity_log_channel_idx on public.activity_log (channel);

alter table public.activity_log enable row level security;

-- Starter policies (aligns with current open policies on other tables)
create policy "Enable read access for all users" on public.activity_log
  for select using (true);

create policy "Enable insert for all users" on public.activity_log
  for insert with check (true);

create policy "Enable delete for all users" on public.activity_log
  for delete using (true);
