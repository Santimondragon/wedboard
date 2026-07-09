import { auth } from "@clerk/nextjs/server";

// Fetch a Convex-audience Clerk JWT server-side, mirroring
// ConvexProviderWithClerk: with the native Clerk Convex integration the
// session token itself carries aud "convex" (no "convex" JWT template
// exists, so requesting it 404s); otherwise fall back to the legacy
// JWT-template setup.
export async function getConvexToken(): Promise<string | null> {
  const { userId, getToken, sessionClaims } = await auth();
  if (!userId) return null;
  if (sessionClaims?.aud === "convex") {
    return await getToken();
  }
  return await getToken({ template: "convex" });
}
