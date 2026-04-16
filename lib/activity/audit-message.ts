import { getContactFieldLabels, getOrganizationFieldLabels } from "@/lib/activity/log";

export type ActivityLogLike = {
  action_type: string;
  actor_name: string | null;
  actor_email: string | null;
  entity_type: "contact" | "organization" | "task";
  metadata: Record<string, unknown> | null;
  summary?: string | null;
};

function formatScalar(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getActionPhrase(actionType: string) {
  const map: Record<string, string> = {
    "contact.created": "created a contact",
    "contact.updated": "updated a contact",
    "contact.deleted": "deleted a contact",
    "organization.created": "created an organization",
    "organization.updated": "updated an organization",
    "organization.deleted": "deleted an organization",
    "task.created": "created a task",
    "task.updated": "updated a task",
    "task.deleted": "deleted a task",
  };
  return map[actionType] ?? actionType;
}

type DiffEntry = { label: string; before: string; after: string };

function pickLabel(field: string, entityType: ActivityLogLike["entity_type"]) {
  const contact = getContactFieldLabels();
  const org = getOrganizationFieldLabels();
  if (entityType === "organization") return org[field] ?? contact[field] ?? field.replace(/_/g, " ");
  return contact[field] ?? org[field] ?? field.replace(/_/g, " ");
}

export function formatActivityLogMessage(
  row: ActivityLogLike,
  contactDisplayName: string | null,
  organizationDisplayName: string | null,
): any {
  const persisted = (row.summary ?? "").trim() || (row.metadata?.summary as string | undefined)?.trim();
  if (persisted) return { isStructured: false, text: persisted };

  const actor = row.actor_name?.trim() || row.actor_email || "Someone";
  const meta = row.metadata ?? {};
  const metaContactName = typeof meta.contact_name === "string" ? meta.contact_name : null;
  const metaOrgName = typeof meta.organization_name === "string" ? meta.organization_name : null;

  const targetName =
    row.entity_type === "organization"
      ? organizationDisplayName ?? metaOrgName ?? "this organization"
      : row.entity_type === "contact"
        ? contactDisplayName ?? metaContactName ?? "this contact"
        : "this record";


  const diffsUnknown = meta.field_diffs;
  if (Array.isArray(diffsUnknown) && diffsUnknown.length > 0) {
    const first = diffsUnknown[0] as Partial<DiffEntry>;
    const label = typeof first.label === "string" ? first.label : "a field";
    const before = typeof first.before === "string" ? first.before : formatScalar(first.before);
    const after = typeof first.after === "string" ? first.after : formatScalar(first.after);
    return {
      isStructured: true,
      actor,
      actionWord: "updated",
      field: label,
      targetName,
      targetType: row.entity_type,
      details: `${before} → ${after}`
    };
  }

  const patch = meta.patch;
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    const keys = Object.keys(patch as Record<string, unknown>);
    if (keys.length >= 1) {
      const field = keys[0];
      const label = pickLabel(field, row.entity_type);
      const value = formatScalar((patch as Record<string, unknown>)[field]);
      if (keys.length === 1) {
        return {
          isStructured: true,
          actor,
          actionWord: "set",
          field: label,
          targetName,
          targetType: row.entity_type,
          details: `to ${value}`
        };
      }
      return {
        isStructured: true,
        actor,
        actionWord: "updated",
        field: `${keys.length} fields`,
        targetName,
        targetType: row.entity_type,
        details: `including ${label} → ${value}`
      };
    }
  }

  return {
    isStructured: true,
    actor,
    actionWord: getActionPhrase(row.action_type),
    targetName: "",
    targetType: row.entity_type,
    details: ""
  };
}
