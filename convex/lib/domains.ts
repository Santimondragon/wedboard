/**
 * Custom-domain normalization and validation, shared by the events domain
 * mutations and the public by-host resolver. Pure helpers — no ctx.
 *
 * The primary app domain comes from the Convex env var `PRIMARY_DOMAIN`
 * (set with `npx convex env set PRIMARY_DOMAIN wedboard.com`). The Next.js
 * `NEXT_PUBLIC_PRIMARY_DOMAIN` var is not visible to Convex functions.
 */

const FALLBACK_PRIMARY_DOMAINS = ["localhost", "127.0.0.1"];

// RFC-1035-ish hostname: dot-separated labels of letters/digits/hyphens,
// no leading/trailing hyphen, at least two labels.
const HOSTNAME_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function primaryDomains(): string[] {
  const fromEnv = process.env.PRIMARY_DOMAIN?.toLowerCase()
    .split(":")[0]
    ?.trim();
  return fromEnv
    ? [fromEnv, ...FALLBACK_PRIMARY_DOMAINS]
    : FALLBACK_PRIMARY_DOMAINS;
}

/**
 * Normalizes user input (or a request Host header) to a bare hostname:
 * lowercased, protocol/path/query/port/trailing-dot stripped.
 */
export function normalizeCustomDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");
}

/**
 * Validates an already-normalized domain. Returns a user-facing error
 * message, or null when the domain is acceptable.
 */
export function validateCustomDomain(domain: string): string | null {
  if (!domain) {
    return "Enter a domain, e.g. invites.mywedding.com";
  }
  if (/[^\x20-\x7e]/.test(domain)) {
    return "International domains must use their punycode (xn--) form";
  }
  if (domain.length > 253 || !HOSTNAME_REGEX.test(domain)) {
    return "That doesn't look like a valid domain, e.g. invites.mywedding.com";
  }
  if (domain === "vercel.app" || domain.endsWith(".vercel.app")) {
    return "vercel.app domains cannot be connected";
  }
  for (const primary of primaryDomains()) {
    if (domain === primary || domain.endsWith("." + primary)) {
      return `"${domain}" is part of this app's own domain and cannot be connected`;
    }
  }
  return null;
}
