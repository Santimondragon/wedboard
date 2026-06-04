import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";
import { generateSlug, generateUniqueInvitationSlug } from "./lib/slug";

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

export const getPublicInvitation = query({
  args: { eventSlug: v.string(), invitationSlug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.eventSlug))
      .unique();

    if (!event) {
      return null;
    }

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_eventId_and_slug", (q) =>
        q.eq("eventId", event._id).eq("slug", args.invitationSlug)
      )
      .unique();

    if (!invitation || !invitation.isActive) {
      return null;
    }

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", invitation._id)
      )
      .take(100);

    return {
      event: {
        name: event.name,
        date: event.date,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        templateId: event.templateId,
        layoutBlocks: event.layoutBlocks,
      },
      invitation: {
        _id: invitation._id,
        title: invitation.title,
        slug: invitation.slug,
        type: invitation.type,
        maxGuests: invitation.maxGuests,
        allowPlusOne: invitation.allowPlusOne,
      },
      guests: guests.map((g) => ({
        _id: g._id,
        firstName: g.firstName,
        lastName: g.lastName,
      })),
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
    guestIds: v.optional(v.array(v.id("guests"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const baseSlug = args.slug
      ? generateSlug(args.slug)
      : generateSlug(args.title);

    const slug = await generateUniqueInvitationSlug(
      ctx,
      args.eventId,
      baseSlug
    );

    const invitationId = await ctx.db.insert("invitations", {
      eventId: args.eventId,
      title: args.title,
      slug,
      type: args.type,
      maxGuests: args.maxGuests,
      allowPlusOne: args.allowPlusOne,
      isActive: true,
      notes: args.notes,
    });

    // Assign selected un-invited guests to this invitation.
    if (args.guestIds) {
      for (const guestId of args.guestIds) {
        const guest = await ctx.db.get(guestId);
        if (
          guest &&
          guest.eventId === args.eventId &&
          !guest.invitationId
        ) {
          await ctx.db.patch(guestId, { invitationId });
        }
      }
    }

    return invitationId;
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
      finalSlug = await generateUniqueInvitationSlug(
        ctx,
        invitation.eventId,
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

    // Unassign guests for this invitation — they return to the un-invited
    // pool rather than being deleted.
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) => q.eq("invitationId", args.id))
      .take(500);

    for (const guest of guests) {
      await ctx.db.patch(guest._id, { invitationId: undefined });
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
    const newSlug = await generateUniqueInvitationSlug(
      ctx,
      invitation.eventId,
      baseSlug,
      args.id
    );
    await ctx.db.patch(args.id, { slug: newSlug });
    return newSlug;
  },
});
