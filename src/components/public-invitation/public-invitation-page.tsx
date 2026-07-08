"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { InvitationTemplate } from "./templates/invitation-template";
import { InvitationNotFound } from "./invitation-not-found";
import type { LayoutBlock } from "./blocks";

// The invitation is addressed either by event slug (primary domain URL) or by
// the request's Host header (custom domain) — exactly one of the two is set.
interface PublicInvitationPageProps {
  eventSlug?: string;
  host?: string;
  invitationSlug: string;
}

export function PublicInvitationPage({
  eventSlug,
  host,
  invitationSlug,
}: PublicInvitationPageProps) {
  const bySlug = useQuery(
    api.invitations.getPublicInvitation,
    eventSlug ? { eventSlug, invitationSlug } : "skip",
  );
  const byHost = useQuery(
    api.invitations.getPublicInvitationByHost,
    !eventSlug && host ? { host, invitationSlug } : "skip",
  );
  const data = eventSlug ? bySlug : byHost;

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    );
  }

  if (data === null) {
    return <InvitationNotFound />;
  }

  return (
    <InvitationTemplate
      // On a custom domain the URL carries no event slug — the public
      // mutations (RSVP, guest message) resolve by slug, so source it from
      // the query payload.
      data={{
        ...data,
        eventSlug: eventSlug ?? data.event.slug,
        invitationSlug,
      }}
      templateId={data.event.templateId}
      blocks={data.event.layoutBlocks as LayoutBlock[] | undefined}
      rsvpState={data.rsvpState}
    />
  );
}
