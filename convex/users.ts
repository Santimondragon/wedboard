import { ConvexError } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
} from "./_generated/server";

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
        q.eq("tokenIdentifier", identity.tokenIdentifier)
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
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const nameParts = (identity.name ?? "").split(" ");
    const firstName = nameParts[0] ?? undefined;
    const lastName = nameParts.slice(1).join(" ") || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        firstName,
        lastName,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? "",
      firstName,
      lastName,
      role: "user",
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
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const nameParts = (identity.name ?? "").split(" ");
    const firstName = nameParts[0] ?? undefined;
    const lastName = nameParts.slice(1).join(" ") || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        firstName,
        lastName,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? "",
      firstName,
      lastName,
      role: "user",
    });

    return userId;
  },
});
