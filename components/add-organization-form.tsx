"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OrganizationFileUploadZone } from "@/components/organization-file-upload-zone";

type AccountOwner = {
  id: string;
  full_name: string | null;
  email: string | null;
};

interface AddOrganizationFormProps {
  accountOwners: AccountOwner[];
}

const COMPANY_TYPES = [
  "Private",
  "Public",
  "Nonprofit",
  "Government",
  "Education",
] as const;

const BUSINESS_MODELS = ["B2B", "B2C", "B2G", "Marketplace"] as const;

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

const ACCOUNT_TIERS = ["Tier 1", "Tier 2", "Tier 3"] as const;

const LIFECYCLE_STAGES = ["Lead", "Prospect", "Customer", "Partner"] as const;

const SOURCE_CHANNELS = [
  "Outbound",
  "Inbound",
  "Partner",
  "Event",
  "Referral",
] as const;

const PAYMENT_TERMS = ["Net 30", "Net 45", "Prepaid"] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "INR"] as const;

const COUNTRY_TIMEZONE_MAP: Record<string, string[]> = {
  US: [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
  ],
  GB: ["Europe/London"],
  IN: ["Asia/Kolkata"],
};

export function AddOrganizationForm({
  accountOwners,
}: AddOrganizationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    legal_name: "",
    trade_name: "",
    company_type: "",
    website_url: "",
    primary_email: "",
    primary_phone_e164: "",
    hq_country_code: "",
    hq_address_line1: "",
    hq_address_line2: "",
    hq_city: "",
    hq_region: "",
    hq_postal_code: "",
    timezone: "",
    industry_primary: "",
    vertical: "",
    sub_vertical: "",
    business_model: "",
    employee_count_range: "",
    annual_revenue_amount: "",
    annual_revenue_currency: "USD",
    account_owner_user_id: "",
    account_tier: "",
    lifecycle_stage: "",
    source_channel: "",
    tags: "",
    registration_number: "",
    tax_id: "",
    marketing_opt_in_status: false,
    do_not_contact: false,
    billing_email: "",
    payment_terms: "",
    preferred_currency: "USD",
    internal_notes: "",
    discovery_search_terms: "",
    discovery_sources: "",
    keywords: "",
  });

  const timezoneOptions = COUNTRY_TIMEZONE_MAP[form.hq_country_code] ?? ["UTC"];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      e.target instanceof HTMLInputElement ? e.target.checked : false;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "hq_country_code"
            ? value.toUpperCase()
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.legal_name.trim()) {
      setError("Legal Name is required.");
      return;
    }

    if (!form.company_type) {
      setError("Company Type is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        annual_revenue_amount: form.annual_revenue_amount
          ? Number(form.annual_revenue_amount)
          : null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        billing_email: form.billing_email || form.primary_email || null,
      };

      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create organization");
      }

      setSuccessMessage("Organization created successfully.");
      setForm((prev) => ({
        ...prev,
        legal_name: "",
        trade_name: "",
        website_url: "",
        primary_email: "",
        primary_phone_e164: "",
        hq_country_code: "",
        hq_address_line1: "",
        hq_address_line2: "",
        hq_city: "",
        hq_region: "",
        hq_postal_code: "",
        timezone: "",
        industry_primary: "",
        vertical: "",
        sub_vertical: "",
        annual_revenue_amount: "",
        tags: "",
        registration_number: "",
        tax_id: "",
        marketing_opt_in_status: false,
        do_not_contact: false,
        billing_email: "",
        internal_notes: "",
        discovery_search_terms: "",
        discovery_sources: "",
        keywords: "",
      }));

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl mx-auto text-sm"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Add Organization
        </h1>
        <p className="text-gray-500">
          Capture all key information about a new organization, or upload them
          in bulk via CSV/Excel.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {/* Section 1: Basic Information */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Basic Information
          </h2>
          <p className="text-xs text-gray-500">
            Core identifiers and contact details for the organization.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="legal_name">
              Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="legal_name"
              name="legal_name"
              required
              value={form.legal_name}
              onChange={handleChange}
              placeholder="Registered legal entity name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trade_name">Trading / Brand Name</Label>
            <Input
              id="trade_name"
              name="trade_name"
              value={form.trade_name}
              onChange={handleChange}
              placeholder="Customer-facing brand name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company_type">
              Company Type <span className="text-red-500">*</span>
            </Label>
            <select
              id="company_type"
              name="company_type"
              value={form.company_type}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              required
            >
              <option value="">Select company type</option>
              {COMPANY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              name="website_url"
              value={form.website_url}
              onChange={handleChange}
              placeholder="https://example.com"
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_email">Primary Email</Label>
            <Input
              id="primary_email"
              name="primary_email"
              value={form.primary_email}
              onChange={handleChange}
              type="email"
              placeholder="primary@organization.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_phone_e164">Primary Phone</Label>
            <Input
              id="primary_phone_e164"
              name="primary_phone_e164"
              value={form.primary_phone_e164}
              onChange={handleChange}
              placeholder="+1 555 123 4567"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Location */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Location</h2>
          <p className="text-xs text-gray-500">
            Headquarters address and geographic details.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="hq_country_code">Country (ISO)</Label>
            <Input
              id="hq_country_code"
              name="hq_country_code"
              value={form.hq_country_code}
              onChange={handleChange}
              placeholder="US, GB, IN"
              maxLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select timezone</option>
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hq_address_line1">Address Line 1</Label>
            <Input
              id="hq_address_line1"
              name="hq_address_line1"
              value={form.hq_address_line1}
              onChange={handleChange}
              placeholder="Street address, building"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hq_address_line2">Address Line 2</Label>
            <Input
              id="hq_address_line2"
              name="hq_address_line2"
              value={form.hq_address_line2}
              onChange={handleChange}
              placeholder="Suite, floor, etc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hq_city">City</Label>
            <Input
              id="hq_city"
              name="hq_city"
              value={form.hq_city}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hq_region">State / Region</Label>
            <Input
              id="hq_region"
              name="hq_region"
              value={form.hq_region}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hq_postal_code">Postal Code</Label>
            <Input
              id="hq_postal_code"
              name="hq_postal_code"
              value={form.hq_postal_code}
              onChange={handleChange}
            />
          </div>
        </div>
      </section>

      {/* Section 3: Business Details */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Business Details
          </h2>
          <p className="text-xs text-gray-500">
            How the organization operates and its scale.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="industry_primary">Industry</Label>
            <Input
              id="industry_primary"
              name="industry_primary"
              value={form.industry_primary}
              onChange={handleChange}
              placeholder="e.g. Software, Manufacturing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vertical">Vertical</Label>
            <Input
              id="vertical"
              name="vertical"
              value={form.vertical}
              onChange={handleChange}
              placeholder="e.g. Technology, Healthcare"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub_vertical">Sub-vertical</Label>
            <Input
              id="sub_vertical"
              name="sub_vertical"
              value={form.sub_vertical}
              onChange={handleChange}
              placeholder="e.g. SaaS, Biotech"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="business_model">Business Model</Label>
            <select
              id="business_model"
              name="business_model"
              value={form.business_model}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select model</option>
              {BUSINESS_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employee_count_range">Employee Count Range</Label>
            <select
              id="employee_count_range"
              name="employee_count_range"
              value={form.employee_count_range}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select range</option>
              {EMPLOYEE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="annual_revenue_amount">Annual Revenue</Label>
            <div className="flex gap-2">
              <Input
                id="annual_revenue_amount"
                name="annual_revenue_amount"
                type="number"
                min={0}
                value={form.annual_revenue_amount}
                onChange={handleChange}
                placeholder="Amount"
              />
              <select
                name="annual_revenue_currency"
                value={form.annual_revenue_currency}
                onChange={handleChange}
                className="h-9 w-28 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Relationship & Ownership */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Relationship & Ownership
          </h2>
          <p className="text-xs text-gray-500">
            How this account is managed within your team.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="account_owner_user_id">Account Owner</Label>
            <select
              id="account_owner_user_id"
              name="account_owner_user_id"
              value={form.account_owner_user_id}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Unassigned</option>
              {accountOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.full_name || owner.email || owner.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account_tier">Account Tier</Label>
            <select
              id="account_tier"
              name="account_tier"
              value={form.account_tier}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select tier</option>
              {ACCOUNT_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lifecycle_stage">Lifecycle Stage</Label>
            <select
              id="lifecycle_stage"
              name="lifecycle_stage"
              value={form.lifecycle_stage}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select stage</option>
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source_channel">Source Channel</Label>
            <select
              id="source_channel"
              name="source_channel"
              value={form.source_channel}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select source</option>
              {SOURCE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="e.g. strategic, high-priority, APAC"
            />
          </div>
        </div>
      </section>

      {/* Section 5: Legal & Compliance */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Legal & Compliance
          </h2>
          <p className="text-xs text-gray-500">
            Optional registration and contact preference details.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="registration_number">Registration Number</Label>
            <Input
              id="registration_number"
              name="registration_number"
              value={form.registration_number}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
            <Input
              id="tax_id"
              name="tax_id"
              value={form.tax_id}
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center gap-4 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                name="marketing_opt_in_status"
                checked={form.marketing_opt_in_status}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Marketing Opt-in
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                name="do_not_contact"
                checked={form.do_not_contact}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Do Not Contact
            </label>
          </div>
        </div>
      </section>

      {/* Section 6: Billing & Bulk Upload */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Billing</h2>
          <p className="text-xs text-gray-500">
            Billing details and optional bulk import of organizations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="billing_email">Billing Email</Label>
            <Input
              id="billing_email"
              name="billing_email"
              type="email"
              value={form.billing_email}
              onChange={handleChange}
              placeholder="Defaults to primary email if left blank"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <select
              id="payment_terms"
              name="payment_terms"
              value={form.payment_terms}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select terms</option>
              {PAYMENT_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferred_currency">Preferred Currency</Label>
            <select
              id="preferred_currency"
              name="preferred_currency"
              value={form.preferred_currency}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <textarea
              id="internal_notes"
              name="internal_notes"
              value={form.internal_notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="Any internal context, special handling, or relationship notes."
            />
          </div>
        </div>

        <div className="pt-4 border-t mt-4">
          <p className="mb-3 text-xs font-medium text-gray-700 uppercase tracking-wide">
            Bulk Organizations Import (Optional)
          </p>
          <OrganizationFileUploadZone />
        </div>
      </section>

      {/* Section 7: Discovery & Keywords */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Discovery & Keywords
          </h2>
          <p className="text-xs text-gray-500">
            Track how this organization was discovered and relevant keywords for
            SEO.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="discovery_search_terms">
              Discovery Search Terms
            </Label>
            <Input
              id="discovery_search_terms"
              name="discovery_search_terms"
              value={form.discovery_search_terms}
              onChange={handleChange}
              placeholder="Search terms used to discover this organization"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="discovery_sources">Discovery Sources (JSON)</Label>
            <textarea
              id="discovery_sources"
              name="discovery_sources"
              value={form.discovery_sources}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder='JSON array of SERP results, e.g., [{"url": "...", "title": "..."}]'
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              name="keywords"
              value={form.keywords}
              onChange={handleChange}
              placeholder="Comma-separated keywords for SEO and categorization"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/organizations")}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Organization"}
        </Button>
      </div>
    </form>
  );
}
