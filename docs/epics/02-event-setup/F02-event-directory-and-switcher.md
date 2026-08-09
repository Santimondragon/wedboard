---
id: EP-02-F02
title: Event Directory & Switcher
epic: EP-02 Event Setup
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: [EP-02-F01]
---

# EP-02-F02 — Event Directory & Switcher

## 1. Summary

A user may hold roles on several events at once — their own wedding, plus boards shared with
them as a co-owner or editor. This feature is how they find and move between those boards: a
directory at `/dashboard` listing every event they belong to, and a switcher in the event
sidebar that jumps between boards without leaving the current page context. The directory is
deliberately a list, not a redirect — even a user with exactly one event sees it and chooses
to enter.

## 2. Actors & Permissions

| Actor                | Access     | Notes                                                       |
| -------------------- | ---------- | ----------------------------------------------------------- |
| Owner                | Full       | Sees every event they own                                   |
| Co-owner (`planner`) | Full       | Shared events appear alongside owned ones, undifferentiated |
| Editor               | Full       | Same                                                        |
| Viewer               | Full       | Same — the listing is membership-based, with no role floor  |
| Public guest         | None       | Behind Clerk middleware                                     |
| Superadmin           | Redirected | `/dashboard` client-redirects to `/admin` (EP-15)           |

`listMyEvents` gates on `requireUser` only and reads the caller's `eventMembers` rows, so
**any** membership role lists the event (`convex/events.ts:25`). Entering a board is gated
separately by `getEventBySlug` → `requireEventAccess`
(`convex/events.ts:57`). See [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F02-01** — As a user with several events, I want a directory of all of them so that
  I can choose which one to work on.
- **US-02-F02-02** — As a collaborator, I want events shared with me to appear in the same
  list as my own so that I have one place to start.
- **US-02-F02-03** — As a user deep inside one board, I want to switch to another board from
  the sidebar so that I do not have to navigate back out.
- **US-02-F02-04** — As a superadmin, I want to land on the platform console instead of a
  personal event list.

## 4. Entry Points

| Entry point          | Route / control                                                       | Actor                                                  |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Event directory      | `/dashboard`                                                          | Any signed-in user                                     |
| Post-sign-in landing | Clerk `fallbackRedirectUrl="/dashboard"` (EP-01)                      | Any signed-in user                                     |
| Event switcher       | Sidebar dropdown on every `/dashboard/[eventSlug]/*` route            | Editor+ (the sidebar is only rendered inside an event) |
| Board card           | Click anywhere on a directory card → `/dashboard/{slug}`              | Any member                                             |
| Wedboard logo        | Sidebar logo links home (`/admin` for superadmins, else `/dashboard`) | Any member                                             |

## 5. UX Flow

### Happy path — WF-02-02 Switch between event boards

1. The user opens `/dashboard`. The page issues two queries: `api.users.getCurrentUser` and
   `api.events.listMyEvents` (`src/app/(dashboard)/dashboard/page.tsx:20`).
2. `listMyEvents` reads the caller's `eventMembers` rows via `by_userId` (capped at 100), maps
   them to event ids, fetches each event, and drops nulls (`convex/events.ts:27`).
3. Each event renders as a card showing name, `StatusBadge`, formatted date and venue name
   (`src/app/(dashboard)/dashboard/page.tsx:82`).
4. Clicking a card pushes `/dashboard/{event.slug}`
   (`src/app/(dashboard)/dashboard/page.tsx:86`).
5. Inside the board, `EventProvider` resolves the slug through `getEventBySlug` and supplies
   `{...event, myRole}` to the subtree (`src/components/dashboard/event-provider.tsx:27`).
6. The sidebar switcher lists the same `listMyEvents` result, marks the current one with a
   check, and pushes `/dashboard/{slug}` on selection
   (`src/components/dashboard/event-switcher.tsx:50`).

### Alternate & edge paths

- **A1** — Zero events → the directory renders the `EmptyState` "Welcome to Wedboard" with a
  Create Event action (`src/app/(dashboard)/dashboard/page.tsx:52`); the switcher renders a
  disabled "No events yet" item (`src/components/dashboard/event-switcher.tsx:60`).
- **A2** — Exactly one event → the directory still lists it. **There is no auto-redirect into
  the board.**
- **A3** — The caller is a superadmin (`currentUser.role === "superadmin"`) → an effect calls
  `router.replace("/admin")` and the page renders `LoadingState` in the meantime
  (`src/app/(dashboard)/dashboard/page.tsx:26`).
- **A4** — Switching between boards keeps the user on the target board's Overview, not on the
  equivalent sub-page of the previous board
  (`src/components/dashboard/event-switcher.tsx:27`).
- **E1** — Navigating directly to `/dashboard/{unknown-slug}` or to an event the user is not a
  member of → `getEventBySlug` returns `null` (unknown slug) or `requireEventAccess` throws;
  `EventProvider` renders the "Event not found" panel with a "Back to events" link
  (`src/components/dashboard/event-provider.tsx:33`).
- **E2** — A membership row survives its event (should not happen after the F06 cascade) →
  `listMyEvents` filters the `null` out silently (`convex/events.ts:35`).

## 6. States

| State             | Behavior                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | `currentUser === undefined` → full-screen `LoadingState "Loading…"`; `events === undefined` → `LoadingState "Loading your events…"`; the switcher label reads "Loading…" |
| Empty             | "Welcome to Wedboard" empty state with a Create Event action; switcher shows a disabled "No events yet"                                                                  |
| Error             | No dedicated error boundary — a thrown query surfaces through the Convex client, not as in-page copy                                                                     |
| Success           | Card grid inside a `max-w-3xl` column, headed "Your Events" with an "N event(s)" subtitle                                                                                |
| Disabled / locked | The switcher trigger is always enabled; the current event is marked with a `Check` icon rather than disabled                                                             |
| Mobile            | The sidebar (and therefore the switcher) is `hidden md:flex` — **on small screens there is no switcher at all** (`src/components/dashboard/dashboard-shell.tsx:13`)      |

## 7. UI Specification

### Screens & components

| Element                                    | Component         | Path                                               |
| ------------------------------------------ | ----------------- | -------------------------------------------------- |
| Directory page                             | `DashboardPage`   | `src/app/(dashboard)/dashboard/page.tsx:18`        |
| Minimal top bar (logo + `UserButton`)      | inline            | `src/app/(dashboard)/dashboard/page.tsx:44`        |
| Event card                                 | shadcn `Card`     | `src/app/(dashboard)/dashboard/page.tsx:83`        |
| Status pill                                | `StatusBadge`     | `src/components/app/status-badge.tsx:38`           |
| Empty state                                | `EmptyState`      | `src/components/app/empty-state.tsx`               |
| Sidebar switcher                           | `EventSwitcher`   | `src/components/dashboard/event-switcher.tsx:18`   |
| Event resolution + not-found               | `EventProvider`   | `src/components/dashboard/event-provider.tsx:24`   |
| Board chrome                               | `DashboardShell`  | `src/components/dashboard/dashboard-shell.tsx:10`  |
| Board header (title · event name · status) | `DashboardHeader` | `src/components/dashboard/dashboard-header.tsx:28` |

The directory intentionally renders **no** event sidebar — its header is only the Wedboard
logo and the Clerk `UserButton`.

### Fields & validation

None — this feature is read-only navigation.

### Copy deck

None. The directory and switcher are English dashboard chrome, not guest-facing.

## 8. Data Model

| Table          | Fields                                        | Read / Write | Index                          |
| -------------- | --------------------------------------------- | ------------ | ------------------------------ |
| `eventMembers` | `userId`, `eventId`                           | Read         | `by_userId`                    |
| `events`       | `name`, `slug`, `status`, `date`, `venueName` | Read (by id) | — (direct `ctx.db.get`)        |
| `users`        | `role`                                        | Read         | via `api.users.getCurrentUser` |

The directory is membership-driven, not ownership-driven: an event appears because the caller
has an `eventMembers` row, which is exactly why owned and shared events are indistinguishable
in the list. No writes occur.

## 9. Backend Contract

| Function                    | Type  | Args     | Returns                      | Guard                                | Caps                    |
| --------------------------- | ----- | -------- | ---------------------------- | ------------------------------------ | ----------------------- |
| `api.events.listMyEvents`   | query | `{}`     | `Doc<"events">[]`            | `requireUser`                        | `take(100)` memberships |
| `api.events.getEventBySlug` | query | `{slug}` | `{...event, myRole} \| null` | `requireUser` + `requireEventAccess` | —                       |
| `api.users.getCurrentUser`  | query | `{}`     | `Doc<"users"> \| null`       | —                                    | —                       |

Sources: `convex/events.ts:22`, `convex/events.ts:48`, `convex/users.ts`.

## 10. Business Rules

- **BR-02-F02-01** `[AS-BUILT]` — The directory lists every event the caller has an
  `eventMembers` row for, regardless of role (`convex/events.ts:27`).
- **BR-02-F02-02** `[AS-BUILT]` — Owned and shared events are listed together with no visual
  distinction and no role indicator (`src/app/(dashboard)/dashboard/page.tsx:82`).
- **BR-02-F02-03** `[AS-BUILT]` — At most 100 memberships are read; events beyond that are
  invisible to the directory and the switcher (`convex/events.ts:30`).
- **BR-02-F02-04** `[AS-BUILT]` — `/dashboard` never auto-redirects a non-superadmin into an
  event, even when they hold exactly one (`src/app/(dashboard)/dashboard/page.tsx:26`).
- **BR-02-F02-05** `[AS-BUILT]` — A user whose `users.role` is `"superadmin"` is
  client-redirected from `/dashboard` to `/admin` and never sees the directory
  (`src/app/(dashboard)/dashboard/page.tsx:28`).
- **BR-02-F02-06** `[AS-BUILT]` — Boards are addressed by event key, never by event id:
  every navigation target is `/dashboard/{slug}`
  (`src/app/(dashboard)/dashboard/page.tsx:86`, `src/components/dashboard/event-switcher.tsx:28`).
- **BR-02-F02-07** `[AS-BUILT]` — Switching events always lands on the target board's Overview,
  discarding the current sub-page (`src/components/dashboard/event-switcher.tsx:27`).
- **BR-02-F02-08** `[AS-BUILT]` — Resolving a slug the caller cannot access renders the
  "Event not found" panel — the same panel as a non-existent slug, so membership is not
  disclosed (`src/components/dashboard/event-provider.tsx:33`).
- **BR-02-F02-09** `[AS-BUILT]` — The whole dashboard subtree is gated on Convex auth state
  (`AuthLoading` / `Authenticated` / `Unauthenticated`), so no listing query runs before the
  Clerk token is attached (`src/app/(dashboard)/layout.tsx:17`).

## 11. Acceptance Criteria

- **AC-02-F02-01** — **Given** a user who owns one event and is an editor on another **When**
  they open `/dashboard` **Then** both events are listed and the subtitle reads "2 events".
- **AC-02-F02-02** — **Given** a user with exactly one event **When** they open `/dashboard`
  **Then** the directory renders and no redirect occurs.
- **AC-02-F02-03** — **Given** a superadmin **When** they open `/dashboard` **Then** the
  browser replaces the URL with `/admin` and the event list is never shown.
- **AC-02-F02-04** — **Given** a user with zero events **When** they open `/dashboard`
  **Then** the "Welcome to Wedboard" empty state renders with a Create Event action.
- **AC-02-F02-05** — **Given** a user on `/dashboard/{a}/guests` **When** they pick event `b`
  from the switcher **Then** the browser navigates to `/dashboard/{b}` (Overview), not
  `/dashboard/{b}/guests`.
- **AC-02-F02-06** — **Given** a user who is not a member of event `x` **When** they open
  `/dashboard/{x}` directly **Then** the "Event not found" panel renders with a "Back to
  events" link.
- **AC-02-F02-07** — **Given** an archived event **When** the directory lists it **Then** the
  card shows the grey "Archived" badge and remains clickable.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                              |
| ------------ | ----------- | ------------------------------------------------------------------------------------- |
| TC-02-F02-01 | integration | `listMyEvents` returns events for owner, planner, editor and viewer memberships alike |
| TC-02-F02-02 | integration | `listMyEvents` omits events the caller has no membership row for                      |
| TC-02-F02-03 | integration | `getEventBySlug` returns `null` for an unknown slug and throws for a non-member       |
| TC-02-F02-04 | unit        | `getEventBySlug` payload includes `myRole` matching the caller's membership           |
| TC-02-F02-05 | e2e         | Superadmin sign-in lands on `/admin`, not on the event directory                      |
| TC-02-F02-06 | e2e         | Switching events from the sidebar navigates to the target Overview                    |

### Manual QA checklist

- [ ] With two events, confirm both cards render name, status, date and venue.
- [ ] Confirm the directory header has no event sidebar.
- [ ] Confirm a shared (editor) event is listed and opens with a restricted sidebar.
- [ ] Confirm the switcher shows a check next to the current event.
- [ ] On a narrow viewport, confirm the sidebar is hidden and note that switching is impossible.

## 13. Non-Functional

| Concern          | Specification                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 100 memberships per user (`take(100)`); the per-id `ctx.db.get` fan-out is bounded by that                                              |
| Performance      | One indexed membership query plus N point reads per directory load; the switcher re-uses the same query through the Convex client cache |
| Security & authz | Listing exposes only events the caller is a member of; the not-found panel does not distinguish "missing" from "forbidden"              |
| Accessibility    | Cards are `div`s with an `onClick`, not links or buttons — they are not keyboard focusable                                              |
| i18n             | English only                                                                                                                            |
| Analytics        | None                                                                                                                                    |

## 14. TODOs & Open Questions

- **TODO-02-04** `[P2]` `[ADD]` — `listMyEvents` caps at 100 memberships, returns events in
  membership-row order, and offers no search, sort or pagination
  (`convex/events.ts:30`).
  - **Rationale:** A planner working across many weddings silently loses events past the cap
    and cannot order the list by date.
  - **Proposed rule:** The directory paginates and sorts by event date descending, and the
    switcher offers a filter box.
- **TODO-02-05** `[P2]` `[ADD]` — A superadmin can never reach their own event directory: the
  redirect at `/dashboard` is unconditional (`src/app/(dashboard)/dashboard/page.tsx:28`).
  - **Rationale:** A superadmin who also hosts a wedding has no route to their personal event
    list, only to the global `/admin` table.
  - **Proposed rule:** `/admin` links to a superadmin-reachable personal event directory, or
    the redirect becomes a one-time suggestion rather than a hard replace.

### Open questions

- **Q1** — Should shared events be visually separated from owned events (a "Shared with me"
  group or a role chip)? Today `listMyEvents` returns no role, so the client cannot tell.
- **Q2** — Should the switcher preserve the current sub-page when switching boards
  (`/dashboard/{a}/guests` → `/dashboard/{b}/guests`)?

## 15. Traceability

| Concern                  | Source                                                    |
| ------------------------ | --------------------------------------------------------- |
| Route (directory)        | `src/app/(dashboard)/dashboard/page.tsx:18`               |
| Route (auth gate)        | `src/app/(dashboard)/layout.tsx:17`                       |
| Route (event layout)     | `src/app/(dashboard)/dashboard/[eventSlug]/layout.tsx:10` |
| UI (superadmin redirect) | `src/app/(dashboard)/dashboard/page.tsx:26`               |
| UI (empty state)         | `src/app/(dashboard)/dashboard/page.tsx:52`               |
| UI (switcher)            | `src/components/dashboard/event-switcher.tsx:18`          |
| UI (event resolution)    | `src/components/dashboard/event-provider.tsx:24`          |
| UI (board header)        | `src/components/dashboard/dashboard-header.tsx:28`        |
| UI (status pill)         | `src/components/app/status-badge.tsx:38`                  |
| Backend (listing)        | `convex/events.ts:22`                                     |
| Backend (resolution)     | `convex/events.ts:48`                                     |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                      |
| ------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-02-06 closed.** Directory cards are real `Link`s (keyboard-activatable, middle-clickable). The switcher is now a `Command`-based searchable combobox |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                                                                              |
