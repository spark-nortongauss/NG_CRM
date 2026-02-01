"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import {
  ColumnCustomizer,
  ColumnConfig,
  useColumnVisibility,
} from "@/components/ui/column-customizer";

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
  [key: string]: any;
}

// Define all available columns with their configurations
const ALL_COLUMNS: ColumnConfig[] = [
  { key: "first_name", label: "First Name", width: "150px" },
  { key: "last_name", label: "Last Name", width: "150px" },
  { key: "organization", label: "Organization", width: "180px" },
  { key: "job_title", label: "Job Title", width: "150px" },
  { key: "linkedin_url", label: "LinkedIn URL", width: "200px" },
  { key: "mobile_1", label: "Mobile 1", width: "140px" },
  { key: "mobile_2", label: "Mobile 2", width: "140px" },
  { key: "mobile_3", label: "Mobile 3", width: "140px" },
  { key: "fixed_number", label: "Fixed Number", width: "140px" },
  { key: "email_1", label: "Email 1", width: "200px" },
  { key: "email_2", label: "Email 2", width: "200px" },
  { key: "email_3", label: "Email 3", width: "200px" },
  { key: "city", label: "City", width: "120px" },
  { key: "state", label: "State", width: "100px" },
  { key: "country", label: "Country", width: "100px" },
  { key: "contact_status", label: "Status", width: "120px" },
  { key: "linkedin_status", label: "LinkedIn", width: "100px" },
  { key: "cold_call_status", label: "Cold Call", width: "100px" },
  { key: "cold_email_status", label: "Cold E-mail", width: "110px" },
  { key: "contact_date", label: "Contact Date", width: "120px" },
  { key: "contacted", label: "Contacted", width: "100px" },
  { key: "created_at", label: "Created Date", width: "120px" },
];

// Default columns shown initially
const DEFAULT_COLUMNS = [
  "first_name",
  "last_name",
  "organization",
  "job_title",
  "mobile_1",
  "email_1",
  "city",
  "state",
  "country",
  "contact_status",
  "linkedin_status",
  "cold_call_status",
  "cold_email_status",
  "contact_date",
];

const STORAGE_KEY = "contacts-table-columns";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useColumnVisibility(
    STORAGE_KEY,
    DEFAULT_COLUMNS
  );

  // Bulk delete state
  const [bulkDeleteRange, setBulkDeleteRange] = useState("");
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const router = useRouter();

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"name" | "email">("name");
  const [sortOption, setSortOption] = useState<"" | "name" | "contacts">("");

  // Compute filtered and sorted data
  const getFilteredAndSortedData = () => {
    let data = [...contacts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (searchType === "name") {
        data = data.filter(
          (contact) =>
            contact.first_name?.toLowerCase().includes(query) ||
            contact.last_name?.toLowerCase().includes(query)
        );
      } else {
        data = data.filter(
          (contact) =>
            contact.email_1?.toLowerCase().includes(query) ||
            contact.email_2?.toLowerCase().includes(query) ||
            contact.email_3?.toLowerCase().includes(query)
        );
      }
    }

    // Apply sorting
    if (sortOption === "name") {
      data.sort((a, b) => {
        const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim();
        const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim();
        return aName.localeCompare(bName);
      });
    } else if (sortOption === "contacts") {
      // Priority: has both email AND phone > has either > has neither
      data.sort((a, b) => {
        const hasEmail = (c: Contact) =>
          !!(c.email_1 || c.email_2 || c.email_3);
        const hasPhone = (c: Contact) =>
          !!(c.mobile_1 || c.mobile_2 || c.mobile_3 || c.fixed_number);

        const aHasEmail = hasEmail(a);
        const aHasPhone = hasPhone(a);
        const bHasEmail = hasEmail(b);
        const bHasPhone = hasPhone(b);

        const aScore = (aHasEmail ? 1 : 0) + (aHasPhone ? 1 : 0);
        const bScore = (bHasEmail ? 1 : 0) + (bHasPhone ? 1 : 0);
        return bScore - aScore;
      });
    }

    return data;
  };

  const displayedContacts = getFilteredAndSortedData();

  useEffect(() => {
    fetchContacts();
  }, [page, limit]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/contacts?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const result = await response.json();

      setContacts(result.data);
      setTotalCount(result.count || 0);
      setTotalPages(result.totalPages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/contacts/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete contact");

      // Refresh data
      fetchContacts();
      setDeleteId(null);
    } catch (err) {
      alert("Failed to delete contact");
      console.error(err);
    }
  };

  // Parse row range string like "18-37" into start and end numbers
  const parseRowRange = (
    rangeStr: string
  ): { start: number; end: number } | null => {
    const trimmed = rangeStr.trim();
    const match = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) return null;

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (isNaN(start) || isNaN(end) || start < 1 || end < start) return null;
    return { start, end };
  };

  // Handle bulk delete button click - validate and show confirmation modal
  const handleBulkDeleteClick = () => {
    setBulkDeleteError(null);

    if (!bulkDeleteRange.trim()) {
      setBulkDeleteError("Please enter a row range (e.g., 18-37)");
      return;
    }

    const range = parseRowRange(bulkDeleteRange);
    if (!range) {
      setBulkDeleteError("Invalid format. Use format like: 18-37");
      return;
    }

    // Calculate actual row indices based on current page
    const pageOffset = (page - 1) * limit;
    const startIndex = range.start - 1 - pageOffset;
    const endIndex = range.end - 1 - pageOffset;

    // Validate that the range is within the current page's data
    if (startIndex < 0 || endIndex >= contacts.length || startIndex > endIndex) {
      const currentPageStart = pageOffset + 1;
      const currentPageEnd = Math.min(pageOffset + contacts.length, totalCount);
      setBulkDeleteError(
        `Row range must be within current page (${currentPageStart}-${currentPageEnd})`
      );
      return;
    }

    // Get the IDs of contacts to delete
    const idsToDelete = contacts
      .slice(startIndex, endIndex + 1)
      .map((contact) => contact.id);

    if (idsToDelete.length === 0) {
      setBulkDeleteError("No rows found in the specified range");
      return;
    }

    setBulkDeleteIds(idsToDelete);
    setShowBulkDeleteModal(true);
  };

  // Perform the actual bulk delete
  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch("/api/contacts/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: bulkDeleteIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete contacts");
      }

      // Refresh data and reset state
      fetchContacts();
      setBulkDeleteRange("");
      setBulkDeleteIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete contacts");
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
    setBulkDeleteIds([]);
  };

  const handleRowClick = (contactId: string) => {
    router.push(`/contacts/${contactId}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
    setPage(1); // Reset to first page when changing limit
  };

  // Render cell value based on column key
  const renderCellValue = (contact: Contact, columnKey: string) => {
    switch (columnKey) {
      case "first_name":
      case "last_name":
        return (
          <span className="font-medium">{contact[columnKey] || "-"}</span>
        );

      case "contact_status":
        return contact.contact_status ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${contact.contact_status === "Call"
              ? "bg-green-100 text-green-700"
              : contact.contact_status === "Email"
                ? "bg-blue-100 text-blue-700"
                : contact.contact_status === "LinkedIn"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-red-100 text-red-700"
              }`}
          >
            {contact.contact_status}
          </span>
        ) : (
          "-"
        );

      case "contact_date":
        return contact.contact_date
          ? format(new Date(contact.contact_date), "PP")
          : "-";

      case "contacted":
        return contact.contacted ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            No
          </span>
        );

      case "linkedin_status":
      case "cold_call_status":
      case "cold_email_status":
        const statusValue = contact[columnKey] || "Not Done";
        return statusValue === "Done" ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            Done
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            Not Done
          </span>
        );

      case "created_at":
        return contact.created_at
          ? format(new Date(contact.created_at), "PP")
          : "-";

      case "email_1":
      case "email_2":
      case "email_3":
        return contact[columnKey] ? (
          <a
            href={`mailto:${contact[columnKey]}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {contact[columnKey]}
          </a>
        ) : (
          "-"
        );

      case "linkedin_url":
        return contact.linkedin_url ? (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {contact.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") || "View Profile"}
          </a>
        ) : (
          "-"
        );

      default:
        return contact[columnKey] || "-";
    }
  };

  // Get visible column configs in order
  const getVisibleColumnConfigs = () => {
    return visibleColumns
      .map((key) => ALL_COLUMNS.find((col) => col.key === key))
      .filter(Boolean) as ColumnConfig[];
  };

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">Error: {error}</div>
    );
  }

  const visibleColumnConfigs = getVisibleColumnConfigs();
  const totalColumnSpan = visibleColumnConfigs.length + 2; // +1 for row number, +1 for actions column

  return (
    <div className="space-y-6 p-6">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <Link
          href="/contacts/add"
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {/* Controls Row: Column Customizer and Bulk Delete */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Column Customizer */}
        <ColumnCustomizer
          allColumns={ALL_COLUMNS}
          defaultColumns={DEFAULT_COLUMNS}
          visibleColumns={visibleColumns}
          onColumnsChange={setVisibleColumns}
          storageKey={STORAGE_KEY}
        />

        {/* Bulk Delete Controls */}
        <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <label
              htmlFor="bulkDeleteRange"
              className="text-sm font-medium text-gray-700"
            >
              Delete Rows:
            </label>
            <input
              id="bulkDeleteRange"
              type="text"
              value={bulkDeleteRange}
              onChange={(e) => {
                setBulkDeleteRange(e.target.value);
                setBulkDeleteError(null);
              }}
              placeholder="e.g., 18-37"
              className="h-9 w-32 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              disabled={!bulkDeleteRange.trim()}
            >
              <Trash2 className="h-4 w-4" />
              Bulk Delete
            </button>
          </div>
          {bulkDeleteError && (
            <span className="text-sm text-red-600">{bulkDeleteError}</span>
          )}
        </div>

        <span className="ml-auto text-xs text-gray-500">
          Current page rows: {(page - 1) * limit + 1} -{" "}
          {Math.min(page * limit, totalCount)}
        </span>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search Bar with Type Selector */}
        <div className="flex items-center gap-2">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "name" | "email")}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
          </select>
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchType === "name" ? "Search by name..." : "Search by email..."}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "" | "name" | "contacts")}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No Sorting</option>
            <option value="name">Sort by Name (A-Z)</option>
            <option value="contacts">Sort by Contacts</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                {visibleColumnConfigs.map((column) => (
                  <TableHead key={column.key} style={{ width: column.width }}>
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="w-[80px] text-center sticky right-0 bg-white shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={totalColumnSpan} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedContacts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={totalColumnSpan}
                    className="h-24 text-center text-gray-500"
                  >
                    No contacts found.
                  </TableCell>
                </TableRow>
              ) : (
                displayedContacts.map((contact, index) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-gray-50 bg-white"
                    onClick={() => handleRowClick(contact.id)}
                  >
                    <TableCell className="text-center text-gray-500 font-medium">
                      {(page - 1) * limit + index + 1}
                    </TableCell>
                    {visibleColumnConfigs.map((column) => (
                      <TableCell key={column.key}>
                        {renderCellValue(contact, column.key)}
                      </TableCell>
                    ))}
                    <TableCell
                      className="text-center sticky right-0 bg-white shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setDeleteId(contact.id)}
                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 py-1 outline-none focus:border-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">40</option>
            </select>
            <span className="ml-2">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount} results
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page Numbers */}
            {(() => {
              const pages: (number | string)[] = [];

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);

                if (page > 3) {
                  pages.push("...");
                }

                const start = Math.max(2, page - 1);
                const end = Math.min(totalPages - 1, page + 1);

                for (let i = start; i <= end; i++) {
                  if (!pages.includes(i)) {
                    pages.push(i);
                  }
                }

                if (page < totalPages - 2) {
                  pages.push("...");
                }

                if (!pages.includes(totalPages)) {
                  pages.push(totalPages);
                }
              }

              return pages.map((p, idx) => {
                if (p === "...") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-8 w-8 items-center justify-center text-gray-500"
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = p as number;
                const isCurrentPage = pageNum === page;
                const isLastPage = pageNum === totalPages;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${isCurrentPage
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {isLastPage && totalPages > 7 ? "Last" : pageNum}
                  </button>
                );
              });
            })()}

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Contact
            </h3>
            <p className="mt-2 text-gray-500">
              Are you sure you want to delete this contact?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                No
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Delete Contacts
            </h3>
            <p className="mt-2 text-gray-500">
              Are you sure you want to delete all these row datas?
            </p>
            <p className="mt-2 text-sm font-medium text-red-600">
              {bulkDeleteIds.length} contact(s) will be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelBulkDelete}
                disabled={isBulkDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </span>
                ) : (
                  "Yes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
