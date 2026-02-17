"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function LayoutShell({
    children,
    header,
}: {
    children: React.ReactNode;
    header: React.ReactNode;
}) {
    const pathname = usePathname();
    // Check if it's the login page
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 flex flex-col pl-64 min-w-0 transition-all duration-300">
                {header}
                <main className="flex-1 pt-16 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
