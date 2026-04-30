import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("scrapper_jobs")
    .select("progress")
    .eq("id", id)
    .single();

  const progress =
    existing && typeof existing.progress === "object" && existing.progress
      ? existing.progress
      : {};

  const { data, error } = await supabase
    .from("scrapper_jobs")
    .update({
      cancelled: true,
      status: "cancelled",
      progress: { ...(progress as Record<string, unknown>), lastMessage: "Cancelled by user" },
    })
    .eq("id", id)
    .select("id, status, cancelled")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}

