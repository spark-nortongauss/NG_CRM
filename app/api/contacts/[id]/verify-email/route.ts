import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticated } from "@/lib/auth/role-check";
import { verifyContactEmail } from "@/lib/contact-email-verification";

const ALLOWED_EMAIL_FIELDS = ["email_1", "email_2", "email_3"] as const;
type AllowedEmailField = (typeof ALLOWED_EMAIL_FIELDS)[number];

function isAllowedEmailField(value: string): value is AllowedEmailField {
  return (ALLOWED_EMAIL_FIELDS as readonly string[]).includes(value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticated();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = (await request.json()) as { emailField?: string };
    const emailField = body?.emailField ?? "";
    if (!isAllowedEmailField(emailField)) {
      return NextResponse.json(
        { error: "emailField must be email_1, email_2, or email_3" },
        { status: 400 },
      );
    }

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, organization, email_1, email_2, email_3")
      .eq("id", id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const emailRaw = contact[emailField];
    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    if (!email) {
      return NextResponse.json(
        { error: `${emailField} is empty for this contact` },
        { status: 400 },
      );
    }

    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
    const companyName = contact.organization ?? "";
    const report = await verifyContactEmail({
      checkedEmailField: emailField,
      email,
      fullName,
      companyName,
    });

    return NextResponse.json({
      success: true,
      emailField,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
