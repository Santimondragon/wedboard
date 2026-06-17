import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import { resolvePublicEvent, resolvePublicInvitation } from "./lib/public";

const MAX_NAME = 200;
const MAX_MESSAGE = 1000;
const MAX_PER_INVITATION = 20;

export const listMessagesByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    const messages = await ctx.db
      .query("guestMessages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(500);

    // Newest first, enriched with the invitation title for context.
    messages.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      messages.map(async (m) => {
        const invitation = await ctx.db.get(m.invitationId);
        return {
          _id: m._id,
          name: m.name,
          message: m.message,
          createdAt: m.createdAt,
          invitationTitle: invitation?.title ?? "—",
        };
      })
    );
  },
});

export const submitGuestMessage = mutation({
  args: {
    eventSlug: v.string(),
    invitationSlug: v.string(),
    name: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const message = args.message.trim();

    if (message.length === 0) {
      throw new ConvexError("Message cannot be empty");
    }
    if (message.length > MAX_MESSAGE) {
      throw new ConvexError("Message is too long");
    }
    if (name.length > MAX_NAME) {
      throw new ConvexError("Name is too long");
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

    // Spam guard: cap messages per invitation.
    const existing = await ctx.db
      .query("guestMessages")
      .withIndex("by_invitationId", (q) =>
        q.eq("invitationId", invitation._id)
      )
      .take(MAX_PER_INVITATION + 1);
    if (existing.length > MAX_PER_INVITATION) {
      throw new ConvexError("Too many messages for this invitation");
    }

    await ctx.db.insert("guestMessages", {
      eventId: event._id,
      invitationId: invitation._id,
      name,
      message,
      createdAt: Date.now(),
    });
  },
});
