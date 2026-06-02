import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess, requireEventMember } from "./lib/permissions";
import { generateSlug, generateUniqueSlug } from "./lib/slug";

export const listMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const memberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(100);

    const eventIds = memberships.map((m) => m.eventId);
    const events = await Promise.all(eventIds.map((id) => ctx.db.get(id)));
    return events.filter(Boolean);
  },
});

export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);
    return await ctx.db.get(args.eventId);
  },
});

export const getEventSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);

    return {
      ...event,
      invitationCount: invitations.length,
      guestCount: guests.length,
    };
  },
});

export const createEvent = mutation({
  args: {
    name: v.string(),
    date: v.optional(v.number()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const baseSlug = generateSlug(args.name);
    const slug = await generateUniqueSlug(ctx, "events", baseSlug);

    const eventId = await ctx.db.insert("events", {
      name: args.name,
      slug,
      ownerUserId: user._id,
      date: args.date,
      venueName: args.venueName,
      venueAddress: args.venueAddress,
      status: "draft",
    });

    await ctx.db.insert("eventMembers", {
      eventId,
      userId: user._id,
      role: "owner",
    });

    return eventId;
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    date: v.optional(v.number()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("active"), v.literal("archived"))
    ),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventMember(ctx, args.eventId, user._id, "planner");

    const { eventId, ...updates } = args;
    await ctx.db.patch(eventId, updates);
  },
});

export const archiveEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventMember(ctx, args.eventId, user._id, "owner");
    await ctx.db.patch(args.eventId, { status: "archived" });
  },
});
