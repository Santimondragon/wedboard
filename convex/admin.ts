import { query } from "./_generated/server";
import { requireSuperadmin } from "./lib/permissions";

/**
 * Global admin listing of every event in the system, enriched with owner and
 * guest/invitation counts. Superadmin-only.
 *
 * Bounded scan: take(200) events, each counted via take(1000) index reads (the
 * getEventSummary/getOverviewStats counting pattern). Fine at current scale;
 * move to denormalized counters if the platform grows past this.
 */
export const listAllEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperadmin(ctx);

    const events = await ctx.db.query("events").take(200);

    return await Promise.all(
      events.map(async (event) => {
        const [owner, invitations, guests] = await Promise.all([
          ctx.db.get(event.ownerUserId),
          ctx.db
            .query("invitations")
            .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
            .take(1000),
          ctx.db
            .query("guests")
            .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
            .take(1000),
        ]);

        const ownerName =
          [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") || null;

        return {
          _id: event._id,
          name: event.name,
          slug: event.slug,
          status: event.status,
          date: event.date ?? null,
          ownerName,
          ownerEmail: owner?.email ?? null,
          guestCount: guests.length,
          invitationCount: invitations.length,
          hasCustomDomain: Boolean(event.customDomain),
          customDomain: event.customDomain ?? null,
        };
      }),
    );
  },
});

/** Global admin listing of every user. Superadmin-only. */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperadmin(ctx);

    const users = await ctx.db.query("users").take(500);

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role,
      createdAt: user._creationTime,
    }));
  },
});
