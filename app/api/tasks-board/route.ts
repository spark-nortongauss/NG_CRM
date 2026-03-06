import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATES = ["inbox", "no_response", "no_interest", "meeting_scheduled"] as const;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tasks_board")
      .select("id, title, state, assigned_to, due_date, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("tasks-board GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("tasks-board GET:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { title, state = "inbox" } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!VALID_STATES.includes(state)) {
      return NextResponse.json(
        { error: "Invalid state. Must be one of: inbox, no_response, no_interest, meeting_scheduled" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tasks_board")
      .insert({
        title: title.trim(),
        state,
        assigned_to: body.assigned_to ?? null,
        due_date: body.due_date ?? null,
      })
      .select("id, title, state, assigned_to, due_date, created_at, updated_at")
      .single();

    if (error) {
      console.error("tasks-board POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("tasks-board POST:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
