import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { requireEventAccess } from "./lib/permissions";

export const listTablesByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(200);
    return tables.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getTablesAndGuests = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(200);

    const sortedTables = tables.sort((a, b) => a.sortOrder - b.sortOrder);

    const result = await Promise.all(
      sortedTables.map(async (table) => {
        const guests = await ctx.db
          .query("guests")
          .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
          .take(50);
        return { ...table, guests };
      })
    );

    return result;
  },
});

export const createTable = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    seatsCount: v.number(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireEventAccess(ctx, args.eventId, user._id);

    const existing = await ctx.db
      .query("tables")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(200);
    const maxSort = existing.reduce(
      (max, t) => Math.max(max, t.sortOrder),
      0
    );

    return await ctx.db.insert("tables", {
      eventId: args.eventId,
      name: args.name,
      seatsCount: args.seatsCount,
      sortOrder: args.sortOrder ?? maxSort + 1,
    });
  },
});

export const updateTable = mutation({
  args: {
    id: v.id("tables"),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const table = await ctx.db.get(args.id);
    if (!table) throw new ConvexError("Table not found");
    await requireEventAccess(ctx, table.eventId, user._id);

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteTable = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const table = await ctx.db.get(args.id);
    if (!table) throw new ConvexError("Table not found");
    await requireEventAccess(ctx, table.eventId, user._id);

    // Unassign all guests from this table
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_tableId", (q) => q.eq("tableId", args.id))
      .take(500);
    for (const guest of guests) {
      await ctx.db.patch(guest._id, { tableId: undefined, seatNumber: undefined });
    }

    await ctx.db.delete(args.id);
  },
});

export const updateTableSeats = mutation({
  args: {
    id: v.id("tables"),
    seatsCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const table = await ctx.db.get(args.id);
    if (!table) throw new ConvexError("Table not found");
    await requireEventAccess(ctx, table.eventId, user._id);

    if (args.seatsCount < 1 || args.seatsCount > 20) {
      throw new ConvexError("Seat count must be between 1 and 20");
    }

    // If reducing seats, unassign guests whose seatNumber >= new seatsCount
    if (args.seatsCount < table.seatsCount) {
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_tableId", (q) => q.eq("tableId", args.id))
        .take(500);
      for (const guest of guests) {
        if (
          guest.seatNumber !== undefined &&
          guest.seatNumber >= args.seatsCount
        ) {
          await ctx.db.patch(guest._id, {
            tableId: undefined,
            seatNumber: undefined,
          });
        }
      }
    }

    await ctx.db.patch(args.id, { seatsCount: args.seatsCount });
  },
});

export const assignGuestToSeat = mutation({
  args: {
    guestId: v.id("guests"),
    tableId: v.id("tables"),
    seatNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found");
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new ConvexError("Table not found");

    if (guest.eventId !== table.eventId) {
      throw new ConvexError("Guest and table belong to different events");
    }
    await requireEventAccess(ctx, guest.eventId, user._id);

    if (args.seatNumber >= table.seatsCount) {
      throw new ConvexError("Seat number exceeds table capacity");
    }

    // Check if seat is already occupied
    const occupyingGuests = await ctx.db
      .query("guests")
      .withIndex("by_tableId_and_seatNumber", (q) =>
        q.eq("tableId", args.tableId).eq("seatNumber", args.seatNumber)
      )
      .take(10);

    for (const occupying of occupyingGuests) {
      if (occupying._id !== args.guestId) {
        await ctx.db.patch(occupying._id, {
          tableId: undefined,
          seatNumber: undefined,
        });
      }
    }

    await ctx.db.patch(args.guestId, {
      tableId: args.tableId,
      seatNumber: args.seatNumber,
    });
  },
});

export const unassignGuestFromSeat = mutation({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found");
    await requireEventAccess(ctx, guest.eventId, user._id);

    await ctx.db.patch(args.guestId, {
      tableId: undefined,
      seatNumber: undefined,
    });
  },
});
