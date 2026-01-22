"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Organization {
  org_id: string;
  legal_name: string;
  trade_name: string | null;
  company_type: string | null;
  website_url: string | null;
  primary_email: string | null;
  primary_phone_e164: string | null;
  hq_country_code: string | null;
  hq_address_line1: string | null;
  hq_address_line2: string | null;
  hq_city: string | null;
  hq_region: string | null;
  hq_postal_code: string | null;
  timezone: string | null;
  industry_primary: string | null;
  business_model: string | null;
  employee_count_range: string | null;
  annual_revenue_amount: number | null;
  annual_revenue_currency: string | null;
  account_tier: string | null;
  lifecycle_stage: string | null;
  source_channel: string | null;
  registration_number: string | null;
  tax_id: string | null;
  marketing_opt_in_status: boolean;
  do_not_contact: boolean;
  billing_email: string | null;
  payment_terms: string | null;
  preferred_currency: string | null;
  internal_notes: string | null;
  discovery_search_terms: string | null;
  discovery_sources: string | null;
  keywords: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow indexing for generic handler
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/${id}`);
      if (!response.ok) throw new Error("Failed to fetch organization");
      const data = await response.json();
      setOrganization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: any) => {
    if (!organization) return;

    // specific parsing for numbers/booleans if needed
    let processedValue = value;
    if (field === "annual_revenue_amount") {
      processedValue = value ? parseFloat(value) : null;
    }

    try {
      setSavingField(field);
      const response = await fetch(`/api/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: processedValue }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const updatedData = await response.json();
      setOrganization((prev) => ({ ...prev!, [field]: updatedData[field] }));
    } catch (err) {
      console.error(err);
      // Revert UI if needed, or show error toast
    } finally {
      setSavingField(null);
    }
  };

  const EditableField = ({
    label,
    field,
    type = "text",
    placeholder = "-",
  }: {
    label: string;
    field: string;
    type?: string;
    placeholder?: string;
  }) => {
    const [localValue, setLocalValue] = useState(
      organization?.[field]?.toString() || "",
    );

    // Sync local state when org data changes (e.g. after save)
    useEffect(() => {
      setLocalValue(organization?.[field]?.toString() || "");
    }, [organization, field]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur(); // Trigger blur to save
        handleUpdate(field, localValue);
      }
    };

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-8 transition-colors focus:bg-blue-50/50"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {savingField === field ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : // Show checkmark briefly if just saved? (Complexity for later)
            // For now standard input is fine
            null}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="p-6 text-center text-red-600">
        Error: {error || "Organization not found"}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {organization.legal_name}
          </h1>
          <p className="text-sm text-gray-500">
            Created {new Date(organization.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Basic Information
          </h3>
          <div className="space-y-4">
            <EditableField label="Legal Name" field="legal_name" />
            <EditableField label="Trade Name" field="trade_name" />
            <EditableField label="Company Type" field="company_type" />
            <EditableField label="Website" field="website_url" />
          </div>
        </section>

        {/* Contact Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Contact Information
          </h3>
          <div className="space-y-4">
            <EditableField label="Email" field="primary_email" type="email" />
            <EditableField
              label="Phone"
              field="primary_phone_e164"
              type="tel"
            />
          </div>
        </section>

        {/* Address */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Address (HQ)
          </h3>
          <div className="space-y-4">
            <EditableField label="Street 1" field="hq_address_line1" />
            <EditableField label="Street 2" field="hq_address_line2" />
            <EditableField label="City" field="hq_city" />
            <EditableField label="Region/State" field="hq_region" />
            <EditableField label="Postal Code" field="hq_postal_code" />
            <EditableField label="Country" field="hq_country_code" />
          </div>
        </section>

        {/* Business Details */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Business Details
          </h3>
          <div className="space-y-4">
            <EditableField label="Industry" field="industry_primary" />
            <EditableField label="Business Model" field="business_model" />
            <EditableField label="Employees" field="employee_count_range" />
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Revenue"
                field="annual_revenue_amount"
                type="number"
              />
              <EditableField label="Currency" field="annual_revenue_currency" />
            </div>
          </div>
        </section>

        {/* Account Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Account Status
          </h3>
          <div className="space-y-4">
            <EditableField label="Tier" field="account_tier" />
            <EditableField label="Lifecycle Stage" field="lifecycle_stage" />
            <EditableField label="Source Channel" field="source_channel" />
          </div>
        </section>

        {/* Compliance */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Compliance & Finance
          </h3>
          <div className="space-y-4">
            <EditableField label="Reg. Number" field="registration_number" />
            <EditableField label="Tax ID" field="tax_id" />
            <EditableField label="Billing Email" field="billing_email" />
            <EditableField label="Payment Terms" field="payment_terms" />
          </div>
        </section>

        {/* Notes (Full Width) */}
        <section className="col-span-full space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Internal Notes
          </h3>
          <EditableField label="Notes" field="internal_notes" />
        </section>

        {/* Discovery & Keywords (Full Width) */}
        <section className="col-span-full space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
            Discovery & Keywords
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField
              label="Discovery Search Terms"
              field="discovery_search_terms"
            />
            <EditableField label="Keywords" field="keywords" />
            <div className="md:col-span-2">
              <EditableField
                label="Discovery Sources (JSON)"
                field="discovery_sources"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
