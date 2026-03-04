import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin();
    if (!auth.authorized) return auth.response;

    try {
        const { id } = await params;
        const body = await request.json();
        const { role } = body;

        if (!role || !["super_admin", "user"].includes(role)) {
            return NextResponse.json(
                { error: "Invalid role. Must be 'super_admin' or 'user'." },
                { status: 400 }
            );
        }

        // Prevent super_admin from changing their own role
        if (id === auth.userId) {
            return NextResponse.json(
                { error: "You cannot change your own role." },
                { status: 403 }
            );
        }

        const supabaseAdmin = createAdminClient();

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: { role },
        });

        if (error) {
            return NextResponse.json(
                { error: "Failed to update user role" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || "user",
        });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
