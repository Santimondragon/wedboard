import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { normalizeCustomDomain } from "./domains";

/**
 * Resolves an event for public (unauthenticated) access by slug.
 * Archived events are not publicly visible; draft is allowed so owners can
 * preview before going live. Reused by any future public resolver
 * (e.g. custom-domain lookup) so the gating stays in one place.
 */
export async function resolvePublicEvent(
  ctx: QueryCtx | MutationCtx,
  eventSlug: string,
): Promise<Doc<"events"> | null> {
  const event = await ctx.db
    .query("events")
    .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
    .unique();

  if (!event || event.status === "archived") {
    return null;
  }
  return event;
}

/**
 * Resolves an event for public access by the request's Host header (custom
 * domain). Same archived-event gating as `resolvePublicEvent`.
 */
export async function resolvePublicEventByHost(
  ctx: QueryCtx | MutationCtx,
  host: string,
): Promise<Doc<"events"> | null> {
  const domain = normalizeCustomDomain(host);
  if (!domain) return null;

  const event = await ctx.db
    .query("events")
    .withIndex("by_customDomain", (q) => q.eq("customDomain", domain))
    .unique();

  if (!event || event.status === "archived") {
    return null;
  }
  return event;
}

/** Resolves an active invitation within an already-resolved public event. */
export async function resolvePublicInvitation(
  ctx: QueryCtx | MutationCtx,
  event: Doc<"events">,
  invitationSlug: string,
): Promise<Doc<"invitations"> | null> {
  const invitation = await ctx.db
    .query("invitations")
    .withIndex("by_eventId_and_slug", (q) =>
      q.eq("eventId", event._id).eq("slug", invitationSlug),
    )
    .unique();

  if (!invitation || !invitation.isActive) {
    return null;
  }
  return invitation;
}
