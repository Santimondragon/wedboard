import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Tables that carry an `eventId` and a `by_eventId` index. Each child row is
// deleted as part of an event cascade. `media` is handled separately because it
// also owns a storage blob.
const EVENT_SCOPED_TABLES = [
  "guestSpecialEventRsvps",
  "invitationSpecialEventAccess",
  "guestMessages",
  "activityLogs",
  "guests",
  "invitations",
  "specialEvents",
  "menuOptions",
  "drinkOptions",
  "tables",
  "eventMembers",
] as const;

// Permanently delete an event and every record that belongs to it across all
// related tables (including media storage blobs), then the event itself.
// Caller is responsible for authorization.
export async function cascadeDeleteEvent(
  ctx: MutationCtx,
  eventId: Id<"events">,
) {
  for (const table of EVENT_SCOPED_TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(5000);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }

  // Media rows additionally own a storage blob.
  const media = await ctx.db
    .query("media")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .take(5000);
  for (const item of media) {
    await ctx.storage.delete(item.storageId);
    await ctx.db.delete(item._id);
  }

  await ctx.db.delete(eventId);
}
