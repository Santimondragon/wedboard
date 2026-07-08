import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexError } from "convex/values";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import {
  buildDnsInstructions,
  getDomainConfig,
  getProjectDomain,
  VercelApiError,
  verifyProjectDomain,
} from "@/lib/vercel-domains";

// "Check status" for the settings wizard: reads the live Vercel state
// (attempting a verify when pending), syncs the cached flag in Convex, and
// returns the DNS records so the wizard can re-render them after a reload.
export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });

  const eventId = request.nextUrl.searchParams.get(
    "eventId",
  ) as Id<"events"> | null;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const event = await fetchQuery(
      api.events.getEventById,
      { eventId },
      { token: token ?? undefined },
    );
    if (!event?.customDomain) {
      return NextResponse.json(
        { error: "This event has no custom domain" },
        { status: 404 },
      );
    }

    let projectDomain = await getProjectDomain(event.customDomain);
    if (!projectDomain.verified) {
      // Verification is a no-op until the owner adds the TXT record, so it's
      // safe to attempt on every status check.
      projectDomain = await verifyProjectDomain(event.customDomain).catch(
        () => projectDomain,
      );
    }
    const config = await getDomainConfig(event.customDomain).catch(() => null);

    const configured = config ? !config.misconfigured : false;
    const live = projectDomain.verified && configured;

    if (live !== (event.customDomainVerified ?? false)) {
      await fetchMutation(
        api.events.setCustomDomainVerified,
        { eventId, verified: live },
        { token: token ?? undefined },
      );
    }

    return NextResponse.json({
      domain: event.customDomain,
      live,
      verified: projectDomain.verified,
      configured,
      dnsRecords: buildDnsInstructions(projectDomain, config),
    });
  } catch (err) {
    if (err instanceof ConvexError) {
      return NextResponse.json({ error: err.data as string }, { status: 400 });
    }
    if (err instanceof VercelApiError) {
      if (err.status === 404) {
        return NextResponse.json(
          {
            error:
              "This domain is no longer attached to the hosting project. Remove it and connect it again.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("domains status route error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
