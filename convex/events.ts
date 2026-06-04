import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireEventAccess, requireEventMember } from "./lib/permissions";
import {
  generateSlug,
  generateUniqueSlug,
  RESERVED_EVENT_SLUGS,
} from "./lib/slug";

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
    return events.filter((e): e is Doc<"events"> => e !== null);
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

export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!event) return null;
    await requireEventAccess(ctx, event._id, user._id);
    return event;
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

    return { eventId, slug };
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
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

    const { eventId, slug, ...updates } = args;

    let finalSlug: string | undefined;
    if (slug !== undefined) {
      const baseSlug = generateSlug(slug);
      if (!baseSlug) {
        throw new ConvexError("Event key cannot be empty");
      }
      if (RESERVED_EVENT_SLUGS.has(baseSlug)) {
        throw new ConvexError(`"${baseSlug}" is a reserved key`);
      }
      // Reject (rather than silently suffix) if the key is already taken by
      // another event — the user explicitly chose this handle.
      const existing = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", baseSlug))
        .unique();
      if (existing && existing._id !== eventId) {
        throw new ConvexError(`"${baseSlug}" is already taken`);
      }
      finalSlug = baseSlug;
    }

    await ctx.db.patch(eventId, {
      ...updates,
      ...(finalSlug ? { slug: finalSlug } : {}),
    });
  },
});

export const setInvitationTemplate = mutation({
  args: {
    eventId: v.id("events"),
    templateId: v.optional(v.string()),
    layoutBlocks: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.string(),
          config: v.optional(v.any()),
        })
      )
    ),
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
