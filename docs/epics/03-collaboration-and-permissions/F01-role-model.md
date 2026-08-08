---
id: EP-03-F01
title: Per-event role model
epic: EP-03 Collaboration & Permissions
version: 1.0.0
status: implemented
last_updated: 2026-07-27
depends_on: [EP-01, EP-02, EP-15]
---

# EP-03-F01 — Per-event role model

## 1. Summary

Every Wedboard event is a shared board, and every user's authority on it is expressed by a
single per-event role: **Owner**, **Co-owner**, **Editor** or **Viewer**. The role decides
which dashboard sections a collaborator sees and which actions the backend will accept for
them. This feature is the product concept behind that model — how a role is acquired, what the
tiers mean, how the global Superadmin sits outside them, and why the client-side gating is a
convenience rather than a control. The authoritative capability matrix lives in
[roles-and-permissions.md](../../roles-and-permissions.md); this spec does not restate it.

## 2. Actors & Permissions

| Actor                | Access                                                                    | Notes                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full                                                                      | Holds the event via `events.ownerUserId` **and** an `eventMembers` row with `role: "owner"`. The only role that can archive or delete the event, or manage Co-owners. |
| Co-owner (`planner`) | Everything except deleting/archiving the event and touching the owner row | Labeled "Co-owner" in the UI, stored as `planner`.                                                                                                                    |
| Editor               | Content only                                                              | Guests, invitations, special invitations, menu, drinks, tables, media, template, meta. No Settings, no Members.                                                       |
| Viewer               | Effectively read-blocked                                                  | Rank 1 exists, but `requireEventEditor` defaults to `minRole: "editor"`, so a viewer can only reach `members.listMembers` and `activity.listByEvent`. See TODO-03-04. |
| Superadmin           | Bypasses everything                                                       | `users.role === "superadmin"` short-circuits `requireEventAccess`, `requireEventMember` and `getEventRole`, which resolves them to an effective role of `owner`.      |
| Public guest         | None                                                                      | Public routes carry no identity and never touch this model.                                                                                                           |

The gates this feature defines are `requireEventAccess(ctx, eventId, userId)`,
`requireEventEditor(ctx, eventId, minRole = "editor")`, `requireEventMember(ctx, eventId,
userId, minRole?)`, `getEventRole(ctx, eventId, userId)` and `requireSuperadmin(ctx)`, all in
`convex/lib/permissions.ts`.

## 3. User Stories

- **US-03-F01-01** — As an Owner, I want a role attached to each collaborator so that I can
  hand out exactly as much authority as each person needs.
- **US-03-F01-02** — As a Co-owner, I want the dashboard to show me only the sections I can act
  on so that I am not led into actions the server will refuse.
- **US-03-F01-03** — As an Editor, I want to manage guests and invitations without being able to
  change the event's settings, domain or membership, so that I cannot break the board.
- **US-03-F01-04** — As a Superadmin, I want to open any event's dashboard for support purposes
  without being added as a member.
- **US-03-F01-05** — As a product owner, I want every permission decision made on the server so
  that hiding a button is never the only thing standing between a user and an action.

## 4. Entry Points

| Entry point                           | Route / control                                | Actor                          |
| ------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Role resolution for the current event | `events.getEventBySlug` → `{...event, myRole}` | Any member                     |
| Sidebar navigation filter             | `/dashboard/[eventSlug]/*` sidebar             | Any member                     |
| Members page gate                     | `/dashboard/[eventSlug]/members`               | Co-owner+                      |
| Settings page gate                    | `/dashboard/[eventSlug]/settings`              | Co-owner+ (Delete card: Owner) |
| Every event-scoped Convex function    | n/a — server guard                             | Any caller                     |

There is no dedicated "roles" screen. The role model surfaces indirectly, through what a
collaborator can see and do.

## 5. UX Flow

### Happy path

1. A user opens `/dashboard/{eventSlug}/…` → `EventProvider` calls `api.events.getEventBySlug`
   (`src/components/dashboard/event-provider.tsx:27`).
2. The query authenticates the caller (`requireUser`), verifies membership
   (`requireEventAccess`) and resolves the caller's effective role with `getEventRole`,
   returning it as `myRole` (`convex/events.ts:57`–`:61`).
3. `EventProvider` publishes the event through `useEvent()` and the role through
   `useEventRole()` (`src/components/dashboard/event-provider.tsx:60`, `:69`).
4. `DashboardSidebar` filters `NAV_ITEMS` with `hasMinRole(role, item.minRole)`, so an Editor
   never sees the Members or Settings links (`src/components/dashboard/dashboard-sidebar.tsx:116`).
5. The user acts on a page → the mutation re-checks the same hierarchy server-side via
   `requireEventEditor`, which is what actually authorizes the write.

### Alternate & edge paths

- **A1** — Caller is the event's `ownerUserId` but the `eventMembers` row is missing →
  `requireEventMember` still resolves them as `owner` from the event document
  (`convex/lib/permissions.ts:124`), so ownership never depends on the membership row.
- **A2** — Caller is a Superadmin with no membership → every guard early-returns and
  `getEventRole` returns `"owner"`, so the dashboard renders as if they owned the event
  (`convex/lib/permissions.ts:72`, `:118`).
- **A3** — Caller is an Editor who types `/dashboard/{slug}/members` directly → the page's own
  `hasMinRole(event.myRole, "planner")` check renders an access notice instead of the member
  list, and the `listMembers` query is `"skip"`ped
  (`src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:18`, `:20`–`:23`, `:26`).
- **E1** — Caller has no membership at all → `requireEventAccess` throws
  `ConvexError("Unauthorized")`; `getEventBySlug` therefore never returns and `EventProvider`
  shows "Event not found" for both the missing-event and no-access cases
  (`src/components/dashboard/event-provider.tsx:33`–`:52`).
- **E2** — Caller holds a role below the function's `minRole` → `requireEventMember` throws
  `ConvexError("Insufficient permissions")` (`convex/lib/permissions.ts:143`).
- **E3** — Caller is authenticated in Clerk but has no `users` row yet → `requireUser` throws
  `ConvexError("User not found")` (`convex/lib/auth.ts:26`).

## 6. States

| State             | Behavior                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `getEventBySlug` pending → `EventProvider` renders `LoadingState` "Loading event…"; `myRole` is unknown, so `hasMinRole(undefined, …)` is false and no gated nav renders. |
| Empty             | Not applicable — an event always has at least the owner.                                                                                                                  |
| Error             | An access failure surfaces as the "Event not found" screen with a "Back to events" link, not as a distinct permission error.                                              |
| Success           | Sidebar and page controls render according to `myRole`.                                                                                                                   |
| Disabled / locked | Members and Settings links are **removed** (not disabled) below `planner`; the Members page renders an access notice for Editors.                                         |
| Mobile            | No role-specific behavior; the sidebar layout is unchanged by role.                                                                                                       |

## 7. UI Specification

### Screens & components

| Element                   | Component                                   | Path                                             |
| ------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Role resolution + context | `EventProvider`, `useEvent`, `useEventRole` | `src/components/dashboard/event-provider.tsx`    |
| Role-filtered navigation  | `DashboardSidebar` (`NAV_ITEMS`)            | `src/components/dashboard/dashboard-sidebar.tsx` |
| Client rank helper        | `hasMinRole`, `ROLE_RANK`                   | `src/lib/roles.ts`                               |
| Role display labels       | `ROLE_LABELS`                               | `src/lib/roles.ts:23`                            |

Sidebar minimums as built (`src/components/dashboard/dashboard-sidebar.tsx:35`–`:78`):

| Sidebar entry                                                                                                                        | `minRole` |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Overview, Invitations, Special Events, Guests, Menu & Drinks, Tables, Messages, Activity, Invitation Template, Media, Meta & Sharing | `editor`  |
| Members, Settings                                                                                                                    | `planner` |

### Fields & validation

| Field               | Type          | Required | Rule                                                                              | Message                |
| ------------------- | ------------- | -------- | --------------------------------------------------------------------------------- | ---------------------- |
| `eventMembers.role` | union literal | yes      | One of `owner` \| `planner` \| `editor` \| `viewer` (`convex/schema.ts:86`–`:91`) | Convex validator error |
| `users.role`        | string        | yes      | `"user"` or `"superadmin"`; only `"superadmin"` is behaviorally significant here  | —                      |

### Copy deck

| Key                  | Copy                                                       | Source                                           |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| Role label — owner   | `Owner`                                                    | `src/lib/roles.ts:24`                            |
| Role label — planner | `Co-owner`                                                 | `src/lib/roles.ts:25`                            |
| Role label — editor  | `Editor`                                                   | `src/lib/roles.ts:26`                            |
| Role label — viewer  | `Viewer`                                                   | `src/lib/roles.ts:27`                            |
| No-access screen     | `This event doesn't exist or you don't have access to it.` | `src/components/dashboard/event-provider.tsx:44` |

No guest-facing Spanish copy participates in this feature.

## 8. Data Model

| Table          | Fields                      | Read / Write                                                       | Index                                           |
| -------------- | --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| `eventMembers` | `eventId`, `userId`, `role` | Read by every guard                                                | `by_eventId_and_userId` (`convex/schema.ts:95`) |
| `eventMembers` | —                           | Read for the event switcher                                        | `by_userId` (`convex/schema.ts:94`)             |
| `events`       | `ownerUserId`               | Read by `requireEventAccess`, `requireEventMember`, `getEventRole` | — (direct `ctx.db.get`)                         |
| `users`        | `role`, `tokenIdentifier`   | Read for the superadmin bypass and caller resolution               | `by_tokenIdentifier` (`convex/schema.ts:25`)    |

**Role acquisition.** There are exactly three ways to hold a role on an event:

1. **Ownership** — `createEvent` inserts the event with `ownerUserId` and immediately inserts an
   `eventMembers` row with `role: "owner"` (`convex/events.ts:127`, `:140`). Ownership is
   non-transferable in the product today; no mutation writes `ownerUserId` after creation.
2. **Sharing** — an Owner or Co-owner inserts a row via `members.addMember`
   ([EP-03-F02](./F02-add-member.md)); the role is later mutated by
   `members.updateMemberRole` ([EP-03-F03](./F03-change-member-role.md)) and deleted by
   `members.removeMember` ([EP-03-F04](./F04-remove-member.md)).
3. **Superadmin bypass** — no row at all; the global `users.role` short-circuits the guards.

**Lifecycle.** Deleting an event cascades away every `eventMembers` row (`convex/lib/events.ts:18`),
so roles never outlive their event. Nothing cascades in the other direction: deleting a user is
not implemented, so member rows are never orphaned by a user deletion today.

## 9. Backend Contract

Guards are library functions rather than Convex endpoints; both are listed because the product
behavior is defined by the guards.

| Function                                               | Type  | Args     | Returns                        | Guard                                                | Caps                    |
| ------------------------------------------------------ | ----- | -------- | ------------------------------ | ---------------------------------------------------- | ----------------------- |
| `api.events.getEventBySlug`                            | query | `{slug}` | `{...event, myRole}` \| `null` | `requireUser` + `requireEventAccess`                 | —                       |
| `api.events.listMyEvents`                              | query | `{}`     | `Doc<"events">[]`              | `requireUser`, then membership fan-out               | `take(100)` memberships |
| `requireUser(ctx)`                                     | lib   | `ctx`    | `Doc<"users">`                 | throws `Unauthorized` / `User not found`             | —                       |
| `requireEventAccess(ctx, eventId, userId)`             | lib   | —        | `void`                         | Any membership or ownership; superadmin bypass       | —                       |
| `requireEventEditor(ctx, eventId, minRole = "editor")` | lib   | —        | `Doc<"users">`                 | `requireUser` + `requireEventMember`                 | —                       |
| `requireEventMember(ctx, eventId, userId, minRole?)`   | lib   | —        | `void`                         | Rank floor; throws `Insufficient permissions`        | —                       |
| `getEventRole(ctx, eventId, userId)`                   | lib   | —        | `EventRole \| null`            | none — resolution only                               | —                       |
| `requireSuperadmin(ctx)`                               | lib   | `ctx`    | `Doc<"users">`                 | throws `Unauthorized` unless `role === "superadmin"` | —                       |

## 10. Business Rules

- **BR-03-F01-01** `[AS-BUILT]` — The role hierarchy ranks `owner: 4`, `planner: 3`,
  `editor: 2`, `viewer: 1` (`convex/lib/permissions.ts:8`).
- **BR-03-F01-02** `[AS-BUILT]` — The client mirrors the identical ranks in
  `src/lib/roles.ts:6`; `hasMinRole` returns false for a null or undefined role.
- **BR-03-F01-03** `[AS-BUILT]` — A user whose id equals the event's `ownerUserId` is treated as
  `owner` regardless of whether an `eventMembers` row exists.
- **BR-03-F01-04** `[AS-BUILT]` — A user with `users.role === "superadmin"` passes
  `requireEventAccess` and `requireEventMember` for every event without a membership row.
- **BR-03-F01-05** `[AS-BUILT]` — `getEventRole` resolves a superadmin and the event owner alike
  to the effective role `"owner"`.
- **BR-03-F01-06** `[AS-BUILT]` — `requireEventEditor` applies a default `minRole` of `"editor"`,
  so any function that omits the argument is closed to viewers.
- **BR-03-F01-07** `[AS-BUILT]` — A caller below the required rank is rejected with
  `ConvexError("Insufficient permissions")`; a caller with no membership at all is rejected with
  `ConvexError("Unauthorized")`.
- **BR-03-F01-08** `[AS-BUILT]` — `requireEventMember` with no `minRole` argument enforces
  membership only, applying no rank floor.
- **BR-03-F01-09** `[AS-BUILT]` — The event's role is surfaced to the client only through
  `events.getEventBySlug`'s `myRole`; no other query returns a role for the caller.
- **BR-03-F01-10** `[AS-BUILT]` — Sidebar entries are filtered, not disabled: an item whose
  `minRole` the caller does not meet is absent from the DOM.
- **BR-03-F01-11** `[AS-BUILT]` — Members and Settings require `planner`; every other dashboard
  section requires `editor`.
- **BR-03-F01-12** `[AS-BUILT]` — `events.listMyEvents` lists events by **membership row**, so a
  shared event appears in the collaborator's event list and switcher.
- **BR-03-F01-13** `[AS-BUILT]` — The owner's membership row is created in the same mutation as
  the event itself, so an event is never memberless.
- **BR-03-F01-14** `[AS-BUILT]` — `role` accepts only the four literals declared in
  `convex/schema.ts:86`–`:91`; any other value is rejected by the Convex validator.

## 11. Acceptance Criteria

- **AC-03-F01-01** — **Given** a user with an `editor` membership **When** they load any
  dashboard page for that event **Then** the sidebar shows the content sections and omits
  Members and Settings.
- **AC-03-F01-02** — **Given** an `editor` **When** they navigate directly to
  `/dashboard/{slug}/members` **Then** the page renders the access notice and issues no
  `listMembers` query.
- **AC-03-F01-03** — **Given** an `editor` **When** they call a `planner`-gated mutation
  directly **Then** the server throws `Insufficient permissions` and no write occurs.
- **AC-03-F01-04** — **Given** a user with no membership on an event **When** they open its
  dashboard URL **Then** the "Event not found" screen renders and no event data is returned.
- **AC-03-F01-05** — **Given** a superadmin with no membership row **When** they open any
  event's dashboard **Then** every section renders and `myRole` is `"owner"`.
- **AC-03-F01-06** — **Given** an event whose owner's `eventMembers` row was deleted **When**
  the owner calls an owner-gated mutation **Then** it succeeds, resolved from `events.ownerUserId`.
- **AC-03-F01-07** — **Given** a `viewer` **When** they open the guests page **Then** the query
  fails with `Insufficient permissions` because `requireEventEditor` defaults to `editor`.
- **AC-03-F01-08** — **Given** a user added as a member of somebody else's event **When** they
  open `/dashboard` **Then** that event appears in their events list and event switcher.
- **AC-03-F01-09** — **Given** an event is deleted **When** the cascade completes **Then** no
  `eventMembers` row for it remains.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                 |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------- |
| TC-03-F01-01 | unit        | `hasMinRole` returns true for equal and higher ranks, false for lower, null and undefined.               |
| TC-03-F01-02 | unit        | `ROLE_RANK` (client) and `ROLE_HIERARCHY` (server) contain identical keys and values.                    |
| TC-03-F01-03 | integration | `requireEventMember` throws `Insufficient permissions` for `editor` when `minRole` is `planner`.         |
| TC-03-F01-04 | integration | `requireEventMember` throws `Unauthorized` for a user with no membership row.                            |
| TC-03-F01-05 | integration | `requireEventMember` returns for a superadmin with no membership row.                                    |
| TC-03-F01-06 | integration | `getEventRole` returns `owner` for the event owner, the stored role for a member, `null` for a stranger. |
| TC-03-F01-07 | integration | `requireEventEditor` with no `minRole` rejects a `viewer`.                                               |
| TC-03-F01-08 | integration | `getEventBySlug` returns `myRole` matching the caller's stored membership role.                          |
| TC-03-F01-09 | e2e         | An editor's sidebar omits Members and Settings; a co-owner's shows both.                                 |
| TC-03-F01-10 | e2e         | An editor navigating to `/members` sees the access notice and a working "Back to overview" link.         |

### Manual QA checklist

- [ ] Sign in as an Editor of a shared event — confirm Members and Settings are absent from the sidebar.
- [ ] Deep-link an Editor to `/dashboard/{slug}/members` — confirm the access notice, not a crash.
- [ ] Sign in as a Co-owner — confirm Members and Settings appear and Settings hides the Delete card.
- [ ] Sign in as a Superadmin on an event they do not belong to — confirm full dashboard access.
- [ ] Confirm a shared event appears in the collaborator's event switcher.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `listMyEvents` reads at most 100 memberships (`convex/events.ts:30`). No cap on roles per user.                                                                                                                                         |
| Performance      | Each guard costs one `events` get, one `users` get and at most one indexed `eventMembers` lookup via `by_eventId_and_userId`. `getEventBySlug` runs the membership lookup twice (once in `requireEventAccess`, once in `getEventRole`). |
| Security & authz | Server guards are the sole enforcement point. Client gating in `hasMinRole`/`NAV_ITEMS` hides controls only and must never be treated as a control.                                                                                     |
| Accessibility    | Nav filtering removes links entirely, so screen readers never announce unavailable destinations.                                                                                                                                        |
| i18n             | All role-model copy is English; roles are not guest-facing.                                                                                                                                                                             |
| Analytics        | None. Role grants and changes are not tracked (see TODO-03-02).                                                                                                                                                                         |

## 14. TODOs & Open Questions

- **TODO-03-04** `[P2]` `[CHANGE]` — The `viewer` role has no coherent product definition. It is
  a valid `eventMembers.role` and a valid `addMember`/`updateMemberRole` argument, but it is
  never offered by the Members UI (`src/components/members/member-list.tsx:65`,
  `src/components/members/add-member-dialog.tsx:45`) and `requireEventEditor`'s `editor` default
  read-blocks it from every content query, leaving it access to only `members.listMembers` and
  `activity.listByEvent`.
  - **Rationale:** the role is reachable through the API but useless if granted, and its
    presence in the hierarchy implies a read-only tier the product does not deliver.
  - **Proposed rule:** decide one of — (a) make Viewer real by lowering the `minRole` of content
    _queries_ to `"viewer"` and surfacing it in the Members UI, or (b) remove `viewer` from
    `ASSIGNABLE_ROLE` and treat the schema literal as legacy.
- **TODO-03-10** `[P2]` `[ADD]` — Ownership cannot be transferred. No mutation writes
  `events.ownerUserId` after `createEvent` (`convex/events.ts:127`), so an owner who leaves the
  project cannot hand the event over; the only escape is to recreate the event.
  - **Rationale:** a real planning team changes hands; today the owner is permanent.
  - **Proposed rule:** an owner may promote an existing Co-owner to Owner, which demotes the
    former owner to Co-owner in the same mutation.

### Open questions

- **Q1** — Should Viewer become a real read-only tier, or be retired? (Drives TODO-03-04.)
- **Q2** — Should a Superadmin's actions on an event be visually distinguished in the dashboard,
  given they resolve to `owner` and are indistinguishable from the real owner today?
- **Q3** — Should an event support more than one Owner, or is single-ownership plus Co-owner the
  intended ceiling?

## 15. Traceability

| Concern                                  | Source                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| Role hierarchy (server)                  | `convex/lib/permissions.ts:8`                                          |
| `requireEventAccess`                     | `convex/lib/permissions.ts:15`                                         |
| Superadmin bypass (access)               | `convex/lib/permissions.ts:26`                                         |
| `requireEventEditor` + default `minRole` | `convex/lib/permissions.ts:51`, `:54`                                  |
| `getEventRole`                           | `convex/lib/permissions.ts:66`                                         |
| Superadmin → `owner` resolution          | `convex/lib/permissions.ts:72`                                         |
| Owner resolution from `ownerUserId`      | `convex/lib/permissions.ts:79`                                         |
| `requireSuperadmin`                      | `convex/lib/permissions.ts:95`                                         |
| `requireEventMember` + rank check        | `convex/lib/permissions.ts:105`, `:139`–`:144`                         |
| Authentication guards                    | `convex/lib/auth.ts:5`, `:15`                                          |
| `myRole` on `getEventBySlug`             | `convex/events.ts:48`, `:60`                                           |
| Owner membership row at creation         | `convex/events.ts:140`                                                 |
| Shared events in the events list         | `convex/events.ts:27`–`:35`                                            |
| `eventMembers` schema + indexes          | `convex/schema.ts:83`–`:95`                                            |
| `users.role`                             | `convex/schema.ts:22`                                                  |
| Member rows cascade on event delete      | `convex/lib/events.ts:18`                                              |
| Client rank mirror                       | `src/lib/roles.ts:6`, `:14`                                            |
| Role labels                              | `src/lib/roles.ts:23`                                                  |
| Role context                             | `src/components/dashboard/event-provider.tsx:27`, `:60`, `:69`         |
| Sidebar `NAV_ITEMS` + filter             | `src/components/dashboard/dashboard-sidebar.tsx:29`, `:116`            |
| Members page role gate                   | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:18`, `:26` |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
