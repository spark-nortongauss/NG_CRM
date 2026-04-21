import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const apolloId = request.nextUrl.searchParams.get("apolloId")?.trim();
  if (!apolloId) {
    return NextResponse.json({ error: "Missing apolloId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("apollo_phone_cache")
    .select("phone")
    .eq("apollo_id", apolloId)
    .maybeSingle();

  if (error) {
    console.error("Apollo phone poll read failed", { apolloId, error: error.message });
    return NextResponse.json({ error: "Failed to poll phone cache" }, { status: 500 });
  }

  return NextResponse.json({ phone: data?.phone ?? null });
}
