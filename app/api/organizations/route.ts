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

    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        ...rest,
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
        { error: "Failed to create organization" },
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
    return NextResponse.json(
      {
        error: "Failed to create organization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


