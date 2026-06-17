import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import { generateSlug, generateUniqueInvitationSlug } from "./lib/slug";
import { resolvePublicEvent, resolvePublicInvitation } from "./lib/public";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    return await ctx.db
      .query("invitations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(500);
  },
});

export const getById = query({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);
    return invitation;
  },
});

export const getPublicInvitation = query({
  args: { eventSlug: v.string(), invitationSlug: v.string() },
  handler: async (ctx, args) => {
    const event = await resolvePublicEvent(ctx, args.eventSlug);
    if (!event) {
      return null;
    }

    const invitation = await resolvePublicInvitation(
      ctx,
      event,
      args.invitationSlug
    );
    if (!invitation) {
      return null;
    }

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", invitation._id)
      )
      .take(100);

    // Derive which layout variant to show from the guests' RSVP states:
    // any attending → accepted; else any pending → pending; else declined.
    // No guests → pending.
    const rsvpState: "pending" | "accepted" | "declined" = guests.some(
      (g) => g.rsvpStatus === "attending"
    )
      ? "accepted"
      : guests.length === 0 || guests.some((g) => g.rsvpStatus === "pending")
        ? "pending"
        : "declined";

    // Saved blocks for the resolved state. `layoutBlocks` is the legacy single
    // layout, used as the accepted fallback. Undefined → the public page falls
    // back to the selected template's default layout for this state.
    const layoutBlocks =
      event.layoutVariants?.[rsvpState] ??
      (rsvpState === "accepted" ? event.layoutBlocks : undefined);

    // Resolve media references in the layout config ("image" fields store a
    // media id string) to signed URLs so the public page can render them.
    const mediaUrls: Record<string, string> = {};
    for (const block of layoutBlocks ?? []) {
      for (const value of Object.values(
        (block.config ?? {}) as Record<string, unknown>
      )) {
        if (typeof value !== "string" || value in mediaUrls) continue;
        const mediaId = ctx.db.normalizeId("media", value);
        if (!mediaId) continue;
        const media = await ctx.db.get(mediaId);
        if (!media || media.eventId !== event._id) continue;
        const url = await ctx.storage.getUrl(media.storageId);
        if (url) mediaUrls[value] = url;
      }
    }

    return {
      event: {
        name: event.name,
        brideName: event.brideName,
        groomName: event.groomName,
        date: event.date,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        venueMapUrl: event.venueMapUrl,
        templateId: event.templateId,
        layoutBlocks,
      },
      rsvpState,
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
      mediaUrls,
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
    await requireEventEditor(ctx, args.eventId);

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
    if (args.guestIds && args.guestIds.length > 20) {
      throw new ConvexError("Cannot link more than 20 guests at once");
    }
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
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

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
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

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
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

    const specialEvent = await ctx.db.get(args.specialEventId);
    if (!specialEvent || specialEvent.eventId !== invitation.eventId) {
      throw new ConvexError("Special event does not belong to this event");
    }

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
    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

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
