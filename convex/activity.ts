import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireEventEditor } from "./lib/permissions";

/** Event activity feed, newest first. Readable by any member. */
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventEditor(ctx, args.eventId, "viewer");

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(200);
  },
});
