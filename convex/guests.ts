import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import { resolvePublicEvent, resolvePublicInvitation } from "./lib/public";
import {
  applyDeclineEffects,
  deletePlusOneCascade,
  findPlusOne,
} from "./lib/guests";
import { Doc, Id } from "./_generated/dataModel";

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

    const [guests, invitations, menuOptions, drinkOptions, tables, specialEvents] =
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
        ctx.db
          .query("specialEvents")
          .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
          .take(10),
      ]);

    // Which invitations can see each special event (powers the per-event
    // "not invited" vs RSVP status columns). At most a couple special events,
    // so one query per event is fine.
    const accessByEvent: Record<string, Id<"invitations">[]> = {};
    await Promise.all(
      specialEvents.map(async (se) => {
        const rows = await ctx.db
          .query("invitationSpecialEventAccess")
          .withIndex("by_specialEventId", (q) =>
            q.eq("specialEventId", se._id)
          )
          .take(500);
        accessByEvent[se._id] = rows.map((r) => r.invitationId);
      })
    );

    // Every guest's per-special-event RSVP status, indexed guestId→eventId→status.
    const rsvpRows = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(5000);
    const specialRsvpByGuest: Record<
      string,
      Record<string, "pending" | "attending" | "declined">
    > = {};
    for (const row of rsvpRows) {
      (specialRsvpByGuest[row.guestId] ??= {})[row.specialEventId] = row.status;
    }

    return {
      guests,
      invitations,
      menuOptions: menuOptions.sort((a, b) => a.sortOrder - b.sortOrder),
      drinkOptions: drinkOptions.sort((a, b) => a.sortOrder - b.sortOrder),
      tables: tables.sort((a, b) => a.sortOrder - b.sortOrder),
      specialEvents,
      accessByEvent,
      specialRsvpByGuest,
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
    allowsPlusOne: v.optional(v.boolean()),
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
      isPlusOne: false,
      allowsPlusOne: args.allowsPlusOne ?? false,
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
    allowsPlusOne: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.id);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    // A guest who declines is pulled out of every special invitation, and
    // loses their +1 (if any). The guest stays linked to its invitation.
    if (
      updates.rsvpStatus === "declined" &&
      guest.rsvpStatus !== "declined"
    ) {
      await applyDeclineEffects(ctx, { ...guest, ...updates });
    }

    // Turning off "allows +1" removes any materialized +1 guest.
    if (updates.allowsPlusOne === false && guest.allowsPlusOne) {
      const plusOne = await findPlusOne(ctx, id);
      if (plusOne) await deletePlusOneCascade(ctx, plusOne);
    }
  },
});

/**
 * Owner-side upsert of a guest's RSVP to a special event. Mirrors the public
 * `submitPublicRsvp` special-event path but is gated by `requireEventEditor`
 * so the planner can adjust statuses from the dashboard.
 */
export const setSpecialEventRsvp = mutation({
  args: {
    guestId: v.id("guests"),
    specialEventId: v.id("specialEvents"),
    status: v.union(
      v.literal("pending"),
      v.literal("attending"),
      v.literal("declined")
    ),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);

    const specialEvent = await ctx.db.get(args.specialEventId);
    if (!specialEvent || specialEvent.eventId !== guest.eventId) {
      throw new ConvexError("Special event does not belong to this event");
    }

    const existing = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_guestId_and_specialEventId", (q) =>
        q.eq("guestId", args.guestId).eq("specialEventId", args.specialEventId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
    } else {
      await ctx.db.insert("guestSpecialEventRsvps", {
        eventId: guest.eventId,
        guestId: args.guestId,
        specialEventId: args.specialEventId,
        status: args.status,
      });
    }
  },
});

/**
 * Owner-side removal of a guest's special-event RSVP row — i.e. setting the
 * guest back to "not invited" for that special event from the dashboard.
 */
export const removeSpecialEventRsvp = mutation({
  args: {
    guestId: v.id("guests"),
    specialEventId: v.id("specialEvents"),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, guest.eventId);

    const existing = await ctx.db
      .query("guestSpecialEventRsvps")
      .withIndex("by_guestId_and_specialEventId", (q) =>
        q.eq("guestId", args.guestId).eq("specialEventId", args.specialEventId)
      )
      .unique();

    if (existing) await ctx.db.delete(existing._id);
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

    // If this guest hosts a +1, remove the +1 too.
    const plusOne = await findPlusOne(ctx, args.id);
    if (plusOne) await deletePlusOneCascade(ctx, plusOne);

    await ctx.db.delete(args.id);
  },
});

/**
 * Create (or return the existing) +1 guest linked to a host guest. The +1 is a
 * real, manageable guest record sharing the host's invitation.
 */
export const addPlusOne = mutation({
  args: {
    hostGuestId: v.id("guests"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const host = await ctx.db.get(args.hostGuestId);
    if (!host) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, host.eventId);

    if (host.isPlusOne) {
      throw new ConvexError("A +1 cannot have its own +1");
    }
    if (!host.allowsPlusOne) {
      throw new ConvexError("This guest is not allowed a +1");
    }

    const existing = await findPlusOne(ctx, host._id);
    if (existing) return existing._id;

    const firstName = args.firstName?.trim() || "Acompañante";
    const lastName = args.lastName?.trim() || `de ${host.firstName}`.trim();

    return await ctx.db.insert("guests", {
      eventId: host.eventId,
      invitationId: host.invitationId,
      firstName,
      lastName,
      isPlusOne: true,
      allowsPlusOne: false,
      plusOneOfGuestId: host._id,
      rsvpStatus: "pending",
    });
  },
});

/**
 * Remove a host guest's +1 (and its special-event RSVPs).
 */
export const removePlusOne = mutation({
  args: { hostGuestId: v.id("guests") },
  handler: async (ctx, args) => {
    const host = await ctx.db.get(args.hostGuestId);
    if (!host) throw new ConvexError("Guest not found");
    await requireEventEditor(ctx, host.eventId);

    const plusOne = await findPlusOne(ctx, host._id);
    if (plusOne) await deletePlusOneCascade(ctx, plusOne);
  },
});

export const bulkCreateGuestsForInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    guests: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        allowsPlusOne: v.optional(v.boolean()),
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
        isPlusOne: false,
        allowsPlusOne: g.allowsPlusOne ?? false,
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
    plusOneUpdates: v.optional(
      v.array(
        v.object({
          hostGuestId: v.id("guests"),
          attending: v.boolean(),
          firstName: v.optional(v.string()),
          lastName: v.optional(v.string()),
        })
      )
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
    if (args.plusOneUpdates && args.plusOneUpdates.length > 20) {
      throw new ConvexError("Too many plus-one updates");
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

    const guestById = new Map(invitationGuests.map((g) => [g._id, g]));
    const validGuestIds = new Set(invitationGuests.map((g) => g._id));
    // Guests whose final RSVP is "declined" — excluded from +1 materialization
    // and special-event RSVPs.
    const declinedGuestIds = new Set<Id<"guests">>();

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

      // A guest who declines is removed from every special invitation and
      // loses their +1; the guest itself stays linked to the invitation.
      if (update.rsvpStatus === "declined") {
        declinedGuestIds.add(update.guestId);
        const guest = guestById.get(update.guestId);
        if (guest) await applyDeclineEffects(ctx, { ...guest, ...patch });
      }
    }

    // Materialize / tear down each host guest's +1 from the RSVP form.
    for (const pu of args.plusOneUpdates ?? []) {
      const host = guestById.get(pu.hostGuestId);
      if (!host) {
        throw new ConvexError("Guest does not belong to this invitation");
      }
      const existing = await findPlusOne(ctx, host._id);

      // Only attending hosts that allow a +1 can bring one.
      const hostAttending =
        !declinedGuestIds.has(host._id) &&
        (args.guestUpdates.find((u) => u.guestId === host._id)?.rsvpStatus ??
          host.rsvpStatus) === "attending";

      if (pu.attending && host.allowsPlusOne && hostAttending) {
        const firstName = pu.firstName?.trim() || "Acompañante";
        const lastName =
          pu.lastName?.trim() || `de ${host.firstName}`.trim();
        if (existing) {
          await ctx.db.patch(existing._id, {
            firstName,
            lastName,
            rsvpStatus: "attending",
          });
        } else {
          await ctx.db.insert("guests", {
            eventId: host.eventId,
            invitationId: host.invitationId,
            firstName,
            lastName,
            isPlusOne: true,
            allowsPlusOne: false,
            plusOneOfGuestId: host._id,
            rsvpStatus: "attending",
          });
        }
      } else if (existing) {
        // +1 declined / host not attending → remove the +1 record.
        await deletePlusOneCascade(ctx, existing);
      }
    }

    // Handle special event RSVPs
    if (args.specialEventRsvps) {
      for (const rsvp of args.specialEventRsvps) {
        if (!validGuestIds.has(rsvp.guestId)) {
          throw new ConvexError("Guest does not belong to this invitation");
        }
        // Declined guests are off the special invitations entirely.
        if (declinedGuestIds.has(rsvp.guestId)) {
          continue;
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
