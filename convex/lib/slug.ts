import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Top-level Next.js routes that the dynamic `[eventSlug]` segment must not
 * shadow. Event slugs matching any of these are rejected.
 */
export const RESERVED_EVENT_SLUGS = new Set([
  "events",
  "dashboard",
  "pricing",
  "sign-in",
  "sign-up",
  "api",
  "invitations",
  "_next",
  "favicon",
]);

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  tableName: "invitations" | "events",
  slug: string,
  existingId?: Id<"invitations"> | Id<"events">
): Promise<string> {
  let candidate = slug;
  let counter = 2;

  while (true) {
    const existing = await ctx.db
      .query(tableName)
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();

    if (!existing || (existingId && existing._id === existingId)) {
      return candidate;
    }

    candidate = `${slug}-${counter}`;
    counter++;
  }
}

/**
 * Generates a slug that is unique within a single event (scoped via the
 * `by_eventId_and_slug` index). Appends -2, -3, etc. until unique. Pass
 * `existingId` to exclude the current invitation when updating.
 */
export async function generateUniqueInvitationSlug(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  slug: string,
  existingId?: Id<"invitations">
): Promise<string> {
  let candidate = slug;
  let counter = 2;

  while (true) {
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_eventId_and_slug", (q) =>
        q.eq("eventId", eventId).eq("slug", candidate)
      )
      .unique();

    if (!existing || (existingId && existing._id === existingId)) {
      return candidate;
    }

    candidate = `${slug}-${counter}`;
    counter++;
  }
}
