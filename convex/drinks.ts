import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";

export const listDrinkOptionsByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // Public-accessible for guest RSVP page
    const options = await ctx.db
      .query("drinkOptions")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(100);
    return options
      .filter((o) => o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listDrinkOptionsByEventAdmin = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const options = await ctx.db
      .query("drinkOptions")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(100);
    return options.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createDrinkOption = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const existing = await ctx.db
      .query("drinkOptions")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(100);
    const maxSort = existing.reduce(
      (max, o) => Math.max(max, o.sortOrder),
      0
    );

    return await ctx.db.insert("drinkOptions", {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      isActive: true,
      sortOrder: args.sortOrder ?? maxSort + 1,
    });
  },
});

export const updateDrinkOption = mutation({
  args: {
    id: v.id("drinkOptions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const option = await ctx.db.get(args.id);
    if (!option) throw new ConvexError("Drink option not found");
    await requireEventAccess(ctx, option.eventId, user._id);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteDrinkOption = mutation({
  args: { id: v.id("drinkOptions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const option = await ctx.db.get(args.id);
    if (!option) throw new ConvexError("Drink option not found");
    await requireEventAccess(ctx, option.eventId, user._id);
    await ctx.db.delete(args.id);
  },
});
