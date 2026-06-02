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
      .query("guests")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);
  },
});

export const listByInvitation = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    return await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", args.invitationId)
      )
      .take(100);
  },
});

export const getGuestById = query({
  args: { id: v.id("guests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventAccess(ctx, guest.eventId, user._id);
    return guest;
  },
});

export const createGuest = mutation({
  args: {
    invitationId: v.id("invitations"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimaryContact: v.optional(v.boolean()),
    isPlusOne: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    return await ctx.db.insert("guests", {
      eventId: invitation.eventId,
      invitationId: args.invitationId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      isPrimaryContact: args.isPrimaryContact ?? false,
      isPlusOne: args.isPlusOne ?? false,
      rsvpStatus: "pending",
    });
  },
});

export const updateGuest = mutation({
  args: {
    id: v.id("guests"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    rsvpStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("attending"),
        v.literal("declined")
      )
    ),
    allergies: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    menuOptionId: v.optional(v.id("menuOptions")),
    drinkOptionId: v.optional(v.id("drinkOptions")),
    tableId: v.optional(v.id("tables")),
    seatNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventAccess(ctx, guest.eventId, user._id);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteGuest = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventAccess(ctx, guest.eventId, user._id);

    // Delete special event RSVPs for this guest
    const rsvps = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_guestId", (q) => q.eq("guestId", args.id))
      .take(100);
    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const bulkCreateGuestsForInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    guests: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        isPrimaryContact: v.optional(v.boolean()),
        isPlusOne: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventAccess(ctx, invitation.eventId, user._id);

    const ids = [];
    for (const g of args.guests) {
      const id = await ctx.db.insert("guests", {
        eventId: invitation.eventId,
        invitationId: args.invitationId,
        firstName: g.firstName,
        lastName: g.lastName,
        isPrimaryContact: g.isPrimaryContact ?? false,
        isPlusOne: g.isPlusOne ?? false,
        rsvpStatus: "pending",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const submitPublicRsvp = mutation({
  args: {
    invitationSlug: v.string(),
    guestUpdates: v.array(
      v.object({
        guestId: v.id("guests"),
        rsvpStatus: v.union(
          v.literal("pending"),
          v.literal("attending"),
          v.literal("declined")
        ),
        menuOptionId: v.optional(v.id("menuOptions")),
        drinkOptionId: v.optional(v.id("drinkOptions")),
        allergies: v.optional(v.string()),
        specialRequests: v.optional(v.string()),
      })
    ),
    specialEventRsvps: v.optional(
      v.array(
        v.object({
          guestId: v.id("guests"),
          specialEventId: v.id("specialEvents"),
          status: v.union(
            v.literal("pending"),
            v.literal("attending"),
            v.literal("declined")
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Look up invitation by slug (public — no auth)
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.invitationSlug))
      .unique();

    if (!invitation || !invitation.isActive) {
      throw new ConvexError("Invitation not found or not active");
    }

    // Get all guests for this invitation
    const invitationGuests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", invitation._id)
      )
      .take(100);

    const validGuestIds = new Set(invitationGuests.map((g) => g._id));

    // Update guests
    for (const update of args.guestUpdates) {
      if (!validGuestIds.has(update.guestId)) {
        throw new ConvexError("Guest does not belong to this invitation");
      }
      const { guestId, ...fields } = update;
      await ctx.db.patch(guestId, fields);
    }

    // Handle special event RSVPs
    if (args.specialEventRsvps) {
      for (const rsvp of args.specialEventRsvps) {
        if (!validGuestIds.has(rsvp.guestId)) {
          throw new ConvexError("Guest does not belong to this invitation");
        }

        const existing = await ctx.db
          .query("guestSpecialEventRsvps")
          .withIndex("by_guestId_and_specialEventId", (q) =>
            q
              .eq("guestId", rsvp.guestId)
              .eq("specialEventId", rsvp.specialEventId)
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, { status: rsvp.status });
        } else {
          await ctx.db.insert("guestSpecialEventRsvps", {
            eventId: invitation.eventId,
            guestId: rsvp.guestId,
            specialEventId: rsvp.specialEventId,
            status: rsvp.status,
          });
        }
      }
    }
  },
});
