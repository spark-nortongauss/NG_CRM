import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type UserRole = "super_admin" | "user";

export async function getUserRole(): Promise<{ role: UserRole; userId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { role: "user", userId: null };
  }

  const role = (user.user_metadata?.role as UserRole) || "user";
  return { role, userId: user.id };
}

export async function requireSuperAdmin() {
  const { role, userId } = await getUserRole();

  if (!userId) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (role !== "super_admin") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true as const, userId, role };
}
