// Server-only helpers for the Vercel Domains API, used by the /api/domains
// route handlers. Requires VERCEL_TOKEN + VERCEL_PROJECT_ID (and VERCEL_TEAM_ID
// when the project lives in a team) in the Next.js server env.

const VERCEL_API = "https://api.vercel.com";

export interface VercelVerificationChallenge {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

export interface VercelProjectDomain {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: VercelVerificationChallenge[];
}

export interface VercelDomainConfig {
  misconfigured: boolean;
  recommendedIPs?: string[];
  recommendedCNAME?: string[];
}

/** One row of the DNS table shown to the event owner. */
export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  reason?: string;
}

export class VercelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

function requireEnv(name: "VERCEL_TOKEN" | "VERCEL_PROJECT_ID"): string {
  const value = process.env[name];
  if (!value) {
    throw new VercelApiError(
      `${name} is not configured on the server`,
      500,
      "missing_env",
    );
  }
  return value;
}

async function vercelFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = requireEnv("VERCEL_TOKEN");
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(VERCEL_API + path);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as { error?: { message?: string; code?: string } })
      ?.error;
    throw new VercelApiError(
      error?.message ?? `Vercel API request failed (${res.status})`,
      res.status,
      error?.code,
    );
  }
  return body;
}

export async function addProjectDomain(
  domain: string,
): Promise<VercelProjectDomain> {
  const projectId = requireEnv("VERCEL_PROJECT_ID");
  return (await vercelFetch(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  })) as VercelProjectDomain;
}

export async function getProjectDomain(
  domain: string,
): Promise<VercelProjectDomain> {
  const projectId = requireEnv("VERCEL_PROJECT_ID");
  return (await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}`,
  )) as VercelProjectDomain;
}

export async function getDomainConfig(
  domain: string,
): Promise<VercelDomainConfig> {
  return (await vercelFetch(
    `/v6/domains/${domain}/config`,
  )) as VercelDomainConfig;
}

export async function verifyProjectDomain(
  domain: string,
): Promise<VercelProjectDomain> {
  const projectId = requireEnv("VERCEL_PROJECT_ID");
  return (await vercelFetch(
    `/v9/projects/${projectId}/domains/${domain}/verify`,
    { method: "POST" },
  )) as VercelProjectDomain;
}

export async function removeProjectDomain(domain: string): Promise<void> {
  const projectId = requireEnv("VERCEL_PROJECT_ID");
  await vercelFetch(`/v9/projects/${projectId}/domains/${domain}`, {
    method: "DELETE",
  });
}

/**
 * Normalizes the Vercel responses into the DNS rows the owner must add at
 * their registrar. Apex domains need an A record; subdomains a CNAME. TXT
 * ownership challenges (domain held by another Vercel account) pass through.
 */
export function buildDnsInstructions(
  projectDomain: VercelProjectDomain,
  config: VercelDomainConfig | null,
): DnsRecord[] {
  const records: DnsRecord[] = [];
  const { name, apexName } = projectDomain;

  if (name === apexName) {
    records.push({
      type: "A",
      name: "@",
      value: config?.recommendedIPs?.[0] ?? "76.76.21.21",
    });
  } else {
    records.push({
      type: "CNAME",
      name: name.slice(0, -(apexName.length + 1)),
      value: config?.recommendedCNAME?.[0] ?? "cname.vercel-dns.com",
    });
  }

  for (const challenge of projectDomain.verification ?? []) {
    records.push({
      type: challenge.type as DnsRecord["type"],
      // Vercel returns the fully-qualified record name; show the registrar
      // form (name relative to the apex).
      name: challenge.domain.endsWith("." + apexName)
        ? challenge.domain.slice(0, -(apexName.length + 1))
        : challenge.domain,
      value: challenge.value,
      reason: challenge.reason,
    });
  }

  return records;
}
