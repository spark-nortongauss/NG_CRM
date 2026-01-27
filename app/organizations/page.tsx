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
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface Organization {
  org_id: string;
  legal_name: string;
  trade_name: string | null;
  primary_email: string | null;
  primary_phone_e164: string | null;
  industry_primary: string | null;
  vertical: string | null;
  sub_vertical: string | null;
  hq_city: string | null;
  hq_country_code: string | null;
  linkedin_url: string | null;
  annual_revenue_amount: number | null;
  account_tier: string | null;
  keywords: string | null;
  created_at: string;
  creator?: {
    full_name: string | null;
    email: string;
  };
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const router = useRouter();

  useEffect(() => {
    fetchOrganizations();
  }, [page, limit]);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations?page=${page}&limit=${limit}`,
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

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <Link
          href="/add-org-form"
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Link>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            {" "}
            {/* Min width to force scroll */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Legal Name</TableHead>
                <TableHead className="w-[150px]">Trade Name</TableHead>
                <TableHead className="w-[150px]">Industry</TableHead>
                <TableHead className="w-[120px]">City</TableHead>
                <TableHead className="w-[80px]">Country</TableHead>
                <TableHead className="w-[180px]">LinkedIn</TableHead>
                <TableHead className="w-[100px]">Revenue</TableHead>
                <TableHead className="w-[100px]">Tier</TableHead>
                <TableHead className="w-[200px]">Keywords</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[150px]">Phone</TableHead>
                <TableHead className="w-[150px]">Created By</TableHead>
                <TableHead className="w-[80px] text-center sticky right-0 bg-white shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : organizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="h-24 text-center text-gray-500"
                  >
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow
                    key={org.org_id}
                    className="cursor-pointer hover:bg-gray-50 bg-white"
                    onClick={() => handleRowClick(org.org_id)}
                  >
                    <TableCell className="font-medium">
                      {org.legal_name}
                    </TableCell>
                    <TableCell>{org.trade_name || "-"}</TableCell>
                    <TableCell>{org.industry_primary || "-"}</TableCell>
                    <TableCell>{org.hq_city || "-"}</TableCell>
                    <TableCell>{org.hq_country_code || "-"}</TableCell>
                    <TableCell>
                      {org.linkedin_url ? (
                        <a
                          href={org.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {org.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "")}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {org.annual_revenue_amount
                        ? `$${org.annual_revenue_amount.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {org.account_tier ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {org.account_tier}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {org.keywords ? (
                        <div className="flex flex-wrap gap-1">
                          {org.keywords
                            .split(",")
                            .slice(0, 3)
                            .map((keyword, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                              >
                                {keyword.trim()}
                              </span>
                            ))}
                          {org.keywords.split(",").length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{org.keywords.split(",").length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{org.primary_email || "-"}</TableCell>
                    <TableCell>{org.primary_phone_e164 || "-"}</TableCell>
                    <TableCell>
                      {org.creator?.full_name || org.creator?.email || "-"}
                    </TableCell>
                    <TableCell
                      className="text-center sticky right-0 bg-white shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setDeleteId(org.org_id)}
                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Organization"
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              Page {page} of {totalPages}
            </span>
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
              Delete Organization
            </h3>
            <p className="mt-2 text-gray-500">
              Are you sure you want to delete this data?
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
    </div>
  );
}
