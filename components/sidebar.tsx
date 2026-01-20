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
        <div className="flex h-screen flex-col bg-white w-64 fixed left-0 top-0 z-50 overflow-y-auto">
            {/* Logo Area - Optional but good for spacing */}
            <div className="flex h-16 items-center border-b px-6">
                <span className="text-xl font-bold tracking-tight text-blue-600">NG <span className="text-gray-900">CRM</span></span>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {/* Organizations Menu */}
                <div>
                    <button
                        onClick={() => toggleMenu("organizations")}
                        className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
                            isActive("/organizations") ? "text-blue-600" : "text-gray-700"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5" />
                            <span>Organizations</span>
                        </div>
                        {openMenus.organizations ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {openMenus.organizations && (
                        <div className="ml-9 mt-1 space-y-1">
                            <Link
                                href="#"
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                            >
                                <Plus className="h-4 w-4" />
                                Add Organization
                            </Link>
                            <Link
                                href="/organizations"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-50 hover:text-blue-600",
                                    pathname === "/organizations" ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600"
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
                            "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
                            isActive("/contacts") ? "text-blue-600" : "text-gray-700"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5" />
                            <span>Contacts</span>
                        </div>
                        {openMenus.contacts ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {openMenus.contacts && (
                        <div className="ml-9 mt-1 space-y-1">
                            <Link
                                href="#"
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                            >
                                <Plus className="h-4 w-4" />
                                Add Contact
                            </Link>
                            <Link
                                href="#"
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600"
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
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
                            isActive("/task-board") ? "bg-blue-50 text-blue-600" : "text-gray-700"
                        )}
                    >
                        <ClipboardList className="h-5 w-5" />
                        <span>Task Board</span>
                    </Link>
                </div>
            </nav>

            {/* Logout Section */}
            <div className="border-t p-4">
                <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-red-600"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
