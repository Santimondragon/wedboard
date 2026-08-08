---
id: EP-15-F02
title: Superadmin Provisioning
epic: EP-15 Platform Administration
version: 1.0.0
status: partial
last_updated: 2026-07-27
depends_on: []
---

# EP-15-F02 — Superadmin Provisioning

## 1. Summary

Superadmin is the platform's only global role, and this feature is how it is granted and what
it unlocks. A platform operator adds an email address to the `SUPERADMIN_EMAILS` Convex
environment variable; the next time that person signs in, the login-time user upsert notices
the match and writes `role: "superadmin"` onto their user record. From that moment they pass
every event-scoped permission guard in the product — they can open, read and modify any
customer's event as though they owned it — and they land on the [Admin
Console](./F01-admin-console.md) instead of their own events list.

There is no in-app grant flow, no invitation, and — importantly — no revocation. The grant is
one-directional: removing the email from the environment variable does not take the role back.
This makes the role a production credential rather than a product feature, and the spec treats
it as one.

## 2. Actors & Permissions

| Actor                 | Access             | Notes                                                                                                             |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Owner                 | None               | Cannot grant, see, or revoke the global role                                                                      |
| Co-owner (`planner`)  | None               | Same                                                                                                              |
| Editor                | None               | Same                                                                                                              |
| Viewer                | None               | Same                                                                                                              |
| Public guest          | None               | Never authenticated                                                                                               |
| **Superadmin**        | Holder of the role | Can _observe_ who else holds it via the Admin Console users table, but cannot grant or revoke it from the product |
| **Platform operator** | Grants the role    | Acts outside the product, via `npx convex env set SUPERADMIN_EMAILS …`                                            |

The role's _effect_ is defined in [roles-and-permissions.md](../../roles-and-permissions.md)
§2–§3 and is not restated here. The specific gates this feature governs are the superadmin
early-returns in `requireEventAccess`, `requireEventMember` and `getEventRole`, and the
positive check in `requireSuperadmin`.

## 3. User Stories

- **US-15-F02-01** — As a platform operator, I want to grant the superadmin role by listing an
  email in configuration so that no manual database mutation or internal function call is
  needed.
- **US-15-F02-02** — As a newly-listed operator, I want the role applied automatically on my
  next sign-in so that granting it requires no further step.
- **US-15-F02-03** — As a Superadmin, I want to open any customer's event dashboard so that I
  can reproduce and diagnose what they are reporting.
- **US-15-F02-04** — As a Superadmin, I want to land on the Admin Console after signing in so
  that the platform view, not my personal events, is my default context.
- **US-15-F02-05** — As a platform operator, I want to see which accounts currently hold the
  role so that I can audit the grant list.
- **US-15-F02-06** _(not satisfied — see TODO-15-08)_ — As a platform operator, I want to
  revoke the role from an account that no longer needs it.

## 4. Entry Points

| Entry point           | Route / control                                                                                                       | Actor              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Grant                 | `npx convex env set SUPERADMIN_EMAILS "a@x.com,b@y.com"` — Convex deployment configuration, outside the app           | Platform operator  |
| Application           | `UserSync` calls `api.users.upsertCurrentUser` on every dashboard mount (`src/components/dashboard/user-sync.tsx:11`) | Any signed-in user |
| Observation           | The Admin Console users table renders each account's `role` (`/admin`)                                                | Superadmin         |
| Effect — landing      | `/dashboard` client-redirects a Superadmin to `/admin`                                                                | Superadmin         |
| Effect — event access | Any `/dashboard/{eventSlug}/*` route for any event on the platform                                                    | Superadmin         |

There is deliberately no UI entry point for granting or revoking.

## 5. UX Flow

### Happy path — granting

1. A platform operator adds an email to the `SUPERADMIN_EMAILS` Convex environment variable.
   The value is a comma-separated list.
2. The named person signs in through Clerk and reaches the `(dashboard)` route group, which
   mounts `UserSync` inside `<Authenticated>` (`src/app/(dashboard)/layout.tsx:26`).
3. `UserSync` calls `api.users.upsertCurrentUser`.
4. The mutation resolves the caller's email as `identity.email ?? existing?.email ?? ""` and
   passes it to `isSuperadminEmail`, which lowercases and trims both sides of the comparison
   (`convex/users.ts:9`).
5. **Existing account** — the mutation patches `email`, `firstName` and `lastName`, and
   additionally sets `role: "superadmin"` only when the email matched _and_ the stored role is
   not already `"superadmin"` (`convex/users.ts:61`).
   **New account** — the row is inserted with `role: promote ? "superadmin" : "user"`
   (`convex/users.ts:74`).
6. The client's `api.users.getCurrentUser` subscription re-runs with the new role, the
   `/dashboard` page sees `isSuperadmin` become true, and it redirects to `/admin`.

### Happy path — using the role

1. From `/admin`, the Superadmin opens `/dashboard/{slug}` for any event.
2. `EventProvider` resolves the slug through `events.getEventBySlug`, which calls
   `getEventRole` (`convex/events.ts:60`); the superadmin branch returns `"owner"`, so the
   payload's `myRole` is `"owner"` (`convex/lib/permissions.ts:72`).
3. The sidebar's `NAV_ITEMS` filter with `hasMinRole("owner", …)` passes for every link, so the
   Superadmin sees the complete navigation including Members and Settings.
4. Every page's Convex query runs its usual `requireEventEditor`, which delegates to
   `requireEventMember`, which early-returns for the superadmin role
   (`convex/lib/permissions.ts:118`) — so all content loads.

### Alternate & edge paths

- **A1** — The email is added to `SUPERADMIN_EMAILS` while the person is already signed in →
  nothing changes until `upsertCurrentUser` runs again. In practice that is the next dashboard
  mount or page reload, not the next request.
- **A2** — The listed email does not yet have an account → no user row exists to promote.
  The role is applied at the moment they first sign in, on the insert path.
- **A3** — The email is listed with different capitalization or surrounding whitespace → it
  still matches; both sides are trimmed and lowercased.
- **A4** — `SUPERADMIN_EMAILS` is unset or empty → `isSuperadminEmail` returns `false` for
  everyone and no account is promoted.
- **A5** — A Clerk identity carries no email and no prior user row exists → the resolved email
  is the empty string, which the guard rejects before consulting the list, so no promotion
  occurs.
- **A6** — The email is **removed** from `SUPERADMIN_EMAILS` → the existing superadmin keeps
  the role indefinitely. The patch only ever adds the role; it never writes `role: "user"`.
  There is no product surface that can undo it. See `TODO-15-08`.
- **A7** — A Superadmin browses a customer's event → nothing in the UI marks the session as
  elevated. The event looks exactly as it does to its owner. See `TODO-15-10`.
- **A8** — A Superadmin _writes_ inside a customer's event (edits a guest, changes the
  template) → the change is recorded in that event's `activityLogs` under the superadmin's own
  name, because `logActivity` denormalizes the acting user. Reads leave no trace at all. See
  `TODO-15-09`.
- **A9** — A Superadmin owns their own events → `/dashboard` redirects them to `/admin`, so
  there is no route that lists only their own events. They reach them through the console's
  all-events table. See `TODO-15-12`.

## 6. States

| State             | Behavior                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | While `api.users.getCurrentUser` is `undefined`, both `/dashboard` and `/admin` render a centered `LoadingState` with `"Loading…"`, so the role is never assumed before it is known |
| Empty             | Not applicable — every authenticated user has exactly one role value                                                                                                                |
| Error             | `upsertCurrentUser` throws `ConvexError("Unauthorized")` when called without a Clerk identity; `UserSync` does not surface this                                                     |
| Success           | `users.role` is `"superadmin"`; the console is reachable and every event guard passes                                                                                               |
| Disabled / locked | The role is permanently locked once granted — no product control writes it back to `"user"`                                                                                         |
| Mobile            | No dedicated behavior; provisioning has no UI                                                                                                                                       |

## 7. UI Specification

### Screens & components

| Element                   | Component                 | Path                                                |
| ------------------------- | ------------------------- | --------------------------------------------------- |
| Login-time upsert trigger | `UserSync`                | `src/components/dashboard/user-sync.tsx:7`          |
| Auth gate that mounts it  | `DashboardLayout`         | `src/app/(dashboard)/layout.tsx:25`                 |
| Role observation          | Admin Console users table | `src/app/(dashboard)/admin/page.tsx:203`            |
| Landing redirect          | `DashboardPage` effect    | `src/app/(dashboard)/dashboard/page.tsx:26`         |
| Home-link retarget        | `DashboardSidebar`        | `src/components/dashboard/dashboard-sidebar.tsx:88` |
| Client role mirror        | `hasMinRole`              | `src/lib/roles.ts:14`                               |

### Fields & validation

| Field                            | Type                   | Required | Rule                                                                   | Message                              |
| -------------------------------- | ---------------------- | -------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `SUPERADMIN_EMAILS` (Convex env) | comma-separated string | No       | Split on `,`, each entry trimmed and lowercased, empty entries dropped | None — configuration error is silent |
| `users.role`                     | `v.string()`           | Yes      | Schema imposes no union; the product uses `"user"` and `"superadmin"`  | None                                 |

`users.role` is a bare `v.string()` in the schema (`convex/schema.ts:22`), not a union — any
value other than `"superadmin"` behaves as a normal user.

### Copy deck

None. This feature exposes no user-facing copy of its own; the only string it influences is the
role badge text on the Admin Console, which renders the stored value verbatim.

## 8. Data Model

| Table          | Fields                                                         | Read / Write                                                                         | Index                                                            |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `users`        | `role`                                                         | Write (promotion), Read (every guard)                                                | `by_tokenIdentifier` for the upsert lookup and for `requireUser` |
| `users`        | `clerkId`, `tokenIdentifier`, `email`, `firstName`, `lastName` | Write on upsert                                                                      | `by_tokenIdentifier`                                             |
| `events`       | `ownerUserId`                                                  | Read — skipped for superadmins, whose bypass returns before the ownership comparison | —                                                                |
| `eventMembers` | `role`                                                         | Read — skipped for superadmins, whose bypass returns before the membership lookup    | `by_eventId_and_userId`                                          |

**Lifecycle.** The role is written in exactly two places, both on the login path, and both
promote-only: `users.upsertCurrentUser` and `users.ensureCurrentUser`. No mutation anywhere in
`convex/` writes `role: "user"` over an existing `"superadmin"`, and no mutation accepts a role
as an argument. The role therefore has a grant transition and no other transition.

`ensureCurrentUser` is an `internalMutation` carrying a byte-for-byte duplicate of the upsert
logic and is not referenced anywhere in `convex/` or `src/`. See `TODO-15-11`.

## 9. Backend Contract

| Function                           | Type             | Args | Returns                            | Guard                                                                     | Caps     |
| ---------------------------------- | ---------------- | ---- | ---------------------------------- | ------------------------------------------------------------------------- | -------- |
| `api.users.upsertCurrentUser`      | mutation         | `{}` | `Id<"users">`                      | Requires a Clerk identity; throws `ConvexError("Unauthorized")` otherwise | —        |
| `internal.users.ensureCurrentUser` | internalMutation | `{}` | `Id<"users">`                      | Same                                                                      | Uncalled |
| `api.users.getCurrentUser`         | query            | `{}` | the caller's `users` doc or `null` | None — returns `null` when unauthenticated                                | —        |

Internal helpers (not Convex functions):

| Helper                                               | Path                            | Behavior                                                                                                        |
| ---------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `isSuperadminEmail(email)`                           | `convex/users.ts:9`             | `true` when the non-empty email appears, case-insensitively, in the trimmed `SUPERADMIN_EMAILS` list            |
| `requireSuperadmin(ctx)`                             | `convex/lib/permissions.ts:95`  | `requireUser` then throws `ConvexError("Unauthorized")` unless the role is `"superadmin"`; returns the user doc |
| `requireEventAccess(ctx, eventId, userId)`           | `convex/lib/permissions.ts:15`  | Early-returns for a superadmin before the ownership and membership checks                                       |
| `requireEventMember(ctx, eventId, userId, minRole?)` | `convex/lib/permissions.ts:105` | Early-returns for a superadmin before the rank comparison                                                       |
| `getEventRole(ctx, eventId, userId)`                 | `convex/lib/permissions.ts:66`  | Returns `"owner"` for a superadmin without loading the event                                                    |

## 10. Business Rules

- **BR-15-F02-01** `[AS-BUILT]` — A user is promoted to `role: "superadmin"` when the email
  resolved during `upsertCurrentUser` appears in the `SUPERADMIN_EMAILS` Convex environment
  variable.
- **BR-15-F02-02** `[AS-BUILT]` — The comparison is case-insensitive and ignores whitespace
  around each list entry; empty entries are discarded.
- **BR-15-F02-03** `[AS-BUILT]` — An empty string email never matches, regardless of the list
  contents.
- **BR-15-F02-04** `[AS-BUILT]` — Promotion is evaluated on **both** the insert and the update
  path, so a listed email is promoted whether or not the account already exists.
- **BR-15-F02-05** `[AS-BUILT]` — Promotion is **promote-only**: the update path writes the
  role only when the email matches and the stored role is not already `"superadmin"`, and never
  writes any other role value over it.
- **BR-15-F02-06** `[AS-BUILT]` — No Convex function accepts a role as an argument, so the
  global role cannot be set by a client request.
- **BR-15-F02-07** `[AS-BUILT]` — The role is evaluated at login time only; a change to
  `SUPERADMIN_EMAILS` takes effect on the affected user's next `upsertCurrentUser` call.
- **BR-15-F02-08** `[AS-BUILT]` — A superadmin passes `requireEventAccess` for every event,
  including events they neither own nor hold an `eventMembers` row on.
- **BR-15-F02-09** `[AS-BUILT]` — A superadmin passes `requireEventMember` at every `minRole`,
  including `"owner"`, so owner-only operations such as archiving and deleting an event are
  available to them on any event.
- **BR-15-F02-10** `[AS-BUILT]` — `getEventRole` resolves a superadmin to `"owner"` for every
  event, so `events.getEventBySlug` returns `myRole: "owner"` and the client renders the full
  owner-level UI.
- **BR-15-F02-11** `[AS-BUILT]` — `requireSuperadmin` is the only guard that _requires_ the
  role; it authenticates first and throws `Unauthorized` for any other role value.
- **BR-15-F02-12** `[AS-BUILT]` — A superadmin who lands on `/dashboard` is client-redirected
  to `/admin`.
- **BR-15-F02-13** `[AS-BUILT]` — Inside an event, the sidebar wordmark links a superadmin to
  `/admin` rather than `/dashboard`.
- **BR-15-F02-14** `[AS-BUILT]` — Writes a superadmin performs inside an event are recorded in
  that event's `activityLogs` under their own denormalized name, on the same terms as any other
  actor.

## 11. Acceptance Criteria

- **AC-15-F02-01** — **Given** `SUPERADMIN_EMAILS` contains `ops@example.com` **When** an
  account with that email signs in for the first time **Then** its `users` row is inserted with
  `role: "superadmin"`. _(BR-15-F02-01, BR-15-F02-04)_
- **AC-15-F02-02** — **Given** an existing account with `role: "user"` whose email is added to
  the list **When** they next load the dashboard **Then** `upsertCurrentUser` patches the row to
  `role: "superadmin"`. _(BR-15-F02-04)_
- **AC-15-F02-03** — **Given** `SUPERADMIN_EMAILS` is `OPS@Example.com ,` **When**
  `ops@example.com` signs in **Then** they are promoted. _(BR-15-F02-02)_
- **AC-15-F02-04** — **Given** a Clerk identity with no email and no prior user row **When**
  `upsertCurrentUser` runs **Then** the row is inserted with `role: "user"`.
  _(BR-15-F02-03)_
- **AC-15-F02-05** — **Given** an account already holding `role: "superadmin"` **When** its
  email is removed from `SUPERADMIN_EMAILS` and it signs in again **Then** the role is still
  `"superadmin"`. _(BR-15-F02-05, TODO-15-08)_
- **AC-15-F02-06** — **Given** `SUPERADMIN_EMAILS` is unset **When** any account signs in
  **Then** it holds `role: "user"`. _(BR-15-F02-01)_
- **AC-15-F02-07** — **Given** a superadmin **When** they call any event-scoped query for an
  event they have no membership row on **Then** the query returns data rather than throwing.
  _(BR-15-F02-08)_
- **AC-15-F02-08** — **Given** a superadmin **When** they invoke `events.deleteEvent` on an
  event owned by someone else **Then** the owner-level guard passes. _(BR-15-F02-09)_
- **AC-15-F02-09** — **Given** a superadmin **When** they load `/dashboard/{foreign-slug}`
  **Then** `myRole` is `"owner"` and the sidebar shows every nav item including Members and
  Settings. _(BR-15-F02-10)_
- **AC-15-F02-10** — **Given** an account with `role: "user"` **When** it calls a function
  guarded by `requireSuperadmin` **Then** the call throws `Unauthorized`. _(BR-15-F02-11)_
- **AC-15-F02-11** — **Given** a superadmin **When** they sign in and reach `/dashboard`
  **Then** they are redirected to `/admin`. _(BR-15-F02-12)_
- **AC-15-F02-12** — **Given** a superadmin viewing a foreign event **When** they click the
  wordmark **Then** they land on `/admin`. _(BR-15-F02-13)_
- **AC-15-F02-13** — **Given** a superadmin **When** they edit a guest in a foreign event
  **Then** that event's Activity page shows the change attributed to the superadmin's name.
  _(BR-15-F02-14)_
- **AC-15-F02-14** — **Given** a superadmin **When** they only _view_ a foreign event
  **Then** no `activityLogs` row is created and the owner has no signal that it happened.
  _(TODO-15-09)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                            |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| TC-15-F02-01 | unit        | `isSuperadminEmail` matches ignoring case and surrounding whitespace                                |
| TC-15-F02-02 | unit        | `isSuperadminEmail` returns `false` for the empty string even when the list contains an empty entry |
| TC-15-F02-03 | unit        | `isSuperadminEmail` returns `false` when `SUPERADMIN_EMAILS` is unset                               |
| TC-15-F02-04 | integration | `upsertCurrentUser` inserts a listed email with `role: "superadmin"`                                |
| TC-15-F02-05 | integration | `upsertCurrentUser` patches an existing `"user"` row to `"superadmin"` when the email is listed     |
| TC-15-F02-06 | integration | `upsertCurrentUser` leaves an existing `"superadmin"` unchanged when the email is no longer listed  |
| TC-15-F02-07 | integration | `upsertCurrentUser` does not downgrade an existing `"superadmin"` under any input                   |
| TC-15-F02-08 | integration | `requireEventAccess` resolves for a superadmin with no membership row                               |
| TC-15-F02-09 | integration | `requireEventMember(…, "owner")` resolves for a superadmin on a foreign event                       |
| TC-15-F02-10 | integration | `getEventRole` returns `"owner"` for a superadmin on a foreign event                                |
| TC-15-F02-11 | integration | `requireSuperadmin` throws for `role: "user"` and returns the doc for `"superadmin"`                |
| TC-15-F02-12 | e2e         | A newly listed operator signs in and lands on `/admin`                                              |
| TC-15-F02-13 | e2e         | A superadmin opens a foreign event and sees Members and Settings in the sidebar                     |
| TC-15-F02-14 | e2e         | A superadmin edits a foreign event's guest and the change appears on that event's Activity page     |

### Manual QA checklist

- [ ] Set `SUPERADMIN_EMAILS`, sign in with that email, and confirm the landing page is `/admin`
- [ ] Confirm the Admin Console users table shows the account with an amber `superadmin` badge
- [ ] Open a foreign event as the superadmin and confirm every sidebar item renders
- [ ] Confirm the Settings page renders the owner-only Delete card for the superadmin
- [ ] Remove the email from `SUPERADMIN_EMAILS`, sign out and back in, and confirm the role
      persists (expected today, and the subject of TODO-15-08)
- [ ] Confirm no banner or badge distinguishes a superadmin's view of a foreign event

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No limit on the number of listed emails; `SUPERADMIN_EMAILS` is a single Convex environment variable                                                                                                                                                                                                                                                                    |
| Performance      | Each guard's bypass costs one extra `ctx.db.get(userId)` on the user row, on every event-scoped call for every user, superadmin or not                                                                                                                                                                                                                                  |
| Security & authz | The role is the highest privilege in the system and is granted purely by deployment configuration. It cannot be set through any client-callable argument. Anyone with Convex deployment access can grant it; anyone holding it can read and modify every customer's data, including guest emails, phone numbers and allergies. It cannot be revoked through the product |
| Accessibility    | Not applicable — no UI                                                                                                                                                                                                                                                                                                                                                  |
| i18n             | Not applicable — no user-facing copy                                                                                                                                                                                                                                                                                                                                    |
| Analytics        | None. No event is emitted on promotion, and none on privileged access                                                                                                                                                                                                                                                                                                   |

## 14. TODOs & Open Questions

- **TODO-15-08** `[P1]` `[ADD]` — The superadmin role cannot be revoked.
  - **Rationale:** promotion is deliberately promote-only, so removing an email from
    `SUPERADMIN_EMAILS` has no effect on an account that already holds the role, and no
    mutation, console control or internal function exists to write it back to `"user"`. An
    operator who leaves the team keeps full read/write access to every customer's data until
    someone edits the database directly. This is the highest-consequence gap in the epic.
  - **Evidence:** `convex/users.ts:61`, `convex/users.ts:108`; no other write to `role` exists
    in `convex/`
  - **Proposed rule:** a user whose email is not in `SUPERADMIN_EMAILS` is demoted to
    `role: "user"` on their next `upsertCurrentUser`, making the environment variable the single
    source of truth in both directions — or, alternatively, an explicitly audited superadmin
    mutation revokes the role from the console.
- **TODO-15-09** `[P1]` `[ADD]` — There is no audit trail of superadmin access to a customer's
  event.
  - **Rationale:** the trust model grants unrestricted read access to every event's guest list,
    contact details, allergies and private messages. `activityLogs` captures writes only, is
    scoped to a single event, and is visible to that event's members rather than to the
    platform. Nothing anywhere records that a superadmin _opened_ an event, so neither the
    operator nor the customer can answer "who looked at this data, and when".
  - **Evidence:** `convex/lib/activity.ts` is invoked only from content mutations;
    `convex/lib/permissions.ts:26` and `:118` return silently
  - **Proposed rule:** every guard bypass taken on behalf of a superadmin records a
    platform-level access entry (`actor`, `eventId`, function name, timestamp) readable from the
    Admin Console and, ideally, surfaced to the event owner.
- **TODO-15-10** `[P2]` `[ADD]` — Nothing indicates that an event is being viewed with elevated
  privilege.
  - **Rationale:** a superadmin's view of a foreign event is pixel-identical to the owner's,
    which invites accidental edits to real customer data and makes the elevated context invisible
    during a screen share or handover.
  - **Evidence:** `convex/lib/permissions.ts:72` returns `"owner"`, and no component
    distinguishes a bypass-derived role from a real one
  - **Proposed rule:** `getEventBySlug` distinguishes a bypass-derived role from a genuine
    membership, and the dashboard shows a persistent banner while the caller is browsing an
    event they are not a member of.
- **TODO-15-11** `[P2]` `[REMOVE]` — `users.ensureCurrentUser` is unreferenced dead code.
  - **Rationale:** it duplicates the whole `upsertCurrentUser` body, including the promotion
    logic, and is called from nowhere in `convex/` or `src/`. Two copies of a
    privilege-granting code path is a maintenance hazard — a future fix applied to one and not
    the other silently diverges the promotion rule.
  - **Evidence:** `convex/users.ts:81`; the only occurrence of the identifier in the repository
    is its own definition
  - **Proposed rule:** delete it, or reduce both functions to a single shared helper.
- **TODO-15-12** `[P2]` `[CHANGE]` — A superadmin has no route that lists their own events.
  - **Rationale:** `/dashboard` unconditionally redirects them to `/admin`, so an operator who
    also hosts a real wedding must find their own event among every event on the platform.
  - **Evidence:** `src/app/(dashboard)/dashboard/page.tsx:26`
  - **Proposed rule:** the Admin Console distinguishes the superadmin's own events, or
    `/dashboard` remains reachable for them behind an explicit link.
- **TODO-15-13** `[P2]` `[CHANGE]` — `users.role` is an unconstrained `v.string()`.
  - **Rationale:** the schema does not restrict the field to the two values the product uses, so
    a typo written by any future code path degrades silently to non-superadmin rather than
    failing loudly.
  - **Evidence:** `convex/schema.ts:22`
  - **Proposed rule:** the field is `v.union(v.literal("user"), v.literal("superadmin"))`.

### Open questions

- **Q1** — Should demotion (TODO-15-08) be automatic from `SUPERADMIN_EMAILS`, or an explicit
  audited action? Automatic demotion makes a mistyped environment variable capable of locking
  every operator out of the console at once.
- **Q2** — Should the platform notify an event owner when a superadmin opens their event, or is
  an operator-side audit log sufficient for the trust model we intend?
- **Q3** — Should the superadmin bypass be scoped — for example read-only by default, with
  writes on a customer's event requiring an explicit, logged elevation step?
- **Q4** — Should `SUPERADMIN_EMAILS` continue to be the grant mechanism at all, or should the
  first superadmin bootstrap from configuration and subsequent ones be granted in-app?

## 15. Traceability

| Concern                                    | Source                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Env-var parsing and match                  | `convex/users.ts:9`                                                |
| `SUPERADMIN_EMAILS` read                   | `convex/users.ts:10`                                               |
| Promotion decision (upsert)                | `convex/users.ts:53`                                               |
| Promote-only patch (upsert)                | `convex/users.ts:61`                                               |
| Promotion on insert (upsert)               | `convex/users.ts:74`                                               |
| Duplicate promotion logic (internal)       | `convex/users.ts:81`, `convex/users.ts:108`, `convex/users.ts:121` |
| Global role field                          | `convex/schema.ts:22`                                              |
| Superadmin guard                           | `convex/lib/permissions.ts:95`                                     |
| Bypass in `requireEventAccess`             | `convex/lib/permissions.ts:26`                                     |
| Bypass in `requireEventMember`             | `convex/lib/permissions.ts:118`                                    |
| Effective role `"owner"` in `getEventRole` | `convex/lib/permissions.ts:72`                                     |
| Standard guard that inherits the bypass    | `convex/lib/permissions.ts:51`                                     |
| `myRole` surfaced to the client            | `convex/events.ts:60`                                              |
| Client role mirror                         | `src/lib/roles.ts:14`                                              |
| Login-time trigger                         | `src/components/dashboard/user-sync.tsx:11`                        |
| Auth gate mounting it                      | `src/app/(dashboard)/layout.tsx:25`                                |
| Landing redirect                           | `src/app/(dashboard)/dashboard/page.tsx:26`                        |
| Home-link retarget                         | `src/components/dashboard/dashboard-sidebar.tsx:88`                |
| Role observation UI                        | `src/app/(dashboard)/admin/page.tsx:203`                           |
| Validation                                 | None — no client input feeds this feature                          |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
