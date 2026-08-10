import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:eventSlug/invitations/:invitationSlug",
  "/api/(.*)",
  "/_domain(.*)",
]);

// Additional hosts (besides the primary domain) that should also serve the
// normal app instead of being treated as a customer's custom domain — e.g. a
// separate subdomain the app is hosted under. Comma-separated hostnames.
const APP_DOMAINS = (process.env.NEXT_PUBLIC_APP_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// Hosts served as the normal app (marketing + dashboard). Anything else is a
// customer's custom domain and is rewritten to the internal /_domain routes.
function isPrimaryHost(host: string): boolean {
  if (!host || host === "localhost" || host === "127.0.0.1") return true;
  // Vercel preview/production deployment URLs keep serving the normal app.
  if (host.endsWith(".vercel.app")) return true;
  const primary =
    process.env.NEXT_PUBLIC_PRIMARY_DOMAIN?.split(":")[0]?.toLowerCase();
  if (primary && (host === primary || host === `www.${primary}`)) return true;
  if (APP_DOMAINS.includes(host)) return true;
  return false;
}

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  if (!isPrimaryHost(host)) {
    // Custom domain: serve only public invitation pages via the internal
    // /_domain routes. Returns before any Clerk logic — custom-domain
    // requests never touch auth.
    return NextResponse.rewrite(
      new URL(`/_domain/${host}${pathname}${search}`, request.url),
    );
  }

  // The internal /_domain routes are not addressable on the primary domain.
  if (pathname.startsWith("/_domain")) {
    return new NextResponse(null, { status: 404 });
  }

  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
