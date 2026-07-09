import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { requireUser } from "./auth";

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
 * verifies event access in one call. Replaces the repeated
 * requireUser + requireEventAccess pair.
 */
export async function requireEventEditor(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  await requireEventAccess(ctx, eventId, user._id);
  return user;
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
