# Supabase Migrations

This directory contains SQL migration scripts for the Norton-Gauss CRM database.

## Migrations

### 20260119_create_users_table.sql

Creates the `public.users` table with:

- Automatic sync with `auth.users` via trigger
- Row Level Security (RLS) policies
- User metadata fields

**To apply this migration:**

```bash
# Using Supabase CLI
supabase db push

# Or manually via Supabase dashboard
# Copy and paste the SQL into the SQL Editor
```

## Seeds

### 001_demo_user.sql

Creates a demo user for testing:

- Email: `demo@nortongauss.com`
- Password: `Demo@123456`

**To apply seeds:**

```bash
# Using Supabase CLI
supabase db seed

# Or manually via Supabase dashboard
# Copy and paste the SQL into the SQL Editor
```

## Important Notes

1. **Migration Order**: Migrations should be applied in chronological order (by filename)
2. **Idempotency**: All migrations use `IF NOT EXISTS` or `CREATE OR REPLACE` to be idempotent
3. **Auth Sync**: The trigger function ensures `public.users` stays in sync with `auth.users`
4. **Security**: RLS policies ensure users can only access their own data

## Troubleshooting

If you encounter "Database error querying schema" when logging in:

1. Ensure all string columns in `auth.users` are set to empty strings (not NULL)
2. Verify the identity record exists in `auth.identities` for the user
3. Check that the trigger function has `SECURITY DEFINER` and `SET search_path = public`
