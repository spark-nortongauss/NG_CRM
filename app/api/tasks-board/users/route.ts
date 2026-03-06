import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Returns users from public.users for assignee dropdown on the task board.
 * Any authenticated user can list users for assignment.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email")
      .order("full_name", { ascending: true })
      .limit(500);

    if (error) {
      console.error("tasks-board users GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error("tasks-board users GET:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
