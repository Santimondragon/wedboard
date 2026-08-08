---
id: EP-01-F03
title: Identity Sync
epic: EP-01 Account & Access
version: 1.0.0
status: defective
last_updated: 2026-07-27
depends_on: [EP-01-F04]
---

# EP-01-F03 — Identity Sync

## 1. Summary

Wedboard stores no credentials, but it must have a durable row for every person who uses it —
events are owned by a `users` id, members are linked by a `users` id, and every activity-log
entry names one. This feature is the mirror that keeps that row in step with Clerk: an
invisible component fires `users.upsertCurrentUser` on every authenticated dashboard mount,
which inserts the row the first time and refreshes name and email thereafter. The
`tokenIdentifier` from the verified JWT is the canonical key everything resolves against. The
same call also carries the platform's only global role decision: an email listed in the
`SUPERADMIN_EMAILS` Convex env var is promoted to `superadmin` — a grant that is applied on
every login but **never** withdrawn.

The mirror is one-directional and best-effort: Clerk never calls Wedboard. There is no
webhook, so a Clerk account that is deleted leaves its `users` row — and everything hanging
off it — behind.

## 2. Actors & Permissions

| Actor                              | Access   | Notes                                                                                               |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| Anonymous visitor                  | —        | `upsertCurrentUser` throws `ConvexError("Unauthorized")` without an identity (`convex/users.ts:39`) |
| User                               | Implicit | Every authenticated user triggers the sync for **their own** row and no other                       |
| Superadmin                         | Implicit | Same path; the role is granted by env var, never by a user action                                   |
| Owner / Co-owner / Editor / Viewer | n/a      | This feature runs before any event scope exists                                                     |
| Public guest                       | —        | Public invitation routes never mount `UserSync`                                                     |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate here is the weakest in
the product and deliberately so: `ctx.auth.getUserIdentity()` must return an identity, and
the row written is always the caller's own — the mutation takes no arguments, so no user can
address another user's row.

## 3. User Stories

- **US-01-F03-01** — As a user, I want my Wedboard identity to exist automatically so that I
  never have to fill in a profile before using the product.
- **US-01-F03-02** — As a user who changed my name or email in Clerk, I want Wedboard to pick
  it up so that collaborators see the current details.
- **US-01-F03-03** — As an operator, I want to grant platform-admin access by editing an env
  var so that no code deploy or manual database edit is needed.
- **US-01-F03-04** — As an event owner, I want to add a collaborator by email so that I do not
  need to know their internal id — which requires their identity to be mirrored first.

## 4. Entry Points

| Entry point                       | Route / control                                                                                                | Actor           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------- |
| Any authenticated dashboard route | `UserSync` mounted inside `<Authenticated>` (`src/app/(dashboard)/layout.tsx:26`)                              | User            |
| Internal callers                  | `internal.users.ensureCurrentUser` — an `internalMutation`, not reachable from a client (`convex/users.ts:81`) | Convex internal |
| Read-back                         | `api.users.getCurrentUser`, used by `/dashboard` and `/admin` to read the global role                          | User            |

There is no UI for this feature: no profile screen, no "sync now" control, no visible
indication that it ran.

## 5. UX Flow

### Happy path

1. An authenticated user loads any route under `(dashboard)`.
2. `DashboardLayout` renders `<Authenticated>`, which mounts `UserSync`
   (`src/app/(dashboard)/layout.tsx:25`).
3. `UserSync`'s `useEffect` runs once and calls `api.users.upsertCurrentUser()`
   (`src/components/dashboard/user-sync.tsx:10`). It renders `null`.
4. The mutation reads the verified identity (`convex/users.ts:37`) and looks the row up by
   `tokenIdentifier` on the `by_tokenIdentifier` index (`convex/users.ts:43`).
5. It derives `firstName` and `lastName` by splitting `identity.name` on spaces — first token
   is the first name, the remainder joined is the last name (`convex/users.ts:49`).
6. It resolves `email` as `identity.email`, falling back to the stored email, falling back to
   `""` (`convex/users.ts:52`), and computes `promote = isSuperadminEmail(email)`
   (`convex/users.ts:53`).
7. **Existing row** → `ctx.db.patch` writes `email`, `firstName`, `lastName`, and adds
   `role: "superadmin"` **only** when `promote` is true and the row is not already superadmin
   (`convex/users.ts:56`). Returns the existing `_id`.
8. **No row** → `ctx.db.insert` writes `clerkId` (`identity.subject`), `tokenIdentifier`,
   `email`, `firstName`, `lastName` and `role` = `"superadmin" | "user"`
   (`convex/users.ts:68`). Returns the new `_id`.
9. Every guarded Convex function thereafter resolves the caller through `requireUser`, which
   performs the same `by_tokenIdentifier` lookup and throws `ConvexError("User not found")` if
   the row is absent (`convex/lib/auth.ts:19`).

### Alternate & edge paths

- **A1** — The identity's email is already listed in `SUPERADMIN_EMAILS` and the row is
  already `superadmin` → the spread produces no `role` key and the patch leaves the role
  untouched (`convex/users.ts:61`).
- **A2** — The email is **removed** from `SUPERADMIN_EMAILS` → `promote` is `false`, the
  conditional spread is empty, and the stored `superadmin` role survives. The role is never
  revoked. See TODO-01-05.
- **A3** — `identity.name` is absent → `("").split(" ")` yields `[""]`, so `firstName` is
  written as the empty string rather than left undefined (`convex/users.ts:49`). See
  DEF-01-02.
- **A4** — `identity.email` is absent and no row exists → `email` is written as `""`
  (`convex/users.ts:52`), and `isSuperadminEmail` short-circuits on the empty string
  (`convex/users.ts:15`). See DEF-01-03.
- **A5** — A user has multiple names ("Ana María Pérez") → `firstName` is "Ana" and
  `lastName` is "María Pérez". The split is naive but lossless when recombined.
- **A6** — The same person signs in from two browsers → both mounts call the mutation; both
  resolve the same `tokenIdentifier` and patch the same row. No duplicate is created.
- **E1** — `UserSync` mounts before the Convex client holds a token → cannot happen, because
  the component is rendered only inside `<Authenticated>`
  ([EP-01-F04](./F04-route-protection.md), `src/app/(dashboard)/layout.tsx:25`).
- **E2** — The mutation rejects → `UserSync` does not `await`, `catch`, or toast the result
  (`src/components/dashboard/user-sync.tsx:11`); the failure is silent and the page continues
  to render, with subsequent guarded queries failing on `User not found`.
- **E3** — The Clerk account is deleted → nothing happens on the Convex side. The `users` row,
  the events it owns and its `eventMembers` rows all persist. See TODO-01-06.

## 6. States

| State             | Behavior                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Invisible. `UserSync` returns `null` and never blocks rendering (`src/components/dashboard/user-sync.tsx:14`)                  |
| Empty             | Not applicable — a missing row is the trigger for an insert, not an empty state                                                |
| Error             | No surface. A rejected upsert produces no toast, no banner and no retry; downstream queries fail with `User not found` instead |
| Success           | Invisible. The only observable effect is that guarded queries stop throwing                                                    |
| Disabled / locked | Never disabled. The sync runs on every authenticated dashboard mount                                                           |
| Mobile            | Identical — the component renders nothing                                                                                      |

## 7. UI Specification

### Screens & components

| Element                        | Component                                          | Path                                                                                 |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sync trigger (renders nothing) | `UserSync`                                         | `src/components/dashboard/user-sync.tsx:7`                                           |
| Mount point                    | `DashboardLayout` → `<Authenticated>`              | `src/app/(dashboard)/layout.tsx:26`                                                  |
| Token attachment               | `ConvexClientProvider` → `ConvexProviderWithClerk` | `src/components/providers/convex-client-provider.tsx:11`                             |
| Server-side token fetch        | `getConvexToken()`                                 | `src/lib/convex-token.ts:8`                                                          |
| Role read-back                 | `DashboardPage`, `AdminPage`                       | `src/app/(dashboard)/dashboard/page.tsx:20`, `src/app/(dashboard)/admin/page.tsx:28` |

### Fields & validation

| Field             | Type    | Required | Rule                                                                                                                                                        | Message |
| ----------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `clerkId`         | string  | yes      | Set once at insert from `identity.subject`; never patched afterwards (`convex/users.ts:69`)                                                                 | —       |
| `tokenIdentifier` | string  | yes      | Set once at insert; the canonical lookup key (`convex/users.ts:70`)                                                                                         | —       |
| `email`           | string  | yes      | `identity.email ?? existing.email ?? ""` (`convex/users.ts:52`)                                                                                             | —       |
| `firstName`       | string? | no       | First space-delimited token of `identity.name` (`convex/users.ts:50`)                                                                                       | —       |
| `lastName`        | string? | no       | Remaining tokens of `identity.name` joined by a space; `undefined` when empty (`convex/users.ts:51`)                                                        | —       |
| `role`            | string  | yes      | `"superadmin"` when the email is listed in `SUPERADMIN_EMAILS`, else `"user"` at insert; promote-only at patch (`convex/users.ts:74`, `convex/users.ts:61`) | —       |

No Zod schema participates — the client sends no fields at all.

### Copy deck

None. This feature renders no copy, guest-facing or otherwise.

| Key | Copy | Source |
| --- | ---- | ------ |
| —   | —    | —      |

## 8. Data Model

| Table   | Fields                                                                 | Read / Write                                          | Index                                        |
| ------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `users` | `clerkId`, `tokenIdentifier`, `email`, `firstName`, `lastName`, `role` | Read (existence check) + Write (insert or patch)      | `by_tokenIdentifier` (`convex/schema.ts:25`) |
| `users` | `email`                                                                | Read by `members.addMember` when resolving an invitee | `by_email` (`convex/schema.ts:26`)           |
| `users` | `clerkId`                                                              | Never queried in application code today               | `by_clerkId` (`convex/schema.ts:24`)         |

**Canonical key.** Although the schema carries three indexes, every lookup in the product
resolves by `tokenIdentifier`: `getCurrentUser` (`convex/users.ts:27`), both upserts
(`convex/users.ts:44`, `convex/users.ts:92`) and `requireUser` (`convex/lib/auth.ts:21`).
`by_email` is used only by `members.addMember` ([EP-03](../03-collaboration-and-permissions/)),
and `by_clerkId` has no reader in application code — it exists for a future webhook that does
not exist yet.

**Lifecycle.** Rows are only ever inserted or patched. No code path deletes a `users` row —
`convex/events.ts` `deleteEvent` cascades across every event-scoped table but never touches
`users`, and there is no `convex/http.ts`, so no Clerk webhook can drive a deletion either. A
`users` row is therefore permanent once created, and the identity it mirrors may no longer
exist in Clerk.

## 9. Backend Contract

| Function                           | Type             | Args | Returns                | Guard                                                                                      | Caps |
| ---------------------------------- | ---------------- | ---- | ---------------------- | ------------------------------------------------------------------------------------------ | ---- |
| `api.users.upsertCurrentUser`      | mutation         | `{}` | `Id<"users">`          | `ctx.auth.getUserIdentity()` → throws `ConvexError("Unauthorized")` (`convex/users.ts:37`) | None |
| `api.users.getCurrentUser`         | query            | `{}` | `Doc<"users"> \| null` | None; returns `null` when unauthenticated (`convex/users.ts:21`)                           | None |
| `internal.users.ensureCurrentUser` | internalMutation | `{}` | `Id<"users">`          | Same identity check (`convex/users.ts:84`)                                                 | None |

`ensureCurrentUser` is byte-for-byte the same handler as `upsertCurrentUser`, declared as an
`internalMutation` so it can be called from other Convex functions rather than from a client
(`convex/users.ts:81`–`convex/users.ts:126`). **It has no callers today** — no
`internal.users.ensureCurrentUser` reference exists anywhere in `convex/`.

Supporting helpers (not Convex functions):

| Helper                      | Path                        | Behavior                                                                                                   |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `isSuperadminEmail(email)`  | `convex/users.ts:9`         | Splits `SUPERADMIN_EMAILS` on commas, trims, lowercases, drops empties; returns `false` for an empty email |
| `getAuthenticatedUser(ctx)` | `convex/lib/auth.ts:5`      | Returns the identity or throws `ConvexError("Unauthorized")`                                               |
| `requireUser(ctx)`          | `convex/lib/auth.ts:15`     | Resolves the `users` doc by `tokenIdentifier`; throws `ConvexError("User not found")` when absent          |
| `getConvexToken()`          | `src/lib/convex-token.ts:8` | Server-side Convex-audience token fetch for route handlers                                                 |

## 10. Business Rules

- **BR-01-F03-01** `[AS-BUILT]` — `users.tokenIdentifier` is the canonical identity key: every
  identity lookup in the product resolves on the `by_tokenIdentifier` index
  (`convex/users.ts:27`, `convex/users.ts:44`, `convex/lib/auth.ts:21`).
- **BR-01-F03-02** `[AS-BUILT]` — The identity sync runs on every authenticated dashboard
  mount, once per mount (`src/components/dashboard/user-sync.tsx:10`).
- **BR-01-F03-03** `[AS-BUILT]` — `upsertCurrentUser` accepts no arguments; all persisted
  identity data is read from the server-verified Clerk identity, so a client cannot assert an
  email, name or role (`convex/users.ts:35`).
- **BR-01-F03-04** `[AS-BUILT]` — The upsert is idempotent per identity: an existing row is
  patched and its `_id` returned, so repeated calls never create duplicates
  (`convex/users.ts:55`).
- **BR-01-F03-05** `[AS-BUILT]` — `clerkId` and `tokenIdentifier` are written only at insert
  and never patched (`convex/users.ts:68` vs. the patch at `convex/users.ts:56`).
- **BR-01-F03-06** `[AS-BUILT]` — `firstName` and `lastName` are derived from `identity.name`
  by splitting on spaces: the first token is `firstName`, the joined remainder is `lastName`
  (`convex/users.ts:49`).
- **BR-01-F03-07** `[AS-BUILT]` — A user whose email appears in the `SUPERADMIN_EMAILS` Convex
  env var (comma-separated, trimmed, case-insensitive) is granted `role: "superadmin"` on both
  the insert and the patch path (`convex/users.ts:9`, `convex/users.ts:61`,
  `convex/users.ts:74`).
- **BR-01-F03-08** `[AS-BUILT]` — The superadmin grant is **promote-only**: the patch adds
  `role` only when the email qualifies _and_ the row is not already `superadmin`, so no code
  path ever demotes a user (`convex/users.ts:61`).
- **BR-01-F03-09** `[AS-BUILT]` — An empty email never qualifies for promotion
  (`convex/users.ts:15`).
- **BR-01-F03-10** `[AS-BUILT]` — A guarded Convex function called by an authenticated user
  with no mirrored row throws `ConvexError("User not found")`, distinct from the
  `ConvexError("Unauthorized")` thrown when there is no identity at all
  (`convex/lib/auth.ts:10`, `convex/lib/auth.ts:26`).
- **BR-01-F03-11** `[AS-BUILT]` — Convex accepts a Clerk JWT only when it validates against the
  `CLERK_FRONTEND_API_URL` Convex env var with `applicationID: "convex"`
  (`convex/auth.config.ts:4`).
- **BR-01-F03-12** `[AS-BUILT]` — This Clerk application uses the **native Convex
  integration**, not a JWT template: the Clerk session token itself carries `aud: "convex"`,
  and requesting a template named `convex` returns a Clerk 404. Server-side code must
  therefore branch on `sessionClaims.aud` and call plain `getToken()` when the audience is
  already `convex`, falling back to `getToken({ template: "convex" })` only for the legacy
  setup (`src/lib/convex-token.ts:11`). Client-side, no branching is authored in this repo —
  `ConvexClientProvider` delegates entirely to `ConvexProviderWithClerk`, which performs the
  equivalent check internally (`src/components/providers/convex-client-provider.tsx:11`).
- **BR-01-F03-13** `[AS-BUILT]` — No code path deletes a `users` row: neither the event cascade
  (`convex/events.ts` `deleteEvent`) nor any other module issues a delete against `users`, and
  no `convex/http.ts` webhook endpoint exists.

## 11. Acceptance Criteria

- **AC-01-F03-01** — **Given** an authenticated user with no `users` row **When** any
  dashboard route mounts **Then** exactly one row exists afterwards, keyed by the identity's
  `tokenIdentifier`. _(BR-01-F03-01, BR-01-F03-02)_
- **AC-01-F03-02** — **Given** an existing row **When** the sync runs ten times **Then** there
  is still exactly one row and its `_id` is unchanged. _(BR-01-F03-04)_
- **AC-01-F03-03** — **Given** a user who renames themselves in Clerk **When** they next load
  the dashboard **Then** `firstName` / `lastName` reflect the new name. _(BR-01-F03-06)_
- **AC-01-F03-04** — **Given** an existing row **When** the sync runs **Then** `clerkId` and
  `tokenIdentifier` are byte-identical to their inserted values. _(BR-01-F03-05)_
- **AC-01-F03-05** — **Given** `SUPERADMIN_EMAILS` contains `" You@Example.com "` **When** a
  user with email `you@example.com` signs in **Then** their `role` becomes `"superadmin"`.
  _(BR-01-F03-07)_
- **AC-01-F03-06** — **Given** a user already stored as `"superadmin"` **When** their email is
  removed from `SUPERADMIN_EMAILS` and they sign in again **Then** their `role` is still
  `"superadmin"`. _(BR-01-F03-08 — the rule holds; the product consequence is TODO-01-05)_
- **AC-01-F03-07** — **Given** an identity carrying no email **When** the sync runs **Then**
  the row is not promoted regardless of `SUPERADMIN_EMAILS` contents. _(BR-01-F03-09)_
- **AC-01-F03-08** — **Given** an authenticated caller whose row was manually removed **When**
  they call a guarded function **Then** it throws `ConvexError("User not found")`, not
  `Unauthorized`. _(BR-01-F03-10)_
- **AC-01-F03-09** — **Given** a route handler needing a Convex token **When** the Clerk
  session claims carry `aud: "convex"` **Then** `getConvexToken()` returns plain `getToken()`
  and never requests a `convex` template. _(BR-01-F03-12)_
- **AC-01-F03-10** — **Given** a user who deletes their Clerk account **When** the Convex data
  is inspected **Then** their `users` row and owned events still exist. _(BR-01-F03-13 — the
  rule holds; the product consequence is TODO-01-06)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                          |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-01-F03-01 | unit        | `isSuperadminEmail` handles whitespace, mixed case, empty list, empty email (`convex/users.ts:9`)                                                 |
| TC-01-F03-02 | unit        | Name splitting: `"Ana María Pérez"` → `{firstName: "Ana", lastName: "María Pérez"}`; `"Ana"` → `{firstName: "Ana", lastName: undefined}`          |
| TC-01-F03-03 | integration | First `upsertCurrentUser` inserts; second patches and returns the same `_id`                                                                      |
| TC-01-F03-04 | integration | Patch path never overwrites `clerkId` / `tokenIdentifier`                                                                                         |
| TC-01-F03-05 | integration | A `superadmin` row survives a sync with the email absent from `SUPERADMIN_EMAILS`                                                                 |
| TC-01-F03-06 | integration | `requireUser` throws `User not found` for an identity with no row                                                                                 |
| TC-01-F03-07 | integration | `getCurrentUser` returns `null` for an unauthenticated caller instead of throwing                                                                 |
| TC-01-F03-08 | unit        | `getConvexToken()` calls plain `getToken()` when `sessionClaims.aud === "convex"`, and the template form otherwise (`src/lib/convex-token.ts:11`) |
| TC-01-F03-09 | e2e         | Sign in on a fresh account → create an event → the event's `ownerUserId` matches the synced row                                                   |

### Manual QA checklist

- [ ] A first sign-in produces exactly one `users` row
- [ ] Changing the display name in Clerk is reflected in the dashboard sidebar/header after a reload
- [ ] Adding an email to `SUPERADMIN_EMAILS` and re-signing-in promotes the user
- [ ] Removing it does **not** demote them (expected today — see TODO-01-05)
- [ ] `members.addMember` finds a collaborator by the email stored on their synced row
- [ ] No `users` row disappears after deleting an event

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. The mutation is unbounded and unthrottled, but writes only the caller's own row                                                                                                                                                                                                                                                                         |
| Performance      | One indexed read plus one write per dashboard mount. `useEffect` has an empty dependency array, so route changes within the same mounted layout do not re-fire it (`src/components/dashboard/user-sync.tsx:12`)                                                                                                                                               |
| Security & authz | Identity fields come exclusively from the verified JWT; the mutation takes no arguments so nothing is client-asserted. Convex validates the token against `CLERK_FRONTEND_API_URL` with `applicationID: "convex"` (`convex/auth.config.ts:4`). **Note DEF-01-01: `convex/_debug.ts` exposes the whole `users` table through an unauthenticated public query** |
| Accessibility    | Not applicable — renders nothing                                                                                                                                                                                                                                                                                                                              |
| i18n             | Not applicable — renders nothing                                                                                                                                                                                                                                                                                                                              |
| Analytics        | None. Identity creation and superadmin promotion are not recorded in `activityLogs` (which is event-scoped) or anywhere else                                                                                                                                                                                                                                  |

## 14. TODOs & Open Questions

- **DEF-01-01** `[P0]` — `convex/_debug.ts` exports a **public** `query` named `check` with no
  authentication guard that returns every user's email and role
  (`allUsers: users.map(u => ({email, role}))`), plus the raw and parsed contents of the
  `SUPERADMIN_EMAILS` env var. Any caller who knows the deployment URL — which is public,
  `NEXT_PUBLIC_CONVEX_URL` — can enumerate the entire user base and identify every superadmin.
  - **Evidence:** `convex/_debug.ts:5` (public `query`), `convex/_debug.ts:14`
    (`ctx.db.query("users").take(500)`), `convex/_debug.ts:20` (`envRaw`),
    `convex/_debug.ts:26` (`allUsers`). The file's own header comment reads "TEMPORARY debug
    helper — delete after verifying superadmin promotion."
  - **Impact:** unauthenticated disclosure of every registered user's email address and of
    which accounts hold platform-admin privileges — a directly exploitable targeting list.
  - **Proposed fix:** delete `convex/_debug.ts`. If a diagnostic is still needed, re-add it as
    an `internalQuery`, or guard it with `requireSuperadmin(ctx)` and drop the `envRaw` field.
- **DEF-01-02** `[P2]` — `firstName` is stored as an **empty string** rather than left
  undefined when the Clerk identity carries no name, because `("").split(" ")` yields `[""]`
  and `?? undefined` does not catch an empty string.
  - **Evidence:** `convex/users.ts:49`, `convex/users.ts:50`
  - **Impact:** the schema's `v.optional(v.string())` intent is defeated; downstream display
    logic that tests `firstName` for presence sees a truthy-shaped field that renders as
    nothing, and `activityLogs.actorName` (`convex/lib/activity.ts`) can be built from an
    empty name instead of falling back to the email.
  - **Proposed fix:** normalize with a trim-and-empty check so a blank name stores `undefined`
    for both `firstName` and `lastName`.
- **DEF-01-03** `[P2]` — `email` is stored as an **empty string** when the Clerk identity
  carries no email and no prior row exists, even though the schema requires the field.
  - **Evidence:** `convex/users.ts:52`, `convex/users.ts:71`
  - **Impact:** such a user can never be found by `members.addMember`'s `by_email` lookup, can
    never be promoted (`convex/users.ts:15` short-circuits on `""`), and would render as a
    nameless, address-less actor in the activity log.
  - **Proposed fix:** reject the sync when no email is resolvable, or record the identity's
    verified primary email explicitly and surface a product-level error.
- **TODO-01-05** `[P1]` `[ADD]` — There is no way to revoke the `superadmin` role. The grant is
  promote-only by design (BR-01-F03-08), so removing an email from `SUPERADMIN_EMAILS` leaves
  the role in place forever, and no mutation exists to set `role` back to `"user"`.
  - **Rationale:** an operator who mis-types an address, or who off-boards an administrator,
    has no in-product remedy — the only fix is a manual database edit. The env var reads like
    an access list but behaves as an append-only grant log.
  - **Proposed rule:** the sync reconciles the role in both directions — an existing
    `superadmin` whose email is no longer listed is demoted to `"user"` — or an explicit
    superadmin-only `setUserRole` mutation exists.
- **TODO-01-06** `[P1]` `[ADD]` — There is no account deletion and no reconciliation with
  Clerk. No `convex/http.ts` exists, so no Clerk webhook (`user.deleted`, `user.updated`) is
  received, and no code path deletes a `users` row.
  - **Rationale:** deleting a Clerk account orphans the `users` row, the events it owns and
    its `eventMembers` rows. The events remain publicly reachable by slug and no one can
    administer them, because the owner can never authenticate again. This is also a data
    -retention exposure: emails persist after the account is gone.
  - **Proposed rule:** a `user.deleted` webhook (or an in-product "delete my account" flow)
    transfers or cascades every owned event and then removes the `users` row and its
    memberships.
- **TODO-01-07** `[P2]` `[ADD]` — Wedboard offers no profile editing. Name and email are
  read-only mirrors of Clerk, and the derivation is a naive space split, so a user with a
  compound first name is mis-parsed with no way to correct it in-product.
  - **Rationale:** collaborator lists, the members page and the activity log all display these
    derived names ([EP-03](../03-collaboration-and-permissions/),
    [EP-14](../14-insights/)), so the parse error is user-visible.
  - **Proposed rule:** either link out to the Clerk account portal from the user menu, or
    store `displayName` as an editable Wedboard-owned field that defaults to the Clerk name.

### Open questions

- **Q1** — Should `SUPERADMIN_EMAILS` be the permanent mechanism for the global role, or an
  operator bootstrap only, with subsequent grants made through `/admin`
  ([EP-15](../15-platform-administration/))?
- **Q2** — When a Clerk account is deleted, should its events be hard-deleted, archived, or
  transferred to a co-owner?
- **Q3** — `by_clerkId` has no reader in application code. Should it be dropped, or is it
  reserved for the webhook proposed in TODO-01-06?
- **Q4** — `internal.users.ensureCurrentUser` duplicates `upsertCurrentUser` exactly and has no
  callers. Should it be removed, or should `upsertCurrentUser` delegate to a shared helper so
  the two cannot drift?

## 15. Traceability

| Concern                         | Source                                                   |
| ------------------------------- | -------------------------------------------------------- |
| Sync trigger (mount)            | `src/components/dashboard/user-sync.tsx:10`              |
| Sync mount point                | `src/app/(dashboard)/layout.tsx:26`                      |
| Backend (upsert)                | `convex/users.ts:34`                                     |
| Backend (identity requirement)  | `convex/users.ts:37`                                     |
| Backend (existence lookup)      | `convex/users.ts:43`                                     |
| Backend (name derivation)       | `convex/users.ts:49`                                     |
| Backend (email resolution)      | `convex/users.ts:52`                                     |
| Backend (promote-only patch)    | `convex/users.ts:61`                                     |
| Backend (insert + role)         | `convex/users.ts:68`                                     |
| Backend (superadmin email list) | `convex/users.ts:9`                                      |
| Backend (read-back)             | `convex/users.ts:18`                                     |
| Backend (internal twin)         | `convex/users.ts:81`                                     |
| Guard (`getAuthenticatedUser`)  | `convex/lib/auth.ts:5`                                   |
| Guard (`requireUser`)           | `convex/lib/auth.ts:15`                                  |
| JWT validation                  | `convex/auth.config.ts:4`                                |
| Native-integration token branch | `src/lib/convex-token.ts:11`                             |
| Client token attachment         | `src/components/providers/convex-client-provider.tsx:11` |
| Schema (`users`)                | `convex/schema.ts:16`                                    |
| Schema (`by_tokenIdentifier`)   | `convex/schema.ts:25`                                    |
| Schema (`by_email`)             | `convex/schema.ts:26`                                    |
| Defect (public debug query)     | `convex/_debug.ts:5`                                     |
| Validation                      | None — the mutation takes no arguments                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
