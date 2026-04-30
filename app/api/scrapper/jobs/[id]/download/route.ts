import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/role-check";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("scrapper_jobs")
    .select("status, result_storage_bucket, result_storage_path")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message || "Job not found" }, { status: 404 });
  }

  if (job.status !== "completed" || !job.result_storage_bucket || !job.result_storage_path) {
    return NextResponse.json(
      { error: "Job is not completed or has no file available" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from(job.result_storage_bucket)
    .createSignedUrl(job.result_storage_path, 60);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signError?.message || "Failed to create signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}

