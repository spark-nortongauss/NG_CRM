"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Shield, ShieldCheck, User, Loader2, AlertCircle, CheckCircle2, Users, Trash2, X } from "lucide-react";

interface UserRecord {
    id: string;
    email: string;
    full_name: string;
    role: "super_admin" | "user";
    created_at: string;
    last_sign_in_at: string | null;
}

export default function UserSettingsPage() {
    const router = useRouter();
    const { isSuperAdmin, isLoading: roleLoading } = useUserRole();

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Fetch current user ID so we can hide delete on self
    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => setCurrentUserId(d.id || null))
            .catch(() => { });
    }, []);

    // Redirect non-super-admin users
    useEffect(() => {
        if (!roleLoading && !isSuperAdmin) {
            router.replace("/");
        }
    }, [roleLoading, isSuperAdmin, router]);

    // Fetch all users
    useEffect(() => {
        if (!isSuperAdmin) return;

        async function fetchUsers() {
            try {
                setLoading(true);
                const res = await fetch("/api/users");
                if (!res.ok) throw new Error("Failed to fetch users");
                const data = await res.json();
                setUsers(data.users);
            } catch (err: any) {
                setError(err.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        }

        fetchUsers();
    }, [isSuperAdmin]);

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const handleRoleChange = async (userId: string, newRole: "super_admin" | "user") => {
        setUpdatingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update role");
            }

            // Update local state
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
            );
            setToast({ type: "success", message: "Role updated successfully" });
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Failed to update role" });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirmDelete) return;
        setDeletingId(confirmDelete.id);
        try {
            const res = await fetch(`/api/users/${confirmDelete.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete user");
            }
            setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
            setToast({ type: "success", message: `${confirmDelete.full_name} has been deleted` });
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Failed to delete user" });
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "Never";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Show nothing while checking role
    if (roleLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-ng-teal dark:text-ng-yellow" />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <div className="min-h-screen p-6 md:p-8">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-20 right-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 shadow-xl transition-all duration-300 animate-in slide-in-from-right ${toast.type === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                        }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ng-teal dark:bg-ng-dark-elevated">
                        <Users className="h-5 w-5 text-ng-yellow" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white font-primary">
                        User Settings
                    </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-[52px]">
                    Manage user roles and permissions across the platform
                </p>
            </div>

            {/* Stats Strip */}
            {!loading && !error && (
                <div className="mb-6 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card px-4 py-2.5 shadow-sm">
                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Total Users:
                        </span>
                        <span className="text-sm font-bold text-ng-teal dark:text-ng-yellow">
                            {users.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card px-4 py-2.5 shadow-sm">
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Super Admins:
                        </span>
                        <span className="text-sm font-bold text-ng-teal dark:text-ng-yellow">
                            {users.filter((u) => u.role === "super_admin").length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card px-4 py-2.5 shadow-sm">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Regular Users:
                        </span>
                        <span className="text-sm font-bold text-ng-teal dark:text-ng-yellow">
                            {users.filter((u) => u.role === "user").length}
                        </span>
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card shadow-lg">
                {loading ? (
                    /* Loading Skeleton */
                    <div className="p-6">
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="h-4 w-8 rounded bg-gray-200 dark:bg-white/10" />
                                    <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-white/10" />
                                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-white/10" />
                                    <div className="h-8 w-32 rounded bg-gray-200 dark:bg-white/10" />
                                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-white/10" />
                                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-white/10" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    /* Error State */
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 rounded-lg bg-ng-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-ng-yellow dark:text-gray-900"
                        >
                            Try Again
                        </button>
                    </div>
                ) : users.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                        <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-ng-dark-deep">
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        #
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Name
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Email
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Role
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Last Sign In
                                    </th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Created
                                    </th>
                                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {users.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
                                    >
                                        {/* Row Number */}
                                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-400 dark:text-gray-500">
                                            {index + 1}
                                        </td>

                                        {/* Name */}
                                        <td className="whitespace-nowrap px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ng-teal/10 dark:bg-ng-yellow/10">
                                                    {user.role === "super_admin" ? (
                                                        <ShieldCheck className="h-4 w-4 text-ng-teal dark:text-ng-yellow" />
                                                    ) : (
                                                        <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.full_name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {user.email}
                                        </td>

                                        {/* Role Dropdown */}
                                        <td className="whitespace-nowrap px-4 py-4">
                                            <div className="relative">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) =>
                                                        handleRoleChange(
                                                            user.id,
                                                            e.target.value as "super_admin" | "user"
                                                        )
                                                    }
                                                    disabled={updatingId === user.id}
                                                    className={`
                            appearance-none cursor-pointer rounded-lg border px-3 py-1.5 pr-8 text-xs font-semibold uppercase tracking-wide transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-offset-1
                            disabled:cursor-wait disabled:opacity-60
                            ${user.role === "super_admin"
                                                            ? "border-amber-300 bg-amber-50 text-amber-800 focus:ring-amber-400 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300 dark:focus:ring-amber-500"
                                                            : "border-blue-300 bg-blue-50 text-blue-800 focus:ring-blue-400 dark:border-blue-600/40 dark:bg-blue-900/20 dark:text-blue-300 dark:focus:ring-blue-500"
                                                        }
                          `}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                                {updatingId === user.id ? (
                                                    <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
                                                ) : (
                                                    <Shield className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                                )}
                                            </div>
                                        </td>

                                        {/* Last Sign In */}
                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDateTime(user.last_sign_in_at)}
                                        </td>

                                        {/* Created */}
                                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(user.created_at)}
                                        </td>

                                        {/* Actions */}
                                        <td className="whitespace-nowrap px-4 py-4 text-center">
                                            {user.id !== currentUserId && (
                                                <button
                                                    onClick={() => setConfirmDelete(user)}
                                                    disabled={deletingId === user.id}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-wait"
                                                    title={`Delete ${user.full_name}`}
                                                >
                                                    {deletingId === user.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ng-dark-card p-6 shadow-2xl">

                        {/* Content */}
                        <h3 className="mb-2 text-center text-lg font-bold text-gray-900 dark:text-white">
                            Delete User
                        </h3>
                        <p className="mb-1 text-center text-sm text-gray-500 dark:text-gray-400">
                            Are you sure you want to delete this user?
                        </p>
                        <p className="mb-6 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {confirmDelete.full_name} ({confirmDelete.email})
                        </p>

                        {/* Warning */}
                        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 px-4 py-3">
                            <p className="text-xs text-red-700 dark:text-red-400">
                                ⚠️ This action is <strong>permanent</strong> and cannot be undone. The user will lose all access immediately.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-ng-dark-deep px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-ng-dark-hover"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={deletingId === confirmDelete.id}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait"
                            >
                                {deletingId === confirmDelete.id ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
