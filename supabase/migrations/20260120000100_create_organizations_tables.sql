-- Create organizations table and supporting tables

create table if not exists public.organizations (
    org_id uuid not null default gen_random_uuid(),
    legal_name text not null,
    trade_name text null,
    company_type text null,
    website_url text null,
    primary_email text null,
    primary_phone_e164 text null,
    hq_country_code text null,
    hq_address_line1 text null,
    hq_address_line2 text null,
    hq_city text null,
    hq_region text null,
    hq_postal_code text null,
    timezone text null,
    industry_primary text null,
    business_model text null,
    employee_count_range text null,
    annual_revenue_amount numeric null,
    annual_revenue_currency text null,
    account_owner_user_id uuid null references public.users (id) on delete set null,
    account_tier text null,
    lifecycle_stage text null,
    source_channel text null,
    registration_number text null,
    tax_id text null,
    marketing_opt_in_status boolean null default false,
    do_not_contact boolean null default false,
    billing_email text null,
    payment_terms text null,
    preferred_currency text null,
    internal_notes text null,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    created_by_user_id uuid null references public.users (id) on delete set null,
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_by_user_id uuid null references public.users (id) on delete set null,
    constraint organizations_pkey primary key (org_id)
);

-- Enable RLS
alter table public.organizations enable row level security;

-- Simple starter policies - adjust for production
create policy "Enable read access for all users" on public.organizations
    for select using (true);

create policy "Enable insert for all users" on public.organizations
    for insert with check (true);

create policy "Enable update for all users" on public.organizations
    for update using (true);

create policy "Enable delete for all users" on public.organizations
    for delete using (true);

-- Organization tags (many-to-many style tags table)
create table if not exists public.organization_tags (
    org_id uuid not null references public.organizations (org_id) on delete cascade,
    tag_name text not null,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    constraint organization_tags_pkey primary key (org_id, tag_name)
);

alter table public.organization_tags enable row level security;

create policy "Enable read access for all users" on public.organization_tags
    for select using (true);

create policy "Enable insert for all users" on public.organization_tags
    for insert with check (true);

create policy "Enable delete for all users" on public.organization_tags
    for delete using (true);

-- Organization addresses (supports multiple locations, future use)
create table if not exists public.organization_addresses (
    address_id uuid not null default gen_random_uuid(),
    org_id uuid not null references public.organizations (org_id) on delete cascade,
    address_type text null check (address_type = any (array['HQ'::text, 'Billing'::text, 'Office'::text, 'Warehouse'::text])),
    address_line1 text null,
    address_line2 text null,
    city text null,
    region text null,
    postal_code text null,
    country_code text null,
    is_primary boolean null default false,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    constraint organization_addresses_pkey primary key (address_id)
);

alter table public.organization_addresses enable row level security;

create policy "Enable read access for all users" on public.organization_addresses
    for select using (true);

create policy "Enable insert for all users" on public.organization_addresses
    for insert with check (true);

create policy "Enable update for all users" on public.organization_addresses
    for update using (true);

create policy "Enable delete for all users" on public.organization_addresses
    for delete using (true);

-- Organization contacts link table (future use)
create table if not exists public.organization_contacts (
    org_id uuid not null references public.organizations (org_id) on delete cascade,
    contact_id uuid not null references public.contacts (id) on delete cascade,
    relationship_type text null check (relationship_type = any (array['Primary'::text, 'Billing'::text, 'Decision Maker'::text])),
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    constraint organization_contacts_pkey primary key (org_id, contact_id, relationship_type)
);

alter table public.organization_contacts enable row level security;

create policy "Enable read access for all users" on public.organization_contacts
    for select using (true);

create policy "Enable insert for all users" on public.organization_contacts
    for insert with check (true);

create policy "Enable delete for all users" on public.organization_contacts
    for delete using (true);


