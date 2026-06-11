import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";
import {
  listPublicOptions,
  listAdminOptions,
  createOption,
  updateOption,
  deleteOption,
} from "./lib/options";

export const listMenuOptionsByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // Public-accessible for guest RSVP page
    return await listPublicOptions(ctx, "menuOptions", args.eventId);
  },
});

export const listMenuOptionsByEventAdmin = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await listAdminOptions(ctx, "menuOptions", args.eventId);
  },
});

// Per-option guest selection counts for the menu page, so the client
// doesn't need the full guest list just to show tallies.
export const getSelectionCounts = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId);

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(1000);

    const menuCounts: Record<string, number> = {};
    const drinkCounts: Record<string, number> = {};
    let menuUnassigned = 0;
    let drinkUnassigned = 0;

    for (const guest of guests) {
      if (guest.menuOptionId) {
        menuCounts[guest.menuOptionId] =
          (menuCounts[guest.menuOptionId] ?? 0) + 1;
      } else {
        menuUnassigned++;
      }
      if (guest.drinkOptionId) {
        drinkCounts[guest.drinkOptionId] =
          (drinkCounts[guest.drinkOptionId] ?? 0) + 1;
      } else {
        drinkUnassigned++;
      }
    }

    return {
      menuCounts,
      drinkCounts,
      menuUnassigned,
      drinkUnassigned,
      totalGuests: guests.length,
    };
  },
});

export const createMenuOption = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await createOption(ctx, "menuOptions", args);
  },
});

export const updateMenuOption = mutation({
  args: {
    id: v.id("menuOptions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await updateOption(ctx, args);
  },
});

export const deleteMenuOption = mutation({
  args: { id: v.id("menuOptions") },
  handler: async (ctx, args) => {
    await deleteOption(ctx, args);
  },
});
