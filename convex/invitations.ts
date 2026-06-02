import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";
import { generateSlug, generateUniqueSlug } from "./lib/slug";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    return await ctx.db
      .query("invitations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(500);
  },
});

export const getById = query({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);
    return invitation;
  },
});

export const getPublicInvitationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!invitation || !invitation.isActive) {
      return null;
    }

    return {
      _id: invitation._id,
      eventId: invitation.eventId,
      title: invitation.title,
      slug: invitation.slug,
      type: invitation.type,
      maxGuests: invitation.maxGuests,
      allowPlusOne: invitation.allowPlusOne,
    };
  },
});

export const createInvitation = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    slug: v.optional(v.string()),
    type: v.union(
      v.literal("single"),
      v.literal("group"),
      v.literal("plusOne")
    ),
    maxGuests: v.number(),
    allowPlusOne: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const baseSlug = args.slug
      ? generateSlug(args.slug)
      : generateSlug(args.title);

    // Check uniqueness within event
    const existingWithSlug = await ctx.db
      .query("invitations")
      .withIndex("by_eventId_and_slug", (q) =>
        q.eq("eventId", args.eventId).eq("slug", baseSlug)
      )
      .unique();

    let finalSlug = baseSlug;
    if (existingWithSlug) {
      let counter = 2;
      while (true) {
        const candidate = `${baseSlug}-${counter}`;
        const exists = await ctx.db
          .query("invitations")
          .withIndex("by_eventId_and_slug", (q) =>
            q.eq("eventId", args.eventId).eq("slug", candidate)
          )
          .unique();
        if (!exists) {
          finalSlug = candidate;
          break;
        }
        counter++;
      }
    }

    // Also ensure global slug uniqueness
    const globalSlug = await generateUniqueSlug(ctx, "invitations", finalSlug);

    return await ctx.db.insert("invitations", {
      eventId: args.eventId,
      title: args.title,
      slug: globalSlug,
      type: args.type,
      maxGuests: args.maxGuests,
      allowPlusOne: args.allowPlusOne,
      isActive: true,
      notes: args.notes,
    });
  },
});

export const updateInvitation = mutation({
  args: {
    id: v.id("invitations"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("single"),
        v.literal("group"),
        v.literal("plusOne")
      )
    ),
    maxGuests: v.optional(v.number()),
    allowPlusOne: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    const { id, slug, ...rest } = args;

    let finalSlug = slug;
    if (slug !== undefined) {
      finalSlug = await generateUniqueSlug(
        ctx,
        "invitations",
        generateSlug(slug),
        id
      );
    }

    await ctx.db.patch(id, { ...rest, ...(finalSlug ? { slug: finalSlug } : {}) });
  },
});

export const deleteInvitation = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    // Delete all guests for this invitation
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) => q.eq("invitationId", args.id))
      .take(500);

    for (const guest of guests) {
      // Delete guest special event rsvps
      const rsvps = await ctx.db
        .query("guestSpecialEventRsvps")
        .withIndex("by_guestId", (q) => q.eq("guestId", guest._id))
        .take(100);
      for (const rsvp of rsvps) {
        await ctx.db.delete(rsvp._id);
      }
      await ctx.db.delete(guest._id);
    }

    // Delete invitation special event access
    const accesses = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_invitationId", (q) => q.eq("invitationId", args.id))
      .take(100);
    for (const access of accesses) {
      await ctx.db.delete(access._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const setSpecialEventAccess = mutation({
  args: {
    invitationId: v.id("invitations"),
    specialEventId: v.id("specialEvents"),
    hasAccess: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    const existing = await ctx.db
      .query("invitationSpecialEventAccess")
      .withIndex("by_invitationId_and_specialEventId", (q) =>
        q
          .eq("invitationId", args.invitationId)
          .eq("specialEventId", args.specialEventId)
      )
      .unique();

    if (args.hasAccess && !existing) {
      await ctx.db.insert("invitationSpecialEventAccess", {
        eventId: invitation.eventId,
        invitationId: args.invitationId,
        specialEventId: args.specialEventId,
      });
    } else if (!args.hasAccess && existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const regenerateSlug = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    const baseSlug = generateSlug(invitation.title);
    const newSlug = await generateUniqueSlug(
      ctx,
      "invitations",
      baseSlug,
      args.id
    );
    await ctx.db.patch(args.id, { slug: newSlug });
    return newSlug;
  },
});
