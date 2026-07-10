import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { requireUser } from "./auth";

export type EventRole = "owner" | "planner" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  planner: 3,
  editor: 2,
  viewer: 1,
};

export async function requireEventAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
): Promise<void> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new ConvexError("Event not found");
  }
  // Global superadmins have full access to every event.
  const user = await ctx.db.get(userId);
  if (user?.role === "superadmin") {
    return;
  }
  if (event.ownerUserId === userId) {
    return;
  }
  const member = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId),
    )
    .unique();
  if (!member) {
    throw new ConvexError("Unauthorized");
  }
}

/**
 * The standard guard for event-scoped functions: authenticates the caller and
 * verifies the caller holds at least `minRole` on the event (default
 * `"editor"`). Content queries/mutations use the default so viewers are
 * read-blocked and editors can manage content; pass `"viewer"` for
 * member-readable data and `"planner"` for privileged operations.
 * Returns the caller's user doc.
 */
export async function requireEventEditor(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  minRole: EventRole = "editor",
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  await requireEventMember(ctx, eventId, user._id, minRole);
  return user;
}

/**
 * Resolves the caller's effective role on an event, or null when they have no
 * access. Superadmins and the event owner both resolve to `"owner"`. Used to
 * surface the caller's role to the client (see events.getEventBySlug).
 */
export async function getEventRole(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
): Promise<EventRole | null> {
  const user = await ctx.db.get(userId);
  if (user?.role === "superadmin") {
    return "owner";
  }
  const event = await ctx.db.get(eventId);
  if (!event) {
    return null;
  }
  if (event.ownerUserId === userId) {
    return "owner";
  }
  const member = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId),
    )
    .unique();
  return (member?.role as EventRole | undefined) ?? null;
}

/**
 * Guard for global-admin-only functions. Authenticates the caller and verifies
 * the `superadmin` role. Returns the user doc.
 */
export async function requireSuperadmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "superadmin") {
    throw new ConvexError("Unauthorized");
  }
  return user;
}

export async function requireEventMember(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
  minRole?: "owner" | "planner" | "editor" | "viewer",
): Promise<void> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new ConvexError("Event not found");
  }

  // Global superadmins bypass the per-event role hierarchy entirely.
  const user = await ctx.db.get(userId);
  if (user?.role === "superadmin") {
    return;
  }

  let userRole: string | undefined;

  if (event.ownerUserId === userId) {
    userRole = "owner";
  } else {
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", eventId).eq("userId", userId),
      )
      .unique();
    if (!member) {
      throw new ConvexError("Unauthorized");
    }
    userRole = member.role;
  }

  if (minRole) {
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;
    if (userLevel < requiredLevel) {
      throw new ConvexError("Insufficient permissions");
    }
  }
}
