---
id: EP-01-F04
title: Route Protection
epic: EP-01 Account & Access
version: 1.0.2
status: implemented
last_updated: 2026-08-09
depends_on: [EP-01-F03]
---

# EP-01-F04 — Route Protection

## 1. Summary

Route protection decides, for every request that reaches Wedboard, which of three worlds it
belongs to: a customer's **custom domain** (public invitation pages only, no authentication
anywhere in the path), a **public route** on the primary domain (marketing, sign-in/sign-up,
public invitation pages, API handlers), or a **protected route** that requires a signed-in
user. It is implemented in two layers that do different jobs. `src/middleware.ts` runs at the
edge and answers the routing question — it rewrites non-primary hosts before Clerk is ever
consulted, 404s the internal `/_domain` routes on the primary host, and redirects an
unauthenticated visitor to the marketing landing page. The dashboard layout runs in the
browser and answers a timing question — it holds the entire dashboard subtree back until the
Convex client actually holds a Clerk token, so no query fires before it can be authorized.
Neither layer decides _what a user may do inside an event_; that is the Convex guards' job
([roles-and-permissions.md](../../roles-and-permissions.md)).

## 2. Actors & Permissions

| Actor                              | Access                                                                   | Notes                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor                  | Public routes only                                                       | Redirected to `/` from any protected route (`src/middleware.ts:47`)                                                                                                           |
| User                               | Every protected route                                                    | Middleware checks only that `userId` exists — never a role (`src/middleware.ts:45`)                                                                                           |
| Superadmin                         | Same as User at the routing layer                                        | `/admin` has **no** middleware or server guard; the gate is a client `useEffect` plus `requireSuperadmin` inside the Convex queries (`src/app/(dashboard)/admin/page.tsx:32`) |
| Owner / Co-owner / Editor / Viewer | Not evaluated here                                                       | The router never reads a per-event role; `/dashboard/[eventSlug]` is stopped, if at all, by `events.getEventBySlug`                                                           |
| Public guest                       | `/[eventSlug]/invitations/[invitationSlug]` and every custom-domain path | Bypasses Clerk entirely (`src/middleware.ts:9`, `src/middleware.ts:34`)                                                                                                       |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). This feature applies exactly one
gate: **authentication**, `const { userId } = await auth()` (`src/middleware.ts:45`). No
authorization gate — no `requireEventMember`, no `requireSuperadmin` — exists at the routing
layer.

## 3. User Stories

- **US-01-F04-01** — As an anonymous visitor, I want to be sent to the marketing landing page
  when I open a dashboard URL so that I am offered a way to sign in rather than a dead end.
- **US-01-F04-02** — As a public guest, I want an invitation link to open without any sign-in
  prompt so that I can RSVP without an account.
- **US-01-F04-03** — As a host with a custom domain, I want my domain to serve only my
  invitation pages so that visitors never see Wedboard's marketing site or dashboard.
- **US-01-F04-04** — As a user, I want the dashboard to finish authenticating before it loads
  data so that a hard refresh does not fail with an authorization error.
- **US-01-F04-05** — As an operator, I want the internal `/_domain` routes to be unreachable
  from the primary domain so that the rewrite target is not addressable directly.

## 4. Entry Points

| Entry point                        | Route / control                                                                                 | Actor             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------- |
| Any protected URL                  | `/dashboard`, `/dashboard/[eventSlug]/**`, `/admin`                                             | User              |
| Public marketing                   | `/`, `/pricing`                                                                                 | Anonymous visitor |
| Hosted auth                        | `/sign-in(.*)`, `/sign-up(.*)`                                                                  | Anonymous visitor |
| Public invitation (primary domain) | `/:eventSlug/invitations/:invitationSlug`                                                       | Public guest      |
| Public invitation (custom domain)  | `https://{customDomain}/invitations/{slug}` → rewritten to `/_domain/{host}/invitations/{slug}` | Public guest      |
| Custom-domain root                 | `https://{customDomain}/` → `/_domain/{host}`                                                   | Public guest      |
| Route handlers                     | `/api/(.*)` — matched as public; each handler self-guards                                       | Any               |

There is no UI control that starts this feature: it runs on every request. Sign-in is reached
from the marketing landing page, not from a middleware redirect
([EP-01-F02](./F02-sign-in-and-sign-out.md)).

## 5. UX Flow

### Happy path — authenticated user opens a dashboard route

1. The request hits `clerkMiddleware` (`src/middleware.ts:26`). The `Host` header is
   lowercased and its port stripped (`src/middleware.ts:27`).
2. `isPrimaryHost(host)` returns `true` — the host is `localhost`, `127.0.0.1`, a
   `*.vercel.app` deployment URL, or matches `NEXT_PUBLIC_PRIMARY_DOMAIN` (or its `www.`
   form) with the port stripped (`src/middleware.ts:16`).
3. The path does not start with `/_domain`, so the 404 branch is skipped
   (`src/middleware.ts:40`).
4. `isPublicRoute(request)` returns `false`, so `await auth()` runs and yields a `userId`
   (`src/middleware.ts:44`). The middleware returns nothing and the request proceeds.
5. `RootProviders` mounts `ConvexClientProvider`, which wraps the app in
   `ConvexProviderWithClerk` with Clerk's `useAuth`
   (`src/components/providers/convex-client-provider.tsx:11`). The provider fetches the Clerk
   token and attaches it to the Convex client.
6. `DashboardLayout` renders `<AuthLoading>` while the token is being fetched and validated,
   showing a centered `LoadingState message="Loading…"`
   (`src/app/(dashboard)/layout.tsx:17`).
7. Once Convex reports an authenticated client, `<Authenticated>` renders `UserSync`
   ([EP-01-F03](./F03-identity-sync.md)) and only then the page subtree
   (`src/app/(dashboard)/layout.tsx:25`). Every dashboard query therefore issues its first
   request with a token already attached.

### Happy path — public guest on a custom domain

1. `isPrimaryHost(host)` returns `false` (`src/middleware.ts:30`).
2. The middleware returns `NextResponse.rewrite` to `/_domain/{host}{pathname}{search}`
   **before `auth()` is called at all** (`src/middleware.ts:34`). The Clerk handler wrapping
   the callback still runs, but no session is required, read, or enforced for the response.
3. `/_domain/[host]/invitations/[invitationSlug]` renders the invitation; `/_domain/[host]`
   with no remaining segments renders the countdown landing
   (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`).
4. Any other path on the custom domain renders `InvitationNotFound`
   (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:35`) rather than Wedboard's marketing site.

### Alternate & edge paths

- **A1** — Anonymous visitor opens a protected route → `userId` is null and the middleware
  issues a redirect to `/`, not to `/sign-in` (`src/middleware.ts:47`). The originally
  requested URL is discarded; see TODO-01-08.
- **A2** — Request for `/_domain/...` arrives on the primary host → the middleware returns a
  bare `404` with an empty body before any auth or routing runs (`src/middleware.ts:41`).
- **A3** — A public invitation URL on the primary domain → matched by
  `"/:eventSlug/invitations/:invitationSlug"`, so `auth()` never runs
  (`src/middleware.ts:9`).
- **A4** — A request to `/api/...` → matched by `"/api/(.*)"` and treated as public. The
  `/api/domains*` handlers perform their own Clerk check and forward the token to Convex via
  `getConvexToken()` (`src/lib/convex-token.ts:8`). See TODO-01-09.
- **A5** — A static asset or `_next` path → excluded by the middleware `matcher` regex, so
  neither the host rewrite nor the auth check runs (`src/middleware.ts:54`).
- **A6** — A Vercel preview deployment URL (`*.vercel.app`) → treated as a primary host and
  serves the full app, not the custom-domain rewrite (`src/middleware.ts:19`).
- **A7** — `www.{primary}` → treated as primary (`src/middleware.ts:22`). Any other subdomain
  of the primary domain is **not**, and is rewritten as a custom domain.
- **A8** — A signed-in non-superadmin opens `/admin` → the middleware admits the request, the
  page renders a full-screen `LoadingState message="Loading…"`, and a `useEffect`
  `router.replace("/dashboard")` moves them off it once `getCurrentUser` resolves
  (`src/app/(dashboard)/admin/page.tsx:32`, `:42`). The admin queries are passed `"skip"` and
  never issued (`src/app/(dashboard)/admin/page.tsx:39`). See TODO-01-10.
- **A9** — A signed-in user opens `/dashboard/{a-slug-they-do-not-belong-to}` → the middleware
  and the layout both admit the request. `EventProvider` calls
  `api.events.getEventBySlug`, which resolves the event by `by_slug` and then throws
  `ConvexError("Unauthorized")` from `requireEventAccess` (`convex/events.ts:57`,
  `convex/lib/permissions.ts:38`). Because `useQuery` surfaces the rejection by throwing
  during render and there is no `error.tsx` under `src/app/`, the user gets the framework's
  generic client-side error screen — **not** the styled "Event not found" panel, which is
  reached only when the slug matches no event at all (`getEventBySlug` returns `null`,
  `convex/events.ts:56`). See TODO-01-11.
- **E1** — The Convex token is still being fetched on a hard refresh → `<AuthLoading>` holds
  the subtree, so no query runs and `requireUser` cannot throw `Unauthorized`
  (`src/app/(dashboard)/layout.tsx:17`).
- **E2** — The Clerk session expires while the dashboard is open → Convex flips to
  unauthenticated, `<Unauthenticated>` renders `RedirectToHome`, which shows
  `LoadingState message="Redirecting…"` and `router.replace("/")`
  (`src/components/dashboard/redirect-to-home.tsx:12`, `:17`).

## 6. States

| State             | Behavior                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | `<AuthLoading>` renders a full-height centered `LoadingState message="Loading…"` for the whole dashboard subtree (`src/app/(dashboard)/layout.tsx:18`)                                     |
| Empty             | Not applicable — routing has no empty state                                                                                                                                                |
| Error             | No `error.tsx` exists anywhere under `src/app/`. A rejected dashboard query therefore falls through to the framework's default client-side error screen rather than a Wedboard-branded one |
| Success           | The protected subtree renders; on custom domains the invitation or countdown landing renders                                                                                               |
| Disabled / locked | Unauthenticated on the primary domain → HTTP redirect to `/`. `/_domain` on the primary domain → bare `404` with no body (`src/middleware.ts:41`)                                          |
| Mobile            | Identical. Routing decisions are host- and path-based only; no viewport branching exists                                                                                                   |

## 7. UI Specification

### Screens & components

| Element                            | Component                                      | Path                                                    |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Edge routing + auth gate           | `clerkMiddleware` callback                     | `src/middleware.ts:26`                                  |
| Public route matcher               | `isPublicRoute`                                | `src/middleware.ts:4`                                   |
| Primary-host test                  | `isPrimaryHost`                                | `src/middleware.ts:16`                                  |
| Convex auth gate                   | `DashboardLayout`                              | `src/app/(dashboard)/layout.tsx:13`                     |
| Loading placeholder                | `LoadingState`                                 | `src/components/app/loading-state.tsx`                  |
| Signed-out fallback                | `RedirectToHome`                               | `src/components/dashboard/redirect-to-home.tsx:8`       |
| Token attachment                   | `ConvexClientProvider`                         | `src/components/providers/convex-client-provider.tsx:9` |
| Server-side token fetch            | `getConvexToken()`                             | `src/lib/convex-token.ts:8`                             |
| Event resolution / not-found panel | `EventProvider`                                | `src/components/dashboard/event-provider.tsx:24`        |
| Custom-domain catch-all            | `Page` → `EventLanding` / `InvitationNotFound` | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`      |

### Fields & validation

None. This feature has no form and accepts no user input; its only inputs are the request
`Host` header and pathname.

| Field | Type | Required | Rule | Message |
| ----- | ---- | -------- | ---- | ------- |
| —     | —    | —        | —    | —       |

### Copy deck

All copy on this path is English app chrome, not guest-facing Spanish.

| Key                      | Copy                                                       | Source                                             |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------- |
| Dashboard auth loading   | `Loading…`                                                 | `src/app/(dashboard)/layout.tsx:19`                |
| Signed-out redirect      | `Redirecting…`                                             | `src/components/dashboard/redirect-to-home.tsx:17` |
| Event resolution loading | `Loading event…`                                           | `src/components/dashboard/event-provider.tsx:30`   |
| Event not found — title  | `Event not found`                                          | `src/components/dashboard/event-provider.tsx:41`   |
| Event not found — body   | `This event doesn't exist or you don't have access to it.` | `src/components/dashboard/event-provider.tsx:44`   |
| Event not found — action | `Back to events`                                           | `src/components/dashboard/event-provider.tsx:48`   |

## 8. Data Model

This feature reads no table directly. The middleware makes its decision entirely from the
request `Host` header, the pathname, and the Clerk session — there is no database round trip
at the edge.

| Table | Fields | Read / Write | Index |
| ----- | ------ | ------------ | ----- |
| —     | —      | —            | —     |

**Downstream reads.** The routes this feature admits resolve data afterwards:
`events.getEventBySlug` reads `events` by `by_slug` (`convex/events.ts:54`), and the
custom-domain pages resolve the host through `resolvePublicEventByHost`, which uses
`by_customDomain` (`convex/lib/public.ts`). Because the rewrite carries the host as a path
segment, the custom domain is matched against `events.customDomain` **without ever consulting
`customDomainVerified`** — see [glossary.md](../../glossary.md) "Domain Verification".

**No cascade or lifecycle side effect.** Routing writes nothing.

## 9. Backend Contract

No Convex function belongs to this feature. It gates access to functions owned by other
features; the two it interacts with observably are listed for traceability.

| Function                    | Type  | Args             | Returns                              | Guard                                                               | Caps |
| --------------------------- | ----- | ---------------- | ------------------------------------ | ------------------------------------------------------------------- | ---- |
| `api.events.getEventBySlug` | query | `{slug: string}` | `Doc<"events"> & {myRole}` \| `null` | `requireUser` + `requireEventAccess` (`convex/events.ts:51`, `:57`) | None |
| `api.users.getCurrentUser`  | query | `{}`             | `Doc<"users">` \| `null`             | None; returns `null` when unauthenticated                           | None |

Supporting helpers (not Convex functions):

| Helper                   | Path                        | Behavior                                                                                              |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `isPublicRoute(request)` | `src/middleware.ts:4`       | Clerk `createRouteMatcher` over seven patterns                                                        |
| `isPrimaryHost(host)`    | `src/middleware.ts:16`      | `true` for localhost, `127.0.0.1`, `*.vercel.app`, `NEXT_PUBLIC_PRIMARY_DOMAIN` and its `www.` form   |
| `getConvexToken()`       | `src/lib/convex-token.ts:8` | Server-side Convex-audience token for `/api/*` handlers; branches on `sessionClaims.aud === "convex"` |

## 10. Business Rules

- **BR-01-F04-01** `[AS-BUILT]` — Seven patterns are public and skip the authentication check:
  `/`, `/pricing`, `/sign-in(.*)`, `/sign-up(.*)`,
  `/:eventSlug/invitations/:invitationSlug`, `/api/(.*)`, `/_domain(.*)`
  (`src/middleware.ts:4`).
- **BR-01-F04-02** `[AS-BUILT]` — Every path that is not public requires a Clerk `userId`; no
  role is consulted at the routing layer (`src/middleware.ts:44`).
- **BR-01-F04-03** `[AS-BUILT]` — An unauthenticated request to a protected route is
  redirected to `/`, not to `/sign-in` (`src/middleware.ts:47`).
- **BR-01-F04-04** `[AS-BUILT]` — The `Host` header is normalized before any comparison:
  lowercased and truncated at the first `:` to drop the port (`src/middleware.ts:27`).
- **BR-01-F04-05** `[AS-BUILT]` — A host that is not the primary host is rewritten to
  `/_domain/{host}{pathname}{search}` and the middleware returns immediately — **before**
  `auth()` is reached, so a custom-domain request never depends on a Clerk session
  (`src/middleware.ts:30`).
- **BR-01-F04-06** `[AS-BUILT]` — `localhost`, `127.0.0.1`, an empty host, any
  `*.vercel.app` host, `NEXT_PUBLIC_PRIMARY_DOMAIN` and `www.{primary}` are primary hosts;
  everything else is a custom domain (`src/middleware.ts:16`).
- **BR-01-F04-07** `[AS-BUILT]` — `NEXT_PUBLIC_PRIMARY_DOMAIN` is compared with its port
  stripped and lowercased, so a value of `localhost:3000` matches a request to `localhost`
  (`src/middleware.ts:21`).
- **BR-01-F04-08** `[AS-BUILT]` — On the primary host, any pathname starting with `/_domain`
  returns HTTP `404` with an empty body, so the rewrite target is not directly addressable
  (`src/middleware.ts:40`).
- **BR-01-F04-09** `[AS-BUILT]` — The host rewrite is evaluated before the `/_domain` 404,
  which is evaluated before the authentication check; the order is fixed
  (`src/middleware.ts:30`, `:40`, `:44`).
- **BR-01-F04-10** `[AS-BUILT]` — The middleware matcher excludes `_next` and requests whose
  path ends in a known static-asset extension, and explicitly includes `/(api|trpc)(.*)`
  (`src/middleware.ts:52`).
- **BR-01-F04-11** `[AS-BUILT]` — The dashboard subtree renders only inside
  `<Authenticated>`; while Convex is still resolving auth, `<AuthLoading>` renders a loading
  screen instead, so no dashboard query or mutation can be issued before the Clerk token is
  attached to the Convex client (`src/app/(dashboard)/layout.tsx:17`, `:25`). This is what
  prevents `requireUser` from throwing `ConvexError("Unauthorized")` on a hard refresh — the
  Convex client is created before Clerk has a token, and any query issued in that window is
  sent unauthenticated (`convex/lib/auth.ts`).
- **BR-01-F04-12** `[AS-BUILT]` — When Convex reports the client as unauthenticated,
  `RedirectToHome` client-navigates to `/` with `router.replace`, leaving no history entry
  (`src/components/dashboard/redirect-to-home.tsx:12`).
- **BR-01-F04-13** `[AS-BUILT]` — `UserSync` is mounted inside `<Authenticated>`, so identity
  sync cannot fire before a token exists (`src/app/(dashboard)/layout.tsx:26`;
  [EP-01-F03](./F03-identity-sync.md)).
- **BR-01-F04-14** `[AS-BUILT]` — The Convex client token is attached by
  `ConvexProviderWithClerk`, which is given Clerk's `useAuth` and performs the
  audience-aware token fetch itself; no branching is authored in this repo on the client
  (`src/components/providers/convex-client-provider.tsx:11`).
- **BR-01-F04-15** `[AS-BUILT]` — `/admin` is protected only as far as _authentication_: it
  matches no public pattern so it requires a `userId`, but no superadmin check exists in
  middleware or in a server component. The page-level gate is a client `useEffect` redirect,
  and the data gate is `requireSuperadmin` inside `api.admin.listAllEvents` /
  `api.admin.listAllUsers` (`src/app/(dashboard)/admin/page.tsx:32`, `:39`).
- **BR-01-F04-16** `[AS-BUILT]` — There is no per-event authorization at the routing layer.
  `/dashboard/[eventSlug]` renders for any authenticated user; membership is enforced only
  when `EventProvider`'s `getEventBySlug` call reaches `requireEventAccess`
  (`src/components/dashboard/event-provider.tsx:27`, `convex/events.ts:57`).
- **BR-01-F04-17** `[AS-BUILT]` — A custom domain's root path renders the countdown landing
  and any other unrecognized path renders the branded `InvitationNotFound`, never the
  Wedboard marketing site (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`, `:35`).

## 11. Acceptance Criteria

- **AC-01-F04-01** — **Given** a signed-out visitor **When** they request `/dashboard`
  **Then** they receive a redirect to `/` and the sign-in page is not shown.
  _(BR-01-F04-02, BR-01-F04-03)_
- **AC-01-F04-02** — **Given** a signed-out visitor **When** they open
  `/{event-key}/invitations/{slug}` **Then** the invitation renders with no sign-in prompt.
  _(BR-01-F04-01)_
- **AC-01-F04-03** — **Given** a request whose `Host` is `mywedding.test` **When** it hits any
  path **Then** the response is served from `/_domain/mywedding.test{path}` and no Clerk
  session is required. _(BR-01-F04-05)_
- **AC-01-F04-04** — **Given** the primary host **When** `/_domain/anything` is requested
  directly **Then** the response is `404` with an empty body. _(BR-01-F04-08)_
- **AC-01-F04-05** — **Given** `NEXT_PUBLIC_PRIMARY_DOMAIN=wedboard.app` **When** a request
  arrives for `www.wedboard.app` **Then** it is treated as primary and not rewritten.
  _(BR-01-F04-06)_
- **AC-01-F04-06** — **Given** `NEXT_PUBLIC_PRIMARY_DOMAIN=wedboard.app` **When** a request
  arrives for `hello.wedboard.app` **Then** it is rewritten as a custom domain.
  _(BR-01-F04-06)_
- **AC-01-F04-07** — **Given** a request for `https://preview-abc.vercel.app/dashboard`
  **Then** the normal app is served and the auth check applies. _(BR-01-F04-06)_
- **AC-01-F04-08** — **Given** an authenticated user **When** they hard-refresh
  `/dashboard/[eventSlug]/guests` **Then** a loading screen is shown until Convex reports
  authentication and no query fails with `Unauthorized`. _(BR-01-F04-11)_
- **AC-01-F04-09** — **Given** an open dashboard **When** the Clerk session ends **Then**
  `Redirecting…` is shown and the browser is replaced to `/` with no new history entry.
  _(BR-01-F04-12)_
- **AC-01-F04-10** — **Given** a signed-in non-superadmin **When** they navigate to `/admin`
  **Then** the middleware serves the route, no admin query is issued, and the browser is
  replaced to `/dashboard`. _(BR-01-F04-15)_
- **AC-01-F04-11** — **Given** a signed-in user who is not a member of event `X` **When** they
  open `/dashboard/{X-slug}` **Then** the route renders and the failure comes from
  `getEventBySlug` throwing `Unauthorized`, not from the router. _(BR-01-F04-16)_
- **AC-01-F04-12** — **Given** a custom domain **When** `/anything-else` is requested **Then**
  the branded "Invitation Not Found" screen renders. _(BR-01-F04-17)_
- **AC-01-F04-13** — **Given** any request for `/_next/static/...` or `/logo.svg` **Then** the
  middleware does not run. _(BR-01-F04-10)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                                          |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-01-F04-01 | unit        | `isPrimaryHost` for `""`, `localhost`, `127.0.0.1`, `x.vercel.app`, `wedboard.app`, `www.wedboard.app`, `sub.wedboard.app`, `other.test` (`src/middleware.ts:16`) |
| TC-01-F04-02 | unit        | `isPrimaryHost` with `NEXT_PUBLIC_PRIMARY_DOMAIN="localhost:3000"` matches a `localhost` host (`src/middleware.ts:21`)                                            |
| TC-01-F04-03 | unit        | `isPublicRoute` accepts `/a/invitations/b` and rejects `/a/invitations/b/c` and `/dashboard/a` (`src/middleware.ts:9`)                                            |
| TC-01-F04-04 | integration | Custom-domain request returns a rewrite and never calls `auth()` (`src/middleware.ts:34`)                                                                         |
| TC-01-F04-05 | integration | `/_domain/x` on the primary host returns `404` with an empty body                                                                                                 |
| TC-01-F04-06 | integration | Signed-out `/dashboard` returns a 307 to `/`                                                                                                                      |
| TC-01-F04-07 | integration | The middleware matcher skips `/_next/...` and `*.png`                                                                                                             |
| TC-01-F04-08 | e2e         | Hard refresh of `/dashboard/[eventSlug]` shows `Loading…` then the page, with no `Unauthorized` error in the console                                              |
| TC-01-F04-09 | e2e         | Sign out from an open dashboard → `Redirecting…` → landing page                                                                                                   |
| TC-01-F04-10 | e2e         | Non-superadmin navigating to `/admin` ends on `/dashboard` and issues no `admin.*` query                                                                          |
| TC-01-F04-11 | e2e         | Non-member opening another user's `/dashboard/{slug}` does not see that event's data                                                                              |
| TC-01-F04-12 | e2e         | `curl -H "Host: mywedding.test" http://localhost:3000/invitations/{slug}` serves the invitation                                                                   |

### Manual QA checklist

- [ ] Signed out, every `/dashboard/**` URL lands on `/`
- [ ] The invitation URL opens in a private window with no sign-in prompt
- [ ] `/_domain/whatever` on the app domain returns a blank 404
- [ ] A custom domain's root shows the countdown landing, `/nope` shows "Invitation Not Found"
- [ ] Hard refresh deep inside the dashboard never flashes an error toast
- [ ] `/admin` bounces a normal user back to `/dashboard`
- [ ] Opening a colleague's event slug without membership shows no event data

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. The middleware performs no database access and no rate limiting                                                                                                                                                                                                                                                                                                           |
| Performance      | One header read, one matcher evaluation and — on protected routes only — one `auth()` call per request. The custom-domain branch returns before `auth()`. Static assets are excluded by the matcher (`src/middleware.ts:52`)                                                                                                                                                    |
| Security & authz | Authentication only. There is no authorization at the routing layer: `/admin` is client-gated (BR-01-F04-15) and event membership is enforced only by Convex (BR-01-F04-16). Both are safe for **data** because the Convex guards are server-side, but neither prevents the route from rendering. `"/api/(.*)"` is wholesale public — each handler must self-guard (TODO-01-09) |
| Accessibility    | The loading and redirect screens are text-only `LoadingState` panels; no focus management or live-region announcement is authored for the auth transitions                                                                                                                                                                                                                      |
| i18n             | English chrome only. Custom-domain public pages render Spanish copy owned by [EP-07](../07-guest-experience/)                                                                                                                                                                                                                                                                   |
| Analytics        | None. No redirect, rewrite or 404 emitted by the middleware is recorded anywhere                                                                                                                                                                                                                                                                                                |

## 14. TODOs & Open Questions

- **TODO-01-08** `[P2]` `[CHANGE]` — An unauthenticated request to a protected route is
  redirected to `/` with no record of where the user was going
  (`src/middleware.ts:47`).
  - **Rationale:** a user who follows a shared dashboard deep link — an invitation editor URL
    passed between co-owners, for example — is dropped on the marketing page and must
    navigate back manually after signing in. Clerk's `redirectToSignIn({ returnBackUrl })`
    exists for exactly this.
  - **Proposed rule:** the middleware preserves the requested URL and the post-authentication
    landing returns the user to it.
- **TODO-01-09** `[P2]` `[CHANGE]` — `"/api/(.*)"` is listed wholesale in the public-route
  matcher, so no route handler is protected by the middleware
  (`src/middleware.ts:10`).
  - **Rationale:** the only handlers today (`/api/domains`, `/api/domains/status`) do
    self-guard with Clerk and forward the token via `getConvexToken()`
    (`src/lib/convex-token.ts:8`), so nothing is exposed right now. But the exemption is a
    standing invitation for the next handler added to be unguarded by omission.
  - **Proposed rule:** only the specific handlers that must be reachable without a session are
    exempted; everything else under `/api` requires a `userId` at the edge.
- **TODO-01-10** `[P2]` `[CHANGE]` — `/admin` has no middleware rule and no server-component
  guard; the only routing-layer protection is a client `useEffect` that calls
  `router.replace("/dashboard")` after `getCurrentUser` resolves.
  - **Evidence:** `src/middleware.ts:4` (no `/admin` entry, so only authentication applies),
    `src/app/(dashboard)/admin/page.tsx:32` (the `useEffect` redirect),
    `src/app/(dashboard)/admin/page.tsx:39` (`"skip"` on both admin queries),
    `convex/admin.ts` (`requireSuperadmin` on both).
  - **Impact:** no data leaks — the admin queries are skipped client-side and would throw
    server-side regardless. What a non-superadmin sees is the admin route's URL resolving, a
    full-screen `Loading…` panel, and then a client redirect to `/dashboard`. The existence
    and shape of the admin console is discoverable, and the guard depends on JavaScript
    running.
  - **Proposed fix:** add `/admin` handling in middleware (or a server component that reads
    the session claim) so a non-superadmin receives a redirect before any admin markup is
    served.
- **TODO-01-11** `[P1]` `[CHANGE]` — There is no per-event authorization at the routing layer.
  _(Partially addressed: since the dashboard redesign, `src/app/(dashboard)/error.tsx` catches
  the throw and renders a styled `StateBlock kind="error"` with a retry inside the shell, so
  the failure is no longer the framework's raw error screen. What remains open is the absence
  of a routing-layer check and the soft disclosure below — an error rather than a not-found
  still distinguishes "this slug exists but is not yours" from "no such slug".)_ A signed-in
  non-member who opens
  `/dashboard/{someone-elses-slug}` passes the middleware and the layout; `EventProvider`
  issues `getEventBySlug`, which finds the event and then throws `ConvexError("Unauthorized")`
  from `requireEventAccess`.
  - **Evidence:** `src/components/dashboard/event-provider.tsx:27` (the query),
    `convex/events.ts:56`–`convex/events.ts:57` (returns `null` only when the slug matches
    nothing; otherwise throws), `convex/lib/permissions.ts:38` (`throw new
ConvexError("Unauthorized")`), and no `error.tsx` exists anywhere under `src/app/`.
  - **Impact:** the event's data is safe — nothing is returned. But the user sees the
    framework's generic client-side error screen instead of the styled
    "This event doesn't exist or you don't have access to it." panel that
    `EventProvider` already renders for the `null` case
    (`src/components/dashboard/event-provider.tsx:44`). The throw is also a soft disclosure:
    an error rather than a not-found distinguishes "this slug exists but is not yours" from
    "this slug does not exist".
  - **Proposed fix:** have `getEventBySlug` return `null` on an access failure so the existing
    not-found panel renders, and add a dashboard `error.tsx` as a backstop.

### Open questions

- **Q1** — Should the post-sign-in destination honour a preserved return URL (TODO-01-08), or
  is always landing on `/dashboard` the intended product behavior?
- **Q2** — Should a non-member hitting another event's slug see "not found" (hiding the
  event's existence) or an explicit "you don't have access" message (better for a collaborator
  who was just removed)?
- **Q3** — Should any subdomain of the primary domain be reserved for the app (e.g. `app.`,
  `admin.`), given that every non-`www` subdomain is currently treated as a customer's custom
  domain (`src/middleware.ts:22`)?
- **Q4** — Should the middleware verify that the rewritten host actually corresponds to an
  `events.customDomain`, rather than rewriting every unknown host and letting the Convex
  resolver 404?

## 15. Traceability

| Concern                            | Source                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| Middleware entry                   | `src/middleware.ts:26`                                    |
| Public route matcher               | `src/middleware.ts:4`                                     |
| Public invitation pattern          | `src/middleware.ts:9`                                     |
| API exemption                      | `src/middleware.ts:10`                                    |
| Primary-host test                  | `src/middleware.ts:16`                                    |
| Host normalization                 | `src/middleware.ts:27`                                    |
| Custom-domain rewrite (pre-Clerk)  | `src/middleware.ts:34`                                    |
| `/_domain` 404 on primary host     | `src/middleware.ts:40`                                    |
| Authentication check               | `src/middleware.ts:44`                                    |
| Redirect to `/`                    | `src/middleware.ts:47`                                    |
| Middleware matcher                 | `src/middleware.ts:52`                                    |
| Convex auth gate                   | `src/app/(dashboard)/layout.tsx:17`                       |
| Authenticated subtree              | `src/app/(dashboard)/layout.tsx:25`                       |
| Signed-out fallback                | `src/components/dashboard/redirect-to-home.tsx:12`        |
| Client token attachment            | `src/components/providers/convex-client-provider.tsx:11`  |
| Server-side token fetch            | `src/lib/convex-token.ts:8`                               |
| Event resolution                   | `src/components/dashboard/event-provider.tsx:27`          |
| Not-found panel copy               | `src/components/dashboard/event-provider.tsx:44`          |
| Event layout (provider + shell)    | `src/app/(dashboard)/dashboard/[eventSlug]/layout.tsx:10` |
| Admin client-side guard            | `src/app/(dashboard)/admin/page.tsx:32`                   |
| Admin query skip                   | `src/app/(dashboard)/admin/page.tsx:39`                   |
| Backend (`getEventBySlug`)         | `convex/events.ts:48`                                     |
| Backend (access guard)             | `convex/events.ts:57`                                     |
| Guard (`requireEventAccess` throw) | `convex/lib/permissions.ts:38`                            |
| Custom-domain catch-all            | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`        |
| Validation                         | None — this feature accepts no user input                 |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                                                    |
| ------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.2   | 2026-08-09 | Dashboard redesign | TODO-01-11 narrowed: the `(dashboard)` and root `error.tsx` boundaries now render a styled error panel for the throw; the missing routing-layer check and the soft disclosure remain open |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                                                                                                            |
