import { NextRequest, NextResponse } from "next/server";
import { getConvexToken } from "@/lib/convex-token";
import { ConvexError } from "convex/values";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  addProjectDomain,
  buildDnsInstructions,
  getDomainConfig,
  getProjectDomain,
  removeProjectDomain,
  VercelApiError,
} from "@/lib/vercel-domains";

// Ownership is enforced by Convex: every fetchQuery/fetchMutation forwards the
// caller's Clerk JWT and the Convex functions run requireEventMember. These
// handlers only add what Convex cannot do — calling the Vercel API.

function errorResponse(err: unknown): NextResponse {
  if (err instanceof ConvexError) {
    return NextResponse.json({ error: err.data as string }, { status: 400 });
  }
  if (err instanceof VercelApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("domains route error:", err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

// Connect a domain: claim it in Convex (validated, unique), attach it to the
// Vercel project, and return the DNS records the owner must configure.
export async function POST(request: NextRequest) {
  const token = await getConvexToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    eventId?: string;
    domain?: string;
  } | null;
  if (!body?.eventId || !body?.domain) {
    return NextResponse.json(
      { error: "eventId and domain are required" },
      { status: 400 },
    );
  }
  const eventId = body.eventId as Id<"events">;

  let domain: string;
  try {
    domain = await fetchMutation(
      api.events.setCustomDomain,
      { eventId, domain: body.domain },
      { token },
    );
  } catch (err) {
    return errorResponse(err);
  }

  try {
    try {
      await addProjectDomain(domain);
    } catch (err) {
      // Already attached to this project (e.g. reconnecting after a partial
      // failure) is fine — confirmed by the fetch below throwing otherwise.
      if (
        !(err instanceof VercelApiError) ||
        err.code !== "domain_already_in_use"
      ) {
        throw err;
      }
    }
    const projectDomain = await getProjectDomain(domain);
    const config = await getDomainConfig(domain).catch(() => null);
    return NextResponse.json({
      domain,
      verified: projectDomain.verified && config?.misconfigured === false,
      dnsRecords: buildDnsInstructions(projectDomain, config),
    });
  } catch (err) {
    // The Convex claim happened first — roll it back so a failed Vercel
    // attach doesn't leave a domain that can never go live.
    await fetchMutation(
      api.events.removeCustomDomain,
      { eventId },
      { token },
    ).catch(() => {});
    return errorResponse(err);
  }
}

// Disconnect the event's domain: detach from Vercel, then clear Convex.
export async function DELETE(request: NextRequest) {
  const token = await getConvexToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    eventId?: string;
  } | null;
  if (!body?.eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }
  const eventId = body.eventId as Id<"events">;

  try {
    const event = await fetchQuery(
      api.events.getEventById,
      { eventId },
      { token },
    );
    if (event?.customDomain) {
      try {
        await removeProjectDomain(event.customDomain);
      } catch (err) {
        // Already detached — clearing Convex is still the right move.
        if (!(err instanceof VercelApiError) || err.status !== 404) {
          throw err;
        }
      }
    }
    await fetchMutation(api.events.removeCustomDomain, { eventId }, { token });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
