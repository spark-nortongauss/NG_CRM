"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/lib/hooks/use-user-role";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  mobile_1: string | null;
  mobile_2: string | null;
  mobile_3: string | null;
  fixed_number: string | null;
  email_1: string | null;
  email_2: string | null;
  email_3: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_status: string | null;
  linkedin_status: string | null;
  cold_call_status: string | null;
  cold_email_status: string | null;
  contact_date: string | null;
  contacted: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow indexing for generic handler
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Role-based access
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      const response = await fetch(`/api/contacts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch contact");
      const data = await response.json();
      setContact(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: any) => {
    if (!contact) return;

    try {
      setSavingField(field);
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error("Failed to update");

      const updatedData = await response.json();
      setContact((prev) => ({ ...prev!, [field]: updatedData[field] }));
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
      contact?.[field]?.toString() || "",
    );

    // Sync local state when contact data changes (e.g. after save)
    useEffect(() => {
      setLocalValue(contact?.[field]?.toString() || "");
    }, [contact, field]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
        handleUpdate(field, localValue);
      }
    };

    // Read-only view for regular users
    if (!isSuperAdmin) {
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </label>
          <div className="min-h-[38px] rounded-md border border-gray-200 dark:border-ng-dark-elevated bg-gray-50 dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
            {contact?.[field]?.toString() || <span className="text-gray-400 dark:text-gray-500">-</span>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleUpdate(field, localValue)}
            placeholder={placeholder}
            type={type}
            className="pr-8 transition-colors focus:bg-blue-50/50 dark:focus:bg-ng-dark-hover"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {savingField === field ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const EditableSelect = ({
    label,
    field,
    options,
  }: {
    label: string;
    field: string;
    options: string[];
  }) => {
    const [localValue, setLocalValue] = useState(
      contact?.[field]?.toString() || "",
    );

    useEffect(() => {
      setLocalValue(contact?.[field]?.toString() || "");
    }, [contact, field]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setLocalValue(value);
      handleUpdate(field, value);
    };

    // Read-only view for regular users
    if (!isSuperAdmin) {
      return (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </label>
          <div className="min-h-[38px] rounded-md border border-gray-200 dark:border-ng-dark-elevated bg-gray-50 dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
            {contact?.[field]?.toString() || <span className="text-gray-400 dark:text-gray-500">-</span>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          <select
            value={localValue}
            onChange={handleChange}
            className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg text-sm dark:text-gray-100 focus:border-blue-500 focus:bg-blue-50/50 dark:focus:bg-ng-dark-hover focus:outline-none transition-colors"
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {savingField === field ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-ng-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        Error: {error || "Contact not found"}
      </div>
    );
  }

  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed Contact";

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-ng-dark-elevated text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fullName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Created {new Date(contact.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Basic Information
          </h3>
          <div className="space-y-4">
            <EditableField label="First Name" field="first_name" />
            <EditableField label="Last Name" field="last_name" />
            <EditableField label="Organization" field="organization" />
            <EditableField label="Job Title" field="job_title" />
            <EditableField label="LinkedIn URL" field="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." />
          </div>
        </section>

        {/* Contact Info - Phone */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Phone Numbers
          </h3>
          <div className="space-y-4">
            <EditableField label="Mobile 1" field="mobile_1" type="tel" />
            <EditableField label="Mobile 2" field="mobile_2" type="tel" />
            <EditableField label="Mobile 3" field="mobile_3" type="tel" />
            <EditableField
              label="Fixed Number"
              field="fixed_number"
              type="tel"
            />
          </div>
        </section>

        {/* Contact Info - Email */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Email Addresses
          </h3>
          <div className="space-y-4">
            <EditableField label="Email 1" field="email_1" type="email" />
            <EditableField label="Email 2" field="email_2" type="email" />
            <EditableField label="Email 3" field="email_3" type="email" />
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Location
          </h3>
          <div className="space-y-4">
            <EditableField label="City" field="city" />
            <EditableField label="State" field="state" />
            <EditableField label="Country" field="country" />
          </div>
        </section>

        {/* Contact Status */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Contact Status
          </h3>
          <div className="space-y-4">
            <EditableSelect
              label="Contact Status"
              field="contact_status"
              options={["Not Contacted", "Email", "LinkedIn", "Call"]}
            />
            <EditableField
              label="Contact Date"
              field="contact_date"
              type="date"
            />
          </div>
        </section>

        {/* Outreach Status */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b dark:border-ng-dark-elevated pb-2">
            Outreach Status
          </h3>
          <div className="space-y-4">
            <EditableSelect
              label="LinkedIn"
              field="linkedin_status"
              options={["Not Done", "Done"]}
            />
            <EditableSelect
              label="Cold Call"
              field="cold_call_status"
              options={["Not Done", "Done"]}
            />
            <EditableSelect
              label="Cold E-mail"
              field="cold_email_status"
              options={["Not Done", "Done"]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
