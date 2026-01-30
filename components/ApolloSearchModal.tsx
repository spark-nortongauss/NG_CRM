"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  Mail,
  Phone,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Search,
  User,
  Briefcase,
  Linkedin,
  Sparkles,
} from "lucide-react";

// Contact from People Search API (limited data - needs enrichment for full details)
interface ApolloContact {
  id: string;
  first_name: string | null;
  last_name_obfuscated: string | null; // Partial last name from search (e.g., "Zh***g")
  job_title: string | null;
  organization_name: string | null;
  organization_website: string | null;
  has_email: boolean; // Indicates if Apollo has email available
  has_direct_phone: boolean; // Indicates if Apollo has phone available
  last_refreshed_at: string | null;
  // Fields populated after enrichment
  last_name?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  enriched?: boolean;
  alreadyExists?: boolean;
}

interface ApolloSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  websiteUrl: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  onOrganizationUpdated: () => void;
  onContactAdded: () => void;
}

export function ApolloSearchModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  websiteUrl,
  hasEmail,
  hasPhone,
  onOrganizationUpdated,
  onContactAdded,
}: ApolloSearchModalProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [enrichingItems, setEnrichingItems] = useState<Set<string>>(new Set());
  const [domain, setDomain] = useState<string>("");

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setContacts([]);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/apollo-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perPage: 25 }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search Apollo.io");
      }

      setContacts(data.contacts);
      setDomain(data.domain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  // Enrich a contact to get email, phone, and full details from Apollo
  const handleEnrichContact = async (contact: ApolloContact) => {
    const itemKey = `enrich-${contact.id}`;
    setEnrichingItems((prev) => new Set(prev).add(itemKey));

    try {
      const enrichResponse = await fetch("/api/apollo-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apolloId: contact.id,
          firstName: contact.first_name,
          // Note: We only have obfuscated last name from search, Apollo will use the ID to find full data
          lastName: null,
          linkedinUrl: contact.linkedin_url,
          organizationName: organizationName,
          domain: websiteUrl ? new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, '') : null,
        }),
      });

      const enrichData = await enrichResponse.json();

      if (!enrichResponse.ok) {
        throw new Error(enrichData.error || "Failed to enrich contact");
      }

      if (enrichData.success && enrichData.contact) {
        // Update the contact in the list with enriched data
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contact.id
              ? {
                  ...c,
                  // Get full last name from enrichment
                  last_name: enrichData.contact.last_name || c.last_name,
                  email: enrichData.contact.email || c.email,
                  phone: enrichData.contact.phone || c.phone,
                  linkedin_url: enrichData.contact.linkedin_url || c.linkedin_url,
                  city: enrichData.contact.city || c.city,
                  state: enrichData.contact.state || c.state,
                  country: enrichData.contact.country || c.country,
                  enriched: true,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Error enriching contact:", err);
      setError(err instanceof Error ? err.message : "Failed to enrich contact");
    } finally {
      setEnrichingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Add contact to CRM (should be called after enrichment for best results)
  const handleAddContact = async (contact: ApolloContact) => {
    const itemKey = `contact-${contact.id}`;
    setSavingItems((prev) => new Set(prev).add(itemKey));

    try {
      // Use enriched last_name if available, otherwise use obfuscated version
      const lastName = contact.last_name || contact.last_name_obfuscated;
      
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: contact.first_name || null,
          last_name: lastName || null,
          organization: organizationName,
          job_title: contact.job_title || null,
          linkedin_url: contact.linkedin_url || null,
          email_1: contact.email || null,
          fixed_number: contact.phone || null,
          city: contact.city || null,
          state: contact.state || null,
          country: contact.country || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add contact");
      }

      setSavedItems((prev) => new Set(prev).add(itemKey));
      
      // Update the contact's alreadyExists status
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id ? { ...c, alreadyExists: true } : c
        )
      );
      
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

  const handleSetAsOrganizationEmail = async (email: string) => {
    const itemKey = `org-email-${email}`;
    setSavingItems((prev) => new Set(prev).add(itemKey));

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_email: email }),
      });

      if (!response.ok) {
        throw new Error("Failed to save email");
      }

      setSavedItems((prev) => new Set(prev).add(itemKey));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving email:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleSetAsOrganizationPhone = async (phone: string) => {
    const itemKey = `org-phone-${phone}`;
    setSavingItems((prev) => new Set(prev).add(itemKey));

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_phone_e164: phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to save phone");
      }

      setSavedItems((prev) => new Set(prev).add(itemKey));
      onOrganizationUpdated();
    } catch (err) {
      console.error("Error saving phone:", err);
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleAddAllContacts = async () => {
    // Only add contacts that are not already in CRM and haven't been saved in this session
    const newContacts = contacts.filter((c) => !c.alreadyExists && !savedItems.has(`contact-${c.id}`));
    
    for (const contact of newContacts) {
      await handleAddContact(contact);
      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  if (!isOpen) return null;

  const newContactsCount = contacts.filter(
    (c) => !c.alreadyExists && !savedItems.has(`contact-${c.id}`)
  ).length;
  
  const existingContactsCount = contacts.filter((c) => c.alreadyExists).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Search className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Apollo.io Contact Search
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
          {/* Website/Domain Info */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Search Domain</p>
              {websiteUrl ? (
                <p className="text-sm text-gray-600">
                  Searching for contacts at: <span className="font-medium">{domain || websiteUrl}</span>
                </p>
              ) : (
                <p className="text-sm text-amber-600">
                  No website URL configured - please add one first
                </p>
              )}
            </div>
          </div>

          {/* Search Button */}
          {contacts.length === 0 && !isSearching && (
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
                    Click the button below to search Apollo.io for contacts at this organization.
                  </p>
                  <p className="text-sm text-gray-500">
                    Apollo.io provides professional contact data including emails, phone numbers, and LinkedIn profiles.
                  </p>
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Search className="h-5 w-5" />
                    Search Apollo.io
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-600" />
              <p className="mt-4 text-gray-600">Searching Apollo.io...</p>
              <p className="text-sm text-gray-500">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Search Failed</p>
              </div>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <button
                onClick={handleSearch}
                className="mt-3 text-sm text-red-700 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {contacts.length > 0 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-purple-50 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {contacts.length}
                    </p>
                    <p className="text-xs text-purple-600">Total Found</p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {newContactsCount}
                    </p>
                    <p className="text-xs text-green-600">New Contacts</p>
                  </div>
                  <div className="rounded-lg bg-gray-100 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {existingContactsCount}
                    </p>
                    <p className="text-xs text-gray-600">Already in CRM</p>
                  </div>
                </div>
                {newContactsCount > 0 && (
                  <button
                    onClick={handleAddAllContacts}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add All New ({newContactsCount})
                  </button>
                )}
              </div>

              {/* Contacts List */}
              <div className="space-y-3">
                {contacts.map((contact) => {
                  const itemKey = `contact-${contact.id}`;
                  const isSaving = savingItems.has(itemKey);
                  const isSaved = savedItems.has(itemKey);
                  const isExisting = contact.alreadyExists;
                  // Use full last_name if enriched, otherwise use obfuscated version
                  const lastName = contact.last_name || contact.last_name_obfuscated;
                  const fullName = [contact.first_name, lastName]
                    .filter(Boolean)
                    .join(" ") || "Unknown";

                  return (
                    <div
                      key={contact.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        isExisting || isSaved
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <h4 className="font-medium text-gray-900 truncate">
                              {fullName}
                            </h4>
                            {isExisting && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <Check className="h-3 w-3" /> In CRM
                              </span>
                            )}
                            {isSaved && !isExisting && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                <Check className="h-3 w-3" /> Added
                              </span>
                            )}
                            {contact.enriched && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Sparkles className="h-3 w-3" /> Enriched
                              </span>
                            )}
                          </div>

                          {contact.job_title && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <Briefcase className="h-3 w-3" />
                              <span className="truncate">{contact.job_title}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm">
                            {/* Show email if enriched */}
                            {contact.email && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Mail className="h-3 w-3" />
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="hover:text-blue-600 hover:underline"
                                >
                                  {contact.email}
                                </a>
                                {!hasEmail && !savedItems.has(`org-email-${contact.email}`) && (
                                  <button
                                    onClick={() => handleSetAsOrganizationEmail(contact.email!)}
                                    disabled={savingItems.has(`org-email-${contact.email}`)}
                                    className="ml-1 text-xs text-blue-600 hover:underline"
                                    title="Set as organization email"
                                  >
                                    {savingItems.has(`org-email-${contact.email}`) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "(set as org)"
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Show email availability indicator if not enriched */}
                            {!contact.email && contact.has_email && (
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Mail className="h-3 w-3" />
                                Email available
                              </span>
                            )}

                            {/* Show phone if enriched */}
                            {contact.phone && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3 w-3" />
                                <span>{contact.phone}</span>
                                {!hasPhone && !savedItems.has(`org-phone-${contact.phone}`) && (
                                  <button
                                    onClick={() => handleSetAsOrganizationPhone(contact.phone!)}
                                    disabled={savingItems.has(`org-phone-${contact.phone}`)}
                                    className="ml-1 text-xs text-blue-600 hover:underline"
                                    title="Set as organization phone"
                                  >
                                    {savingItems.has(`org-phone-${contact.phone}`) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "(set as org)"
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Show phone availability indicator if not enriched */}
                            {!contact.phone && contact.has_direct_phone && (
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <Phone className="h-3 w-3" />
                                Phone available
                              </span>
                            )}

                            {contact.linkedin_url && (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <Linkedin className="h-3 w-3" />
                                LinkedIn
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}

                            {(contact.city || contact.state || contact.country) && (
                              <span className="text-gray-400">
                                {[contact.city, contact.state, contact.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {!isExisting && !isSaved && (
                          <div className="flex items-center gap-2">
                            {/* Enrich button - shows if not yet enriched */}
                            {/* Enrich button - show if not yet enriched and Apollo has data available */}
                            {!contact.enriched && (contact.has_email || contact.has_direct_phone) && (
                              <button
                                onClick={() => handleEnrichContact(contact)}
                                disabled={enrichingItems.has(`enrich-${contact.id}`)}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                title="Get email & phone from Apollo (uses credits)"
                              >
                                {enrichingItems.has(`enrich-${contact.id}`) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                Enrich
                              </button>
                            )}
                            {/* Enriched badge */}
                            {contact.enriched && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                <Sparkles className="h-3 w-3" /> Enriched
                              </span>
                            )}
                            {/* Add to CRM button */}
                            <button
                              onClick={() => handleAddContact(contact)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Add to CRM
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Search Again Button */}
              <div className="text-center pt-4">
                <button
                  onClick={handleSearch}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Search again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Data provided by Apollo.io. Free tier: ~1,000-2,000 lookups/month.
            </p>
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
