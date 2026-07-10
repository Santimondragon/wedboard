import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  requireEventEditor,
  getEventRole,
  type EventRole,
} from "./lib/permissions";

// Roles that can be assigned to a shared member. The event owner is implicit
// (the eventMembers "owner" row created at createEvent) and never assigned here.
const ASSIGNABLE_ROLE = v.union(
  v.literal("planner"),
  v.literal("editor"),
  v.literal("viewer"),
);

/**
 * Members of an event (owner + shared collaborators), enriched with each
 * user's name/email for display. Readable by any member.
 */
export const listMembers = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const caller = await requireEventEditor(ctx, args.eventId, "viewer");

    const members = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(50);

    const rows = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role as EventRole,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email ?? "",
          isSelf: m.userId === caller._id,
        };
      }),
    );

    // Owner first, then by role strength, so the list reads top-down.
    const order: Record<string, number> = {
      owner: 0,
      planner: 1,
      editor: 2,
      viewer: 3,
    };
    return rows.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  },
});

/** Share an event with an existing Wedboard account by email (planner+). */
export const addMember = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    role: ASSIGNABLE_ROLE,
  },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId, "planner");

    const email = args.email.trim().toLowerCase();
    if (!email) throw new ConvexError("Email is required");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      throw new ConvexError(
        "No account exists with that email — ask them to sign up first",
      );
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.ownerUserId === user._id) {
      throw new ConvexError("That user already owns this event");
    }

    const existing = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id),
      )
      .unique();
    if (existing) {
      throw new ConvexError("That user is already a member of this event");
    }

    return await ctx.db.insert("eventMembers", {
      eventId: args.eventId,
      userId: user._id,
      role: args.role,
    });
  },
});

/** Change a member's role (planner+; only the owner may touch a co-owner). */
export const updateMemberRole = mutation({
  args: { memberId: v.id("eventMembers"), role: ASSIGNABLE_ROLE },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Member not found");
    const caller = await requireEventEditor(ctx, member.eventId, "planner");
    const callerRole = await getEventRole(ctx, member.eventId, caller._id);

    if (member.role === "owner") {
      throw new ConvexError("The owner's role cannot be changed");
    }
    if (member.userId === caller._id) {
      throw new ConvexError("You cannot change your own role");
    }
    // Only the owner may promote someone to, or demote someone from, co-owner.
    if (
      (args.role === "planner" || member.role === "planner") &&
      callerRole !== "owner"
    ) {
      throw new ConvexError("Only the owner can manage co-owners");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
  },
});

/** Remove a member (planner+; only the owner may remove a co-owner). */
export const removeMember = mutation({
  args: { memberId: v.id("eventMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Member not found");
    const caller = await requireEventEditor(ctx, member.eventId, "planner");
    const callerRole = await getEventRole(ctx, member.eventId, caller._id);

    if (member.role === "owner") {
      throw new ConvexError("The owner cannot be removed");
    }
    if (member.userId === caller._id) {
      throw new ConvexError("You cannot remove yourself");
    }
    if (member.role === "planner" && callerRole !== "owner") {
      throw new ConvexError("Only the owner can remove co-owners");
    }

    await ctx.db.delete(args.memberId);
  },
});
