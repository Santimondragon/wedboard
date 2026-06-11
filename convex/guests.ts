import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import { resolvePublicEvent, resolvePublicInvitation } from "./lib/public";
import { Doc } from "./_generated/dataModel";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    return await ctx.db
      .query("guests")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);
  },
});

export const listByInvitation = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

    return await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", args.invitationId)
      )
      .take(100);
  },
});

export const listUnassignedByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    // Index on (eventId, invitationId) lets us match the "no invitation"
    // rows directly instead of scanning every guest in the event.
    return await ctx.db
      .query("guests")
      .withIndex("by_eventId_and_invitationId", (q) =>
        q.eq("eventId", args.eventId).eq("invitationId", undefined)
      )
      .take(200);
  },
});

// Everything the guests dashboard page needs in a single round trip,
// instead of five separate subscriptions.
export const getGuestsPageData = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    const [guests, invitations, menuOptions, drinkOptions, tables] =
      await Promise.all([
        ctx.db
          .query("guests")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(1000),
        ctx.db
          .query("invitations")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(500),
        ctx.db
          .query("menuOptions")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(100),
        ctx.db
          .query("drinkOptions")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(100),
        ctx.db
          .query("tables")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(200),
      ]);

    return {
      guests,
      invitations,
      menuOptions: menuOptions.sort((a, b) => a.sortOrder - b.sortOrder),
      drinkOptions: drinkOptions.sort((a, b) => a.sortOrder - b.sortOrder),
      tables: tables.sort((a, b) => a.sortOrder - b.sortOrder),
    };
  },
});

export const getGuestById = query({
  args: { id: v.id("guests") },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);
    return guest;
  },
});

export const createGuest = mutation({
  args: {
    eventId: v.id("events"),
    invitationId: v.optional(v.id("invitations")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimaryContact: v.optional(v.boolean()),
    isPlusOne: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    if (args.invitationId) {
      const invitation = await ctx.db.get(args.invitationId);
      if (!invitation || invitation.eventId !== args.eventId) {
        throw new ConvexError("Invitation does not belong to this event");
      }
    }

    return await ctx.db.insert("guests", {
      eventId: args.eventId,
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
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteGuest = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);

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
    if (args.guests.length > 20) {
      throw new ConvexError("Cannot create more than 20 guests at once");
    }
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new ConvexError("Invitation not found");
    await requireEventEditor(ctx, invitation.eventId);

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
    eventSlug: v.string(),
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
    if (args.guestUpdates.length > 20) {
      throw new ConvexError("Too many guest updates");
    }
    if (args.specialEventRsvps && args.specialEventRsvps.length > 100) {
      throw new ConvexError("Too many special event RSVPs");
    }

    // Resolve event then invitation by slug (public — no auth).
    const event = await resolvePublicEvent(ctx, args.eventSlug);
    if (!event) {
      throw new ConvexError("Invitation not found or not active");
    }

    const invitation = await resolvePublicInvitation(
      ctx,
      event,
      args.invitationSlug
    );
    if (!invitation) {
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

    // Update guests — only RSVP-related fields, never seating/contact data.
    for (const update of args.guestUpdates) {
      if (!validGuestIds.has(update.guestId)) {
        throw new ConvexError("Guest does not belong to this invitation");
      }
      if ((update.allergies?.length ?? 0) > 1000) {
        throw new ConvexError("Allergies text is too long");
      }
      if ((update.specialRequests?.length ?? 0) > 1000) {
        throw new ConvexError("Special requests text is too long");
      }

      if (update.menuOptionId) {
        const option = await ctx.db.get(update.menuOptionId);
        if (!option || option.eventId !== event._id || !option.isActive) {
          throw new ConvexError("Menu option does not belong to this event");
        }
      }
      if (update.drinkOptionId) {
        const option = await ctx.db.get(update.drinkOptionId);
        if (!option || option.eventId !== event._id || !option.isActive) {
          throw new ConvexError("Drink option does not belong to this event");
        }
      }

      // Build the patch explicitly so omitted optional fields are left
      // untouched (patching `undefined` would unset them).
      const patch: Partial<Doc<"guests">> = { rsvpStatus: update.rsvpStatus };
      if ("menuOptionId" in update) patch.menuOptionId = update.menuOptionId;
      if ("drinkOptionId" in update) patch.drinkOptionId = update.drinkOptionId;
      if ("allergies" in update) patch.allergies = update.allergies;
      if ("specialRequests" in update)
        patch.specialRequests = update.specialRequests;
      await ctx.db.patch(update.guestId, patch);
    }

    // Handle special event RSVPs
    if (args.specialEventRsvps) {
      for (const rsvp of args.specialEventRsvps) {
        if (!validGuestIds.has(rsvp.guestId)) {
          throw new ConvexError("Guest does not belong to this invitation");
        }

        const specialEvent = await ctx.db.get(rsvp.specialEventId);
        if (
          !specialEvent ||
          specialEvent.eventId !== event._id ||
          !specialEvent.isActive
        ) {
          throw new ConvexError(
            "Special event does not belong to this event"
          );
        }

        // The invitation must have been granted access to this special event.
        const access = await ctx.db
          .query("invitationSpecialEventAccess")
          .withIndex("by_invitationId_and_specialEventId", (q) =>
            q
              .eq("invitationId", invitation._id)
              .eq("specialEventId", rsvp.specialEventId)
          )
          .unique();
        if (!access) {
          throw new ConvexError(
            "Invitation does not have access to this special event"
          );
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
