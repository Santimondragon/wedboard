import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  planner: 3,
  editor: 2,
  viewer: 1,
};

export async function requireEventAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
): Promise<void> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new ConvexError("Event not found");
  }
  if (event.ownerUserId === userId) {
    return;
  }
  const member = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();
  if (!member) {
    throw new ConvexError("Unauthorized");
  }
}

export async function requireEventMember(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
  minRole?: "owner" | "planner" | "editor" | "viewer"
): Promise<void> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new ConvexError("Event not found");
  }

  let userRole: string | undefined;

  if (event.ownerUserId === userId) {
    userRole = "owner";
  } else {
    const member = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", eventId).eq("userId", userId)
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
