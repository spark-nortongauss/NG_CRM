import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATES = ["inbox", "no_response", "no_interest", "meeting_scheduled"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks_board")
    .select("id, title, state, assigned_to, due_date, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title must be a non-empty string" }, { status: 400 });
    }
    updates.title = body.title.trim();
  }

  if (body.state !== undefined) {
    if (!VALID_STATES.includes(body.state)) {
      return NextResponse.json(
        { error: "Invalid state. Must be one of: inbox, no_response, no_interest, meeting_scheduled" },
        { status: 400 }
      );
    }
    updates.state = body.state;
  }

  if (body.assigned_to !== undefined) {
    updates.assigned_to = body.assigned_to === null || body.assigned_to === "" ? null : body.assigned_to;
  }

  if (body.due_date !== undefined) {
    updates.due_date = body.due_date === null || body.due_date === "" ? null : body.due_date;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks_board")
    .update(updates)
    .eq("id", id)
    .select("id, title, state, assigned_to, due_date, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("tasks_board").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
