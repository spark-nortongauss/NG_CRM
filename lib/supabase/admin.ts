import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service role key for admin operations.
 * This should ONLY be used server-side (API routes, server actions).
 * It bypasses Row Level Security and has full access to user management.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
