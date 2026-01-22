"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
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
            onBlur={() => handleUpdate(field, localValue)}
            placeholder={placeholder}
            type={type}
            className="pr-8 transition-colors focus:bg-blue-50/50"
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

    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative">
          <select
            value={localValue}
            onChange={handleChange}
            className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:border-blue-500 focus:bg-blue-50/50 focus:outline-none transition-colors"
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
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6 text-center text-red-600">
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
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-sm text-gray-500">
            Created {new Date(contact.created_at).toLocaleDateString()}
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
            <EditableField label="First Name" field="first_name" />
            <EditableField label="Last Name" field="last_name" />
            <EditableField label="Organization" field="organization" />
          </div>
        </section>

        {/* Contact Info - Phone */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
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
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
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
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
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
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
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
      </div>
    </div>
  );
}
