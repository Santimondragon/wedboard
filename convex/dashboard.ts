import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";

export const getOverviewStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);

    const totalInvitations = invitations.length;
    const totalGuests = guests.length;

    let attendingCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let allergyCount = 0;
    let menuCompletionCount = 0;
    let tableAssignmentCount = 0;

    for (const guest of guests) {
      if (guest.rsvpStatus === "attending") attendingCount++;
      else if (guest.rsvpStatus === "declined") declinedCount++;
      else pendingCount++;

      if (guest.allergies && guest.allergies.trim() !== "") allergyCount++;
      if (guest.rsvpStatus === "attending" && guest.menuOptionId)
        menuCompletionCount++;
      if (guest.tableId) tableAssignmentCount++;
    }

    const guestCapacity = invitations.reduce(
      (sum, inv) => sum + inv.maxGuests,
      0
    );

    return {
      totalInvitations,
      totalGuests,
      attendingCount,
      declinedCount,
      pendingCount,
      allergyCount,
      menuCompletionCount,
      tableAssignmentCount,
      guestCapacity,
    };
  },
});
