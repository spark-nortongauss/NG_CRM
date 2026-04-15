-- Add created_by / updated_by to contacts for attribution

alter table public.contacts
  add column if not exists created_by_user_id uuid null references public.users (id) on delete set null;

alter table public.contacts
  add column if not exists updated_by_user_id uuid null references public.users (id) on delete set null;

create index if not exists contacts_created_by_user_id_idx on public.contacts (created_by_user_id);
create index if not exists contacts_updated_by_user_id_idx on public.contacts (updated_by_user_id);
