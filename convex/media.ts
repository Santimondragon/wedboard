import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/gif",
  // .ico favicons (both mime spellings browsers report).
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MEDIA_PER_EVENT = 50;

export const generateUploadUrl = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Catalogs an uploaded blob as event media (call after POSTing the file). */
export const register = mutation({
  args: {
    eventId: v.id("events"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(args.mimeType)) {
      throw new ConvexError("Only image files are allowed");
    }
    if (args.size > MAX_FILE_SIZE) {
      throw new ConvexError("Image must be smaller than 5MB");
    }
    if (!args.name.trim()) {
      throw new ConvexError("File name is required");
    }

    // Trust the actual blob metadata over the client-reported values.
    const blob = await ctx.db.system.get(args.storageId);
    if (!blob) {
      throw new ConvexError("Uploaded file not found");
    }
    if (blob.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("Image must be smaller than 5MB");
    }
    if (
      blob.contentType &&
      !ALLOWED_IMAGE_MIME_TYPES.includes(blob.contentType)
    ) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("Only image files are allowed");
    }

    const existing = await ctx.db
      .query("media")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(MAX_MEDIA_PER_EVENT);
    if (existing.length >= MAX_MEDIA_PER_EVENT) {
      throw new ConvexError(
        `Media library is full (max ${MAX_MEDIA_PER_EVENT} images)`,
      );
    }

    return await ctx.db.insert("media", {
      eventId: args.eventId,
      storageId: args.storageId,
      name: args.name.trim(),
      mimeType: blob.contentType ?? args.mimeType,
      size: blob.size,
    });
  },
});

/** Event media with resolved URLs, newest first. */
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    const items = await ctx.db
      .query("media")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(MAX_MEDIA_PER_EVENT);

    return await Promise.all(
      items.map(async (item) => ({
        ...item,
        url: await ctx.storage.getUrl(item.storageId),
      })),
    );
  },
});

export const rename = mutation({
  args: { id: v.id("media"), name: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new ConvexError("Media not found");
    await requireEventEditor(ctx, item.eventId);

    if (!args.name.trim()) {
      throw new ConvexError("File name is required");
    }
    await ctx.db.patch(args.id, { name: args.name.trim() });
  },
});

/** Deletes the catalog row and the underlying blob. */
export const remove = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new ConvexError("Media not found");
    await requireEventEditor(ctx, item.eventId);

    await ctx.storage.delete(item.storageId);
    await ctx.db.delete(args.id);
  },
});
