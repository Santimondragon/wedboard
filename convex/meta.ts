import { ConvexError, v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { requireEventMember } from "./lib/permissions";
import {
  resolvePublicEvent,
  resolvePublicEventByHost,
  resolvePublicInvitation,
} from "./lib/public";
import {
  buildMetaVariables,
  resolveMetaTemplate,
  DEFAULT_META_TITLE,
  DEFAULT_META_DESCRIPTION,
  META_TITLE_MAX,
  META_DESCRIPTION_MAX,
  FAVICON_MIME_TYPES,
} from "./lib/meta";

async function resolveMediaUrl(
  ctx: QueryCtx,
  event: Doc<"events">,
  mediaId: Id<"media"> | undefined,
): Promise<{ url: string; mimeType: string } | null> {
  if (!mediaId) return null;
  const item = await ctx.db.get(mediaId);
  if (!item || item.eventId !== event._id) return null;
  const url = await ctx.storage.getUrl(item.storageId);
  return url ? { url, mimeType: item.mimeType } : null;
}

/**
 * Public — resolved social metadata for one invitation page, consumed by
 * Next.js `generateMetadata` on the public routes. Pass `eventSlug` (primary
 * domain) or `host` (custom domain). Returns null when the invitation isn't
 * publicly visible.
 */
export const getPublicInvitationMeta = query({
  args: {
    eventSlug: v.optional(v.string()),
    host: v.optional(v.string()),
    invitationSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const event = args.eventSlug
      ? await resolvePublicEvent(ctx, args.eventSlug)
      : args.host
        ? await resolvePublicEventByHost(ctx, args.host)
        : null;
    if (!event) return null;

    const invitation = await resolvePublicInvitation(
      ctx,
      event,
      args.invitationSlug,
    );
    if (!invitation) return null;

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitationId", (q) => q.eq("invitationId", invitation._id))
      .take(50);
    const guestNames = guests
      .filter((g) => !g.isPlusOne)
      .map((g) => `${g.firstName} ${g.lastName}`.trim());

    const variables = buildMetaVariables({
      eventName: event.name,
      brideName: event.brideName,
      groomName: event.groomName,
      invitationTitle: invitation.title,
      guestNames,
    });

    const [image, favicon] = await Promise.all([
      resolveMediaUrl(ctx, event, event.meta?.imageId),
      resolveMediaUrl(ctx, event, event.meta?.faviconId),
    ]);

    return {
      title: resolveMetaTemplate(
        event.meta?.title || DEFAULT_META_TITLE,
        variables,
      ),
      description: resolveMetaTemplate(
        event.meta?.description || DEFAULT_META_DESCRIPTION,
        variables,
      ),
      imageUrl: image?.url ?? null,
      faviconUrl: favicon?.url ?? null,
      faviconMimeType: favicon?.mimeType ?? null,
    };
  },
});

/** Replaces the event's social metadata (min role planner). */
export const updateEventMeta = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("media")),
    faviconId: v.optional(v.id("media")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventMember(ctx, args.eventId, user._id, "planner");

    const title = args.title?.trim();
    const description = args.description?.trim();
    if (title && title.length > META_TITLE_MAX) {
      throw new ConvexError(
        `Title must be at most ${META_TITLE_MAX} characters`,
      );
    }
    if (description && description.length > META_DESCRIPTION_MAX) {
      throw new ConvexError(
        `Description must be at most ${META_DESCRIPTION_MAX} characters`,
      );
    }

    for (const mediaId of [args.imageId, args.faviconId]) {
      if (!mediaId) continue;
      const item = await ctx.db.get(mediaId);
      if (!item || item.eventId !== args.eventId) {
        throw new ConvexError("Image not found in this event's media library");
      }
    }
    if (args.faviconId) {
      const favicon = await ctx.db.get(args.faviconId);
      if (favicon && !FAVICON_MIME_TYPES.includes(favicon.mimeType)) {
        throw new ConvexError("Favicon must be an .ico, .svg, or .png file");
      }
    }

    await ctx.db.patch(args.eventId, {
      meta: {
        title: title || undefined,
        description: description || undefined,
        imageId: args.imageId,
        faviconId: args.faviconId,
      },
    });
  },
});
