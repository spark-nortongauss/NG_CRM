import { createClient } from "@/lib/supabase/server";
import { UserCircle } from "lucide-react";

export async function Header() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="fixed top-0 right-0 left-64 z-30 flex h-16 items-center justify-end border-b border-white/20 bg-ng-teal px-6 shadow-sm">
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">
                                {user.user_metadata?.full_name || user.email}
                            </p>
                            <p className="text-xs text-white/70">{user.email}</p>
                        </div>
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                            {/* Replace with Avatar if available, else generic icon */}
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

