export function toDedupePart(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function buildContactDedupeKey(input: {
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  job_title?: string | null;
}): string {
  return [
    toDedupePart(input.first_name),
    toDedupePart(input.last_name),
    toDedupePart(input.organization),
    toDedupePart(input.job_title),
  ].join("|");
}
