import { v } from "convex/values";
import { query } from "./_generated/server";

// TEMPORARY debug helper — delete after verifying superadmin promotion.
export const check = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const raw = process.env.SUPERADMIN_EMAILS ?? "";
    const allowed = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e !== "");

    const users = await ctx.db.query("users").take(500);
    const match = users.find(
      (u) => u.email.toLowerCase() === args.email.toLowerCase(),
    );

    return {
      envRaw: raw,
      envParsed: allowed,
      wouldPromote: allowed.includes(args.email.toLowerCase()),
      userFound: Boolean(match),
      storedRole: match?.role ?? null,
      storedEmail: match?.email ?? null,
      allUsers: users.map((u) => ({ email: u.email, role: u.role })),
    };
  },
});
