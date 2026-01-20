-- Create contacts table
create table if not exists public.contacts (
    id uuid not null default gen_random_uuid(),
    first_name text null,
    last_name text null,
    organization text null,
    mobile_1 text null,
    mobile_2 text null,
    mobile_3 text null,
    fixed_number text null,
    email_1 text null,
    email_2 text null,
    email_3 text null,
    city text null,
    state text null,
    country text null,
    contact_status text null check (contact_status = any (array['Not Contacted'::text, 'Email'::text, 'LinkedIn'::text, 'Call'::text])),
    contact_date timestamp with time zone null,
    contacted boolean null default false,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint contacts_pkey primary key (id)
);

-- Enable RLS
alter table public.contacts enable row level security;

-- Create policies (allowing all access for now as per typical starter setup, or authenticated)
-- Adjust policies as needed for security requirements
create policy "Enable read access for all users" on public.contacts
    for select using (true);

create policy "Enable insert for all users" on public.contacts
    for insert with check (true);

create policy "Enable update for all users" on public.contacts
    for update using (true);

create policy "Enable delete for all users" on public.contacts
    for delete using (true);
