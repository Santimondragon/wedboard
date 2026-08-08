---
id: EP-01-F02
title: Sign In & Sign Out
epic: EP-01 Account & Access
version: 1.0.0
status: implemented
last_updated: 2026-07-27
depends_on: [EP-01-F03, EP-01-F04]
---

# EP-01-F02 — Sign In & Sign Out

## 1. Summary

A returning user authenticates through Clerk's hosted `<SignIn />` component and is returned
to `/dashboard`, where they pick the event they want to work on. Superadmins are the single
exception: `/dashboard` detects the global role and client-redirects them to the `/admin`
console instead of their own events list. Signing out is handled entirely by Clerk's
`UserButton`, which is rendered in every dashboard chrome — the plain dashboard top bar, the
admin top bar, the per-event header and the per-event sidebar. Wedboard implements no
session store, no "remember me", and no sign-out route of its own.

## 2. Actors & Permissions

| Actor                              | Access          | Notes                                                                                                     |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Anonymous visitor                  | Sign in only    | `/sign-in(.*)` is public (`src/middleware.ts:7`)                                                          |
| User                               | Full            | Signs in, lands on `/dashboard`, signs out from any dashboard chrome                                      |
| Superadmin                         | Full + redirect | Lands on `/dashboard` then is client-redirected to `/admin` (`src/app/(dashboard)/dashboard/page.tsx:28`) |
| Owner / Co-owner / Editor / Viewer | n/a             | Event roles are irrelevant to authentication; they gate what happens _after_ an event is opened           |
| Public guest                       | —               | Never signs in                                                                                            |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The only role this feature reads
is the **global** `users.role`, via `api.users.getCurrentUser`, and it uses it purely to
choose a landing route. The `/admin` console itself is guarded server-side by
`requireSuperadmin` — see [EP-15](../15-platform-administration/).

## 3. User Stories

- **US-01-F02-01** — As a returning user, I want to sign in with the credentials I already
  registered so that I can reach my events.
- **US-01-F02-02** — As a returning user, I want to land on my events list so that I can pick
  the board I need.
- **US-01-F02-03** — As a superadmin, I want to land on the platform console rather than my
  personal events so that my default view matches my job.
- **US-01-F02-04** — As a signed-in user, I want to sign out from wherever I am in the
  dashboard so that I can leave a shared computer safely.
- **US-01-F02-05** — As a signed-out user, I want protected URLs to send me somewhere useful
  rather than erroring.

## 4. Entry Points

| Entry point                                | Route / control                                                                             | Actor             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------- |
| Marketing header "Sign in" button          | `/sign-in`                                                                                  | Anonymous visitor |
| Marketing hero "Sign in" button            | `/sign-in`                                                                                  | Anonymous visitor |
| Direct URL                                 | `/sign-in` (catch-all `[[...sign-in]]`)                                                     | Anonymous visitor |
| Clerk "Sign in" link on the sign-up screen | `/sign-in` via `signInUrl` (`src/components/providers/root-providers.tsx:14`)               | Anonymous visitor |
| Sign out — plain dashboard                 | `UserButton` in the `/dashboard` top bar (`src/app/(dashboard)/dashboard/page.tsx:46`)      | User              |
| Sign out — admin console                   | `UserButton` in the `/admin` top bar (`src/app/(dashboard)/admin/page.tsx:63`)              | Superadmin        |
| Sign out — event header                    | `UserButton` in `DashboardHeader` (`src/components/dashboard/dashboard-header.tsx:48`)      | User              |
| Sign out — event sidebar footer            | `UserButton` beside the user's email (`src/components/dashboard/dashboard-sidebar.tsx:136`) | User              |

There is **no** `/sign-out` route and no sign-out button authored in this repo — the control
is Clerk's `UserButton` menu.

## 5. UX Flow

### Happy path — sign in

1. A signed-out visitor clicks "Sign in" on `/` (`src/app/page.tsx:16`) → `/sign-in`.
2. `SignInPage` renders `<SignIn fallbackRedirectUrl="/dashboard" />` centered on a
   `bg-zinc-50` full-height screen (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:6`).
3. Clerk authenticates and redirects to `/dashboard`.
4. Middleware admits the request because `auth()` yields a `userId` (`src/middleware.ts:45`).
5. `DashboardLayout` holds the subtree in `<AuthLoading>` until the Convex client has the
   token, then renders `<Authenticated>` with `UserSync`
   (`src/app/(dashboard)/layout.tsx:17`).
6. `DashboardPage` runs `api.users.getCurrentUser` and `api.events.listMyEvents`
   (`src/app/(dashboard)/dashboard/page.tsx:20`).
7. Non-superadmin: the events list renders — a header with "Your Events" and the event count,
   a "New Event" button, and one clickable card per event.
8. Clicking a card routes to `/dashboard/{event.slug}`
   (`src/app/(dashboard)/dashboard/page.tsx:86`), handing off to [EP-02](../02-event-setup/).

### Happy path — superadmin landing

1. Steps 1–6 above are identical.
2. `getCurrentUser` returns `role: "superadmin"`, so `isSuperadmin` is `true`
   (`src/app/(dashboard)/dashboard/page.tsx:24`).
3. A `useEffect` calls `router.replace("/admin")`
   (`src/app/(dashboard)/dashboard/page.tsx:26`).
4. While redirecting, the page renders `LoadingState` "Loading…" — the events list is never
   shown to a superadmin (`src/app/(dashboard)/dashboard/page.tsx:33`).
5. `/admin` renders the platform console; it performs the mirror check and redirects
   non-superadmins back to `/dashboard` (`src/app/(dashboard)/admin/page.tsx:33`).

### Happy path — sign out

1. The user opens the `UserButton` menu in any dashboard chrome and chooses Clerk's sign-out
   item.
2. Clerk clears the session. `ConvexProviderWithClerk` drops the token, so the Convex client
   becomes unauthenticated (`src/components/providers/convex-client-provider.tsx:11`).
3. `DashboardLayout` swaps to `<Unauthenticated>` and renders `RedirectToHome`
   (`src/app/(dashboard)/layout.tsx:22`).
4. `RedirectToHome` calls `router.replace("/")` and shows `LoadingState` "Redirecting…"
   meanwhile (`src/components/dashboard/redirect-to-home.tsx:12`).
5. The user lands on the marketing page, where "Sign in" and "Get started" are offered again.

### Alternate & edge paths

- **A1** — A signed-in user opens `/sign-in` → Clerk's component handles the already-signed-in
  case; Wedboard adds no guard of its own on the auth routes.
- **A2** — A superadmin navigates _manually_ to `/dashboard` → the same client redirect to
  `/admin` fires every time; there is no way to view a personal events list as a superadmin.
- **A3** — A non-superadmin navigates to `/admin` → the page redirects them to `/dashboard`
  and never issues the admin queries (`isSuperadmin ? {} : "skip"`,
  `src/app/(dashboard)/admin/page.tsx:39`).
- **A4** — A user is a member of events they do not own → `listMyEvents` returns those too,
  so the list mixes owned and shared boards. See [EP-03](../03-collaboration-and-permissions/).
- **E1** — A signed-out user opens a protected URL → middleware redirects to `/`, **not** to
  `/sign-in` (`src/middleware.ts:47`). See [EP-01-F04](./F04-route-protection.md).
- **E2** — The Clerk session expires while a dashboard page is open → the Convex client
  becomes unauthenticated, `<Unauthenticated>` takes over and `RedirectToHome` sends the user
  to `/` mid-session with no explanatory message.
- **E3** — A `users` row is missing for a valid Clerk session (never synced) → every guarded
  Convex function throws `ConvexError("User not found")` (`convex/lib/auth.ts:26`). `UserSync`
  normally prevents this; see [EP-01-F03](./F03-identity-sync.md).

## 6. States

| State             | Behavior                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | `AuthLoading` → `LoadingState` "Loading…"; then "Loading your events…" while `listMyEvents` resolves; superadmins see "Loading…" for the whole redirect            |
| Empty             | Zero events → the first-run `EmptyState` "Welcome to Wedboard" (specified in [EP-01-F01](./F01-sign-up.md))                                                        |
| Error             | None authored. Clerk renders its own credential errors; a Convex failure after landing surfaces as an unhandled rejection                                          |
| Success           | Events list: "Your Events", the count line ("1 event" / "N events"), a "New Event" button and one card per event with name, `StatusBadge`, optional date and venue |
| Disabled / locked | Superadmins cannot reach the personal events list at all — the redirect is unconditional while the role holds                                                      |
| Mobile            | The events list is a `max-w-3xl` centered stack of full-width cards; the top bar keeps `Logo` left and `UserButton` right                                          |

## 7. UI Specification

### Screens & components

| Element                | Component              | Path                                               |
| ---------------------- | ---------------------- | -------------------------------------------------- |
| Sign-in screen         | `SignInPage`           | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:3` |
| Sign-in form           | Clerk `<SignIn />`     | `@clerk/nextjs` — not authored in this repo        |
| Sign-out control       | Clerk `<UserButton />` | rendered at 4 call sites (see §4)                  |
| Events list / landing  | `DashboardPage`        | `src/app/(dashboard)/dashboard/page.tsx:18`        |
| Auth gate              | `DashboardLayout`      | `src/app/(dashboard)/layout.tsx:8`                 |
| Post-sign-out redirect | `RedirectToHome`       | `src/components/dashboard/redirect-to-home.tsx:8`  |
| Admin console landing  | `AdminPage`            | `src/app/(dashboard)/admin/page.tsx:26`            |
| Event status pill      | `StatusBadge`          | `src/components/app/status-badge.tsx`              |
| Wordmark / home link   | `Logo`                 | `src/components/app/logo.tsx`                      |

### Fields & validation

| Field | Type | Required | Rule                                                                                                          | Message |
| ----- | ---- | -------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| —     | —    | —        | Credential fields belong to Clerk's hosted component; Wedboard defines none and has no Zod schema for sign-in | —       |

### Copy deck

No guest-facing Spanish strings — these surfaces are English.

| Key                             | Copy                   | Source                                             |
| ------------------------------- | ---------------------- | -------------------------------------------------- |
| Marketing sign-in (header)      | `Sign in`              | `src/app/page.tsx:16`                              |
| Marketing sign-in (hero)        | `Sign in`              | `src/app/page.tsx:41`                              |
| Auth gate loading               | `Loading…`             | `src/app/(dashboard)/layout.tsx:19`                |
| Superadmin redirect loading     | `Loading…`             | `src/app/(dashboard)/dashboard/page.tsx:36`        |
| Sign-out redirect               | `Redirecting…`         | `src/components/dashboard/redirect-to-home.tsx:17` |
| Events loading                  | `Loading your events…` | `src/app/(dashboard)/dashboard/page.tsx:51`        |
| Events list heading             | `Your Events`          | `src/app/(dashboard)/dashboard/page.tsx:69`        |
| Event count (singular / plural) | `event` / `events`     | `src/app/(dashboard)/dashboard/page.tsx:72`        |
| Create button                   | `New Event`            | `src/app/(dashboard)/dashboard/page.tsx:77`        |
| Admin badge                     | `Admin`                | `src/app/(dashboard)/admin/page.tsx:60`            |

## 8. Data Model

| Table          | Fields                                                      | Read / Write                                                           | Index                                    |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| `users`        | `role` (landing decision), `email`, `firstName`, `lastName` | Read via `getCurrentUser`; written by the concurrent `UserSync` upsert | `by_tokenIdentifier`                     |
| `events`       | `name`, `slug`, `date`, `venueName`, `status`               | Read via `listMyEvents`                                                | Specified in [EP-02](../02-event-setup/) |
| `eventMembers` | `userId`, `eventId`, `role`                                 | Read via `listMyEvents`                                                | `by_userId`                              |

Signing in and signing out write **nothing** on their own. The only write on the sign-in path
is the identity upsert triggered by `UserSync`, specified in
[EP-01-F03](./F03-identity-sync.md). Sign-out has no server-side effect in Convex at all: the
session lives in Clerk, and Wedboard keeps no session table, no last-seen timestamp and no
audit entry (`activityLogs` is event-scoped and records no account events).

## 9. Backend Contract

| Function                   | Type  | Args | Returns                                   | Guard                                                             | Caps                                                      |
| -------------------------- | ----- | ---- | ----------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `api.users.getCurrentUser` | query | `{}` | `Doc<"users"> \| null`                    | None — returns `null` when unauthenticated (`convex/users.ts:21`) | None                                                      |
| `api.events.listMyEvents`  | query | `{}` | Events owned by or shared with the caller | `requireUser` (see [EP-02](../02-event-setup/))                   | Specified in EP-02                                        |
| `api.admin.listAllEvents`  | query | `{}` | All events, enriched                      | `requireSuperadmin` (`convex/admin.ts`)                           | `take(200)` — see [EP-15](../15-platform-administration/) |
| `api.admin.listAllUsers`   | query | `{}` | All users                                 | `requireSuperadmin` (`convex/admin.ts`)                           | `take(500)` — see [EP-15](../15-platform-administration/) |

Sign-in and sign-out themselves invoke **no** Convex function.

## 10. Business Rules

- **BR-01-F02-01** `[AS-BUILT]` — `/sign-in` and every path beneath it are public
  (`src/middleware.ts:7`).
- **BR-01-F02-02** `[AS-BUILT]` — The sign-in screen renders Clerk's hosted `<SignIn />`;
  Wedboard implements no credential verification
  (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:6`).
- **BR-01-F02-03** `[AS-BUILT]` — After a successful sign-in the user is redirected to
  `/dashboard` (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:6`, and globally via
  `signInFallbackRedirectUrl`, `src/components/providers/root-providers.tsx:12`).
- **BR-01-F02-04** `[AS-BUILT]` — `/dashboard` does **not** auto-open a single event; it always
  renders the events list (`src/app/(dashboard)/dashboard/page.tsx:41`).
- **BR-01-F02-05** `[AS-BUILT]` — A user whose `users.role` is `"superadmin"` is
  client-redirected from `/dashboard` to `/admin` and never sees their own events list
  (`src/app/(dashboard)/dashboard/page.tsx:26`).
- **BR-01-F02-06** `[AS-BUILT]` — A user whose `users.role` is not `"superadmin"` is
  client-redirected from `/admin` to `/dashboard`, and the admin queries are skipped rather
  than issued and rejected (`src/app/(dashboard)/admin/page.tsx:33`,
  `src/app/(dashboard)/admin/page.tsx:39`).
- **BR-01-F02-07** `[AS-BUILT]` — The events list shows every event the caller owns **or** is
  a member of, not only owned ones (`api.events.listMyEvents`,
  `src/app/(dashboard)/dashboard/page.tsx:21`).
- **BR-01-F02-08** `[AS-BUILT]` — Selecting an event navigates by **event key**, not by id:
  `/dashboard/{event.slug}` (`src/app/(dashboard)/dashboard/page.tsx:86`).
- **BR-01-F02-09** `[AS-BUILT]` — Sign-out is offered only through Clerk's `UserButton`;
  Wedboard exposes no sign-out route or custom control (`src/app/(dashboard)/dashboard/page.tsx:46`,
  `src/app/(dashboard)/admin/page.tsx:63`, `src/components/dashboard/dashboard-header.tsx:48`,
  `src/components/dashboard/dashboard-sidebar.tsx:136`).
- **BR-01-F02-10** `[AS-BUILT]` — Losing authentication while inside the dashboard — by
  signing out or by session expiry — renders `RedirectToHome`, which replaces the location
  with `/` (`src/app/(dashboard)/layout.tsx:22`, `src/components/dashboard/redirect-to-home.tsx:12`).
- **BR-01-F02-11** `[AS-BUILT]` — Sign-out performs no Convex write; the `users` row and all
  event data are untouched (no mutation is referenced on any sign-out path).

## 11. Acceptance Criteria

- **AC-01-F02-01** — **Given** a signed-out visitor **When** they open `/sign-in` **Then** the
  Clerk sign-in form renders without a redirect to `/`. _(BR-01-F02-01)_
- **AC-01-F02-02** — **Given** valid credentials **When** Clerk completes sign-in **Then** the
  browser lands on `/dashboard`. _(BR-01-F02-03)_
- **AC-01-F02-03** — **Given** a user with three events **When** `/dashboard` loads **Then**
  three cards render and no automatic navigation into any event occurs. _(BR-01-F02-04)_
- **AC-01-F02-04** — **Given** a user with `role: "superadmin"` **When** `/dashboard` loads
  **Then** the browser ends at `/admin` and the events list is never painted.
  _(BR-01-F02-05)_
- **AC-01-F02-05** — **Given** a user with `role: "user"` **When** they open `/admin` **Then**
  the browser ends at `/dashboard` and `admin.listAllUsers` is never called.
  _(BR-01-F02-06)_
- **AC-01-F02-06** — **Given** a user who owns no events but is an editor on someone else's
  **When** `/dashboard` loads **Then** that shared event appears in the list.
  _(BR-01-F02-07)_
- **AC-01-F02-07** — **Given** the events list **When** a card is clicked **Then** the URL
  becomes `/dashboard/{slug}` using the event key, not the Convex id. _(BR-01-F02-08)_
- **AC-01-F02-08** — **Given** a signed-in user on any dashboard page **When** they sign out
  from the `UserButton` **Then** the app shows "Redirecting…" and ends at `/`.
  _(BR-01-F02-09, BR-01-F02-10)_
- **AC-01-F02-09** — **Given** a user who signs out **When** they sign back in **Then** the
  same `users` row (same `_id`) is reused and all their events are intact.
  _(BR-01-F02-11)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                        |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------- |
| TC-01-F02-01 | unit        | `DashboardPage` renders `LoadingState` while `getCurrentUser` is `undefined`                                    |
| TC-01-F02-02 | unit        | `DashboardPage` calls `router.replace("/admin")` when `getCurrentUser` returns `role: "superadmin"`             |
| TC-01-F02-03 | unit        | `AdminPage` calls `router.replace("/dashboard")` for a non-superadmin and passes `"skip"` to both admin queries |
| TC-01-F02-04 | unit        | `RedirectToHome` calls `router.replace("/")` on mount                                                           |
| TC-01-F02-05 | integration | `listMyEvents` returns owned + shared events for the signed-in user                                             |
| TC-01-F02-06 | e2e         | Sign in → land on `/dashboard` → open an event by slug                                                          |
| TC-01-F02-07 | e2e         | Sign in as a superadmin → end at `/admin`                                                                       |
| TC-01-F02-08 | e2e         | Sign out from the event sidebar → end at `/` → `/dashboard` now redirects to `/`                                |

### Manual QA checklist

- [ ] "Sign in" from both marketing entry points reaches `/sign-in`
- [ ] Signing in from `/sign-in` lands on `/dashboard`, never on an event page
- [ ] A superadmin never sees a flash of the personal events list before `/admin`
- [ ] `UserButton` is present in the plain dashboard bar, the admin bar, the event header and the event sidebar
- [ ] Signing out from a deep event route (e.g. `/dashboard/{slug}/guests`) still lands on `/`
- [ ] After sign-out, using the browser Back button does not render dashboard content

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None on sign-in attempts within Wedboard; rate limiting is Clerk's. `listMyEvents` bounds are specified in [EP-02](../02-event-setup/)                                                                                                |
| Performance      | The landing page issues two queries in parallel (`getCurrentUser`, `listMyEvents`). Both are issued for superadmins too, even though the page immediately redirects — see TODO-01-04                                                  |
| Security & authz | Route-level protection is middleware-side ([EP-01-F04](./F04-route-protection.md)); the `/admin` redirect is a client-side convenience only, with `requireSuperadmin` enforcing server-side ([EP-15](../15-platform-administration/)) |
| Accessibility    | Clerk's components own their own semantics. Event cards are `Card` elements with an `onClick` and no keyboard affordance or link role — a known accessibility gap on the events list, tracked under [EP-02](../02-event-setup/)       |
| i18n             | English only                                                                                                                                                                                                                          |
| Analytics        | None. No sign-in, sign-out or session event is recorded anywhere                                                                                                                                                                      |

## 14. TODOs & Open Questions

- **TODO-01-03** `[P2]` `[ADD]` — Wedboard has no session-revocation story. There is no way,
  from inside the product, to see active sessions, sign out other devices, or force-invalidate
  a collaborator's session after removing them from an event.
  - **Rationale:** removing a member (`members.removeMember`, [EP-03](../03-collaboration-and-permissions/))
    takes effect on the next Convex call because guards re-check membership, but nothing in
    the product tells an owner that, and there is no account-security surface at all.
  - **Proposed rule:** the product exposes Clerk's session management (or documents
    explicitly that session control lives in the Clerk account portal).
- **TODO-01-04** `[P2]` `[CHANGE]` — The superadmin landing redirect happens on the client
  after `/dashboard` has already mounted, and `useQuery(api.events.listMyEvents)` is issued
  unconditionally — so a superadmin's personal events are fetched on every visit only to be
  discarded.
  - **Rationale:** a wasted round trip on every superadmin page load, and the redirect depends
    on JavaScript running.
  - **Proposed rule:** the landing decision is made server-side (or `listMyEvents` is skipped
    while `isSuperadmin` is true), so `/dashboard` never fetches data it will not render.

### Open questions

- **Q1** — Should a superadmin be able to reach their _own_ events list at all? Today the
  redirect is unconditional and there is no escape hatch.
- **Q2** — Should session expiry inside the dashboard show an explanatory message ("Your
  session ended") instead of silently landing the user on the marketing page?
- **Q3** — Should the events list distinguish owned events from shared ones? Today they are
  visually identical.

## 15. Traceability

| Concern                          | Source                                               |
| -------------------------------- | ---------------------------------------------------- |
| Route (sign-in)                  | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:3`   |
| Redirect target (component)      | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:6`   |
| Redirect target (provider)       | `src/components/providers/root-providers.tsx:12`     |
| Clerk sign-in URL config         | `src/components/providers/root-providers.tsx:14`     |
| Public route matcher             | `src/middleware.ts:7`                                |
| Landing page                     | `src/app/(dashboard)/dashboard/page.tsx:18`          |
| Superadmin landing redirect      | `src/app/(dashboard)/dashboard/page.tsx:26`          |
| Superadmin loading guard         | `src/app/(dashboard)/dashboard/page.tsx:33`          |
| Event navigation by slug         | `src/app/(dashboard)/dashboard/page.tsx:86`          |
| Admin mirror redirect            | `src/app/(dashboard)/admin/page.tsx:33`              |
| Admin query skip                 | `src/app/(dashboard)/admin/page.tsx:39`              |
| Sign-out control (dashboard)     | `src/app/(dashboard)/dashboard/page.tsx:46`          |
| Sign-out control (admin)         | `src/app/(dashboard)/admin/page.tsx:63`              |
| Sign-out control (event header)  | `src/components/dashboard/dashboard-header.tsx:48`   |
| Sign-out control (event sidebar) | `src/components/dashboard/dashboard-sidebar.tsx:136` |
| Unauthenticated branch           | `src/app/(dashboard)/layout.tsx:22`                  |
| Post-sign-out redirect           | `src/components/dashboard/redirect-to-home.tsx:12`   |
| Backend (role read)              | `convex/users.ts:18`                                 |
| Schema (`users.role`)            | `convex/schema.ts:22`                                |
| Marketing entry                  | `src/app/page.tsx:16`                                |
| Validation                       | None — no Zod schema exists for sign-in              |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
