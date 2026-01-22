import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();

    const {
      tags,
      annual_revenue_amount,
      annual_revenue_currency,
      marketing_opt_in_status,
      do_not_contact,
      account_owner_user_id,
      ...rest
    } = body;

    const parsedTags: string[] = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
        : [];

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    // Convert empty strings to null for UUID fields
    const accountOwnerId =
      account_owner_user_id && account_owner_user_id.trim() !== ""
        ? account_owner_user_id
        : null;

    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        ...rest,
        account_owner_user_id: accountOwnerId,
        annual_revenue_amount:
          typeof annual_revenue_amount === "number"
            ? annual_revenue_amount
            : null,
        annual_revenue_currency: annual_revenue_currency ?? null,
        marketing_opt_in_status: Boolean(marketing_opt_in_status),
        do_not_contact: Boolean(do_not_contact),
        created_by_user_id: userId,
        updated_by_user_id: userId,
      })
      .select("org_id")
      .single();

    if (error) {
      console.error("Error inserting organization:", error);
      return NextResponse.json(
        {
          error: "Failed to create organization",
          details: error.message || "Database error",
        },
        { status: 500 },
      );
    }

    if (org && parsedTags.length > 0) {
      const uniqueTags = Array.from(new Set(parsedTags));
      const { error: tagsError } = await supabase
        .from("organization_tags")
        .insert(
          uniqueTags.map((tagName) => ({
            org_id: org.org_id,
            tag_name: tagName,
          })),
        );

      if (tagsError) {
        console.error("Error inserting organization tags:", tagsError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        org_id: org?.org_id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Organization create error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: "Failed to create organization",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
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
      .from("organizations")
      .select(`
        *,
        creator:created_by_user_id (
          full_name,
          email
        )
      `, { count: "exact" })
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
      { status: 500 }
    );
  }
}


