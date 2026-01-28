"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ContactFileUploadZone } from "@/components/contact-file-upload-zone";

const CONTACT_STATUSES = [
  "Not Contacted",
  "Email",
  "LinkedIn",
  "Call",
] as const;

export function AddContactForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    organization: "",
    job_title: "",
    linkedin_url: "",
    mobile_1: "",
    mobile_2: "",
    mobile_3: "",
    fixed_number: "",
    email_1: "",
    email_2: "",
    email_3: "",
    city: "",
    state: "",
    country: "",
    contact_status: "",
    linkedin_status: "Not Done",
    cold_call_status: "Not Done",
    cold_email_status: "Not Done",
    contact_date: "",
    contacted: false,
  });

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
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError("At least First Name or Last Name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        contact_date: form.contact_date
          ? new Date(form.contact_date).toISOString()
          : null,
      };

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create contact");
      }

      setSuccessMessage("Contact created successfully.");
      setForm({
        first_name: "",
        last_name: "",
        organization: "",
        job_title: "",
        linkedin_url: "",
        mobile_1: "",
        mobile_2: "",
        mobile_3: "",
        fixed_number: "",
        email_1: "",
        email_2: "",
        email_3: "",
        city: "",
        state: "",
        country: "",
        contact_status: "",
        linkedin_status: "Not Done",
        cold_call_status: "Not Done",
        cold_email_status: "Not Done",
        contact_date: "",
        contacted: false,
      });

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
        <h1 className="text-2xl font-semibold text-gray-900">Add Contact</h1>
        <p className="text-gray-500">
          Capture all key information about a new contact.
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
            Core identifiers for the contact.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="John"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              name="organization"
              value={form.organization}
              onChange={handleChange}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              name="job_title"
              value={form.job_title}
              onChange={handleChange}
              placeholder="e.g. Sales Manager"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              value={form.linkedin_url}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Contact Numbers */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Contact Numbers
          </h2>
          <p className="text-xs text-gray-500">
            Phone numbers and mobile contacts.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="mobile_1">Mobile 1</Label>
            <Input
              id="mobile_1"
              name="mobile_1"
              value={form.mobile_1}
              onChange={handleChange}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile_2">Mobile 2</Label>
            <Input
              id="mobile_2"
              name="mobile_2"
              value={form.mobile_2}
              onChange={handleChange}
              placeholder="+1 555 123 4568"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile_3">Mobile 3</Label>
            <Input
              id="mobile_3"
              name="mobile_3"
              value={form.mobile_3}
              onChange={handleChange}
              placeholder="+1 555 123 4569"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fixed_number">Fixed Number</Label>
            <Input
              id="fixed_number"
              name="fixed_number"
              value={form.fixed_number}
              onChange={handleChange}
              placeholder="+1 555 000 0000"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Email Addresses */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Email Addresses
          </h2>
          <p className="text-xs text-gray-500">
            Primary and alternative email contacts.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email_1">Email 1</Label>
            <Input
              id="email_1"
              name="email_1"
              type="email"
              value={form.email_1}
              onChange={handleChange}
              placeholder="primary@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email_2">Email 2</Label>
            <Input
              id="email_2"
              name="email_2"
              type="email"
              value={form.email_2}
              onChange={handleChange}
              placeholder="secondary@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email_3">Email 3</Label>
            <Input
              id="email_3"
              name="email_3"
              type="email"
              value={form.email_3}
              onChange={handleChange}
              placeholder="alternate@example.com"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Location */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Location</h2>
          <p className="text-xs text-gray-500">Geographic location details.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="New York"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State / Region</Label>
            <Input
              id="state"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="NY"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="United States"
            />
          </div>
        </div>
      </section>

      {/* Section 5: Contact Status */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Contact Status
          </h2>
          <p className="text-xs text-gray-500">
            Track contact status and engagement.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact_status">Contact Status</Label>
            <select
              id="contact_status"
              name="contact_status"
              value={form.contact_status}
              onChange={handleChange}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">Select status</option>
              {CONTACT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_date">Contact Date</Label>
            <Input
              id="contact_date"
              name="contact_date"
              type="date"
              value={form.contact_date}
              onChange={handleChange}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                name="contacted"
                checked={form.contacted}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Contacted
            </label>
          </div>
        </div>
      </section>

      {/* Section 5.5: Outreach Status */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Outreach Status
          </h2>
          <p className="text-xs text-gray-500">
            Track outreach channels - toggle between Done and Not Done.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="linkedin_status">LinkedIn</Label>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  linkedin_status:
                    prev.linkedin_status === "Done" ? "Not Done" : "Done",
                }))
              }
              className={`h-9 w-full rounded-md border px-3 text-sm font-medium transition-colors ${
                form.linkedin_status === "Done"
                  ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {form.linkedin_status}
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cold_call_status">Cold Call</Label>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  cold_call_status:
                    prev.cold_call_status === "Done" ? "Not Done" : "Done",
                }))
              }
              className={`h-9 w-full rounded-md border px-3 text-sm font-medium transition-colors ${
                form.cold_call_status === "Done"
                  ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {form.cold_call_status}
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cold_email_status">Cold E-mail</Label>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  cold_email_status:
                    prev.cold_email_status === "Done" ? "Not Done" : "Done",
                }))
              }
              className={`h-9 w-full rounded-md border px-3 text-sm font-medium transition-colors ${
                form.cold_email_status === "Done"
                  ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {form.cold_email_status}
            </button>
          </div>
        </div>
      </section>

      {/* Section 6: Bulk Upload */}
      <section className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Bulk Contacts Import
          </h2>
          <p className="text-xs text-gray-500">
            Upload a CSV or Excel file to add multiple contacts at once.
          </p>
        </div>
        <ContactFileUploadZone />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/contacts")}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Contact"}
        </Button>
      </div>
    </form>
  );
}
