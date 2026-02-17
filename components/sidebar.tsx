"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    ClipboardList,
    Plus,
    List,
    ChevronRight,
    ChevronDown,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { useUI } from "@/lib/hooks/use-store";

export function Sidebar() {
    const pathname = usePathname();

    // Use custom hook for UI state
    const { openMenus, toggleMenu } = useUI();

    // Helper to check if a route is active
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <div className="flex h-screen flex-col bg-ng-teal dark:bg-ng-dark-deep w-64 fixed left-0 top-0 z-50 overflow-y-auto transition-colors duration-200">
            {/* Logo Area */}
            <div className="flex h-16 items-center border-b border-white/20 px-6">
                <span className="text-xl font-bold tracking-tight font-primary">
                    <span className="text-ng-yellow">NG</span>{" "}
                    <span className="text-white">CRM</span>
                </span>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {/* Organizations Menu */}
                <div>
                    <button
                        onClick={() => toggleMenu("organizations")}
                        className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-white/10",
                            isActive("/organizations") ? "text-ng-yellow" : "text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5" />
                            <span>Organizations</span>
                        </div>
                        {openMenus.organizations ? (
                            <ChevronDown className="h-4 w-4 text-white/60" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-white/60" />
                        )}
                    </button>

                    {openMenus.organizations && (
                        <div className="ml-9 mt-1 space-y-1">
                            <Link
                                href="/add-org-form"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/add-org-form"
                                        ? "bg-white/10 text-ng-yellow font-medium"
                                        : "text-white/80"
                                )}
                            >
                                <Plus className="h-4 w-4" />
                                Add Organization
                            </Link>
                            <Link
                                href="/organizations"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/organizations" ? "bg-white/10 text-ng-yellow font-medium" : "text-white/80"
                                )}
                            >
                                <List className="h-4 w-4" />
                                Organizations List
                            </Link>
                        </div>
                    )}
                </div>

                {/* Contacts Menu */}
                <div className="pt-2">
                    <button
                        onClick={() => toggleMenu("contacts")}
                        className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-white/10",
                            isActive("/contacts") ? "text-ng-yellow" : "text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5" />
                            <span>Contacts</span>
                        </div>
                        {openMenus.contacts ? (
                            <ChevronDown className="h-4 w-4 text-white/60" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-white/60" />
                        )}
                    </button>

                    {openMenus.contacts && (
                        <div className="ml-9 mt-1 space-y-1">
                            <Link
                                href="/contacts/add"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/contacts/add"
                                        ? "bg-white/10 text-ng-yellow font-medium"
                                        : "text-white/80"
                                )}
                            >
                                <Plus className="h-4 w-4" />
                                Add Contact
                            </Link>
                            <Link
                                href="/contacts"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/contacts"
                                        ? "bg-white/10 text-ng-yellow font-medium"
                                        : "text-white/80"
                                )}
                            >
                                <List className="h-4 w-4" />
                                Contacts List
                            </Link>
                        </div>
                    )}
                </div>

                {/* Task Board Menu */}
                <div className="pt-2">
                    <Link
                        href="#"
                        className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-white/10",
                            isActive("/task-board") ? "bg-white/10 text-ng-yellow" : "text-white"
                        )}
                    >
                        <ClipboardList className="h-5 w-5" />
                        <span>Task Board</span>
                    </Link>
                </div>
            </nav>

            {/* Logout Section */}
            <div className="border-t border-white/20 p-4">
                <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-red-400"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

