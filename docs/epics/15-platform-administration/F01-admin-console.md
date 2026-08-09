---
id: EP-15-F01
title: Admin Console
epic: EP-15 Platform Administration
version: 1.1.0
status: partial
last_updated: 2026-08-09
depends_on: [EP-15-F02]
---

# EP-15-F01 — Admin Console

## 1. Summary

The Admin Console is the single global screen in Wedboard. It lives at `/admin`, is visible
only to a [Superadmin](../../glossary.md), and answers platform-health and support questions
at a glance: every event on the platform with its owner, guest and invitation counts, custom
domain and lifecycle status; and every user account with its email, global role and join date.
It is **read-only** — the console displays data and links out to a customer's event dashboard,
but it performs no administrative action of its own. Its purpose is to spare the operator from
asking a customer for access before they can diagnose anything.

## 2. Actors & Permissions

| Actor                | Access    | Notes                                                                                |
| -------------------- | --------- | ------------------------------------------------------------------------------------ |
| Owner                | None      | The `/admin` route redirects them to `/dashboard`                                    |
| Co-owner (`planner`) | None      | Same                                                                                 |
| Editor               | None      | Same                                                                                 |
| Viewer               | None      | Same                                                                                 |
| Public guest         | None      | `/admin` is not a public route; middleware redirects unauthenticated requests to `/` |
| **Superadmin**       | Full read | Both queries pass `requireSuperadmin(ctx)`                                           |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
`requireSuperadmin(ctx)` (`convex/lib/permissions.ts:95`) on both console queries. It is the
only guard in the codebase that requires the global role rather than tolerating it.

## 3. User Stories

- **US-15-F01-01** — As a Superadmin, I want a list of every event on the platform so that I
  can confirm a customer's event exists and see its scale without asking them.
- **US-15-F01-02** — As a Superadmin, I want each event row to show its owner's name and email
  so that I can match a support request to an account.
- **US-15-F01-03** — As a Superadmin, I want guest and invitation counts per event so that I
  can judge how much data a reported problem affects.
- **US-15-F01-04** — As a Superadmin, I want to see which events have a custom domain attached
  so that I can triage domain and DNS reports.
- **US-15-F01-05** — As a Superadmin, I want to copy an event's internal id so that I can
  correlate it with logs and Convex data.
- **US-15-F01-06** — As a Superadmin, I want to open any event's dashboard in one click so
  that I can reproduce what the customer is seeing.
- **US-15-F01-07** — As a Superadmin, I want a list of every user with their global role so
  that I can confirm who else holds superadmin.
- **US-15-F01-08** — As a non-superadmin, I want `/admin` to send me somewhere useful rather
  than showing an error, so that a stale link is not a dead end.

## 4. Entry Points

| Entry point                     | Route / control                                                                                                                                     | Actor      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Direct navigation               | `/admin`                                                                                                                                            | Superadmin |
| Automatic landing after sign-in | `/dashboard` client-redirects a Superadmin to `/admin` (`src/app/(dashboard)/dashboard/page.tsx:26`)                                                | Superadmin |
| Sidebar logo inside any event   | The "Wedboard" wordmark links to `/admin` for a Superadmin and `/dashboard` for everyone else (`src/components/dashboard/dashboard-sidebar.tsx:88`) | Superadmin |
| Event name / "Open" link        | Each events-table row links to `/dashboard/{event.slug}`                                                                                            | Superadmin |

There is no sidebar nav item for `/admin` — the page is reached by URL, by the post-sign-in
redirect, or by the logo. The console is rendered inside the `(dashboard)` route group but
draws its own minimal header (logo + `Admin` badge + `UserButton`); it does not use
`DashboardShell`, so it has no event sidebar.

## 5. UX Flow

### Happy path

1. A Superadmin lands on `/admin` (directly, via the post-sign-in redirect from `/dashboard`,
   or via the sidebar logo).
2. The `(dashboard)` layout gates the subtree on Convex auth: `<AuthLoading>` renders a
   spinner, `<Unauthenticated>` redirects home, `<Authenticated>` mounts `UserSync` and the
   page (`src/app/(dashboard)/layout.tsx:17`).
3. `UserSync` calls `api.users.upsertCurrentUser`, which is where the superadmin promotion is
   applied — see [EP-15-F02](./F02-superadmin-provisioning.md).
4. The page calls `api.users.getCurrentUser` and computes
   `isSuperadmin = currentUser?.role === "superadmin"` (`src/app/(dashboard)/admin/page.tsx:30`).
5. Because `isSuperadmin` is true, the page subscribes to `api.admin.listAllEvents` and
   `api.admin.listAllUsers` (both with `{}`; otherwise the argument is the literal `"skip"`).
6. Both queries run `requireSuperadmin(ctx)` server-side, then bounded scans of `events` and
   `users`.
7. The page renders two sections — "All Events" then "All Users" — each with a count line
   above its table.
8. The Superadmin clicks an event name or its "Open" link and lands on
   `/dashboard/{slug}`, where the guard bypasses grant them an effective role of `owner`.

### Alternate & edge paths

- **A1** — Authenticated non-superadmin navigates to `/admin` → `currentUser` resolves, the
  effect fires `router.replace("/dashboard")`, and until the navigation completes the page
  renders the centered `LoadingState` with the message `"Loading…"`. Both Convex queries are
  passed `"skip"`, so no data is ever requested and no authorization error is surfaced. The
  user sees a spinner, then their own events list. They never see an error and never see
  another customer's data.
- **A2** — Unauthenticated visitor navigates to `/admin` → Clerk middleware matches the route
  as non-public and redirects to `/` (`src/middleware.ts:44`). The page component never runs.
- **A3** — A Superadmin navigates to `/dashboard` → they are client-redirected to `/admin` and
  cannot reach their own events list at that URL at all; their own events are reachable only
  through the `/admin` events table or a direct `/dashboard/{slug}` URL.
- **A4** — The platform holds more than 200 events (or more than 500 users) → the tables show
  the first 200 / 500 rows returned by the scan, and the count line reports that truncated
  number as if it were the total. There is no pagination, no "showing N of M", and no error.
  See `TODO-15-01`.
- **A5** — An event's owner user document is missing → `ownerName` is `null` and renders as
  `"—"`, `ownerEmail` is `null` and renders as an empty string. The row still renders.
- **A6** — An event has no `date` → the query returns `date: null`. The events table does not
  render a date column today, so the field is unused by the UI.
- **E1** — A non-superadmin calls `api.admin.listAllEvents` or `api.admin.listAllUsers`
  directly (outside the UI) → `requireSuperadmin` throws `ConvexError("Unauthorized")` and no
  rows are returned. This is the real gate; the client redirect is convenience only.
- **E2** — An authenticated Clerk user with no `users` row yet calls either query →
  `requireUser` throws `ConvexError("User not found")` (`convex/lib/auth.ts:26`) before the
  role is examined.

## 6. States

| State             | Behavior                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | While `currentUser === undefined`, or for any non-superadmin, the whole page is a centered `LoadingState` with `"Loading…"`. Per-section: `events === undefined` renders `LoadingState` `"Loading events…"` and the count line reads `"Loading…"`; `users === undefined` renders `"Loading users…"` with the same count-line behavior |
| Empty             | Zero events → `EmptyState` titled `"No events yet"`, description `"No one has created an event in the system."`. Zero users → `EmptyState` titled `"No users yet"`, description `"No users found."`                                                                                                                                   |
| Error             | None handled. A thrown `Unauthorized` from either query is not caught by the page; the page relies on the `"skip"` argument so the query is never issued for a non-superadmin                                                                                                                                                         |
| Success           | Two bordered tables, each preceded by a heading and a pluralized count line                                                                                                                                                                                                                                                           |
| Disabled / locked | The users table's Role column is a read-only badge — there is no control to change a role                                                                                                                                                                                                                                             |
| Mobile            | Both tables render inside `DataTableShell`, which owns `overflow-x-auto` and a sticky header, so the wide column sets scroll rather than overflow the page. `/admin` uses deliberately denser operator chrome (compact rows) so it never reads as a planner board                                                                     |

## 7. UI Specification

### Screens & components

| Element               | Component                                                                      | Path                                     |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| Console page          | `AdminPage`                                                                    | `src/app/(dashboard)/admin/page.tsx:26`  |
| Auth gate wrapper     | `DashboardLayout`                                                              | `src/app/(dashboard)/layout.tsx:17`      |
| Wordmark              | `Logo`                                                                         | `src/components/app/logo.tsx`            |
| "Admin" chip          | `Badge` (variant `outline`, amber)                                             | `src/components/ui/badge.tsx`            |
| Account menu          | `UserButton` (Clerk)                                                           | `@clerk/nextjs`                          |
| Loading               | `LoadingState`                                                                 | `src/components/app/loading-state.tsx:7` |
| Empty                 | `EmptyState`                                                                   | `src/components/app/empty-state.tsx:14`  |
| Event status chip     | `StatusBadge`                                                                  | `src/components/app/status-badge.tsx:38` |
| Event id copy control | `CopyButton` (`label=""`)                                                      | `src/components/app/copy-button.tsx:13`  |
| Tables                | `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` | `src/components/ui/table.tsx`            |

### Events table columns

| Column        | Content                                                                                            | Source field                      |
| ------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| Event         | Event name as a link to `/dashboard/{slug}`, with `/{slug}` beneath it                             | `name`, `slug`                    |
| ID            | First 8 characters of the document id followed by `…`, plus a `CopyButton` that copies the full id | `_id`                             |
| Owner         | Owner's full name, with the owner's email beneath it                                               | `ownerName`, `ownerEmail`         |
| Guests        | Right-aligned tabular count                                                                        | `guestCount`                      |
| Invitations   | Right-aligned tabular count                                                                        | `invitationCount`                 |
| Custom domain | When present, a green check icon plus the domain; otherwise a grey minus icon                      | `hasCustomDomain`, `customDomain` |
| Status        | `StatusBadge` for `draft` / `active` / `archived`                                                  | `status`                          |
| _(unlabeled)_ | `"Open"` link with an arrow icon → `/dashboard/{slug}`                                             | `slug`                            |

### Users table columns

| Column | Content                                                                                    | Source field            |
| ------ | ------------------------------------------------------------------------------------------ | ----------------------- |
| Name   | `"{firstName} {lastName}"`, falling back to `"—"` when both are absent                     | `firstName`, `lastName` |
| Email  | Plain text                                                                                 | `email`                 |
| Role   | Badge; amber when the value is `superadmin`, grey otherwise. Renders the raw stored string | `role`                  |
| Joined | `_creationTime` formatted `MMM d, yyyy` via date-fns                                       | `createdAt`             |

### Fields & validation

None. The console has no inputs, no forms and no mutations.

### Copy deck

The console is operator-facing and its copy is English, not the guest-facing Spanish of the
public invitation.

| Key                    | Copy                                                                             | Source                                   |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| Header chip            | `Admin`                                                                          | `src/app/(dashboard)/admin/page.tsx:60`  |
| Events heading         | `All Events`                                                                     | `src/app/(dashboard)/admin/page.tsx:70`  |
| Events count           | `{n} event` / `{n} events in the system`                                         | `src/app/(dashboard)/admin/page.tsx:74`  |
| Events loading         | `Loading events…`                                                                | `src/app/(dashboard)/admin/page.tsx:79`  |
| Events empty title     | `No events yet`                                                                  | `src/app/(dashboard)/admin/page.tsx:82`  |
| Events empty body      | `No one has created an event in the system.`                                     | `src/app/(dashboard)/admin/page.tsx:83`  |
| Events columns         | `Event` · `ID` · `Owner` · `Guests` · `Invitations` · `Custom domain` · `Status` | `src/app/(dashboard)/admin/page.tsx:91`  |
| Row action             | `Open`                                                                           | `src/app/(dashboard)/admin/page.tsx:154` |
| Users heading          | `All Users`                                                                      | `src/app/(dashboard)/admin/page.tsx:169` |
| Users count            | `{n} user` / `{n} users`                                                         | `src/app/(dashboard)/admin/page.tsx:173` |
| Users loading          | `Loading users…`                                                                 | `src/app/(dashboard)/admin/page.tsx:178` |
| Users empty title      | `No users yet`                                                                   | `src/app/(dashboard)/admin/page.tsx:180` |
| Users empty body       | `No users found.`                                                                | `src/app/(dashboard)/admin/page.tsx:180` |
| Users columns          | `Name` · `Email` · `Role` · `Joined`                                             | `src/app/(dashboard)/admin/page.tsx:186` |
| Page-level loading     | `Loading…`                                                                       | `src/app/(dashboard)/admin/page.tsx:46`  |
| Count-line placeholder | `Loading…`                                                                       | `src/app/(dashboard)/admin/page.tsx:73`  |

## 8. Data Model

The console writes nothing. Schema detail lives in [`AGENTS.md`](../../../AGENTS.MD).

| Table         | Fields                                                                 | Read / Write                                                   | Index                                                                          |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `events`      | `_id`, `name`, `slug`, `status`, `date`, `ownerUserId`, `customDomain` | Read                                                           | none — full-table `.take(200)`                                                 |
| `users`       | `_id`, `email`, `firstName`, `lastName`, `role`, `_creationTime`       | Read (both as the owner lookup by id and as the users listing) | none for the listing — full-table `.take(500)`; owner resolved by `ctx.db.get` |
| `invitations` | counted only                                                           | Read                                                           | `by_eventId`, `.take(1000)`                                                    |
| `guests`      | counted only                                                           | Read                                                           | `by_eventId`, `.take(1000)`                                                    |

**Counting behavior.** `guestCount` and `invitationCount` are not stored counters. Each event
row triggers two index scans that materialize up to 1000 documents each and take their
`.length` — the same pattern used by `events.getEventSummary` and `dashboard.getOverviewStats`.
Read cost for one page load is therefore proportional to (number of events) × (their guest and
invitation rows), and any event holding more than 1000 guests or 1000 invitations reports 1000
rather than its true count. See `TODO-15-02` and `TODO-15-03`.

**Cascades.** None. There is no lifecycle side effect anywhere in this feature.

## 9. Backend Contract

| Function                   | Type  | Args | Returns                                                                                                                                                                                              | Guard                                      | Caps                                                                              |
| -------------------------- | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `api.admin.listAllEvents`  | query | `{}` | `Array<{_id, name, slug, status, date: number \| null, ownerName: string \| null, ownerEmail: string \| null, guestCount, invitationCount, hasCustomDomain: boolean, customDomain: string \| null}>` | `requireSuperadmin(ctx)`                   | `.take(200)` events; per event `.take(1000)` invitations and `.take(1000)` guests |
| `api.admin.listAllUsers`   | query | `{}` | `Array<{_id, email, firstName: string \| null, lastName: string \| null, role: string, createdAt: number}>`                                                                                          | `requireSuperadmin(ctx)`                   | `.take(500)` users                                                                |
| `api.users.getCurrentUser` | query | `{}` | the caller's `users` doc or `null`                                                                                                                                                                   | none — returns `null` when unauthenticated | —                                                                                 |

`ownerName` is `[firstName, lastName]` filtered for truthiness and joined with a space, or
`null` when that produces an empty string. `createdAt` is the user's `_creationTime`, renamed.

## 10. Business Rules

- **BR-15-F01-01** `[AS-BUILT]` — `admin.listAllEvents` returns rows only to a caller whose
  `users.role` is `"superadmin"`; every other authenticated caller receives
  `ConvexError("Unauthorized")`.
- **BR-15-F01-02** `[AS-BUILT]` — `admin.listAllUsers` applies the identical guard.
- **BR-15-F01-03** `[AS-BUILT]` — `requireSuperadmin` authenticates first: an unauthenticated
  caller fails at `requireUser` with `ConvexError("Unauthorized")`, and an authenticated caller
  with no `users` row fails with `ConvexError("User not found")`.
- **BR-15-F01-04** `[AS-BUILT]` — `admin.listAllEvents` returns at most 200 events.
- **BR-15-F01-05** `[AS-BUILT]` — `admin.listAllUsers` returns at most 500 users.
- **BR-15-F01-06** `[AS-BUILT]` — Each event's `guestCount` is the length of at most 1000
  `guests` rows read through `by_eventId`, and `invitationCount` the length of at most 1000
  `invitations` rows read the same way.
- **BR-15-F01-07** `[AS-BUILT]` — `hasCustomDomain` is `Boolean(event.customDomain)`; it does
  **not** consult `customDomainVerified`, so a claimed-but-unverified domain still shows as
  present.
- **BR-15-F01-08** `[AS-BUILT]` — `ownerName` is `null`, and the cell renders `"—"`, when the
  owner document is missing or has neither a first nor a last name.
- **BR-15-F01-09** `[AS-BUILT]` — The console lists **all** events regardless of `status`,
  including `archived` ones; status is displayed, never used as a filter.
- **BR-15-F01-10** `[AS-BUILT]` — An authenticated non-superadmin who opens `/admin` is
  client-redirected to `/dashboard`, and the console's two queries are passed `"skip"` so they
  are never issued.
- **BR-15-F01-11** `[AS-BUILT]` — While `currentUser` is unresolved, or for any
  non-superadmin, the page body is a centered `LoadingState` — no partial table is ever
  rendered to a non-superadmin.
- **BR-15-F01-12** `[AS-BUILT]` — An authenticated Superadmin who opens `/dashboard` is
  client-redirected to `/admin`.
- **BR-15-F01-13** `[AS-BUILT]` — Inside an event, the sidebar wordmark links to `/admin` for
  a Superadmin and `/dashboard` for every other role.
- **BR-15-F01-14** `[AS-BUILT]` — `/admin` is not listed in `isPublicRoute`, so an
  unauthenticated request is redirected to `/` by middleware before the page renders.
- **BR-15-F01-15** `[AS-BUILT]` — The console performs no mutation: it exposes no control that
  writes to any table.
- **BR-15-F01-17** `[AS-BUILT]` — Each table renders a footer stating how many rows it holds
  and, once the row count reaches the query's scan cap (200 events / 500 users), that the list
  is capped and more may exist. The caps themselves are unchanged. _(Added in 1.1.0 —
  TODO-15-01.)_
- **BR-15-F01-18** `[AS-BUILT]` — Both tables render inside `DataTableShell`, which owns the
  horizontal scroll container and the sticky header. _(Added in 1.1.0 — TODO-15-06.)_
- **BR-15-F01-16** `[AS-BUILT]` — The users table renders `users.role` verbatim as a badge,
  amber for `"superadmin"` and grey for any other value, with no control to change it.

## 11. Acceptance Criteria

- **AC-15-F01-01** — **Given** a signed-in user whose `users.role` is `"user"` **When** they
  call `api.admin.listAllEvents` directly **Then** the call rejects with `Unauthorized` and no
  event data is returned. _(BR-15-F01-01)_
- **AC-15-F01-02** — **Given** the same user **When** they call `api.admin.listAllUsers`
  **Then** the call rejects with `Unauthorized`. _(BR-15-F01-02)_
- **AC-15-F01-03** — **Given** an unauthenticated caller **When** either admin query is
  invoked **Then** it rejects with `Unauthorized` without reading any table. _(BR-15-F01-03)_
- **AC-15-F01-04** — **Given** 250 events exist **When** a Superadmin loads `/admin` **Then**
  exactly 200 rows render and the count line reads `200 events in the system`.
  _(BR-15-F01-04, TODO-15-01)_
- **AC-15-F01-05** — **Given** 600 users exist **When** a Superadmin loads `/admin` **Then**
  exactly 500 rows render in the users table. _(BR-15-F01-05)_
- **AC-15-F01-06** — **Given** an event with 12 guests and 5 invitations **When** a Superadmin
  loads `/admin` **Then** its row shows `12` under Guests and `5` under Invitations.
  _(BR-15-F01-06)_
- **AC-15-F01-07** — **Given** an event whose `customDomain` is set but whose
  `customDomainVerified` is `false` **When** a Superadmin loads `/admin` **Then** the Custom
  domain cell shows the check icon and the domain string. _(BR-15-F01-07)_
- **AC-15-F01-08** — **Given** an event whose owner has no first or last name **When** a
  Superadmin loads `/admin` **Then** the Owner cell shows `—` above the owner's email.
  _(BR-15-F01-08)_
- **AC-15-F01-09** — **Given** an archived event **When** a Superadmin loads `/admin` **Then**
  it appears in the table with an archived status badge. _(BR-15-F01-09)_
- **AC-15-F01-10** — **Given** a signed-in Editor **When** they navigate to `/admin` **Then**
  they see a `Loading…` spinner, are redirected to `/dashboard`, and no admin query appears in
  the network trace. _(BR-15-F01-10, BR-15-F01-11)_
- **AC-15-F01-11** — **Given** a signed-in Superadmin **When** they navigate to `/dashboard`
  **Then** they are redirected to `/admin`. _(BR-15-F01-12)_
- **AC-15-F01-12** — **Given** a Superadmin viewing any event dashboard **When** they click
  the "Wedboard" wordmark **Then** they land on `/admin`, whereas an Owner doing the same
  lands on `/dashboard`. _(BR-15-F01-13)_
- **AC-15-F01-13** — **Given** a signed-out visitor **When** they request `/admin` **Then**
  they are redirected to `/`. _(BR-15-F01-14)_
- **AC-15-F01-14** — **Given** a Superadmin on `/admin` **When** they click an event's "Open"
  link **Then** they land on `/dashboard/{slug}` with full host access to that event.
  _(BR-15-F01-15, and the bypass rules in [F02](./F02-superadmin-provisioning.md))_
- **AC-15-F01-15** — **Given** zero events on the platform **When** a Superadmin loads
  `/admin` **Then** the events section shows `No events yet` /
  `No one has created an event in the system.`

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                |
| ------------ | ----------- | --------------------------------------------------------------------------------------- |
| TC-15-F01-01 | unit        | `requireSuperadmin` returns the user doc for `role: "superadmin"`                       |
| TC-15-F01-02 | unit        | `requireSuperadmin` throws `Unauthorized` for `role: "user"`                            |
| TC-15-F01-03 | unit        | `requireSuperadmin` throws `Unauthorized` when unauthenticated                          |
| TC-15-F01-04 | unit        | `ownerName` composition: both names, first only, last only, neither → `null`            |
| TC-15-F01-05 | integration | `listAllEvents` as a superadmin returns one row per event with correct counts           |
| TC-15-F01-06 | integration | `listAllEvents` truncates to 200 with 201 events seeded                                 |
| TC-15-F01-07 | integration | `listAllUsers` truncates to 500 with 501 users seeded                                   |
| TC-15-F01-08 | integration | `listAllEvents` reports `hasCustomDomain: true` for an unverified claimed domain        |
| TC-15-F01-09 | integration | An archived event appears in `listAllEvents`                                            |
| TC-15-F01-10 | integration | `listAllEvents` rejects for a non-superadmin                                            |
| TC-15-F01-11 | e2e         | Superadmin signs in → is redirected from `/dashboard` to `/admin` → both tables render  |
| TC-15-F01-12 | e2e         | Editor navigates to `/admin` → is redirected to `/dashboard` with no admin query issued |
| TC-15-F01-13 | e2e         | Signed-out request to `/admin` redirects to `/`                                         |
| TC-15-F01-14 | e2e         | Superadmin clicks "Open" on a foreign event and reaches its dashboard                   |
| TC-15-F01-15 | e2e         | Copying an event id from the ID column places the full id on the clipboard              |

### Manual QA checklist

- [ ] Sign in as a Superadmin and confirm the amber `Admin` chip renders beside the wordmark
- [ ] Confirm the events count line pluralizes correctly at 0, 1 and many
- [ ] Confirm the users count line pluralizes correctly at 1 and many
- [ ] Confirm an event with no custom domain shows the grey minus, not an empty cell
- [ ] Confirm `Joined` renders as e.g. `Mar 4, 2026`
- [ ] Confirm the superadmin's own account shows an amber `superadmin` role badge
- [ ] Sign in as an Editor, navigate to `/admin`, and confirm no admin data flashes before the
      redirect
- [ ] Confirm the console renders acceptably at 1280px and that both tables scroll horizontally below it
- [ ] With fewer than 200 events, confirm the footer states the count without a cap warning

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Hard ceiling of **200 events** and **500 users** per page load; per-event counts saturate at **1000** guests and **1000** invitations. All four are silent — no pagination control, no total count, no truncation notice                                                                                               |
| Performance      | One page load issues `1 + 2N` database reads for N events, materializing up to 1000 documents per count. At the 200-event ceiling this is up to 400,000 documents read per subscription update. Because both are live Convex queries, any write to any event's guests or invitations re-runs the subscription          |
| Security & authz | `requireSuperadmin` on both queries is the enforcing gate. The `/admin` client redirect and the `"skip"` query argument are convenience only and must never be relied on. There is **no** middleware rule and **no** server-component guard for `/admin`; the route is protected only as a generic authenticated route |
| Accessibility    | Tables use semantic `<table>` markup via the shadcn primitives. The custom-domain and "Open" cells convey state through icons; the copy control is rendered with `label=""`, leaving it without a visible text label                                                                                                   |
| i18n             | English only. This surface is operator-facing and is deliberately not part of the Spanish guest-facing copy deck                                                                                                                                                                                                       |
| Analytics        | None. No event is emitted when a Superadmin views the console or opens a customer's event                                                                                                                                                                                                                              |

## 14. TODOs & Open Questions

- **TODO-15-02** `[P1]` `[CHANGE]` — Per-event counts are computed by materializing rows.
  - **Rationale:** `by_eventId.take(1000).length` runs twice per event on every page load and
    on every reactive re-run, so console cost grows with total platform data rather than with
    what is displayed. This is already flagged in the source comment as something to revisit.
  - **Evidence:** `convex/admin.ts:23`, `convex/admin.ts:27`
  - **Proposed rule:** guest and invitation counts on the admin console are read from
    denormalized counters maintained on the event document, not recomputed per page load.
- **TODO-15-03** `[P2]` `[CHANGE]` — Counts saturate at 1000 without any indication.
  - **Rationale:** an event with 1400 guests reports `1000`, which reads as a real number.
  - **Evidence:** `convex/admin.ts:30`
  - **Proposed rule:** a saturated count renders as `1000+`, or is replaced by an exact
    denormalized counter per TODO-15-02.
- **TODO-15-04** `[P1]` `[ADD]` — `/admin` has no server-side route guard.
  - **Rationale:** the only thing stopping a non-superadmin from _rendering_ the console shell
    is a `useEffect` in a client component. Data is safe — the queries are skipped and would
    reject anyway — but the protection depends on client JavaScript behaving, and the route is
    indistinguishable from any authenticated route to middleware.
  - **Evidence:** `src/app/(dashboard)/admin/page.tsx:32`; `src/middleware.ts:4` lists no
    `/admin` rule; there is no `layout.tsx` in `src/app/(dashboard)/admin/`
  - **Proposed rule:** `/admin` is guarded server-side (middleware or a server component that
    resolves the caller's role) and returns 404 or redirects before any admin markup is sent.
- **TODO-15-05** `[P1]` `[ADD]` — The console offers no administrative action.
  - **Rationale:** an operator can see a problem but can do nothing about it from the console.
    There is no impersonation, no suspend/reactivate for a user or event, no delete, no role
    management, no way to transfer an event's owner, and no search or filter on either table.
    Every remediation requires opening the customer's event and acting as if they were the
    owner, which is both indirect and unattributable.
  - **Evidence:** `convex/admin.ts` exports two queries and no mutation;
    `src/app/(dashboard)/admin/page.tsx` renders no form or button that writes
  - **Proposed rule:** decide the minimum operator action set (suspend a user, archive an
    event, grant/revoke superadmin) and expose each as an explicitly audited mutation.
- **TODO-15-07** `[P2]` `[ADD]` — The console cannot be reached from anywhere other than the
  logo or a typed URL while a Superadmin is inside an event.
  - **Rationale:** the sidebar has no `/admin` entry, so the way back to the platform view is
    undiscoverable unless the operator already knows the wordmark is a link.
  - **Evidence:** `src/components/dashboard/dashboard-sidebar.tsx:88` is the only affordance
  - **Proposed rule:** a Superadmin viewing an event sees an explicit, labeled link back to the
    admin console.

### Open questions

- **Q1** — Should the console show an event's `date` (already returned by the query but never
  rendered) so operators can distinguish upcoming from past events?
- **Q2** — When a Superadmin opens a customer's event, should the UI display a persistent
  banner making the elevated context obvious, both to prevent accidental edits and to make the
  session self-evident in a screen share?
- **Q3** — Should `listAllUsers` also report how many events each user owns, so an operator can
  spot the account behind an event without cross-referencing tables?

## 15. Traceability

| Concern                                          | Source                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| Route (page component)                           | `src/app/(dashboard)/admin/page.tsx:26`             |
| Superadmin detection                             | `src/app/(dashboard)/admin/page.tsx:30`             |
| Non-superadmin client redirect                   | `src/app/(dashboard)/admin/page.tsx:32`             |
| Query subscriptions (with `"skip"`)              | `src/app/(dashboard)/admin/page.tsx:39`             |
| Loading gate                                     | `src/app/(dashboard)/admin/page.tsx:42`             |
| Events table markup                              | `src/app/(dashboard)/admin/page.tsx:86`             |
| Users table markup                               | `src/app/(dashboard)/admin/page.tsx:182`            |
| Superadmin → `/admin` redirect                   | `src/app/(dashboard)/dashboard/page.tsx:26`         |
| Sidebar home link target                         | `src/components/dashboard/dashboard-sidebar.tsx:88` |
| Auth gating of the route group                   | `src/app/(dashboard)/layout.tsx:17`                 |
| Middleware public-route list (no `/admin` entry) | `src/middleware.ts:4`                               |
| Middleware authenticated-route redirect          | `src/middleware.ts:44`                              |
| Backend — all events                             | `convex/admin.ts:12`                                |
| Backend — events cap                             | `convex/admin.ts:17`                                |
| Backend — per-event counting                     | `convex/admin.ts:23`                                |
| Backend — all users                              | `convex/admin.ts:55`                                |
| Backend — users cap                              | `convex/admin.ts:60`                                |
| Guard                                            | `convex/lib/permissions.ts:95`                      |
| Authentication under the guard                   | `convex/lib/auth.ts:15`                             |
| Global role field                                | `convex/schema.ts:22`                               |
| Validation                                       | None — the console has no inputs                    |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                                                     |
| ------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-15-01 and TODO-15-06 closed.** Both tables render inside `DataTableShell` (horizontal scroll + sticky header) and each carries a footer disclosing the scan cap. Added BR-15-F01-14 |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                                                                                                             |
