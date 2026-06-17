import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

/**
 * The +1 record linked to a host guest, if any. A host can have at most one.
 */
export async function findPlusOne(
  ctx: MutationCtx,
  hostGuestId: Id<"guests">
): Promise<Doc<"guests"> | null> {
  return await ctx.db
    .query("guests")
    .withIndex("by_plusOneOf", (q) => q.eq("plusOneOfGuestId", hostGuestId))
    .first();
}

/**
 * Delete a guest's per-special-event RSVP rows.
 */
async function deleteSpecialEventRsvps(
  ctx: MutationCtx,
  guestId: Id<"guests">
): Promise<void> {
  const rsvps = await ctx.db
    .query("guestSpecialEventRsvps")
    .withIndex("by_guestId", (q) => q.eq("guestId", guestId))
    .take(100);
  for (const rsvp of rsvps) {
    await ctx.db.delete(rsvp._id);
  }
}

/**
 * Delete a +1 guest record together with its special-event RSVP rows.
 */
export async function deletePlusOneCascade(
  ctx: MutationCtx,
  plusOne: Doc<"guests">
): Promise<void> {
  await deleteSpecialEventRsvps(ctx, plusOne._id);
  await ctx.db.delete(plusOne._id);
}

/**
 * Effects when a guest transitions to `declined`:
 *  - The guest is removed from every special invitation (their RSVP rows go).
 *  - If the guest hosts a +1, that +1 guest is deleted.
 * The guest itself stays linked to its invitation so the public `declined`
 * layout still triggers.
 */
export async function applyDeclineEffects(
  ctx: MutationCtx,
  guest: Doc<"guests">
): Promise<void> {
  await deleteSpecialEventRsvps(ctx, guest._id);
  const plusOne = await findPlusOne(ctx, guest._id);
  if (plusOne) {
    await deletePlusOneCascade(ctx, plusOne);
  }
}
