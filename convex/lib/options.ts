import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { requireEventEditor } from "./permissions";

// menuOptions and drinkOptions share the exact same shape and behavior, so
// menu.ts and drinks.ts are thin wrappers around these handlers.
export type OptionTable = "menuOptions" | "drinkOptions";

/** Highest sortOrder + 1 among an event's rows (also used by tables.ts). */
export async function nextSortOrder(
  ctx: QueryCtx | MutationCtx,
  table: OptionTable | "tables",
  eventId: Id<"events">
): Promise<number> {
  const existing = await ctx.db
    .query(table)
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(200);
  return existing.reduce((max, o) => Math.max(max, o.sortOrder), 0) + 1;
}

/** Public list — active options only, for the guest RSVP page. */
export async function listPublicOptions(
  ctx: QueryCtx,
  table: OptionTable,
  eventId: Id<"events">
) {
  const options = await ctx.db
    .query(table)
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  return options
    .filter((o) => o.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Admin list — all options, auth + event access required. */
export async function listAdminOptions(
  ctx: QueryCtx,
  table: OptionTable,
  eventId: Id<"events">
) {
  await requireEventEditor(ctx, eventId);

  const options = await ctx.db
    .query(table)
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(100);
  return options.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createOption(
  ctx: MutationCtx,
  table: OptionTable,
  args: {
    eventId: Id<"events">;
    name: string;
    description?: string;
    sortOrder?: number;
  }
) {
    await requireEventEditor(ctx, args.eventId);

  return await ctx.db.insert(table, {
    eventId: args.eventId,
    name: args.name,
    description: args.description,
    isActive: true,
    sortOrder: args.sortOrder ?? (await nextSortOrder(ctx, table, args.eventId)),
  });
}

export async function updateOption(
  ctx: MutationCtx,
  args: {
    id: Id<OptionTable>;
    name?: string;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
    const option = await ctx.db.get(args.id);
  if (!option) throw new ConvexError("Option not found");
  await requireEventEditor(ctx, option.eventId);

  const { id, ...updates } = args;
  await ctx.db.patch(id, updates);
}

export async function deleteOption(
  ctx: MutationCtx,
  args: { id: Id<OptionTable> }
) {
    const option = await ctx.db.get(args.id);
  if (!option) throw new ConvexError("Option not found");
  await requireEventEditor(ctx, option.eventId);
  await ctx.db.delete(args.id);
}
