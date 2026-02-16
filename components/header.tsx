import { createClient } from "@/lib/supabase/server";
import { UserCircle } from "lucide-react";

export async function Header() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const userRole = user?.user_metadata?.role || "user";
    const roleLabel = userRole === "super_admin" ? "Super Admin" : "User";

    return (
        <header className="fixed top-0 right-0 left-64 z-30 flex h-16 items-center justify-end border-b border-white/20 bg-ng-teal px-6 shadow-sm">
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <p className="text-sm font-medium text-white">
                                    {user.user_metadata?.full_name || user.email}
                                </p>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    userRole === "super_admin"
                                        ? "bg-ng-yellow text-gray-900"
                                        : "bg-white/20 text-white"
                                }`}>
                                    {roleLabel}
                                </span>
                            </div>
                            <p className="text-xs text-white/70">{user.email}</p>
                        </div>
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                            <UserCircle className="h-6 w-6 text-ng-yellow" />
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-white/70">Not Logged In</div>
                )}
            </div>
        </header>
    );
}

