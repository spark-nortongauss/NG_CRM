import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      first_name,
      last_name,
      organization,
      job_title,
      mobile_1,
      mobile_2,
      mobile_3,
      fixed_number,
      email_1,
      email_2,
      email_3,
      city,
      state,
      country,
      contact_status,
      contact_date,
      contacted,
    } = body;

    // Validate that at least first_name or last_name is provided
    if (!first_name?.trim() && !last_name?.trim()) {
      return NextResponse.json(
        { error: "At least First Name or Last Name is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("contacts")
      .insert([
        {
          first_name: first_name || null,
          last_name: last_name || null,
          organization: organization || null,
          job_title: job_title || null,
          mobile_1: mobile_1 || null,
          mobile_2: mobile_2 || null,
          mobile_3: mobile_3 || null,
          fixed_number: fixed_number || null,
          email_1: email_1 || null,
          email_2: email_2 || null,
          email_3: email_3 || null,
          city: city || null,
          state: state || null,
          country: country || null,
          contact_status: contact_status || null,
          contact_date: contact_date || null,
          contacted: contacted || false,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create contact" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Clamp limit
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  try {
    const { data, count, error } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count,
      page,
      limit: safeLimit,
      totalPages: count ? Math.ceil(count / safeLimit) : 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
