"use client";

import { useState } from "react";
import {
  X,
  Globe,
  Loader2,
  Mail,
  Phone,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Building,
  Linkedin,
  MapPin,
} from "lucide-react";

interface ScrapedContact {
  type: "email" | "phone";
  value: string;
  source: string;
  context?: string;
}

interface ScrapedAddress {
  fullAddress?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  source: string;
}

interface ScanResult {
  emails: ScrapedContact[];
  phones: ScrapedContact[];
  linkedinUrl?: string;
  address?: ScrapedAddress;
  pagesScanned: string[];
  pagesFailed: string[];
  organizationHasEmail: boolean;
  organizationHasPhone: boolean;
  organizationHasLinkedin: boolean;
  organizationHasAddress: boolean;
}

interface Organization {
  org_id: string;
  legal_name: string;
  website_url: string;
}

interface WebsiteScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  websiteUrl: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedin?: boolean;
  hasAddress?: boolean;
  onOrganizationUpdated: () => void;
  onContactAdded: () => void;
}

export function WebsiteScanModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  websiteUrl,
  hasEmail,
  hasPhone,
  hasLinkedin,
  hasAddress,
  onOrganizationUpdated,
  onContactAdded,
}: WebsiteScanModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  
  // Track if LinkedIn/Address were saved during this session
  const [linkedinSaved, setLinkedinSaved] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/scan-website`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan website");
      }

      setScanResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveAsOrganizationEmail = async (email: string) => {
    setSavingItems((prev) => new Set(prev).add(`org-email-${email}`));

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_email: email }),
      });

      if (!response.ok) {
        throw new Error("Failed to save email");
      }

      setSavedItems((prev) => new Set(prev).add(`org-email-${email}`));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving email:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(`org-email-${email}`);
        return next;
      });
    }
  };

  const handleSaveAllEmailsToOrg = async () => {
    if (!scanResult || scanResult.emails.length === 0) return;
    
    setSavingItems((prev) => new Set(prev).add("org-all-emails"));

    try {
      // Combine all emails with comma separation
      const allEmails = scanResult.emails.map((e) => e.value).join(",");
      
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_email: allEmails }),
      });

      if (!response.ok) {
        throw new Error("Failed to save emails");
      }

      setSavedItems((prev) => new Set(prev).add("org-all-emails"));
      // Mark all individual emails as saved too
      scanResult.emails.forEach((email) => {
        setSavedItems((prev) => new Set(prev).add(`org-email-${email.value}`));
      });
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving emails:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete("org-all-emails");
        return next;
      });
    }
  };

  const handleSaveAsOrganizationPhone = async (phone: string) => {
    setSavingItems((prev) => new Set(prev).add(`org-phone-${phone}`));

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_phone_e164: phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to save phone");
      }

      setSavedItems((prev) => new Set(prev).add(`org-phone-${phone}`));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving phone:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(`org-phone-${phone}`);
        return next;
      });
    }
  };

  const handleSaveAllPhonesToOrg = async () => {
    if (!scanResult || scanResult.phones.length === 0) return;
    
    setSavingItems((prev) => new Set(prev).add("org-all-phones"));

    try {
      // Combine all phones with comma separation
      const allPhones = scanResult.phones.map((p) => p.value).join(",");
      
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_phone_e164: allPhones }),
      });

      if (!response.ok) {
        throw new Error("Failed to save phones");
      }

      setSavedItems((prev) => new Set(prev).add("org-all-phones"));
      // Mark all individual phones as saved too
      scanResult.phones.forEach((phone) => {
        setSavedItems((prev) => new Set(prev).add(`org-phone-${phone.value}`));
      });
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving phones:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete("org-all-phones");
        return next;
      });
    }
  };

  const handleAddAsContact = async (email?: string, phone?: string) => {
    const itemKey = `contact-${email || phone}`;
    setSavingItems((prev) => new Set(prev).add(itemKey));

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: "Contact",
          last_name: `from ${organizationName}`,
          organization: organizationName,
          email_1: email || null,
          fixed_number: phone || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add contact");
      }

      setSavedItems((prev) => new Set(prev).add(itemKey));
      onContactAdded();
    } catch (err) {
      console.error("Error adding contact:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleSaveLinkedinUrl = async (linkedinUrl: string) => {
    setSavingItems((prev) => new Set(prev).add("linkedin-url"));

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_url: linkedinUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to save LinkedIn URL");
      }

      setLinkedinSaved(true);
      setSavedItems((prev) => new Set(prev).add("linkedin-url"));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving LinkedIn URL:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete("linkedin-url");
        return next;
      });
    }
  };

  const handleSaveAddress = async (address: ScrapedAddress) => {
    setSavingItems((prev) => new Set(prev).add("address"));

    try {
      // Build the update payload with available address fields
      const updatePayload: Record<string, string | null> = {};
      
      if (address.addressLine1) {
        updatePayload.hq_address_line1 = address.addressLine1;
      }
      if (address.addressLine2) {
        updatePayload.hq_address_line2 = address.addressLine2;
      }
      if (address.city) {
        updatePayload.hq_city = address.city;
      }
      if (address.region) {
        updatePayload.hq_region = address.region;
      }
      if (address.postalCode) {
        updatePayload.hq_postal_code = address.postalCode;
      }
      if (address.country) {
        updatePayload.hq_country_code = address.country;
      }
      
      // If we only have fullAddress, put it in address_line1
      if (Object.keys(updatePayload).length === 0 && address.fullAddress) {
        updatePayload.hq_address_line1 = address.fullAddress;
      }

      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      setAddressSaved(true);
      setSavedItems((prev) => new Set(prev).add("address"));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving address:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete("address");
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Website Contact Scraper
              </h2>
              <p className="text-sm text-gray-500">{organizationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {/* Website URL Info */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Website URL</p>
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {websiteUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">No website URL configured</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {hasEmail && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" /> Has Email
                  </span>
                )}
                {hasPhone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" /> Has Phone
                  </span>
                )}
                {hasLinkedin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" /> Has LinkedIn
                  </span>
                )}
                {hasAddress && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <Check className="h-3 w-3" /> Has Address
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scan Button */}
          {!scanResult && !isScanning && (
            <div className="text-center py-8">
              {!websiteUrl ? (
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
                  <p className="text-gray-600">
                    Please add a website URL to this organization first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Click the button below to scan the website for contact information.
                  </p>
                  <p className="text-sm text-gray-500">
                    This will crawl key pages like /contact, /about, /team, etc.
                  </p>
                  <button
                    onClick={handleScan}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    Scan Website
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isScanning && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600" />
              <p className="mt-4 text-gray-600">Scanning website...</p>
              <p className="text-sm text-gray-500">
                This may take up to 30 seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Scan Failed</p>
              </div>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button
                onClick={handleScan}
                className="mt-3 text-sm text-red-700 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {scanResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <Mail className="h-8 w-8 mx-auto text-blue-600" />
                  <p className="mt-2 text-2xl font-bold text-blue-600">
                    {scanResult.emails.length}
                  </p>
                  <p className="text-sm text-blue-600">Emails Found</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <Phone className="h-8 w-8 mx-auto text-green-600" />
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {scanResult.phones.length}
                  </p>
                  <p className="text-sm text-green-600">Phones Found</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${scanResult.linkedinUrl ? 'bg-sky-50' : 'bg-gray-50'}`}>
                  <Linkedin className={`h-8 w-8 mx-auto ${scanResult.linkedinUrl ? 'text-sky-600' : 'text-gray-400'}`} />
                  <p className={`mt-2 text-2xl font-bold ${scanResult.linkedinUrl ? 'text-sky-600' : 'text-gray-400'}`}>
                    {scanResult.linkedinUrl ? '1' : '0'}
                  </p>
                  <p className={`text-sm ${scanResult.linkedinUrl ? 'text-sky-600' : 'text-gray-400'}`}>LinkedIn</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${scanResult.address ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <MapPin className={`h-8 w-8 mx-auto ${scanResult.address ? 'text-amber-600' : 'text-gray-400'}`} />
                  <p className={`mt-2 text-2xl font-bold ${scanResult.address ? 'text-amber-600' : 'text-gray-400'}`}>
                    {scanResult.address ? '1' : '0'}
                  </p>
                  <p className={`text-sm ${scanResult.address ? 'text-amber-600' : 'text-gray-400'}`}>Address</p>
                </div>
              </div>

              {/* LinkedIn URL */}
              {scanResult.linkedinUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Linkedin className="h-4 w-4 text-sky-600" />
                    LinkedIn Company Page
                  </h3>
                  <div className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={scanResult.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-sky-600 hover:underline flex items-center gap-1"
                      >
                        {scanResult.linkedinUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!hasLinkedin && !linkedinSaved && !scanResult.organizationHasLinkedin ? (
                        <button
                          onClick={() => handleSaveLinkedinUrl(scanResult.linkedinUrl!)}
                          disabled={savingItems.has("linkedin-url")}
                          className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors disabled:opacity-50"
                        >
                          {savingItems.has("linkedin-url") ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Building className="h-3 w-3" />
                          )}
                          Save to Organization
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          <Check className="h-3 w-3" />
                          {linkedinSaved ? 'Saved' : 'Already Set'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Address */}
              {scanResult.address && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    HQ Address
                  </h3>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {scanResult.address.fullAddress && (
                          <p className="text-sm text-gray-900">{scanResult.address.fullAddress}</p>
                        )}
                        {(scanResult.address.addressLine1 || scanResult.address.city || scanResult.address.region || scanResult.address.postalCode || scanResult.address.country) && !scanResult.address.fullAddress && (
                          <div className="text-sm text-gray-900 space-y-1">
                            {scanResult.address.addressLine1 && <p>{scanResult.address.addressLine1}</p>}
                            {scanResult.address.addressLine2 && <p>{scanResult.address.addressLine2}</p>}
                            <p>
                              {[
                                scanResult.address.city,
                                scanResult.address.region,
                                scanResult.address.postalCode,
                              ].filter(Boolean).join(", ")}
                            </p>
                            {scanResult.address.country && <p>{scanResult.address.country}</p>}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Found on: {scanResult.address.source}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {!hasAddress && !addressSaved && !scanResult.organizationHasAddress ? (
                          <button
                            onClick={() => handleSaveAddress(scanResult.address!)}
                            disabled={savingItems.has("address")}
                            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                          >
                            {savingItems.has("address") ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Building className="h-3 w-3" />
                            )}
                            Save to Organization
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            <Check className="h-3 w-3" />
                            {addressSaved ? 'Saved' : 'Already Set'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Details Toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showDetails ? "Hide" : "Show"} scan details (
                {scanResult.pagesScanned.length} pages scanned,{" "}
                {scanResult.pagesFailed.length} failed)
              </button>

              {showDetails && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p className="font-medium text-gray-700 mb-2">Pages Scanned:</p>
                  <ul className="list-disc list-inside text-gray-600 mb-4">
                    {scanResult.pagesScanned.map((page, i) => (
                      <li key={i} className="truncate">
                        {page}
                      </li>
                    ))}
                  </ul>
                  {scanResult.pagesFailed.length > 0 && (
                    <>
                      <p className="font-medium text-gray-700 mb-2">Failed Pages:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {scanResult.pagesFailed.map((page, i) => (
                          <li key={i} className="truncate">
                            {page}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* Emails List */}
              {scanResult.emails.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Addresses ({scanResult.emails.length})
                    </h3>
                    {!hasEmail && scanResult.emails.length > 1 && !savedItems.has("org-all-emails") && (
                      <button
                        onClick={handleSaveAllEmailsToOrg}
                        disabled={savingItems.has("org-all-emails")}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {savingItems.has("org-all-emails") ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Building className="h-3 w-3" />
                        )}
                        Save All to Organization
                      </button>
                    )}
                    {savedItems.has("org-all-emails") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> All Saved
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {scanResult.emails.map((email, index) => {
                      const orgItemKey = `org-email-${email.value}`;
                      const contactItemKey = `contact-${email.value}`;
                      const isSavingOrg = savingItems.has(orgItemKey);
                      const isSavedOrg = savedItems.has(orgItemKey);
                      const isSavingContact = savingItems.has(contactItemKey);
                      const isSavedContact = savedItems.has(contactItemKey);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{email.value}</p>
                            <p className="text-xs text-gray-500 truncate max-w-md">
                              Found on: {email.source}
                            </p>
                            {email.context && (
                              <p className="text-xs text-gray-400 truncate max-w-md">
                                Context: {email.context}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!hasEmail && (
                              <button
                                onClick={() => handleSaveAsOrganizationEmail(email.value)}
                                disabled={isSavingOrg || isSavedOrg}
                                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                  isSavedOrg
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {isSavingOrg ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isSavedOrg ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Building className="h-3 w-3" />
                                )}
                                {isSavedOrg ? "Saved" : "Set as Org Email"}
                              </button>
                            )}
                            <button
                              onClick={() => handleAddAsContact(email.value)}
                              disabled={isSavingContact || isSavedContact}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                isSavedContact
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {isSavingContact ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isSavedContact ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              {isSavedContact ? "Added" : "Add as Contact"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Phones List */}
              {scanResult.phones.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Numbers ({scanResult.phones.length})
                    </h3>
                    {!hasPhone && scanResult.phones.length > 1 && !savedItems.has("org-all-phones") && (
                      <button
                        onClick={handleSaveAllPhonesToOrg}
                        disabled={savingItems.has("org-all-phones")}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {savingItems.has("org-all-phones") ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Building className="h-3 w-3" />
                        )}
                        Save All to Organization
                      </button>
                    )}
                    {savedItems.has("org-all-phones") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> All Saved
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {scanResult.phones.map((phone, index) => {
                      const orgItemKey = `org-phone-${phone.value}`;
                      const contactItemKey = `contact-${phone.value}`;
                      const isSavingOrg = savingItems.has(orgItemKey);
                      const isSavedOrg = savedItems.has(orgItemKey);
                      const isSavingContact = savingItems.has(contactItemKey);
                      const isSavedContact = savedItems.has(contactItemKey);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{phone.value}</p>
                            <p className="text-xs text-gray-500 truncate max-w-md">
                              Found on: {phone.source}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!hasPhone && (
                              <button
                                onClick={() => handleSaveAsOrganizationPhone(phone.value)}
                                disabled={isSavingOrg || isSavedOrg}
                                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                  isSavedOrg
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                }`}
                              >
                                {isSavingOrg ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isSavedOrg ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Building className="h-3 w-3" />
                                )}
                                {isSavedOrg ? "Saved" : "Set as Org Phone"}
                              </button>
                            )}
                            <button
                              onClick={() => handleAddAsContact(undefined, phone.value)}
                              disabled={isSavingContact || isSavedContact}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                isSavedContact
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {isSavingContact ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isSavedContact ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              {isSavedContact ? "Added" : "Add as Contact"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {scanResult.emails.length === 0 && 
               scanResult.phones.length === 0 && 
               !scanResult.linkedinUrl && 
               !scanResult.address && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
                  <p className="mt-4 text-gray-600">
                    No contact information found on the website.
                  </p>
                  <p className="text-sm text-gray-500">
                    The website may use JavaScript to render content, or contact info may be in images.
                  </p>
                </div>
              )}

              {/* Scan Again Button */}
              <div className="text-center pt-4">
                <button
                  onClick={handleScan}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Scan again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
