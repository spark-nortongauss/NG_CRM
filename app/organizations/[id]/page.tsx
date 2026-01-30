"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Users, Globe, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WebsiteScanModal } from "@/components/WebsiteScanModal";
import { ApolloSearchModal } from "@/components/ApolloSearchModal";

interface OrganizationContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  fixed_number: string | null;
  email_1: string | null;
  linkedin_url: string | null;
  organization: string | null;
}

interface Organization {
  org_id: string;
  legal_name: string;
  trade_name: string | null;
  company_type: string | null;
  website_url: string | null;
  linkedin_url: string | null;
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
  vertical: string | null;
  sub_vertical: string | null;
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
  const [contacts, setContacts] = useState<OrganizationContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [showWebsiteScanModal, setShowWebsiteScanModal] = useState(false);
  const [showApolloSearchModal, setShowApolloSearchModal] = useState(false);

  useEffect(() => {
    fetchOrganization();
    fetchContacts();
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

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await fetch(`/api/organizations/${id}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    } finally {
      setContactsLoading(false);
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

  // Component for displaying multi-value fields (comma-separated) with line breaks
  const MultiValueDisplayField = ({
    label,
    field,
    type = "text",
  }: {
    label: string;
    field: string;
    type?: "email" | "tel" | "text";
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(
      organization?.[field]?.toString() || ""
    );

    useEffect(() => {
      setLocalValue(organization?.[field]?.toString() || "");
    }, [organization, field]);

    const values = localValue ? localValue.split(",").map((v: string) => v.trim()).filter(Boolean) : [];

    const handleSave = () => {
      handleUpdate(field, localValue);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        setLocalValue(organization?.[field]?.toString() || "");
        setIsEditing(false);
      }
    };

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Enter values separated by commas"
              className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-400">
              Separate multiple values with commas. Press Enter to save, Esc to cancel.
            </p>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[38px] rounded-md border border-gray-200 bg-white px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            {values.length > 0 ? (
              <div className="space-y-1">
                {values.map((value: string, index: number) => (
                  <div key={index} className="text-sm">
                    {type === "email" ? (
                      <a
                        href={`mailto:${value}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {value}
                      </a>
                    ) : type === "tel" ? (
                      <a
                        href={`tel:${value}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {value}
                      </a>
                    ) : (
                      <span className="text-gray-900">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
            {savingField === field && (
              <div className="flex justify-end">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>
        )}
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
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

        {/* Contact Discovery Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWebsiteScanModal(true)}
            disabled={!organization.website_url}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={organization.website_url ? "Scan website for contact info" : "Add a website URL first"}
          >
            <Globe className="h-4 w-4" />
            Scan Website
          </button>
          <button
            onClick={() => setShowApolloSearchModal(true)}
            disabled={!organization.website_url}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={organization.website_url ? "Search Apollo.io for contacts" : "Add a website URL first"}
          >
            <Search className="h-4 w-4" />
            Find Contacts (Apollo)
          </button>
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
            <MultiValueDisplayField label="Email(s)" field="primary_email" type="email" />
            <MultiValueDisplayField
              label="Phone(s)"
              field="primary_phone_e164"
              type="tel"
            />
            <EditableField
              label="LinkedIn URL"
              field="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/company/..."
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
            <EditableField label="Vertical" field="vertical" />
            <EditableField label="Sub-vertical" field="sub_vertical" />
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

        {/* Contacts Section (Full Width) */}
        <section className="col-span-full space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Organization Contacts
            </h3>
            <span className="text-xs text-gray-500">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No contacts found for this organization</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LinkedIn
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {contact.job_title || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {contact.fixed_number || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {contact.email_1 ? (
                          <a
                            href={`mailto:${contact.email_1}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.email_1}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {contact.linkedin_url ? (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Profile
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Website Scan Modal */}
      <WebsiteScanModal
        isOpen={showWebsiteScanModal}
        onClose={() => setShowWebsiteScanModal(false)}
        organizationId={organization.org_id}
        organizationName={organization.legal_name}
        websiteUrl={organization.website_url}
        hasEmail={!!organization.primary_email}
        hasPhone={!!organization.primary_phone_e164}
        hasLinkedin={!!organization.linkedin_url}
        hasAddress={!!organization.hq_address_line1}
        onOrganizationUpdated={() => {
          fetchOrganization();
        }}
        onContactAdded={() => {
          fetchContacts();
        }}
      />

      {/* Apollo Search Modal */}
      <ApolloSearchModal
        isOpen={showApolloSearchModal}
        onClose={() => setShowApolloSearchModal(false)}
        organizationId={organization.org_id}
        organizationName={organization.legal_name}
        websiteUrl={organization.website_url}
        hasEmail={!!organization.primary_email}
        hasPhone={!!organization.primary_phone_e164}
        onOrganizationUpdated={() => {
          fetchOrganization();
        }}
        onContactAdded={() => {
          fetchContacts();
        }}
      />
    </div>
  );
}
