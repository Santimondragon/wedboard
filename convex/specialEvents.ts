import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import { logActivity } from "./lib/activity";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    return await ctx.db
      .query("specialEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(100);
  },
});

// Everything the special-events dashboard page needs in one round trip:
// the event's special invitations, its invitations (for assignment), and the
// current access map (which invitations each special event is visible to).
export const getSpecialEventsPageData = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    const [specialEvents, invitations] = await Promise.all([
      ctx.db
        .query("specialEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(100),
      ctx.db
        .query("invitations")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(500),
    ]);

    // specialEventId → invitation ids that currently have access.
    const accessByEvent: Record<string, string[]> = {};
    for (const se of specialEvents) {
      const accesses = await ctx.db
        .query("invitationSpecialEventAccess")
        .withIndex("by_specialEventId", (q) => q.eq("specialEventId", se._id))
        .take(500);
      accessByEvent[se._id] = accesses.map((a) => a.invitationId);
    }

    return { specialEvents, invitations, accessByEvent };
  },
});

export const listForInvitation = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    // PUBLIC — no auth needed (used on public RSVP page)
    const accesses = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", args.invitationId),
      )
      .take(100);

    // Per-id get fan-out is bounded by the take(100) above — fine at this scale.
    const specialEvents = await Promise.all(
      accesses.map((a) => ctx.db.get(a.specialEventId)),
    );

    return specialEvents.filter((se) => se !== null && se.isActive);
  },
});

/** Max special invitations (mini sub-events) an event may have. */
export const MAX_SPECIAL_EVENTS = 2;

export const createSpecialEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireEventEditor(ctx, args.eventId);

    // An event may have at most MAX_SPECIAL_EVENTS special invitations.
    const existing = await ctx.db
      .query("specialEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(MAX_SPECIAL_EVENTS + 1);
    if (existing.length >= MAX_SPECIAL_EVENTS) {
      throw new ConvexError(
        `An event can have at most ${MAX_SPECIAL_EVENTS} special invitations`,
      );
    }

    const specialEventId = await ctx.db.insert("specialEvents", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      date: args.date,
      location: args.location,
      isActive: true,
    });
    await logActivity(ctx, {
      eventId: args.eventId,
      actor: user,
      action: "create",
      entity: "specialEvent",
      entityName: args.name,
    });
    return specialEventId;
  },
});

export const updateSpecialEvent = mutation({
  args: {
    id: v.id("specialEvents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const specialEvent = await ctx.db.get(args.id);
    if (!specialEvent) throw new ConvexError("Special event not found");
    const user = await requireEventEditor(ctx, specialEvent.eventId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    await logActivity(ctx, {
      eventId: specialEvent.eventId,
      actor: user,
      action: "update",
      entity: "specialEvent",
      entityName: updates.name ?? specialEvent.name,
    });
  },
});

export const deleteSpecialEvent = mutation({
  args: { id: v.id("specialEvents") },
  handler: async (ctx, args) => {
    const specialEvent = await ctx.db.get(args.id);
    if (!specialEvent) throw new ConvexError("Special event not found");
    const user = await requireEventEditor(ctx, specialEvent.eventId);

    // Clean up invitationSpecialEventAccess
    const accesses = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_specialEventId", (q) => q.eq("specialEventId", args.id))
      .take(500);
    for (const access of accesses) {
      await ctx.db.delete(access._id);
    }

    // Clean up guestSpecialEventRsvps
    const rsvps = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_specialEventId", (q) => q.eq("specialEventId", args.id))
      .take(500);
    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    await ctx.db.delete(args.id);
    await logActivity(ctx, {
      eventId: specialEvent.eventId,
      actor: user,
      action: "delete",
      entity: "specialEvent",
      entityName: specialEvent.name,
    });
  },
});
