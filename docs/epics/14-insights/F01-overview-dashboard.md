---
id: EP-14-F01
title: Overview Dashboard
epic: EP-14 Insights
version: 2.0.0
status: defective
last_updated: 2026-08-09
depends_on:
  [EP-01-F01, EP-02-F01, EP-03-F01, EP-04-F01, EP-05-F01, EP-11-F01, EP-12-F02]
---

# EP-14-F01 — Overview Dashboard

## 1. Summary

The overview dashboard is the first screen a host sees after opening an event. It answers
"where do we stand?" with a row of metric cards computed live from the event's guests and
invitations — how many people are invited, how many have accepted, declined or not yet
answered, and how much operational work is still outstanding. Below the cards sit four Quick
Action shortcuts into the sections most often needed next, and, for a brand-new event with no
invitations, an affordance to seed demo data. The feature is `partial`: one of the eight
computed values is never displayed, two of the displayed cards measure something guests cannot
influence, and every count is silently capped at 1000 rows.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                     |
| -------------------- | ------ | ------------------------------------------------------------------------- |
| Owner                | Read   |                                                                           |
| Co-owner (`planner`) | Read   |                                                                           |
| Editor               | Read   | Minimum role that can load the page                                       |
| Viewer               | None   | `requireEventEditor` defaults to `minRole: "editor"`, so the query throws |
| Public guest         | None   | No aggregate is exposed publicly                                          |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
`requireEventEditor(ctx, args.eventId)` (`convex/dashboard.ts:8`).

## 3. User Stories

- **US-14-F01-01** — As an editor, I want a live count of invitations and guests so that I
  know the size of the event without opening the guest table.
- **US-14-F01-02** — As an editor, I want the attending / declined / pending split so that I
  can judge RSVP progress.
- **US-14-F01-03** — As an editor, I want to see how many attending guests are missing a menu
  choice so that I can chase the caterer's headcount.
- **US-14-F01-04** — As an editor, I want to see how many guests still lack a table so that I
  know how much seating work is left.
- **US-14-F01-05** — As an editor, I want one-click shortcuts to invitations, guests, menu and
  tables so that the overview is a launch pad rather than a dead end.
- **US-14-F01-06** — As a new host with an empty event, I want to seed demo data so that I can
  see the product populated before entering my own.

## 4. Entry Points

| Entry point                                | Route / control                                           | Actor                                                   |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| Sidebar link "Overview"                    | `/dashboard/[eventSlug]`                                  | Editor+ (`minRole: "editor"` in `NAV_GROUPS`)           |
| Event switcher — selecting any event       | `/dashboard/{slug}`                                       | Editor+ (`src/components/dashboard/event-switcher.tsx`) |
| Events list — opening an event             | `/dashboard/{slug}`                                       | Editor+                                                 |
| Quick Actions — "Manage Invitations"       | `/dashboard/{slug}/invitations`                           | Editor+ (`.../[eventSlug]/page.tsx:96`)                 |
| Quick Actions — "View Guests"              | `/dashboard/{slug}/guests`                                | Editor+ (`:97`)                                         |
| Quick Actions — "Menu & Drinks"            | `/dashboard/{slug}/menu`                                  | Editor+ (`:98`)                                         |
| Quick Actions — "Tables"                   | `/dashboard/{slug}/tables`                                | Editor+ (`:99`)                                         |
| "Seed Demo Data" button (empty state only) | in-page mutation, then `router.push` to the **new** event | Any authenticated user (`:140`)                         |

The metric cards themselves are **not** links; there is no deep link to a filtered guest list
(TODO-14-04).

## 5. UX Flow

### Happy path

1. Editor opens `/dashboard/[eventSlug]` → `EventProvider` resolves the slug to the event and
   `EventOverviewPage` reads `useEvent()._id` (`.../[eventSlug]/page.tsx:26-27`).
2. The page issues `useQuery(api.dashboard.getOverviewStats, { eventId })` (`:29`).
3. The Convex handler guards on `requireEventEditor`, then reads the event's invitations and
   guests in parallel, each bounded at `.take(1000)` (`convex/dashboard.ts:13-22`).
4. One pass over the guest array increments the six per-guest tallies
   (`convex/dashboard.ts:34-43`); the two totals are array lengths (`:24-25`).
5. The page maps the returned object into seven card descriptors — five direct, two computed
   by subtraction (`.../[eventSlug]/page.tsx:54-93`) — and renders them in a
   responsive grid of `StatCard`s, each carrying an `href` into the list it summarises.
6. The Quick Actions card renders four outline buttons wrapped in `next/link` (`:116-132`).

### Alternate & edge paths

- **A1** — `stats === undefined` (query in flight) → the page returns early and renders eight
  `Skeleton` placeholders of height `h-28` in the same grid (`.../[eventSlug]/page.tsx:42-52`).
  Note the skeleton count (8) does not match the rendered card count (7).
- **A2** — `stats.totalInvitations === 0` → a dashed-border card appears below Quick Actions
  offering "Seed Demo Data" (`:134-145`).
- **A3** — Seeding succeeds → a success toast fires and the router navigates to
  `/dashboard/{result.slug}` — **a different, newly created demo event**, not the one the host
  was looking at (`:34-36`; `convex/seed.ts:459` returns `{ eventId, slug }`).
- **A4** — Seeding fails (for example the caller already owns three or more events) → the
  catch branch fires `toast.error("Failed to seed demo data")` and the page is unchanged
  (`:37-39`).
- **A5** — The event has invitations but zero guests → every guest-derived card shows `0`, but
  its hint reads "No guests yet" / "No guests to seat yet" rather than a completion ratio, so
  "nothing to do" is distinguishable from "no data yet" (BR-14-F01-21).
- **E1** — The caller is a `viewer` or not a member → `requireEventEditor` throws. `useQuery`
  re-throws, and the `(dashboard)` route error boundary (`src/app/(dashboard)/error.tsx`)
  renders `StateBlock kind="error"` with a retry inside the shell (BR-14-F01-22).
- **E2** — The event holds more than 1000 guests or more than 1000 invitations → the counts
  reflect only the first 1000 rows the index returns, with no indication (DEF-14-01).

### The 8 metrics, exactly as computed

| #   | Value                  | Computation                                                                         | What it counts                                                                                                                          |
| --- | ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `totalInvitations`     | `invitations.length` after `.take(1000)` on `by_eventId` (`convex/dashboard.ts:24`) | Every invitation row for the event — active **and** inactive, sent and unsent                                                           |
| 2   | `totalGuests`          | `guests.length` after `.take(1000)` on `by_eventId` (`:25`)                         | Every guest row for the event — including `isPlusOne` records, declined guests, and guests with no `invitationId`                       |
| 3   | `attendingCount`       | `guest.rsvpStatus === "attending"` (`:35`)                                          | Guests whose RSVP is attending, +1 records included                                                                                     |
| 4   | `declinedCount`        | `else if (guest.rsvpStatus === "declined")` (`:36`)                                 | Guests whose RSVP is declined                                                                                                           |
| 5   | `pendingCount`         | the trailing `else` (`:37`)                                                         | Everything that is neither attending nor declined — in practice `"pending"`, but the branch is a catch-all rather than an equality test |
| 6   | `allergyCount`         | `guest.allergies && guest.allergies.trim() !== ""` (`:39`)                          | Guests carrying any non-blank allergies text, **regardless of RSVP status**                                                             |
| 7   | `menuCompletionCount`  | `guest.rsvpStatus === "attending" && guest.menuOptionId` (`:40-41`)                 | Attending guests who have a menu option assigned                                                                                        |
| 8   | `tableAssignmentCount` | `guest.tableId` is truthy (`:42`)                                                   | Guests holding a table assignment, **regardless of RSVP status**                                                                        |

### How each number can mislead

| Metric                 | Misleading because                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalInvitations`     | Counts inactive invitations (`isActive: false`), which are not publicly resolvable (`convex/lib/public.ts:56`). A host who deactivated an invitation still sees it in the total. It is also not a household count — nothing prevents an invitation with zero linked guests                                                                                                                                                                                                                                                                                  |
| `totalGuests`          | Inflated on both ends. **+1 records are ordinary guest rows** (`isPlusOne: true`) and are counted like anyone else, so materializing a +1 raises the total by one. **Declined guests are never removed** — `applyDeclineEffects` deletes only their special-event RSVPs and their +1 (`convex/lib/guests.ts:51-59`) — so the total is "people on the list", not "people coming". Un-invited guests (no `invitationId`) are also included, so the number can exceed the sum of every invitation's roster                                                     |
| `attendingCount`       | A materialized +1 counts as a full attendee even when it holds a placeholder name; the card's description "Confirmed guests" reads as a headcount, which is correct for catering but does not match "invitations that answered yes"                                                                                                                                                                                                                                                                                                                         |
| `declinedCount`        | A declined guest keeps its `invitationId`, its `tableId`, its `menuOptionId` and its allergies text, so it keeps contributing to metrics 6, 7 and 8's denominators                                                                                                                                                                                                                                                                                                                                                                                          |
| `pendingCount`         | Implemented as a catch-all `else`, so any guest row whose `rsvpStatus` is absent or unexpected is silently reported as pending rather than surfacing as a data error                                                                                                                                                                                                                                                                                                                                                                                        |
| `allergyCount`         | **Never displayed** (DEF-14-03) — the host is not shown it anywhere. It also counts declined guests' allergy notes, and counts any non-blank string including a guest who wrote the equivalent of "none"                                                                                                                                                                                                                                                                                                                                                    |
| `menuCompletionCount`  | Measures a field **no guest can set**. The elegant template implements no `menuSelection` or `drinkSelection` block (`src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`), so although `submitPublicRsvp` accepts `menuOptionId` (`convex/guests.ts:478`), nothing on the public page ever sends it. The only writer is the host's own guest dialog (`src/components/guests/guest-details-sheet.tsx:138`). The derived "Menu Selections Missing" card therefore tracks host data entry, not guest response — see DEF-14-02 and EP-11 |
| `tableAssignmentCount` | Counts declined guests who still hold a seat, so the derived "Guests Without Table" (`totalGuests - tableAssignmentCount`) counts guests who will never attend as outstanding seating work (DEF-14-04)                                                                                                                                                                                                                                                                                                                                                      |

## 6. States

| State             | Behavior                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Seven `Skeleton` blocks matching the rendered card layout (4 + 3), plus placeholders for the two panels; Quick Actions and the seed card are not rendered  |
| Empty             | There is no empty state for the metrics — all cards render with `0`. When `totalInvitations === 0` an extra dashed card offers demo seeding (`:134-145`)   |
| Error             | The `(dashboard)/error.tsx` boundary renders `StateBlock kind="error"` with a `reset` retry, inside the shell (E1). The page writes no inline error branch |
| Success           | Seven metric cards + Quick Actions card                                                                                                                    |
| Disabled / locked | None. Nothing on the page is disabled; the sidebar hides the route below `editor`                                                                          |
| Mobile            | The metric grid is `grid-cols-2` below the `md` breakpoint and `md:grid-cols-4` above; Quick Actions uses the same responsive pattern (`:104, :121`)       |

## 7. UI Specification

### Screens & components

| Element                 | Component                     | Path                                                    |
| ----------------------- | ----------------------------- | ------------------------------------------------------- |
| Overview page           | `EventOverviewPage`           | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:24` |
| Metric card             | `StatCard`                    | `src/components/app/stat-card.tsx`                      |
| Loading placeholder     | `Skeleton`                    | `src/components/ui/skeleton.tsx`                        |
| Page header             | `PageHeader`                  | `src/components/app/page-header.tsx`                    |
| Quick Actions container | `Panel`                       | `src/components/app/panel.tsx`                          |
| Error surface           | `StateBlock` (route boundary) | `src/app/(dashboard)/error.tsx`                         |
| Event resolution        | `useEvent()`                  | `src/components/dashboard/event-provider.tsx`           |

`StatCard` accepts `{ label, value, hint?, icon?, href?, tone? }`
(`src/components/app/stat-card.tsx`). It replaced `dashboard/metric-card.tsx`, which was
deleted along with its never-passed `trend` prop. The overview passes `href` on every card, so
each metric is a real link into the list it summarises (BR-14-F01-19). Values render in
`text-metric` (tabular numerals).

### Fields & validation

None. The page has no inputs; its only control besides navigation links is the
"Seed Demo Data" button.

### Copy deck

The dashboard is host-facing and entirely in English.

| Key                   | Copy                                                          | Source                                                  |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Card 1 title          | `Total Invitations`                                           | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:56` |
| Card 2 title          | `Total Guests`                                                | `:61`                                                   |
| Card 3 title          | `Attending`                                                   | `:66`                                                   |
| Card 3 description    | `Confirmed guests`                                            | `:69`                                                   |
| Card 4 title          | `Declined`                                                    | `:72`                                                   |
| Card 5 title          | `Pending`                                                     | `:77`                                                   |
| Card 6 title          | `Menu Selections Missing`                                     | `:82`                                                   |
| Card 6 description    | `Attending without menu choice`                               | `:85`                                                   |
| Card 7 title          | `Guests Without Table`                                        | `:88`                                                   |
| Card 7 description    | `Need seating assignment`                                     | `:91`                                                   |
| Quick Actions heading | `Quick Actions`                                               | `:118`                                                  |
| Quick action 1        | `Manage Invitations`                                          | `:96`                                                   |
| Quick action 2        | `View Guests`                                                 | `:97`                                                   |
| Quick action 3        | `Menu & Drinks`                                               | `:98`                                                   |
| Quick action 4        | `Tables`                                                      | `:99`                                                   |
| Seed prompt           | `No invitations yet. Seed demo data to explore all features.` | `:138`                                                  |
| Seed button           | `Seed Demo Data`                                              | `:141`                                                  |
| Seed success toast    | `Demo data seeded! Redirecting…`                              | `:35`                                                   |
| Seed error toast      | `Failed to seed demo data`                                    | `:38`                                                   |

## 8. Data Model

| Table         | Fields                                               | Read / Write | Index                                   |
| ------------- | ---------------------------------------------------- | ------------ | --------------------------------------- |
| `invitations` | row count only                                       | Read         | `by_eventId` (`convex/dashboard.ts:16`) |
| `guests`      | `rsvpStatus`, `allergies`, `menuOptionId`, `tableId` | Read         | `by_eventId` (`convex/dashboard.ts:20`) |

No table is written. The feature stores nothing: there is no `eventStats` table, no cached
aggregate and no snapshot row, so the numbers exist only for the lifetime of a query result.

**Lifecycle side effects.** None from this feature. The metrics _react_ to lifecycle events
owned elsewhere: materializing a +1 (EP-04) raises `totalGuests` and, once attending,
`attendingCount`; declining a guest (EP-04 / EP-07) moves it from pending to declined but
leaves `tableId`, `menuOptionId` and `allergies` intact, so metrics 6, 7 and 8 do not adjust;
deleting a guest removes it from every guest-derived metric at once.

The **`by_eventId_and_rsvpStatus` index exists on `guests`** (`convex/schema.ts`) but this
query does not use it — it reads all guests and branches in memory instead (TODO-14-06).

## 9. Backend Contract

| Function                               | Type            | Args                        | Returns                                                                                                                                                  | Guard                                                                      | Caps                                                                                          |
| -------------------------------------- | --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `api.dashboard.getOverviewStats`       | query           | `{ eventId: Id<"events"> }` | `{ totalInvitations, totalGuests, attendingCount, declinedCount, pendingCount, allergyCount, menuCompletionCount, tableAssignmentCount }` — all `number` | `requireEventEditor(ctx, eventId)`                                         | `.take(1000)` on invitations and `.take(1000)` on guests                                      |
| `api.seed.seedDemoEventForCurrentUser` | public mutation | `{}`                        | `{ eventId, slug }`                                                                                                                                      | None beyond authentication; refuses when the caller already owns 3+ events | Creates 5 invitations, 15 guests, 2 special events, 3 menu options, 3 drink options, 6 tables |

`convex/dashboard.ts` exports exactly one function. The seed mutation is specified in EP-02;
it appears here only because the overview page is its sole entry point.

## 10. Business Rules

- **BR-14-F01-01** `[AS-BUILT]` — Reading overview stats requires event membership of at least
  `editor` (`convex/dashboard.ts:8`).
- **BR-14-F01-02** `[AS-BUILT]` — `totalInvitations` is the number of invitation rows for the
  event, without regard to `isActive` or `isSent` (`convex/dashboard.ts:24`).
- **BR-14-F01-03** `[AS-BUILT]` — `totalGuests` is the number of guest rows for the event,
  including `isPlusOne` records, declined guests and guests with no `invitationId`
  (`convex/dashboard.ts:25`).
- **BR-14-F01-04** `[AS-BUILT]` — `attendingCount` counts guests whose `rsvpStatus` is exactly
  `"attending"` (`convex/dashboard.ts:35`).
- **BR-14-F01-05** `[AS-BUILT]` — `declinedCount` counts guests whose `rsvpStatus` is exactly
  `"declined"` (`convex/dashboard.ts:36`).
- **BR-14-F01-06** `[AS-BUILT]` — `pendingCount` counts every guest that is neither attending
  nor declined, as the fall-through branch (`convex/dashboard.ts:37`).
- **BR-14-F01-07** `[AS-BUILT]` — `attendingCount + declinedCount + pendingCount` always
  equals `totalGuests`, because the three branches are mutually exclusive and exhaustive
  (`convex/dashboard.ts:35-37`).
- **BR-14-F01-08** `[AS-BUILT]` — `allergyCount` counts guests whose `allergies` is present and
  non-blank after trimming, at any RSVP status (`convex/dashboard.ts:39`).
- **BR-14-F01-09** `[AS-BUILT]` — `menuCompletionCount` counts only guests that are both
  attending and carry a `menuOptionId` (`convex/dashboard.ts:40-41`).
- **BR-14-F01-10** `[AS-BUILT]` — `tableAssignmentCount` counts every guest with a `tableId`,
  at any RSVP status (`convex/dashboard.ts:42`).
- **BR-14-F01-11** `[AS-BUILT]` — At most 1000 invitation rows and 1000 guest rows are read per
  query (`convex/dashboard.ts:17, 21`).
- **BR-14-F01-12** `[AS-BUILT]` — The overview renders the "Menu Selections Missing" card as
  `attendingCount - menuCompletionCount`, computed on the client
  (`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:83`).
- **BR-14-F01-13** `[AS-BUILT]` — The overview renders the "Guests Without Table" card as
  `totalGuests - tableAssignmentCount`, computed on the client (`.../page.tsx:89`).
- **BR-14-F01-14** `[AS-BUILT]` — Seven metric cards are rendered; `allergyCount` is returned
  but has no card (`.../page.tsx:54-93`).
- **BR-14-F01-15** `[AS-BUILT]` — While the query is in flight the page renders one skeleton
  per rendered card (4 + 3) plus the two panel placeholders, and nothing else. _(Changed in
  2.0.0; was eight placeholders for seven cards — TODO-14-01.)_
- **BR-14-F01-16** `[AS-BUILT]` — The "Seed Demo Data" card is rendered only when
  `totalInvitations === 0` (`.../page.tsx:134`).
- **BR-14-F01-17** `[AS-BUILT]` — A successful seed navigates to the slug returned by the
  mutation — the newly created demo event — not the event currently open
  (`.../page.tsx:36`; `convex/seed.ts:459`).
- **BR-14-F01-18** `[AS-BUILT]` — The four Quick Action links are built from `event.slug` and
  point at invitations, guests, menu and tables (`.../page.tsx:95-100`).
- **BR-14-F01-19** `[AS-BUILT]` — Every metric card is a link: the page passes an `href` to
  each `StatCard`, pointing at the list the metric summarises (guests, invitations, menu or
  tables) under the current `event.slug`. _(Changed in 2.0.0; cards were previously static —
  TODO-14-04.)_
- **BR-14-F01-21** `[AS-BUILT]` — A card whose underlying set is empty renders a zero-data hint
  ("No guests yet", "No guests to seat yet") instead of a completion ratio, so `0` meaning
  "done" is distinguishable from `0` meaning "nothing here yet". _(Added in 2.0.0 —
  TODO-14-09.)_
- **BR-14-F01-22** `[AS-BUILT]` — The page renders no inline error branch. A thrown query error
  is handled by the `(dashboard)` route error boundary, which renders `StateBlock kind="error"`
  with a retry. _(Added in 2.0.0 — TODO-14-10.)_
- **BR-14-F01-20** `[AS-BUILT]` — The query writes nothing and stores no snapshot; every value
  is recomputed per read (`convex/dashboard.ts:5-55`).

## 11. Acceptance Criteria

- **AC-14-F01-01** — **Given** a user whose event role is `viewer` **When** they load
  `/dashboard/[eventSlug]` **Then** `getOverviewStats` throws and no metric is returned.
  _(BR-14-F01-01)_
- **AC-14-F01-02** — **Given** an event with 3 active and 2 inactive invitations **When** the
  overview loads **Then** "Total Invitations" reads `5`. _(BR-14-F01-02)_
- **AC-14-F01-03** — **Given** an event with 10 named guests, 2 materialized +1 records and 1
  un-invited guest **When** the overview loads **Then** "Total Guests" reads `13`.
  _(BR-14-F01-03)_
- **AC-14-F01-04** — **Given** 4 attending guests **When** the overview loads **Then**
  "Attending" reads `4`. _(BR-14-F01-04)_
- **AC-14-F01-05** — **Given** 2 declined guests **When** the overview loads **Then**
  "Declined" reads `2`. _(BR-14-F01-05)_
- **AC-14-F01-06** — **Given** 5 guests at `rsvpStatus: "pending"` **When** the overview loads
  **Then** "Pending" reads `5`. _(BR-14-F01-06)_
- **AC-14-F01-07** — **Given** any event **When** the stats are returned **Then**
  `attendingCount + declinedCount + pendingCount === totalGuests`. _(BR-14-F01-07)_
- **AC-14-F01-08** — **Given** a declined guest whose `allergies` is `"nuts"` **When** the
  stats are returned **Then** `allergyCount` includes that guest. _(BR-14-F01-08)_
- **AC-14-F01-09** — **Given** a pending guest holding a `menuOptionId` **When** the stats are
  returned **Then** `menuCompletionCount` does **not** include that guest. _(BR-14-F01-09)_
- **AC-14-F01-10** — **Given** a declined guest still holding a `tableId` **When** the stats
  are returned **Then** `tableAssignmentCount` includes that guest. _(BR-14-F01-10)_
- **AC-14-F01-11** — **Given** an event with 1200 guest rows **When** the stats are returned
  **Then** `totalGuests` is `1000`. _(BR-14-F01-11)_
- **AC-14-F01-12** — **Given** 6 attending guests of whom 2 hold a menu option **When** the
  overview loads **Then** "Menu Selections Missing" reads `4`. _(BR-14-F01-12)_
- **AC-14-F01-13** — **Given** 13 guests of whom 5 hold a table **When** the overview loads
  **Then** "Guests Without Table" reads `8`. _(BR-14-F01-13)_
- **AC-14-F01-14** — **Given** any loaded overview **When** the cards are counted **Then**
  there are exactly 7, and none of them displays `allergyCount`. _(BR-14-F01-14)_
- **AC-14-F01-15** — **Given** the query has not resolved **When** the page renders **Then**
  the skeleton count equals the rendered card count and no Quick Actions card is shown.
  _(BR-14-F01-15)_
- **AC-14-F01-16** — **Given** an event with at least one invitation **When** the overview
  loads **Then** the "Seed Demo Data" card is absent. _(BR-14-F01-16)_
- **AC-14-F01-17** — **Given** an event with zero invitations **When** the host clicks
  "Seed Demo Data" and it succeeds **Then** the browser navigates to a different event's
  dashboard. _(BR-14-F01-17)_
- **AC-14-F01-18** — **Given** an event whose slug is `casa-verde` **When** the overview loads
  **Then** "View Guests" links to `/dashboard/casa-verde/guests`. _(BR-14-F01-18)_
- **AC-14-F01-19** — **Given** any metric card **When** it is activated by click, keyboard or
  middle-click **Then** the browser navigates to the list it summarises. _(BR-14-F01-19)_
- **AC-14-F01-21** — **Given** an event with zero guests **When** the overview loads **Then**
  the seating and RSVP cards read "No guests yet" rather than a `0 / 0` ratio. _(BR-14-F01-21)_
- **AC-14-F01-22** — **Given** a caller without access **When** the overview loads **Then** a
  styled error panel with a retry is shown inside the shell, not an indefinite skeleton.
  _(BR-14-F01-22)_
- **AC-14-F01-20** — **Given** the overview is loaded twice with no intervening mutation
  **When** the results are compared **Then** they are identical and no document was written.
  _(BR-14-F01-20)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                       |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------- |
| TC-14-F01-01 | integration | `getOverviewStats` throws for a `viewer`, succeeds for an `editor`                             |
| TC-14-F01-02 | integration | Totals count inactive invitations and +1 guest records                                         |
| TC-14-F01-03 | integration | The three RSVP tallies sum to `totalGuests` for a mixed fixture                                |
| TC-14-F01-04 | integration | A guest with `allergies: "   "` is not counted in `allergyCount`                               |
| TC-14-F01-05 | integration | A pending guest with a menu option is excluded from `menuCompletionCount`                      |
| TC-14-F01-06 | integration | A declined guest with a `tableId` is included in `tableAssignmentCount`                        |
| TC-14-F01-07 | integration | With 1200 seeded guests, `totalGuests` returns `1000`                                          |
| TC-14-F01-08 | unit        | The derived card values equal `attending − menuCompletion` and `totalGuests − tableAssignment` |
| TC-14-F01-09 | e2e         | Loading an event overview shows 7 cards, then Quick Actions                                    |
| TC-14-F01-10 | e2e         | An event with no invitations shows the seed card; an event with invitations does not           |
| TC-14-F01-11 | e2e         | Marking a guest attending in the guest table updates the "Attending" card without a reload     |

### Manual QA checklist

- [ ] Cards render two-per-row at 375px and four-per-row on desktop.
- [ ] Skeleton grid appears briefly on a cold load, matches the card count, and is replaced by real numbers.
- [ ] Open the overview for an event you are not a member of and confirm the styled error panel renders.
- [ ] "Attending" increases by one after materializing a +1 through the RSVP flow.
- [ ] "Guests Without Table" decreases by one after seating a guest.
- [ ] "Menu Selections Missing" only changes when a host assigns a menu option in the guest dialog.
- [ ] Each Quick Action lands on the correct section of the same event.
- [ ] The seed card disappears once the first invitation exists.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 1000 invitations and 1000 guests read per query (`convex/dashboard.ts:17, 21`). This is the feature's **scale ceiling**: an event beyond either bound reports numbers that are wrong and cannot be made right without a schema change. The source names the intended remedy — denormalized counters in an `eventStats` table (`convex/dashboard.ts:10-12`) |
| Performance      | Two parallel indexed reads plus one O(n) in-memory pass; no per-row document `get`. The whole page is one query round trip. Cost grows linearly with guest count up to the cap                                                                                                                                                                             |
| Security & authz | Editor floor via `requireEventEditor`; the query takes an `eventId`, never a slug, so no cross-event read is possible. No aggregate is exposed on any public route                                                                                                                                                                                         |
| Accessibility    | Cards are static text in semantic card markup; values are plain numbers with a labelled title. Icons are decorative and carry no `aria-label`; there is no live region, so a screen-reader user is not told when a reactive number changes                                                                                                                 |
| i18n             | English only, hard-coded in the page component. No number or date formatting is locale-aware                                                                                                                                                                                                                                                               |
| Analytics        | None. No page-view or interaction event is emitted                                                                                                                                                                                                                                                                                                         |

### Scale ceiling as a product limit

The overview is the only place a host sees the event's size, so the 1000-row bound is a
product limit, not just an implementation detail: at 1001 guests the dashboard understates the
event and the host has no way to know. There is no error, no "1000+" affordance and no
telemetry that would surface the condition. This is filed as DEF-14-01 rather than a business
rule because no code detects or communicates it.

## 14. TODOs & Open Questions

- **DEF-14-01** `[P1]` — Counts are silently truncated at the `.take(1000)` bound.
  - **Evidence:** `convex/dashboard.ts:17` and `convex/dashboard.ts:21`.
  - **Impact:** An event above the bound reports understated totals with no warning; every
    derived card is wrong too. The host cannot detect the condition from the UI.
  - **Proposed fix:** Detect saturation (read `1001` and compare) and render "1000+", or move
    to the `eventStats` counters the source comment already proposes.
- **DEF-14-02** `[P1]` — "Menu Selections Missing" measures a field no guest can set.
  - **Evidence:** `ELEGANT_BLOCKS` implements no `menuSelection` or `drinkSelection` component
    (`src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`), although the
    block types exist in the model (`src/components/public-invitation/blocks.ts:17`) and
    `submitPublicRsvp` accepts `menuOptionId` (`convex/guests.ts:478`). The only writer is the
    host's guest dialog (`src/components/guests/guest-details-sheet.tsx:138`).
  - **Impact:** For any event where the host does not manually record every attendee's meal,
    the card reads exactly `attendingCount` forever and looks like an RSVP failure rather than
    an unimplemented capability. Cross-reference **EP-11** (Catering).
  - **Proposed fix:** Either implement the guest-facing menu selection block, or relabel the
    card to state it reflects host-recorded choices.
- **DEF-14-03** `[P2]` — `allergyCount` is computed, transmitted and never rendered.
  - **Evidence:** returned at `convex/dashboard.ts:51`; the page's `metrics` array
    (`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:54-93`) contains no card for it, and
    no other component reads it.
  - **Impact:** Allergy data is the one dietary signal guests _can_ submit (the elegant
    `allergies` block writes `guests.allergies` via `submitPublicRsvp` —
    `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:168`), and it is
    absent from every summary. The host must scan the guest table row by row.
  - **Proposed fix:** Render an eighth card, "Guests With Allergies", and link it to the guest
    list filtered accordingly.
- **DEF-14-04** `[P2]` — "Guests Without Table" counts guests who will not attend.
  - **Evidence:** `totalGuests - tableAssignmentCount` (`.../page.tsx:89`) over a
    `tableAssignmentCount` that ignores RSVP status (`convex/dashboard.ts:42`), while
    declining clears neither `tableId` nor RSVP membership
    (`convex/lib/guests.ts:51-59`).
  - **Impact:** The seating work outstanding is overstated by the number of pending and
    declined guests; the number can never reach zero on an event with any declines.
  - **Proposed fix:** Base the card on attending guests only:
    `attendingCount − (attending guests with a tableId)`.
- **TODO-14-03** `[P1]` `[ADD]` — No trend over time.
  - **Rationale:** Nothing stores a historical value: the query writes nothing
    (`convex/dashboard.ts:5-55`) and no table holds a snapshot. A host cannot see whether RSVPs
    are arriving faster this week than last, which is the question that actually drives chasing
    guests.
  - **Proposed rule:** Persist a daily aggregate per event and render an RSVP burn-up
    alongside the cards.
- **TODO-14-05** `[P2]` `[ADD]` — No per-special-invitation breakdown.
  - **Rationale:** Special invitations are first-class sub-events with their own per-guest RSVP
    rows (`guestSpecialEventRsvps`), and an event may have up to two of them, but the overview
    aggregates only the main event. A host running a rehearsal dinner has no headcount for it
    without exporting the guest table.
  - **Proposed rule:** Add an attending/declined/pending tally per special invitation.
- **TODO-14-06** `[P2]` `[CHANGE]` — The RSVP index is unused.
  - **Rationale:** `guests.by_eventId_and_rsvpStatus` exists but `getOverviewStats` reads all
    guests through `by_eventId` and branches in memory (`convex/dashboard.ts:18-37`).
  - **Proposed rule:** Use the index (or the counters of TODO-14-03) so the RSVP split does not
    require a full scan.
- **TODO-14-07** `[P2]` `[ADD]` — No export.
  - **Rationale:** There is no CSV, print view or share link for the overview anywhere in
    `src/`; hosts commonly need to hand a headcount to a caterer or venue.
  - **Proposed rule:** Editor+ can export the current metrics, and the guest list behind them,
    as CSV.
- **TODO-14-08** `[P2]` `[CHANGE]` — The seed affordance navigates away from the open event.
  - **Rationale:** The card appears on _this_ event's empty overview but
    `seedDemoEventForCurrentUser` creates a **new** event and the page redirects to it
    (`.../page.tsx:34-36`). A host who wanted to populate the event in front of them ends up
    somewhere else, with an extra event on their list.
  - **Proposed rule:** Either seed into the current event, or label the button so the outcome
    is unambiguous.
- **TODO-14-11** `[P2]` `[CHANGE]` — Derived cards are computed on the client.
  - **Rationale:** "Menu Selections Missing" and "Guests Without Table" are subtractions in the
    page component (`.../page.tsx:83, 89`), so the definition of each card lives outside the
    query that owns every other metric, and any second consumer would have to re-derive it.
  - **Proposed rule:** Return the displayed values from `getOverviewStats` directly.
- **TODO-14-12** `[P2]` `[CHANGE]` — `pendingCount` is a catch-all branch.
  - **Rationale:** `else pendingCount++` (`convex/dashboard.ts:37`) attributes any unexpected
    `rsvpStatus` to pending instead of surfacing it.
  - **Proposed rule:** Test `=== "pending"` explicitly and count anything else separately.

### Open questions

- **Q1** — Should `totalGuests` mean "people on the list" (today's behavior) or "people
  expected"? A card labelled "Total Guests" that includes declines is the single most likely
  misreading on the page.
- **Q2** — Should +1 records be counted as guests in the headline metrics, broken out
  separately, or excluded until they carry a real name?
- **Q3** — Should declining clear a guest's `tableId` and `menuOptionId`? Doing so would make
  metrics 7 and 8 self-correcting, at the cost of losing the assignment if the guest un-declines.
- **Q4** — Which single metric should be the page's headline? Today all seven carry equal
  visual weight, so nothing signals that "Pending" is the number driving action.
- **Q5** — Is the 1000-row ceiling acceptable as a product boundary (i.e. Wedboard is for
  events under 1000 guests) or must it be lifted before launch?

## 15. Traceability

| Concern                                         | Source                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Route                                           | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:24`                       |
| Query call                                      | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:29`                       |
| Loading skeleton                                | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:42-52`                    |
| Metric descriptors                              | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:54-93`                    |
| Derived card — menu                             | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:83`                       |
| Derived card — tables                           | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:89`                       |
| Quick Actions                                   | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:95-100, 116-132`          |
| Seed affordance                                 | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:32-40, 134-145`           |
| UI — card                                       | `src/components/app/stat-card.tsx`                                            |
| UI — error boundary                             | `src/app/(dashboard)/error.tsx`                                               |
| Backend — query                                 | `convex/dashboard.ts:5`                                                       |
| Backend — guard                                 | `convex/dashboard.ts:8`                                                       |
| Backend — take bounds                           | `convex/dashboard.ts:17, 21`                                                  |
| Backend — counting loop                         | `convex/dashboard.ts:34-43`                                                   |
| Backend — return shape                          | `convex/dashboard.ts:45-54`                                                   |
| Seed mutation return                            | `convex/seed.ts:459`                                                          |
| Decline effects (why metrics 6–8 do not adjust) | `convex/lib/guests.ts:51-59`                                                  |
| No guest-facing menu block                      | `src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`    |
| Allergies written by guests                     | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:168` |
| Menu option written by host                     | `src/components/guests/guest-details-sheet.tsx:138`                           |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                                                                                                                                                   |
| ------- | ---------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0.0   | 2026-08-09 | Dashboard redesign | **TODO-14-01, -02, -04, -09, -10 closed.** BR-14-F01-15 and -19 changed meaning (skeleton count matches cards; every metric card is a link). Added BR-14-F01-21 (zero-data hints) and BR-14-F01-22 (errors belong to the route boundary). `MetricCard` replaced by the shared `StatCard` |
| 1.0.1   | 2026-07-28 | Spec suite v1      | Status corrected to `defective` per authoring-guide §3 (spec carries a behaviour-breaking P1 defect)                                                                                                                                                                                     |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                                                                                                                                                                                                                           |
