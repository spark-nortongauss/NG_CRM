import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("org_id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Organization not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Only super admins can edit organizations
    const auth = await requireSuperAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    try {
        const { data, error } = await supabase
            .from("organizations")
            .update({
                ...body,
                updated_by_user_id: auth.userId,
                updated_at: new Date().toISOString(),
            })
            .eq("org_id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Only super admins can delete organizations
    const auth = await requireSuperAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("organizations")
            .delete()
            .eq("org_id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
