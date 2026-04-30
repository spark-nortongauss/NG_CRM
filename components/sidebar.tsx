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
    LogOut,
    Settings,
    Globe,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { useUI } from "@/lib/hooks/use-store";
import { useUserRole } from "@/lib/hooks/use-user-role";

export function Sidebar() {
    const pathname = usePathname();
    const { isSuperAdmin } = useUserRole();

    // Use custom hook for UI state
    const { openMenus, toggleMenu, isSidebarOpen, setSidebarOpen } = useUI();

    // Helper to check if a route is active
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <div className={cn(
            "flex h-screen flex-col bg-ng-teal dark:bg-ng-dark-deep fixed left-0 top-0 z-50 overflow-y-auto overflow-x-hidden transition-all duration-300 w-64 max-w-[85vw]",
            isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}>
            {/* Logo Area */}
            <div className="flex justify-between h-16 shrink-0 items-center border-b border-white/20 px-6">
                <span className="text-xl font-bold tracking-tight font-primary truncate">
                    <span className="text-ng-yellow">NG</span>
                    <span className="text-white ml-1">CRM</span>
                </span>

                {/* Mobile close button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="md:hidden flex h-10 w-10 -mr-2 items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close Sidebar"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            <nav className="flex-1 space-y-2 p-3">
                {/* Home / Dashboard */}
                <div>
                    <Link
                        href="/home"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 group w-full",
                            isActive("/home") ? "bg-white/10 text-ng-yellow" : "text-white"
                        )}
                    >
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        <span className="font-medium text-sm truncate">Home</span>
                    </Link>
                </div>

                {/* Organizations Menu */}
                <div>
                    <button
                        onClick={() => toggleMenu("organizations")}
                        className={cn(
                            "flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 w-full group",
                            isActive("/organizations") || isActive("/add-org-form") ? "text-ng-yellow" : "text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 shrink-0" />
                            <span className="font-medium text-sm truncate">Organizations</span>
                        </div>
                        {openMenus.organizations ? (
                            <ChevronDown className="h-4 w-4 text-white/60 shrink-0" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
                        )}
                    </button>

                    {openMenus.organizations && (
                        <div className="ml-9 mt-1 mb-2 space-y-1">
                            <Link
                                href="/add-org-form"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/add-org-form"
                                        ? "bg-white/10 text-ng-yellow font-medium"
                                        : "text-white/80"
                                )}
                            >
                                <Plus className="h-4 w-4 shrink-0" />
                                <span className="truncate">Add Organization</span>
                            </Link>
                            <Link
                                href="/organizations"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/organizations" ? "bg-white/10 text-ng-yellow font-medium" : "text-white/80"
                                )}
                            >
                                <List className="h-4 w-4 shrink-0" />
                                <span className="truncate">Organizations List</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Contacts Menu */}
                <div>
                    <button
                        onClick={() => toggleMenu("contacts")}
                        className={cn(
                            "flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 w-full group",
                            isActive("/contacts") ? "text-ng-yellow bg-white/5" : "text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 shrink-0" />
                            <span className="font-medium text-sm truncate">Contacts</span>
                        </div>
                        {openMenus.contacts ? (
                            <ChevronDown className="h-4 w-4 text-white/60 shrink-0" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
                        )}
                    </button>

                    {openMenus.contacts && (
                        <div className="ml-9 mt-1 mb-2 space-y-1">
                            <Link
                                href="/contacts/add"
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/10 hover:text-ng-yellow",
                                    pathname === "/contacts/add"
                                        ? "bg-white/10 text-ng-yellow font-medium"
                                        : "text-white/80"
                                )}
                            >
                                <Plus className="h-4 w-4 shrink-0" />
                                <span className="truncate">Add Contact</span>
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
                                <List className="h-4 w-4 shrink-0" />
                                <span className="truncate">Contacts List</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Task Board Menu */}
                <div>
                    <Link
                        href="/task-board"
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 group w-full",
                            isActive("/task-board") ? "bg-white/10 text-ng-yellow" : "text-white"
                        )}
                    >
                        <ClipboardList className="h-5 w-5 shrink-0" />
                        <span className="font-medium text-sm truncate">Task Board</span>
                    </Link>
                </div>

                {/* Industry Scrapper Menu — Super Admin Only */}
                {isSuperAdmin && (
                    <div>
                        <Link
                            href="/scrapper-api"
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 group w-full",
                                isActive("/scrapper-api") ? "bg-white/10 text-ng-yellow" : "text-white"
                            )}
                        >
                            <Globe className="h-5 w-5 shrink-0" />
                            <span className="font-medium text-sm truncate">Industry Scrapper</span>
                        </Link>
                    </div>
                )}

                {/* User Settings Menu — Super Admin Only */}
                {isSuperAdmin && (
                    <div>
                        <Link
                            href="/user-settings"
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-white/10 group w-full",
                                isActive("/user-settings") ? "bg-white/10 text-ng-yellow" : "text-white"
                            )}
                        >
                            <Settings className="h-5 w-5 shrink-0" />
                            <span className="font-medium text-sm truncate">User Settings</span>
                        </Link>
                    </div>
                )}
            </nav>

            {/* Logout Section */}
            <div className="border-t border-white/20 p-3 shrink-0">
                <button
                    onClick={() => signOut()}
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-white transition-colors hover:bg-white/10 hover:text-red-400 group w-full"
                    )}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="font-medium text-sm truncate">Logout</span>
                </button>
            </div>
        </div>
    );
}

