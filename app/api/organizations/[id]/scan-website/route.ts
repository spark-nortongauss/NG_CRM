import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";
import parser from "parse-address";

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

interface ScrapedAddress {
  fullAddress?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  source: string;
}

interface ScanResult {
  emails: ScrapedContact[];
  phones: ScrapedContact[];
  linkedinUrl?: string;
  address?: ScrapedAddress;
  pagesScanned: string[];
  pagesFailed: string[];
  organizationHasEmail: boolean;
  organizationHasPhone: boolean;
  organizationHasLinkedin: boolean;
  organizationHasAddress: boolean;
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

// LinkedIn URL patterns
const LINKEDIN_COMPANY_REGEX = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+\/?/gi;

// Extract LinkedIn company URL from HTML
function extractLinkedinUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);

  // First, check for explicit LinkedIn links
  const linkedinLinks: string[] = [];

  // Check all anchor tags
  $('a[href*="linkedin.com/company"]').each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      linkedinLinks.push(href);
    }
  });

  // Also check for LinkedIn links in the text content
  const textContent = $.html();
  const matches = textContent.match(LINKEDIN_COMPANY_REGEX) || [];
  linkedinLinks.push(...matches);

  // Return the first valid LinkedIn company URL found
  for (const url of linkedinLinks) {
    // Clean the URL - remove trailing slashes and query params
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    if (cleanUrl.includes("linkedin.com/company/")) {
      return cleanUrl;
    }
  }

  return null;
}

// Address extraction patterns
const ADDRESS_INDICATORS = [
  "headquarters",
  "head office",
  "main office",
  "corporate office",
  "hq",
  "address",
  "location",
  "visit us",
  "find us",
  "our office",
  "office address",
];

// Common country names/codes for validation
const COUNTRY_PATTERNS = [
  "united states", "usa", "u.s.a", "u.s.", "us",
  "united kingdom", "uk", "u.k.",
  "canada", "australia", "germany", "france", "india",
  "spain", "italy", "netherlands", "belgium", "switzerland",
  "austria", "sweden", "norway", "denmark", "finland",
  "ireland", "portugal", "poland", "czech republic",
  "singapore", "hong kong", "japan", "china", "south korea",
  "brazil", "mexico", "argentina",
  "new zealand", "south africa", "uae", "dubai",
];

// Extract address from HTML
function extractAddress(html: string, pageUrl: string): ScrapedAddress | null {
  const $ = cheerio.load(html);

  // Remove script and style tags
  $("script, style, noscript").remove();

  // Look for structured address data first (Schema.org)
  const schemaAddress = extractSchemaAddress($);
  if (schemaAddress) {
    return { ...schemaAddress, source: pageUrl };
  }

  // Look for address in common locations
  const addressCandidates: { text: string; score: number }[] = [];

  // Check footer sections - often contains HQ address
  $("footer, .footer, #footer, [class*='footer']").each((_, element) => {
    const text = $(element).text().trim();
    const score = scoreAddressText(text);
    if (score > 0) {
      addressCandidates.push({ text, score: score + 10 }); // Bonus for being in footer
    }
  });

  // Check address-related elements
  $("address, [itemprop='address'], .address, #address, [class*='address']").each((_, element) => {
    const text = $(element).text().trim();
    const score = scoreAddressText(text);
    if (score > 0) {
      addressCandidates.push({ text, score: score + 15 }); // Bonus for being in address element
    }
  });

  // Check contact sections
  $("[class*='contact'], #contact, .contact-info, [class*='location']").each((_, element) => {
    const text = $(element).text().trim();
    const score = scoreAddressText(text);
    if (score > 0) {
      addressCandidates.push({ text, score: score + 5 });
    }
  });

  // Check elements near address indicators
  ADDRESS_INDICATORS.forEach((indicator) => {
    $(`*:contains("${indicator}")`).each((_, element) => {
      // Get nearby text
      const parentText = $(element).parent().text().trim();
      const score = scoreAddressText(parentText);
      if (score > 0 && parentText.length < 500) {
        addressCandidates.push({ text: parentText, score });
      }
    });
  });

  // Sort by score and get the best candidate
  addressCandidates.sort((a, b) => b.score - a.score);

  if (addressCandidates.length > 0) {
    const bestCandidate = addressCandidates[0];
    const parsed = parseAddressText(bestCandidate.text);
    if (parsed) {
      return { ...parsed, source: pageUrl };
    }
  }

  return null;
}

// Extract address from Schema.org structured data
function extractSchemaAddress($: cheerio.Root): Partial<ScrapedAddress> | null {
  // Check for JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const content = $(jsonLdScripts[i]).html();
      if (!content) continue;

      const data = JSON.parse(content);
      const address = findAddressInSchema(data);
      if (address) return address;
    } catch {
      // Invalid JSON, skip
    }
  }

  // Check for microdata
  const streetAddress = $('[itemprop="streetAddress"]').first().text().trim();
  const addressLocality = $('[itemprop="addressLocality"]').first().text().trim();
  const addressRegion = $('[itemprop="addressRegion"]').first().text().trim();
  const postalCode = $('[itemprop="postalCode"]').first().text().trim();
  const addressCountry = $('[itemprop="addressCountry"]').first().text().trim();

  if (streetAddress || addressLocality) {
    return {
      addressLine1: streetAddress || undefined,
      city: addressLocality || undefined,
      region: addressRegion || undefined,
      postalCode: postalCode || undefined,
      country: addressCountry || undefined,
      fullAddress: [streetAddress, addressLocality, addressRegion, postalCode, addressCountry]
        .filter(Boolean)
        .join(", "),
    };
  }

  return null;
}

// Recursively find address in Schema.org data
function findAddressInSchema(data: any): Partial<ScrapedAddress> | null {
  if (!data || typeof data !== "object") return null;

  // Check if this is an address object
  if (data["@type"] === "PostalAddress" || data.streetAddress) {
    return {
      addressLine1: data.streetAddress || undefined,
      city: data.addressLocality || undefined,
      region: data.addressRegion || undefined,
      postalCode: data.postalCode || undefined,
      country: typeof data.addressCountry === "string"
        ? data.addressCountry
        : data.addressCountry?.name || undefined,
      fullAddress: [
        data.streetAddress,
        data.addressLocality,
        data.addressRegion,
        data.postalCode,
        typeof data.addressCountry === "string" ? data.addressCountry : data.addressCountry?.name,
      ].filter(Boolean).join(", "),
    };
  }

  // Check address property
  if (data.address) {
    const result = findAddressInSchema(data.address);
    if (result) return result;
  }

  // Check location property
  if (data.location) {
    const result = findAddressInSchema(data.location);
    if (result) return result;
  }

  // Check arrays
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findAddressInSchema(item);
      if (result) return result;
    }
  }

  // Check nested objects
  for (const key of Object.keys(data)) {
    if (typeof data[key] === "object") {
      const result = findAddressInSchema(data[key]);
      if (result) return result;
    }
  }

  return null;
}

// Score how likely a text contains an address
function scoreAddressText(text: string): number {
  if (!text || text.length < 10 || text.length > 1000) return 0;

  const lowerText = text.toLowerCase();
  let score = 0;

  // Check for postal code patterns (US, UK, etc.)
  if (/\b\d{5}(-\d{4})?\b/.test(text)) score += 20; // US ZIP
  if (/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(text)) score += 20; // UK postcode
  if (/\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i.test(text)) score += 20; // Canadian postcode

  // Check for street indicators
  if (/\b(street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd\.|drive|dr\.|lane|ln\.|way|court|ct\.|place|pl\.|suite|ste\.|floor|flr\.)\b/i.test(text)) {
    score += 15;
  }

  // Check for number + street pattern
  if (/\b\d+\s+[A-Za-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way)/i.test(text)) {
    score += 20;
  }

  // Check for city/state patterns
  if (/,\s*[A-Z]{2}\s+\d{5}/i.test(text)) score += 15; // City, ST 12345

  // Check for country names
  for (const country of COUNTRY_PATTERNS) {
    if (lowerText.includes(country)) {
      score += 10;
      break;
    }
  }

  // Check for address indicators nearby
  for (const indicator of ADDRESS_INDICATORS) {
    if (lowerText.includes(indicator)) {
      score += 5;
      break;
    }
  }

  return score;
}

// US State abbreviations mapping
const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia',
};

// Clean raw text to extract just the address portion
function cleanAddressText(text: string): string {
  let cleaned = text;

  // Remove common noise phrases (case insensitive)
  const noisePatterns = [
    /\b(headquarters|head\s*quarters|hq|corporate\s*office|main\s*office|office\s*address)\b:?\s*/gi,
    /\b(call\s*us|contact\s*us|reach\s*us|get\s*in\s*touch|email\s*us|fax\s*us|write\s*to\s*us)\b:?\s*/gi,
    /\b(phone|tel|telephone|fax|mobile|cell)\s*:?\s*/gi,
    /\b(email|e-mail|mail)\s*:?\s*/gi,
    /\b(visit\s*us|find\s*us|our\s*location|our\s*address|location)\b:?\s*/gi,
    /\b(follow\s*us|connect\s*with\s*us|social\s*media)\b:?\s*/gi,
    /\b(copyright|©|all\s*rights\s*reserved)\b.*/gi,
    /\b(privacy\s*policy|terms\s*(of\s*service|&\s*conditions)?)\b/gi,
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ');

  // Remove phone numbers (various formats)
  cleaned = cleaned.replace(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, ' ');
  cleaned = cleaned.replace(/\(\d{3}\)\s*\d{3}[\s.-]?\d{4}/g, ' ');

  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, ' ');
  cleaned = cleaned.replace(/www\.[^\s]+/gi, ' ');

  // Replace pipe characters and multiple separators with commas
  cleaned = cleaned.replace(/\s*\|\s*/g, ', ');
  cleaned = cleaned.replace(/\s*[•·]\s*/g, ', ');

  // Normalize whitespace and newlines
  cleaned = cleaned.replace(/[\n\r\t]+/g, ', ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.trim();

  // Remove leading/trailing commas
  cleaned = cleaned.replace(/^[,\s]+|[,\s]+$/g, '');

  return cleaned;
}

// Extract address string using patterns
function extractAddressFromText(text: string): string | null {
  // Pattern: number + street + optional suite + city + state + zip
  // Example: "309 Commerce Dr, Suite 100, Exton, PA 19341"

  // Try to find a US address pattern
  const usAddressPattern = /(\d+\s+[A-Za-z0-9\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir|highway|hwy|parkway|pkwy)[.,]?\s*(?:suite|ste|unit|apt|#)?\s*\d*[.,]?\s*[A-Za-z\s]+[.,]?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/i;

  const match = text.match(usAddressPattern);
  if (match) {
    return match[1].trim();
  }

  // Fallback: try to find any text with street number, city, state abbrev, and zip
  const fallbackPattern = /(\d+[^,\n]*,\s*[^,\n]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/i;
  const fallbackMatch = text.match(fallbackPattern);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }

  return null;
}

// Parse address text into components using parse-address library
function parseAddressText(text: string): Partial<ScrapedAddress> | null {
  // First, clean the text to remove noise
  const cleanedText = cleanAddressText(text);

  if (!cleanedText || cleanedText.length < 10) return null;

  // Try to extract a clean address string first
  const extractedAddress = extractAddressFromText(cleanedText);
  const addressToParse = extractedAddress || cleanedText;

  // Use the parse-address library to parse US addresses
  try {
    const parsed = parser.parseLocation(addressToParse);

    if (parsed) {
      const result: Partial<ScrapedAddress> = {};

      // Build street address from components
      const streetParts: string[] = [];
      if (parsed.number) streetParts.push(parsed.number);
      if (parsed.prefix) streetParts.push(parsed.prefix);
      if (parsed.street) streetParts.push(parsed.street);
      if (parsed.type) streetParts.push(parsed.type);
      if (parsed.suffix) streetParts.push(parsed.suffix);

      if (streetParts.length > 0) {
        result.addressLine1 = streetParts.join(' ');
      }

      // Handle secondary address (Suite, Unit, etc.)
      if (parsed.sec_unit_type || parsed.sec_unit_num) {
        const secParts: string[] = [];
        if (parsed.sec_unit_type) secParts.push(parsed.sec_unit_type);
        if (parsed.sec_unit_num) secParts.push(parsed.sec_unit_num);

        if (secParts.length > 0) {
          // Append to addressLine1 or create addressLine2
          if (result.addressLine1) {
            result.addressLine1 += ', ' + secParts.join(' ');
          } else {
            result.addressLine2 = secParts.join(' ');
          }
        }
      }

      // City
      if (parsed.city) {
        result.city = parsed.city;
      }

      // State/Region
      if (parsed.state) {
        result.region = parsed.state.toUpperCase();
      }

      // Postal code
      if (parsed.zip) {
        result.postalCode = parsed.zip;
      }

      // Build full address string
      const fullParts: string[] = [];
      if (result.addressLine1) fullParts.push(result.addressLine1);
      if (result.addressLine2) fullParts.push(result.addressLine2);
      if (result.city) fullParts.push(result.city);
      if (result.region && result.postalCode) {
        fullParts.push(`${result.region} ${result.postalCode}`);
      } else {
        if (result.region) fullParts.push(result.region);
        if (result.postalCode) fullParts.push(result.postalCode);
      }

      if (fullParts.length > 0) {
        result.fullAddress = fullParts.join(', ');
      }

      // Detect country (US addresses parsed by this library)
      if (result.region && US_STATES[result.region]) {
        result.country = 'US';
      }

      // Only return if we have meaningful data
      if (result.addressLine1 || result.city || result.postalCode) {
        return result;
      }
    }
  } catch (e) {
    console.error("Address parsing error:", e);
  }

  // Fallback to manual parsing if library fails
  return parseAddressManual(cleanedText);
}

// Manual fallback parsing for addresses the library can't handle
function parseAddressManual(text: string): Partial<ScrapedAddress> | null {
  const result: Partial<ScrapedAddress> = {};

  // Try to find components manually

  // US ZIP code
  const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
  if (zipMatch) {
    result.postalCode = zipMatch[1];
    result.country = 'US';
  }

  // UK postcode
  const ukPostMatch = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  if (ukPostMatch && !result.postalCode) {
    result.postalCode = ukPostMatch[1].toUpperCase();
    result.country = 'UK';
  }

  // Canadian postcode
  const caPostMatch = text.match(/\b([A-Z]\d[A-Z]\s*\d[A-Z]\d)\b/i);
  if (caPostMatch && !result.postalCode) {
    result.postalCode = caPostMatch[1].toUpperCase();
    result.country = 'Canada';
  }

  // US state pattern: City, ST (two letter state abbreviation)
  const cityStatePattern = /([A-Za-z\s]+)[,\s]+([A-Z]{2})\s+\d{5}/i;
  const cityStateMatch = text.match(cityStatePattern);
  if (cityStateMatch) {
    result.city = cityStateMatch[1].trim();
    result.region = cityStateMatch[2].toUpperCase();
  }

  // Street address: starts with number
  const streetMatch = text.match(/^(\d+\s+[^,]+)/);
  if (streetMatch) {
    result.addressLine1 = streetMatch[1].trim();
  }

  if (result.postalCode || result.city || result.addressLine1) {
    // Build full address
    const parts: string[] = [];
    if (result.addressLine1) parts.push(result.addressLine1);
    if (result.city) parts.push(result.city);
    if (result.region && result.postalCode) {
      parts.push(`${result.region} ${result.postalCode}`);
    } else {
      if (result.region) parts.push(result.region);
      if (result.postalCode) parts.push(result.postalCode);
    }
    if (result.country && result.country !== 'US') parts.push(result.country);

    result.fullAddress = parts.join(', ');
    return result;
  }

  // If we have some text but couldn't parse it, return it as fullAddress
  if (text.length > 20 && text.length < 300) {
    return { fullAddress: text };
  }

  return null;
}

function extractContactsFromHtml(
  html: string,
  pageUrl: string,
  domain: string
): {
  emails: ScrapedContact[];
  phones: ScrapedContact[];
  linkedinUrl: string | null;
  address: ScrapedAddress | null;
} {
  const $ = cheerio.load(html);
  const emails: ScrapedContact[] = [];
  const phones: ScrapedContact[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  // Extract LinkedIn URL before removing scripts (might be in JSON-LD)
  const linkedinUrl = extractLinkedinUrl(html, pageUrl);

  // Extract address before removing elements
  const address = extractAddress(html, pageUrl);

  // Remove script and style tags to avoid false positives for email/phone
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

  return { emails, phones, linkedinUrl, address };
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
      .select("org_id, legal_name, website_url, primary_email, primary_phone_e164, linkedin_url, hq_address_line1")
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
      linkedinUrl: undefined,
      address: undefined,
      pagesScanned: [],
      pagesFailed: [],
      organizationHasEmail: !!organization.primary_email,
      organizationHasPhone: !!organization.primary_phone_e164,
      organizationHasLinkedin: !!organization.linkedin_url,
      organizationHasAddress: !!organization.hq_address_line1,
    };

    const allEmails = new Map<string, ScrapedContact>();
    const allPhones = new Map<string, ScrapedContact>();
    let foundLinkedinUrl: string | null = null;
    let foundAddress: ScrapedAddress | null = null;

    // Crawl each page
    for (const path of PAGES_TO_CRAWL) {
      const pageUrl = normalizeUrl(baseUrl, path);
      if (!pageUrl) continue;

      const { html, success, error } = await fetchPageContent(pageUrl);

      if (success && html) {
        result.pagesScanned.push(pageUrl);
        const { emails, phones, linkedinUrl, address } = extractContactsFromHtml(html, pageUrl, domain);

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

        // Store LinkedIn URL (first one found wins)
        if (!foundLinkedinUrl && linkedinUrl) {
          foundLinkedinUrl = linkedinUrl;
        }

        // Store address (prefer more complete addresses)
        if (address) {
          if (!foundAddress) {
            foundAddress = address;
          } else {
            // Keep the address with more fields populated
            const currentFields = Object.values(foundAddress).filter(Boolean).length;
            const newFields = Object.values(address).filter(Boolean).length;
            if (newFields > currentFields) {
              foundAddress = address;
            }
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
    result.linkedinUrl = foundLinkedinUrl || undefined;
    result.address = foundAddress || undefined;

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
