import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityChannel = "email" | "phone" | "linkedin" | "meeting" | "other";
export type ActivityEntityType = "contact" | "organization" | "task";

export type ActivityLogInsert = {
  occurred_at?: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
  entity_type: ActivityEntityType;
  entity_id: string;
  action_type: string;
  channel?: ActivityChannel | null;
  contact_id?: string | null;
  org_id?: string | null;
  /** Denormalized audit line (also stored in metadata.summary for backwards compatibility). */
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
};

const CONTACT_FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  organization: "Organization",
  job_title: "Job title",
  linkedin_url: "LinkedIn URL",
  mobile_1: "Mobile 1",
  mobile_2: "Mobile 2",
  mobile_3: "Mobile 3",
  fixed_number: "Fixed number",
  email_1: "Email 1",
  email_2: "Email 2",
  email_3: "Email 3",
  city: "City",
  state: "State",
  country: "Country",
  contact_status: "Contact status",
  contact_date: "Contact date",
  contacted: "Contacted",
  cold_call_status: "Cold call status",
  cold_email_status: "Cold email status",
  linkedin_status: "LinkedIn status",
  note: "Note",
};

const ORG_FIELD_LABELS: Record<string, string> = {
  legal_name: "Legal name",
  trade_name: "Trade name",
  company_type: "Company type",
  website_url: "Website URL",
  primary_email: "Primary email",
  primary_phone_e164: "Primary phone",
  hq_country_code: "HQ country",
  hq_address_line1: "HQ address line 1",
  hq_address_line2: "HQ address line 2",
  hq_city: "HQ city",
  hq_region: "HQ region",
  hq_postal_code: "HQ postal code",
  timezone: "Timezone",
  industry_primary: "Industry",
  business_model: "Business model",
  employee_count_range: "Employee count range",
  annual_revenue_amount: "Annual revenue amount",
  annual_revenue_currency: "Annual revenue currency",
  account_owner_user_id: "Account owner",
  account_tier: "Account tier",
  lifecycle_stage: "Lifecycle stage",
  source_channel: "Source channel",
  registration_number: "Registration number",
  tax_id: "Tax ID",
  marketing_opt_in_status: "Marketing opt-in",
  do_not_contact: "Do not contact",
  billing_email: "Billing email",
  payment_terms: "Payment terms",
  preferred_currency: "Preferred currency",
  internal_notes: "Internal notes",
};

type DiffEntry = {
  field: string;
  label: string;
  before: string;
  after: string;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function buildFieldDiffs(
  before: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
  fieldLabels: Record<string, string>,
): DiffEntry[] {
  if (!before || !patch) return [];
  const diffs: DiffEntry[] = [];

  for (const key of Object.keys(patch)) {
    const previousValue = before[key];
    const nextValue = patch[key];
    if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) continue;

    diffs.push({
      field: key,
      label: fieldLabels[key] ?? key.replace(/_/g, " "),
      before: formatValue(previousValue),
      after: formatValue(nextValue),
    });
  }

  return diffs;
}

export function getContactFieldLabels() {
  return CONTACT_FIELD_LABELS;
}

export function getOrganizationFieldLabels() {
  return ORG_FIELD_LABELS;
}

/**
 * Best-effort audit + analytics logging.
 * Never throw: dashboard logging must not break core CRUD flows.
 */
export async function logActivity(
  supabase: SupabaseClient,
  entry: ActivityLogInsert,
) {
  try {
    const meta = entry.metadata ?? {};
    const summaryFromMeta = typeof meta.summary === "string" ? meta.summary : null;
    const { error } = await supabase.from("activity_log").insert({
      occurred_at: entry.occurred_at ?? new Date().toISOString(),
      actor_user_id: entry.actor_user_id ?? null,
      actor_email: entry.actor_email ?? null,
      actor_name: entry.actor_name ?? null,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action_type: entry.action_type,
      channel: entry.channel ?? null,
      contact_id: entry.contact_id ?? null,
      org_id: entry.org_id ?? null,
      summary: entry.summary ?? summaryFromMeta,
      metadata: meta,
    });
    if (error) console.error("activity_log insert failed:", error);
  } catch (e) {
    console.error("activity_log insert error:", e);
  }
}

