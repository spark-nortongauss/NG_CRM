import { createAdminClient } from "@/lib/supabase/admin";

export const SCRAPPER_BUCKET = "scrapper-results";

export async function uploadScrapperResultXlsx(params: {
  jobId: string;
  buffer: Buffer;
}): Promise<{ bucket: string; path: string }> {
  const supabase = createAdminClient();

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const path = `jobs/${yyyy}-${mm}-${dd}/${params.jobId}.xlsx`;

  const { error } = await supabase.storage
    .from(SCRAPPER_BUCKET)
    .upload(path, params.buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload result to storage: ${error.message}`);
  }

  return { bucket: SCRAPPER_BUCKET, path };
}

