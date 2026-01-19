import { createClient } from "@/lib/supabase/server";
import { UserCircle } from "lucide-react";

export async function Header() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="fixed top-0 right-0 left-64 z-30 flex h-16 items-center justify-end border-b bg-white px-6 shadow-sm">
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                                {user.user_metadata?.full_name || user.email}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                            {/* Replace with Avatar if available, else generic icon */}
                            <UserCircle className="h-6 w-6 text-gray-400" />
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">Not Logged In</div>
                )}
            </div>
        </header>
    );
}
