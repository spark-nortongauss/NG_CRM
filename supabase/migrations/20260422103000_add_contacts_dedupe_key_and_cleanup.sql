alter table public.contacts
  add column if not exists dedupe_key text;

update public.contacts
set dedupe_key = lower(trim(coalesce(first_name, '')))
  || '|' || lower(trim(coalesce(last_name, '')))
  || '|' || lower(trim(coalesce(organization, '')))
  || '|' || lower(trim(coalesce(job_title, '')))
where dedupe_key is null;

with ranked as (
  select
    id,
    row_number() over (
      partition by dedupe_key
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.contacts
  where dedupe_key is not null
)
delete from public.contacts c
using ranked r
where c.id = r.id
  and r.rn > 1;

alter table public.contacts
  alter column dedupe_key set not null;

create unique index if not exists contacts_dedupe_key_unique
  on public.contacts (dedupe_key);
