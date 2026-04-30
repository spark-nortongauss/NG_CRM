import { URL } from "node:url";

import type { ScrapperSearchResult } from "@/lib/scrapper/types";

const EXCLUDE_DOMAINS = new Set([
  // Job boards (global + UAE-specific)
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "monster.com",
  "ziprecruiter.com",
  "dice.com",
  "careerbuilder.com",
  "simplyhired.com",
  "bayt.com",
  "naukrigulf.com",
  "gulftalent.com",
  "dubizzle.com",
  "monstergulf.com",
  "laimoon.com",

  // Social media & forums
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "reddit.com",
  "quora.com",
  "stackoverflow.com",
  "medium.com",
  "pinterest.com",
  "tiktok.com",
  "snapchat.com",
  "tumblr.com",
  "whatsapp.com",

  // News & media
  "bloomberg.com",
  "reuters.com",
  "forbes.com",
  "wsj.com",
  "nytimes.com",
  "cnn.com",
  "bbc.com",
  "techcrunch.com",
  "venturebeat.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "arabianbusiness.com",
  "gulfnews.com",
  "khaleejtimes.com",
  "thenationalnews.com",
  "zawya.com",
  "menabytes.com",

  // Wiki & reference
  "wikipedia.org",
  "wikimedia.org",
  "investopedia.com",
  "britannica.com",
  "dictionary.com",

  // Cloud & tech platforms
  "amazon.com",
  "aws.com",
  "azure.com",
  "microsoft.com",
  "google.com",
  "youtube.com",
  "github.com",
  "gitlab.com",

  // Business directories & reviews
  "yelp.com",
  "yellowpages.com",
  "bbb.org",
  "trustpilot.com",
  "capterra.com",
  "g2.com",
  "clutch.co",
  "goodfirms.co",
  "yellowpages.ae",
  "cylex.ae",
  "bizwiki.com",
  "b2blistings.org",
  "hotfrog.ae",
  "exportbureau.com",
  "tradekey.com",
  "kompass.com",

  // Research & aggregators
  "slideshare.net",
  "scribd.com",
  "issuu.com",
  "academia.edu",
  "researchgate.net",
  "crunchbase.com",
  "owler.com",
  "zoominfo.com",
  "pitchbook.com",
  "cbinsights.com",
  "dealroom.co",
]);

const EXCLUDE_URL_PATTERNS: RegExp[] = [
  /\/blog(s)?\//i,
  /\/article(s)?\//i,
  /\/news\//i,
  /\/press[-_]?release(s)?\//i,
  /\/media\//i,
  /\/resource(s)?\//i,
  /\/insight(s)?\//i,
  /\/knowledge[-_]?base\//i,
  /\/learn\//i,
  /\/education\//i,
  /\/training\//i,
  /\/webinar(s)?\//i,
  /\/event(s)?\//i,
  /\/podcast(s)?\//i,
  /\/video(s)?\//i,
  /\/case[-_]?stud(y|ies)\//i,
  /\/whitepaper(s)?\//i,
  /\/guide(s)?\//i,
  /\/ebook(s)?\//i,
  /\/download(s)?\//i,
  /\/career(s)?\//i,
  /\/job(s)?\//i,
  /\/hiring\//i,
  /\/join[-_]?us\//i,
  /\/work[-_]?with[-_]?us\//i,
  /\/opportunity\//i,
  /\/opportunities\//i,
  /\/recruit(ing|ment)?\//i,
  /\/opening(s)?\//i,
  /\/position(s)?\//i,
  /\/vacanc(y|ies)\//i,
  /\/apply\//i,
  /\/forum\//i,
  /\/community\//i,
  /\/discussion(s)?\//i,
  /\/wiki\//i,
  /\/doc(s)?\//i,
  /\/documentation\//i,
  /\/support\//i,
  /\/help\//i,
  /\/faq(s)?\//i,
  /\/search\?/i,
  /\/tag(s)?\//i,
  /\/categor(y|ies)\//i,
  /\/author\//i,
  /\/profile\//i,
  /\/user\//i,
  /\/company\/\d+/i,
];

const EXCLUDE_KEYWORDS = new Set([
  "blog",
  "article",
  "whitepaper",
  "white paper",
  "guide",
  "ebook",
  "e-book",
  "webinar",
  "podcast",
  "video",
  "tutorial",
  "how to",
  "how-to",
  "what is",
  "top 10",
  "best practices",
  "case study",
  "careers",
  "jobs",
  "hiring",
  "now hiring",
  "join our team",
  "work with us",
  "job opening",
  "position",
  "vacancy",
  "recruit",
  "apply now",
  "employment",
  "opportunity",
  "career opportunity",
  "news",
  "press release",
  "announces",
  "announced",
  "announcement",
  "breaking",
  "newsletter",
  "learn",
  "guide to",
  "introduction to",
  "beginners",
  "explained",
  "understanding",
  "everything you need to know",
  "ultimate guide",
  "review",
  "reviews",
  "comparison",
  "vs",
  "versus",
  "alternatives",
  "competitors",
  "top companies",
  "best companies",
  "leading providers",
  "directory",
  "list of",
  "companies that",
  "providers in",
  "vendors",
  "find",
  "search for",
  "looking for",
  "compare",
  "discussion",
  "forum",
  "community",
  "comments",
  "posted by",
  "shared by",
  "asked",
  "answered",
]);

const COMPANY_INDICATORS = new Set([
  "about us",
  "who we are",
  "our company",
  "our mission",
  "our vision",
  "our team",
  "leadership team",
  "management team",
  "our services",
  "what we do",
  "solutions",
  "products",
  "contact us",
  "get in touch",
  "request quote",
  "request demo",
  "schedule demo",
  "free trial",
  "pricing",
  "plans",
  "enterprise",
  "customers",
  "clients",
  "case studies",
  "testimonials",
  "portfolio",
  "projects",
  // ICP-specific
  "das provider",
  "das operator",
  "das installer",
  "das integrator",
  "errcs provider",
  "cbrs provider",
  "private lte",
  "private 5g",
  "neutral host",
  "network operator",
  "wireless infrastructure",
  "managed services",
  "field services",
  "network operations",
  "o&m services",
  "deployment services",
  "in-building wireless",
  "venue wireless",
  "enterprise wireless",
  "rf engineering",
  "telecom contractor",
  "systems integrator",
]);

const EXCLUDE_FILE_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".zip",
  ".rar",
  ".mp4",
  ".mp3",
  ".avi",
  ".mov",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
]);

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    try {
      const u = new URL(`https://${url}`);
      return u.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  }
}

function isValidCompanyDomain(domain: string): boolean {
  if (!domain) return false;
  const excludedSubdomains = new Set([
    "blog",
    "news",
    "press",
    "media",
    "resources",
    "learn",
    "support",
    "help",
    "docs",
    "documentation",
    "community",
    "forum",
    "careers",
    "jobs",
    "recruiting",
  ]);

  const parts = domain.split(".");
  if (parts.length > 2) {
    const sub = parts[0];
    if (sub && excludedSubdomains.has(sub)) return false;
  }
  return true;
}

function isValidCompanyTitle(title: string): boolean {
  if (!title) return false;
  const patterns: RegExp[] = [
    /^\d+\s+(ways|tips|steps|reasons)/i,
    /how\s+to\s+/i,
    /what\s+is\s+/i,
    /why\s+/i,
    /the\s+ultimate\s+guide/i,
    /best\s+\d+/i,
    /\s+vs\s+|\s+versus\s+/i,
  ];
  return !patterns.some((p) => p.test(title));
}

export function isValidCompanyResult(
  r: Pick<ScrapperSearchResult, "url" | "domain" | "title" | "snippet">
): { valid: boolean; reason: string } {
  const url = (r.url || "").toLowerCase();
  const domain = (r.domain || "").toLowerCase();
  const title = (r.title || "").toLowerCase();
  const snippet = (r.snippet || "").toLowerCase();

  for (const excluded of EXCLUDE_DOMAINS) {
    if (domain.includes(excluded)) return { valid: false, reason: `Excluded domain: ${excluded}` };
  }

  // file extension
  const path = (() => {
    try {
      const u = new URL(url);
      return u.pathname.toLowerCase();
    } catch {
      return "";
    }
  })();
  for (const ext of EXCLUDE_FILE_EXTENSIONS) {
    if (path.endsWith(ext)) return { valid: false, reason: `File download: ${ext}` };
  }

  for (const pattern of EXCLUDE_URL_PATTERNS) {
    if (pattern.test(url)) return { valid: false, reason: `URL pattern match: ${pattern}` };
  }

  const combined = `${title} ${snippet}`;
  const exclusionMatches = Array.from(EXCLUDE_KEYWORDS).reduce(
    (acc, kw) => (combined.includes(kw) ? acc + 1 : acc),
    0
  );
  const indicatorMatches = Array.from(COMPANY_INDICATORS).reduce(
    (acc, kw) => (combined.includes(kw) ? acc + 1 : acc),
    0
  );

  if (exclusionMatches >= 2) return { valid: false, reason: `Multiple exclusion keywords (${exclusionMatches})` };
  if (exclusionMatches === 1 && indicatorMatches === 0) return { valid: false, reason: "Exclusion keyword without company indicators" };

  if (!isValidCompanyDomain(domain)) return { valid: false, reason: "Invalid company domain structure" };
  if (!isValidCompanyTitle(title)) return { valid: false, reason: "Non-company title structure" };

  return { valid: true, reason: "Valid company" };
}

export function scoreCompanyRelevance(
  r: Pick<ScrapperSearchResult, "title" | "snippet">
): number {
  let score = 50;
  const title = (r.title || "").toLowerCase();
  const snippet = (r.snippet || "").toLowerCase();
  const combined = `${title} ${snippet}`;

  const icpKeywords: Record<string, number> = {
    das: 10,
    "distributed antenna": 10,
    errcs: 10,
    "emergency responder": 8,
    cbrs: 10,
    "private lte": 10,
    "private 5g": 10,
    "neutral host": 12,
    "network operator": 8,
    "wireless infrastructure": 8,
    "managed services": 5,
    "field services": 5,
    "network operations": 5,
    "in-building wireless": 8,
    "venue wireless": 7,
    "enterprise wireless": 6,
    "rf engineering": 7,
    "telecom contractor": 6,
    "systems integrator": 5,
    // UAE
    dubai: 8,
    uae: 8,
    "abu dhabi": 7,
    "united arab emirates": 8,
    gulf: 4,
    gcc: 4,
    "middle east": 3,
    sharjah: 5,
  };

  for (const [kw, points] of Object.entries(icpKeywords)) {
    if (combined.includes(kw)) score += points;
  }

  if (Array.from(EXCLUDE_KEYWORDS).some((kw) => combined.includes(kw))) score -= 20;

  const indicatorCount = Array.from(COMPANY_INDICATORS).reduce(
    (acc, kw) => (combined.includes(kw) ? acc + 1 : acc),
    0
  );
  score += indicatorCount * 3;

  return Math.max(0, Math.min(100, score));
}

export function filterAndScoreResults(
  raw: ScrapperSearchResult[],
  minScore: number
): ScrapperSearchResult[] {
  const valid = raw.filter((r) => isValidCompanyResult(r).valid);
  const scored = valid
    .map((r) => ({ ...r, relevance_score: scoreCompanyRelevance(r) }))
    .filter((r) => (r.relevance_score ?? 0) >= minScore)
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
  return scored;
}

