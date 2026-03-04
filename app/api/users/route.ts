import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    const auth = await requireSuperAdmin();
    if (!auth.authorized) return auth.response;

    try {
        const supabaseAdmin = createAdminClient();

        // Fetch all users from Supabase Auth
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000,
        });

        if (error) {
            return NextResponse.json(
                { error: "Failed to fetch users" },
                { status: 500 }
            );
        }

        const users = (data?.users || []).map((u) => ({
            id: u.id,
            email: u.email || "",
            full_name: u.user_metadata?.full_name || u.email || "—",
            role: u.user_metadata?.role || "user",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at || null,
        }));

        return NextResponse.json({ users });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
