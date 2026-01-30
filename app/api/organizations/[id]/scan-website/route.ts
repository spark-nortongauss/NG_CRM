import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

// Email regex pattern - matches most email formats
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone regex pattern - matches international formats
const PHONE_REGEX = /(?:\+?[\d]{1,4}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?[\d]{3,4}[\s.-]?[\d]{3,4}[\s.-]?[\d]{0,4}/g;

// Common pages to crawl for contact information
const PAGES_TO_CRAWL = [
  "",
  "/contact",
  "/contact-us",
  "/contactus",
  "/about",
  "/about-us",
  "/aboutus",
  "/team",
  "/our-team",
  "/leadership",
  "/management",
  "/people",
  "/staff",
  "/support",
  "/help",
  "/reach-us",
  "/get-in-touch",
];

// Common email prefixes to filter out (often not useful)
const SPAM_EMAIL_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
];

// File extensions to exclude from email matching (these are often image references)
const EXCLUDED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".pdf",
  ".doc",
  ".docx",
];

interface ScrapedContact {
  type: "email" | "phone";
  value: string;
  source: string;
  context?: string;
}

interface ScanResult {
  emails: ScrapedContact[];
  phones: ScrapedContact[];
  pagesScanned: string[];
  pagesFailed: string[];
  organizationHasEmail: boolean;
  organizationHasPhone: boolean;
}

function normalizeUrl(baseUrl: string, path: string): string {
  try {
    // Remove trailing slash from base URL
    const cleanBase = baseUrl.replace(/\/+$/, "");
    // Remove leading slash from path if base doesn't end with one
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  } catch {
    return "";
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isValidEmail(email: string, domain: string): boolean {
  // Check for excluded extensions (often image files)
  const lowerEmail = email.toLowerCase();
  if (EXCLUDED_EXTENSIONS.some((ext) => lowerEmail.endsWith(ext))) {
    return false;
  }

  // Check for spam prefixes
  const prefix = lowerEmail.split("@")[0];
  if (SPAM_EMAIL_PREFIXES.some((spam) => prefix.includes(spam))) {
    return false;
  }

  // Check if email is too long (likely not a real email)
  if (email.length > 100) {
    return false;
  }

  // Check for minimum structure
  if (!email.includes("@") || !email.includes(".")) {
    return false;
  }

  return true;
}

function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, "");

  // Phone should have between 7 and 15 digits
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }

  // Avoid matching years (1900-2099)
  if (/^(19|20)\d{2}$/.test(digitsOnly)) {
    return false;
  }

  return true;
}

function cleanPhone(phone: string): string {
  // Remove extra whitespace and normalize
  return phone.replace(/\s+/g, " ").trim();
}

async function fetchPageContent(
  url: string,
  timeout: number = 10000
): Promise<{ html: string; success: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        html: "",
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    return { html, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      html: "",
      success: false,
      error: errorMessage.includes("abort") ? "Timeout" : errorMessage,
    };
  }
}

function extractContactsFromHtml(
  html: string,
  pageUrl: string,
  domain: string
): { emails: ScrapedContact[]; phones: ScrapedContact[] } {
  const $ = cheerio.load(html);
  const emails: ScrapedContact[] = [];
  const phones: ScrapedContact[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  // Remove script and style tags to avoid false positives
  $("script, style, noscript").remove();

  // Get the text content
  const textContent = $("body").text();

  // Also check for mailto: links
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].toLowerCase().trim();
    if (email && isValidEmail(email, domain) && !seenEmails.has(email)) {
      seenEmails.add(email);
      const context = $(element).parent().text().slice(0, 100).trim();
      emails.push({
        type: "email",
        value: email,
        source: pageUrl,
        context: context || undefined,
      });
    }
  });

  // Also check for tel: links
  $('a[href^="tel:"]').each((_, element) => {
    const href = $(element).attr("href") || "";
    const phone = cleanPhone(href.replace("tel:", ""));
    if (phone && isValidPhone(phone) && !seenPhones.has(phone)) {
      seenPhones.add(phone);
      const context = $(element).parent().text().slice(0, 100).trim();
      phones.push({
        type: "phone",
        value: phone,
        source: pageUrl,
        context: context || undefined,
      });
    }
  });

  // Extract emails from text content
  const emailMatches = textContent.match(EMAIL_REGEX) || [];
  for (const email of emailMatches) {
    const cleanEmail = email.toLowerCase().trim();
    if (isValidEmail(cleanEmail, domain) && !seenEmails.has(cleanEmail)) {
      seenEmails.add(cleanEmail);
      emails.push({
        type: "email",
        value: cleanEmail,
        source: pageUrl,
      });
    }
  }

  // Extract phones from text content
  const phoneMatches = textContent.match(PHONE_REGEX) || [];
  for (const phone of phoneMatches) {
    const cleanedPhone = cleanPhone(phone);
    if (isValidPhone(cleanedPhone) && !seenPhones.has(cleanedPhone)) {
      seenPhones.add(cleanedPhone);
      phones.push({
        type: "phone",
        value: cleanedPhone,
        source: pageUrl,
      });
    }
  }

  return { emails, phones };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // First, fetch the organization to get the website URL and check existing data
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("org_id, legal_name, website_url, primary_email, primary_phone_e164")
      .eq("org_id", id)
      .single();

    if (orgError) {
      if (orgError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    if (!organization.website_url) {
      return NextResponse.json(
        { error: "Organization does not have a website URL configured" },
        { status: 400 }
      );
    }

    // Validate URL format
    let baseUrl: string;
    try {
      const urlObj = new URL(organization.website_url);
      baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return NextResponse.json(
        { error: "Invalid website URL format" },
        { status: 400 }
      );
    }

    const domain = extractDomain(baseUrl);
    const result: ScanResult = {
      emails: [],
      phones: [],
      pagesScanned: [],
      pagesFailed: [],
      organizationHasEmail: !!organization.primary_email,
      organizationHasPhone: !!organization.primary_phone_e164,
    };

    const allEmails = new Map<string, ScrapedContact>();
    const allPhones = new Map<string, ScrapedContact>();

    // Crawl each page
    for (const path of PAGES_TO_CRAWL) {
      const pageUrl = normalizeUrl(baseUrl, path);
      if (!pageUrl) continue;

      const { html, success, error } = await fetchPageContent(pageUrl);

      if (success && html) {
        result.pagesScanned.push(pageUrl);
        const { emails, phones } = extractContactsFromHtml(html, pageUrl, domain);

        // Deduplicate and store
        for (const email of emails) {
          if (!allEmails.has(email.value)) {
            allEmails.set(email.value, email);
          }
        }
        for (const phone of phones) {
          if (!allPhones.has(phone.value)) {
            allPhones.set(phone.value, phone);
          }
        }
      } else {
        result.pagesFailed.push(`${pageUrl} (${error})`);
      }

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    result.emails = Array.from(allEmails.values());
    result.phones = Array.from(allPhones.values());

    // Sort emails - prioritize company domain emails
    result.emails.sort((a, b) => {
      const aIsCompanyDomain = a.value.includes(domain);
      const bIsCompanyDomain = b.value.includes(domain);
      if (aIsCompanyDomain && !bIsCompanyDomain) return -1;
      if (!aIsCompanyDomain && bIsCompanyDomain) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      organization: {
        org_id: organization.org_id,
        legal_name: organization.legal_name,
        website_url: organization.website_url,
      },
      result,
    });
  } catch (error) {
    console.error("Website scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan website" },
      { status: 500 }
    );
  }
}
