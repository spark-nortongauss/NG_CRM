-- Denormalized human-readable audit line for fast reads and guaranteed UI display
alter table public.activity_log
  add column if not exists summary text;

-- Best-effort backfill from existing JSON metadata
update public.activity_log
set summary = metadata->>'summary'
where (summary is null or summary = '')
  and metadata is not null
  and metadata ? 'summary'
  and coalesce(metadata->>'summary', '') <> '';
