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
import {
  ColumnCustomizer,
  ColumnConfig,
  useColumnVisibility,
} from "@/components/ui/column-customizer";
import { useUserRole } from "@/lib/hooks/use-user-role";

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
  keywords: string | null;
  created_at: string;
  creator?: {
    full_name: string | null;
    email: string;
  };
  [key: string]: any;
}

// Define all available columns with their configurations
const ALL_COLUMNS: ColumnConfig[] = [
  { key: "legal_name", label: "Legal Name", width: "180px" },
  { key: "trade_name", label: "Trade Name", width: "150px" },
  { key: "company_type", label: "Company Type", width: "120px" },
  { key: "industry_primary", label: "Industry", width: "150px" },
  { key: "vertical", label: "Vertical", width: "130px" },
  { key: "sub_vertical", label: "Sub-Vertical", width: "130px" },
  { key: "hq_city", label: "City", width: "120px" },
  { key: "hq_region", label: "Region/State", width: "120px" },
  { key: "hq_country_code", label: "Country", width: "80px" },
  { key: "hq_address_line1", label: "Address Line 1", width: "180px" },
  { key: "hq_address_line2", label: "Address Line 2", width: "150px" },
  { key: "hq_postal_code", label: "Postal Code", width: "100px" },
  { key: "linkedin_url", label: "LinkedIn", width: "180px" },
  { key: "website_url", label: "Website", width: "180px" },
  { key: "annual_revenue_amount", label: "Revenue", width: "100px" },
  { key: "annual_revenue_currency", label: "Revenue Currency", width: "100px" },
  { key: "account_tier", label: "Tier", width: "100px" },
  { key: "lifecycle_stage", label: "Lifecycle Stage", width: "130px" },
  { key: "source_channel", label: "Source Channel", width: "130px" },
  { key: "business_model", label: "Business Model", width: "130px" },
  { key: "employee_count_range", label: "Employees", width: "110px" },
  { key: "timezone", label: "Timezone", width: "130px" },
  { key: "keywords", label: "Keywords", width: "200px" },
  { key: "primary_email", label: "Email", width: "200px" },
  { key: "primary_phone_e164", label: "Phone", width: "150px" },
  { key: "creator", label: "Created By", width: "150px" },
  { key: "created_at", label: "Created Date", width: "120px" },
];

// Default columns shown initially
const DEFAULT_COLUMNS = [
  "legal_name",
  "trade_name",
  "industry_primary",
  "hq_city",
  "hq_country_code",
  "linkedin_url",
  "annual_revenue_amount",
  "account_tier",
  "keywords",
  "primary_email",
  "primary_phone_e164",
  "creator",
];

const STORAGE_KEY = "org-table-columns";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Role-based access
  const { isSuperAdmin } = useUserRole();

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
  const [sortOption, setSortOption] = useState<"" | "name" | "contacts">("");

  // Compute filtered and sorted data
  const getFilteredAndSortedData = () => {
    let data = [...organizations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((org) =>
        org.legal_name?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortOption === "name") {
      data.sort((a, b) =>
        (a.legal_name || "").localeCompare(b.legal_name || "")
      );
    } else if (sortOption === "contacts") {
      // Prioritize organizations with more contact data
      data.sort((a, b) => {
        const aScore =
          (a.primary_email ? 1 : 0) + (a.primary_phone_e164 ? 1 : 0);
        const bScore =
          (b.primary_email ? 1 : 0) + (b.primary_phone_e164 ? 1 : 0);
        return bScore - aScore;
      });
    }

    return data;
  };

  const displayedOrganizations = getFilteredAndSortedData();

  useEffect(() => {
    fetchOrganizations();
  }, [page, limit]);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations?page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const result = await response.json();

      setOrganizations(result.data);
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
      const response = await fetch(`/api/organizations/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete organization");

      // Refresh data
      fetchOrganizations();
      setDeleteId(null);
    } catch (err) {
      alert("Failed to delete organization");
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
    if (
      startIndex < 0 ||
      endIndex >= organizations.length ||
      startIndex > endIndex
    ) {
      const currentPageStart = pageOffset + 1;
      const currentPageEnd = Math.min(
        pageOffset + organizations.length,
        totalCount
      );
      setBulkDeleteError(
        `Row range must be within current page (${currentPageStart}-${currentPageEnd})`
      );
      return;
    }

    // Get the IDs of organizations to delete
    const idsToDelete = organizations
      .slice(startIndex, endIndex + 1)
      .map((org) => org.org_id);

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
      const response = await fetch("/api/organizations/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: bulkDeleteIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete organizations");
      }

      // Refresh data and reset state
      fetchOrganizations();
      setBulkDeleteRange("");
      setBulkDeleteIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete organizations"
      );
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
    setBulkDeleteIds([]);
  };

  const handleRowClick = (orgId: string) => {
    router.push(`/organizations/${orgId}`);
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
  const renderCellValue = (org: Organization, columnKey: string) => {
    switch (columnKey) {
      case "legal_name":
        return <span className="font-medium">{org.legal_name}</span>;

      case "linkedin_url":
        return org.linkedin_url ? (
          <a
            href={org.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            {org.linkedin_url.replace(
              /^https?:\/\/(www\.)?linkedin\.com\//,
              ""
            )}
          </a>
        ) : (
          "-"
        );

      case "website_url":
        return org.website_url ? (
          <a
            href={org.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            {org.website_url.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          "-"
        );

      case "annual_revenue_amount":
        return org.annual_revenue_amount
          ? `$${org.annual_revenue_amount.toLocaleString()}`
          : "-";

      case "account_tier":
        return org.account_tier ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            {org.account_tier}
          </span>
        ) : (
          "-"
        );

      case "lifecycle_stage":
        return org.lifecycle_stage ? (
          <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
            {org.lifecycle_stage}
          </span>
        ) : (
          "-"
        );

      case "keywords":
        return org.keywords ? (
          <div className="flex flex-wrap gap-1">
            {org.keywords
              .split(",")
              .slice(0, 3)
              .map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-ng-dark-elevated px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                >
                  {keyword.trim()}
                </span>
              ))}
            {org.keywords.split(",").length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{org.keywords.split(",").length - 3}
              </span>
            )}
          </div>
        ) : (
          "-"
        );

      case "creator":
        return org.creator?.full_name || org.creator?.email || "-";

      case "created_at":
        return org.created_at
          ? new Date(org.created_at).toLocaleDateString()
          : "-";

      default:
        return org[columnKey] || "-";
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
      <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-red-600 dark:text-red-400">Error: {error}</div>
    );
  }

  const visibleColumnConfigs = getVisibleColumnConfigs();
  const totalColumnSpan = visibleColumnConfigs.length + (isSuperAdmin ? 2 : 1); // +1 for row number, +1 for actions column (super_admin only)

  return (
    <div className="space-y-6 p-6">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organizations</h1>
        <Link
          href="/add-org-form"
          className="flex items-center gap-2 rounded-md bg-ng-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ng-teal/90"
        >
          <Plus className="h-4 w-4" />
          Add Organization
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

        {/* Bulk Delete Controls - Super Admin only */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <label
                htmlFor="bulkDeleteRange"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
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
                className="h-9 w-32 rounded-md border border-gray-300 dark:border-ng-dark-elevated dark:bg-ng-dark-bg dark:text-gray-200 px-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
        )}

        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          Current page rows: {(page - 1) * limit + 1} -{" "}
          {Math.min(page * limit, totalCount)}
        </span>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by organization name..."
            className="h-10 w-full rounded-lg border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card dark:text-gray-200 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:placeholder-gray-500"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "" | "name" | "contacts")}
            className="h-10 rounded-lg border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card dark:text-gray-200 px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No Sorting</option>
            <option value="name">Sort by Name (A-Z)</option>
            <option value="contacts">Sort by Contacts</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card shadow-sm overflow-hidden">
        {/* Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">#</TableHead>
                {visibleColumnConfigs.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </TableHead>
                ))}
                {isSuperAdmin && (
                  <TableHead className="w-[80px] text-center sticky right-0 bg-white dark:bg-ng-dark-card shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]">
                    Actions
                  </TableHead>
                )}
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
              ) : displayedOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={totalColumnSpan}
                    className="h-24 text-center text-gray-500"
                  >
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                displayedOrganizations.map((org, index) => (
                  <TableRow
                    key={org.org_id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-ng-dark-hover bg-white dark:bg-ng-dark-card"
                    onClick={() => handleRowClick(org.org_id)}
                  >
                    <TableCell className="text-center text-gray-500 dark:text-gray-400 font-medium">
                      {(page - 1) * limit + index + 1}
                    </TableCell>
                    {visibleColumnConfigs.map((column) => (
                      <TableCell key={column.key}>
                        {renderCellValue(org, column.key)}
                      </TableCell>
                    ))}
                    {isSuperAdmin && (
                      <TableCell
                        className="text-center sticky right-0 bg-white dark:bg-ng-dark-card shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setDeleteId(org.org_id)}
                          className="rounded-full p-2 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                          title="Delete Organization"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-ng-dark-elevated px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="h-8 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg dark:text-gray-200 px-2 py-1 outline-none focus:border-blue-500"
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 dark:border-ng-dark-elevated dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
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
                      : "border-gray-300 dark:border-ng-dark-elevated dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 dark:border-ng-dark-elevated dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-ng-dark-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete Organization
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this data?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-gray-300 dark:border-ng-dark-elevated px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-ng-dark-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Bulk Delete Organizations
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Are you sure you want to delete all these row datas?
            </p>
            <p className="mt-2 text-sm font-medium text-red-600">
              {bulkDeleteIds.length} organization(s) will be permanently
              deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelBulkDelete}
                disabled={isBulkDeleting}
                className="rounded-md border border-gray-300 dark:border-ng-dark-elevated px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
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
