import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export type ActivityAction = "create" | "update" | "delete";
export type ActivityEntity =
  | "guest"
  | "invitation"
  | "specialEvent"
  | "template"
  | "meta";

/** Human-readable actor name for the activity feed, falling back to email. */
function actorDisplayName(actor: Doc<"users">): string {
  const name = [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || actor.email;
}

/**
 * Append an entry to an event's activity log. Called from dashboard mutations
 * after the write succeeds. The actor is the user doc returned by
 * `requireEventEditor`.
 */
export async function logActivity(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    actor: Doc<"users">;
    action: ActivityAction;
    entity: ActivityEntity;
    entityName?: string;
  },
): Promise<void> {
  await ctx.db.insert("activityLogs", {
    eventId: args.eventId,
    actorUserId: args.actor._id,
    actorName: actorDisplayName(args.actor),
    action: args.action,
    entity: args.entity,
    entityName: args.entityName,
  });
}
