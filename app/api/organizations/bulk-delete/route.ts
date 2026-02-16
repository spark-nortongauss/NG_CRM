import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";

export async function POST(request: NextRequest) {
  // Only super admins can bulk delete organizations
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = await createClient();

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: ids array is required" },
        { status: 400 }
      );
    }

    // Delete organizations with the specified IDs
    const { error, count } = await supabase
      .from("organizations")
      .delete()
      .in("org_id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: count || ids.length,
      message: `Successfully deleted ${count || ids.length} organization(s)`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
