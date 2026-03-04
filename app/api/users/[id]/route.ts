import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdmin();
    if (!auth.authorized) return auth.response;

    try {
        const { id } = await params;

        // Prevent super_admin from deleting themselves
        if (id === auth.userId) {
            return NextResponse.json(
                { error: "You cannot delete your own account." },
                { status: 403 }
            );
        }

        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (error) {
            return NextResponse.json(
                { error: "Failed to delete user" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
