import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  listPublicOptions,
  listAdminOptions,
  createOption,
  updateOption,
  deleteOption,
} from "./lib/options";

export const listDrinkOptionsByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // Public-accessible for guest RSVP page
    return await listPublicOptions(ctx, "drinkOptions", args.eventId);
  },
});

export const listDrinkOptionsByEventAdmin = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await listAdminOptions(ctx, "drinkOptions", args.eventId);
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
    return await createOption(ctx, "drinkOptions", args);
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
    await updateOption(ctx, args);
  },
});

export const deleteDrinkOption = mutation({
  args: { id: v.id("drinkOptions") },
  handler: async (ctx, args) => {
    await deleteOption(ctx, args);
  },
});
