import { ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Whether an email should be granted the global superadmin role. Driven by the
 * `SUPERADMIN_EMAILS` Convex env var (comma-separated, case-insensitive) so no
 * manual internal mutation is needed to promote a user.
 */
function isSuperadminEmail(email: string): boolean {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== "");
  return email !== "" && allowed.includes(email.toLowerCase());
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export const upsertCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const nameParts = (identity.name ?? "").split(" ");
    const firstName = nameParts[0] ?? undefined;
    const lastName = nameParts.slice(1).join(" ") || undefined;
    const email = identity.email ?? existing?.email ?? "";
    const promote = isSuperadminEmail(email);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        firstName,
        lastName,
        // Promote-only: never strip an already-granted role.
        ...(promote && existing.role !== "superadmin"
          ? { role: "superadmin" }
          : {}),
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      firstName,
      lastName,
      role: promote ? "superadmin" : "user",
    });

    return userId;
  },
});

export const ensureCurrentUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const nameParts = (identity.name ?? "").split(" ");
    const firstName = nameParts[0] ?? undefined;
    const lastName = nameParts.slice(1).join(" ") || undefined;
    const email = identity.email ?? existing?.email ?? "";
    const promote = isSuperadminEmail(email);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        firstName,
        lastName,
        // Promote-only: never strip an already-granted role.
        ...(promote && existing.role !== "superadmin"
          ? { role: "superadmin" }
          : {}),
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      firstName,
      lastName,
      role: promote ? "superadmin" : "user",
    });

    return userId;
  },
});
