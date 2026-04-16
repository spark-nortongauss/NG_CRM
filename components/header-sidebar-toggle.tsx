"use client";

import { Menu } from "lucide-react";
import { useUI } from "@/lib/hooks/use-store";

export function HeaderSidebarToggle() {
    const { isSidebarOpen, toggleSidebar } = useUI();

    return (
        <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
            <Menu className="h-6 w-6" />
        </button>
    );
}
