"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { useUI } from "@/lib/hooks/use-store";
import { cn } from "@/lib/utils";

export function LayoutShell({
    children,
    header,
}: {
    children: React.ReactNode;
    header: React.ReactNode;
}) {
    const pathname = usePathname();
    const { isSidebarOpen, setSidebarOpen } = useUI();
    const [isMobile, setIsMobile] = useState(false);
    
    // Check if it's the login page
    const isLoginPage = pathname === "/login";

    // Handle screen resize to detect mobile
    useEffect(() => {
        const checkIsMobile = () => {
            const isMob = window.innerWidth < 768; // md breakpoint
            setIsMobile(isMob);
            // If we transition FROM mobile TO desktop, we might want to auto-open
            // If from desktop to mobile, auto-close. But simpler to just let user toggle.
            if (isMob) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        checkIsMobile();
        window.addEventListener("resize", checkIsMobile);
        return () => window.removeEventListener("resize", checkIsMobile);
    }, [setSidebarOpen]);

    // Auto-close sidebar on route change when on mobile
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    }, [pathname, isMobile, setSidebarOpen]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background transition-colors duration-200">
            {/* Mobile overlays */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            <Sidebar />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out w-full border-0 md:pl-64">
                {header}
                <main className="flex-1 pt-16 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
