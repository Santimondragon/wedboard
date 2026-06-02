import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    return await ctx.db
      .query("specialEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(100);
  },
});

export const listForInvitation = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    // PUBLIC — no auth needed (used on public RSVP page)
    const accesses = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", args.invitationId)
      )
      .take(100);

    const specialEvents = await Promise.all(
      accesses.map((a) => ctx.db.get(a.specialEventId))
    );

    return specialEvents.filter(
      (se) => se !== null && se.isActive
    );
  },
});

export const createSpecialEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    return await ctx.db.insert("specialEvents", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      date: args.date,
      location: args.location,
      isActive: true,
    });
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
    const user = await requireUser(ctx);
    const specialEvent = await ctx.db.get(args.id);
    if (!specialEvent) throw new ConvexError("Special event not found");
    await requireEventAccess(ctx, specialEvent.eventId, user._id);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteSpecialEvent = mutation({
  args: { id: v.id("specialEvents") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const specialEvent = await ctx.db.get(args.id);
    if (!specialEvent) throw new ConvexError("Special event not found");
    await requireEventAccess(ctx, specialEvent.eventId, user._id);

    // Clean up invitationSpecialEventAccess
    const accesses = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_specialEventId", (q) =>
        q.eq("specialEventId", args.id)
      )
      .take(500);
    for (const access of accesses) {
      await ctx.db.delete(access._id);
    }

    // Clean up guestSpecialEventRsvps
    const rsvps = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_specialEventId", (q) =>
        q.eq("specialEventId", args.id)
      )
      .take(500);
    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    await ctx.db.delete(args.id);
  },
});
