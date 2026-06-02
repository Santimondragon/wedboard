import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueSlug(
  ctx: QueryCtx | MutationCtx,
  tableName: "invitations" | "events",
  slug: string,
  existingId?: Id<"invitations"> | Id<"events">
): Promise<string> {
  let candidate = slug;
  let counter = 2;

  while (true) {
    const existing = await ctx.db
      .query(tableName)
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();

    if (!existing || (existingId && existing._id === existingId)) {
      return candidate;
    }

    candidate = `${slug}-${counter}`;
    counter++;
  }
}
