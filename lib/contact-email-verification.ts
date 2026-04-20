import { Resolver } from "node:dns/promises";
import net from "node:net";

type EmailSignal = "valid" | "invalid" | "risky" | "unknown";
type LinkedinSignal = "active" | "left_company" | "unknown" | "error";
type DomainSignal = "active" | "invalid" | "risky" | "unknown";
export type FinalSignal = "OUTREACH_READY" | "RISKY" | "DO_NOT_CONTACT";

export interface DomainCheckResult {
  domain: string;
  domain_alive: boolean;
  has_website: boolean;
  signal: DomainSignal;
  reason: string;
}

export interface EmailCheckResult {
  email: string;
  syntax_valid: boolean;
  domain_exists: boolean;
  mx_found: boolean;
  mailbox_exists: boolean;
  is_catchall: boolean;
  signal: EmailSignal;
  reason: string;
  provider: "google" | "microsoft" | "other";
  smtp_code: number | null;
}

export interface LinkedinCheckResult {
  name: string;
  company: string;
  linkedin_found: boolean;
  still_at_company: boolean;
  signal: LinkedinSignal;
  profile_snippet: string;
  reason: string;
}

export interface ContactVerificationReport {
  checked_email_field: "email_1" | "email_2" | "email_3";
  checked_at: string;
  contact: {
    name: string;
    company: string;
    email: string;
  };
  domain_check: DomainCheckResult;
  email_check: EmailCheckResult;
  linkedin_check: LinkedinCheckResult | null;
  final_signal: FinalSignal;
  final_reason: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
const resolver = new Resolver();

function detectProvider(mxHost: string): "google" | "microsoft" | "other" {
  const mx = mxHost.toLowerCase();
  if (mx.includes("google") || mx.includes("gmail") || mx.includes("aspmx")) {
    return "google";
  }
  if (
    mx.includes("outlook") ||
    mx.includes("microsoft") ||
    mx.includes("protection.outlook")
  ) {
    return "microsoft";
  }
  return "other";
}

async function checkDomainHealth(domain: string): Promise<DomainCheckResult> {
  const result: DomainCheckResult = {
    domain,
    domain_alive: false,
    has_website: false,
    signal: "unknown",
    reason: "",
  };

  try {
    await resolver.resolve(domain, "A");
    result.domain_alive = true;
  } catch {
    result.signal = "invalid";
    result.reason = "Domain does not resolve";
    return result;
  }

  try {
    const resp = await fetch(`https://${domain}`, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (resp.status < 400) {
      result.has_website = true;
      result.signal = "active";
      result.reason = "Domain resolves and website responds";
    } else {
      result.signal = "risky";
      result.reason = `Website responded with status ${resp.status}`;
    }
  } catch {
    result.signal = "risky";
    result.reason = "Domain resolves but website did not respond";
  }

  return result;
}

async function readSmtpLine(socket: net.Socket): Promise<string> {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP read timeout"));
    }, 7000);

    const onData = (buffer: Buffer) => {
      cleanup();
      resolve(buffer.toString("utf8"));
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    socket.once("data", onData);
    socket.once("error", onError);
  });
}

async function smtpCommand(socket: net.Socket, command: string): Promise<string> {
  socket.write(`${command}\r\n`);
  return readSmtpLine(socket);
}

function parseSmtpCode(message: string): number | null {
  const code = Number.parseInt(message.slice(0, 3), 10);
  return Number.isFinite(code) ? code : null;
}

async function probeMailbox(
  mxHost: string,
  email: string,
): Promise<{ rcptCode: number | null; fakeRcptCode: number | null }> {
  const domain = email.split("@")[1];
  const fakeAddress = `random-${Date.now()}@${domain}`;

  const socket = new net.Socket();
  socket.setTimeout(10000);

  await new Promise<void>((resolve, reject) => {
    socket.connect(25, mxHost, () => resolve());
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP socket timeout")));
  });

  try {
    await readSmtpLine(socket);
    await smtpCommand(socket, "HELO nortongauss.com");
    await smtpCommand(socket, "MAIL FROM:<verify@nortongauss.com>");
    const rcptResponse = await smtpCommand(socket, `RCPT TO:<${email}>`);
    const fakeResponse = await smtpCommand(socket, `RCPT TO:<${fakeAddress}>`);
    await smtpCommand(socket, "QUIT");

    return {
      rcptCode: parseSmtpCode(rcptResponse),
      fakeRcptCode: parseSmtpCode(fakeResponse),
    };
  } finally {
    socket.end();
    socket.destroy();
  }
}

async function verifyEmailSmtp(email: string): Promise<EmailCheckResult> {
  const result: EmailCheckResult = {
    email,
    syntax_valid: false,
    domain_exists: false,
    mx_found: false,
    mailbox_exists: false,
    is_catchall: false,
    signal: "unknown",
    reason: "",
    provider: "other",
    smtp_code: null,
  };

  if (!EMAIL_REGEX.test(email)) {
    result.signal = "invalid";
    result.reason = "Bad syntax";
    return result;
  }
  result.syntax_valid = true;

  const domain = email.split("@")[1];
  let mxHost = "";
  try {
    const records = await resolver.resolveMx(domain);
    if (!records.length) {
      result.signal = "invalid";
      result.reason = "No MX records found";
      return result;
    }
    const sorted = [...records].sort((a, b) => a.priority - b.priority);
    mxHost = sorted[0].exchange.replace(/\.$/, "");
    result.mx_found = true;
    result.domain_exists = true;
  } catch {
    result.signal = "invalid";
    result.reason = "No MX records found";
    return result;
  }

  const provider = detectProvider(mxHost);
  result.provider = provider;
  if (provider === "google" || provider === "microsoft") {
    result.signal = "risky";
    result.reason = `Hosted on ${provider}, mailbox-level SMTP probing is often blocked`;
    return result;
  }

  try {
    const { rcptCode, fakeRcptCode } = await probeMailbox(mxHost, email);
    result.smtp_code = rcptCode;

    if (fakeRcptCode === 250) {
      result.is_catchall = true;
      result.signal = "risky";
      result.reason = "Domain appears catch-all";
      return result;
    }

    if (rcptCode === 250 || rcptCode === 251) {
      result.mailbox_exists = true;
      result.signal = "valid";
      result.reason = "Mailbox accepted by SMTP server";
      return result;
    }

    if (rcptCode === 550 || rcptCode === 551 || rcptCode === 553) {
      result.signal = "invalid";
      result.reason = `Mailbox rejected (SMTP ${rcptCode})`;
      return result;
    }

    result.signal = "unknown";
    result.reason = rcptCode
      ? `SMTP returned ambiguous code ${rcptCode}`
      : "SMTP response could not be parsed";
    return result;
  } catch (error) {
    result.signal = "unknown";
    result.reason =
      error instanceof Error ? `SMTP probe failed: ${error.message}` : "SMTP probe failed";
    return result;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function checkLinkedinStillAtCompany(
  fullName: string,
  companyName: string,
): Promise<LinkedinCheckResult> {
  const result: LinkedinCheckResult = {
    name: fullName,
    company: companyName,
    linkedin_found: false,
    still_at_company: false,
    signal: "unknown",
    profile_snippet: "",
    reason: "",
  };

  if (!fullName || !companyName) {
    result.reason = "Name or company missing";
    return result;
  }

  const query = encodeURIComponent(`site:linkedin.com/in "${fullName}" "${companyName}"`);

  try {
    const response = await fetch(`https://www.google.com/search?q=${query}&hl=en`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const text = normalizeText(html.replace(/<[^>]+>/g, " ").slice(0, 4000));

    result.profile_snippet = text.slice(0, 300);
    result.linkedin_found = /linkedin\.com\/in/i.test(html);

    const nameFound = normalizeText(fullName)
      .split(" ")
      .every((chunk) => chunk.length < 2 || text.includes(chunk));
    const companyFound = text.includes(normalizeText(companyName));

    if (nameFound && companyFound && result.linkedin_found) {
      result.still_at_company = true;
      result.signal = "active";
      result.reason = "Search snippet still matches person at company";
    } else if (result.linkedin_found && !companyFound) {
      result.signal = "left_company";
      result.reason = "LinkedIn presence found but company name missing in snippet";
    } else {
      result.signal = "unknown";
      result.reason = "Could not confidently confirm current employer";
    }
  } catch (error) {
    result.signal = "error";
    result.reason = error instanceof Error ? error.message : "LinkedIn signal check failed";
  }

  return result;
}

export async function verifyContactEmail(params: {
  checkedEmailField: "email_1" | "email_2" | "email_3";
  email: string;
  fullName: string;
  companyName: string;
}): Promise<ContactVerificationReport> {
  const { checkedEmailField, email, fullName, companyName } = params;
  const domain = email.split("@")[1] ?? "";

  const report: ContactVerificationReport = {
    checked_email_field: checkedEmailField,
    checked_at: new Date().toISOString(),
    contact: {
      name: fullName,
      company: companyName,
      email,
    },
    domain_check: {
      domain,
      domain_alive: false,
      has_website: false,
      signal: "invalid",
      reason: "Email domain missing",
    },
    email_check: {
      email,
      syntax_valid: false,
      domain_exists: false,
      mx_found: false,
      mailbox_exists: false,
      is_catchall: false,
      signal: "invalid",
      reason: "Email domain missing",
      provider: "other",
      smtp_code: null,
    },
    linkedin_check: null,
    final_signal: "DO_NOT_CONTACT",
    final_reason: "Email domain missing",
  };

  if (!domain) {
    return report;
  }

  report.domain_check = await checkDomainHealth(domain);
  if (report.domain_check.signal === "invalid") {
    report.final_signal = "DO_NOT_CONTACT";
    report.final_reason = `Dead domain: ${report.domain_check.reason}`;
    return report;
  }

  report.email_check = await verifyEmailSmtp(email);
  if (report.email_check.signal === "invalid") {
    report.final_signal = "DO_NOT_CONTACT";
    report.final_reason = `Dead mailbox: ${report.email_check.reason}`;
    return report;
  }

  const linkedin = await checkLinkedinStillAtCompany(fullName, companyName);
  report.linkedin_check = linkedin;

  const emailSignal = report.email_check.signal;
  const linkedinSignal = linkedin.signal;

  if (emailSignal === "valid" && linkedinSignal === "active") {
    report.final_signal = "OUTREACH_READY";
    report.final_reason = "Email accepted and public profile signal matches company";
  } else if (emailSignal === "valid" && linkedinSignal === "unknown") {
    report.final_signal = "RISKY";
    report.final_reason = "Mailbox looks valid but role could not be confirmed";
  } else if (emailSignal === "risky" && linkedinSignal === "active") {
    report.final_signal = "RISKY";
    report.final_reason = "Mailbox verification limited, but profile signal looks current";
  } else if (linkedinSignal === "left_company") {
    report.final_signal = "DO_NOT_CONTACT";
    report.final_reason = "Profile signal indicates person may have left company";
  } else {
    report.final_signal = "RISKY";
    report.final_reason = "Signal is incomplete; manual check recommended";
  }

  return report;
}
