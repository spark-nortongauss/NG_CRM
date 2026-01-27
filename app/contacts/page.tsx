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
import { format } from "date-fns";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  job_title: string | null;
  mobile_1: string | null;
  mobile_2: string | null;
  email_1: string | null;
  email_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_status: string | null;
  contact_date: string | null;
  contacted: boolean;
  created_at: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <Link
          href="/contacts/add"
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[1350px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">First Name</TableHead>
                <TableHead className="w-[150px]">Last Name</TableHead>
                <TableHead className="w-[180px]">Organization</TableHead>
                <TableHead className="w-[150px]">Job Title</TableHead>
                <TableHead className="w-[140px]">Mobile 1</TableHead>
                <TableHead className="w-[180px]">Email 1</TableHead>
                <TableHead className="w-[120px]">City</TableHead>
                <TableHead className="w-[100px]">State</TableHead>
                <TableHead className="w-[100px]">Country</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px]">Contact Date</TableHead>
                <TableHead className="w-[80px] text-center sticky right-0 bg-white shadow-[-5px_0px_10px_-5px_rgba(0,0,0,0.1)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
<TableCell colSpan={12} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="h-24 text-center text-gray-500"
                  >
                    No contacts found.
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-gray-50 bg-white"
                    onClick={() => handleRowClick(contact.id)}
                  >
                    <TableCell className="font-medium">
                      {contact.first_name || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {contact.last_name || "-"}
                    </TableCell>
                    <TableCell>{contact.organization || "-"}</TableCell>
                    <TableCell>{contact.job_title || "-"}</TableCell>
                    <TableCell>{contact.mobile_1 || "-"}</TableCell>
                    <TableCell>{contact.email_1 || "-"}</TableCell>
                    <TableCell>{contact.city || "-"}</TableCell>
                    <TableCell>{contact.state || "-"}</TableCell>
                    <TableCell>{contact.country || "-"}</TableCell>
                    <TableCell>
                      {contact.contact_status ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            contact.contact_status === "Call"
                              ? "bg-green-100 text-green-700"
                              : contact.contact_status === "Email"
                                ? "bg-blue-100 text-blue-700"
                                : contact.contact_status === "LinkedIn"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {contact.contact_status}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.contact_date
                        ? format(new Date(contact.contact_date), "PP")
                        : "-"}
                    </TableCell>
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
    </div>
  );
}
