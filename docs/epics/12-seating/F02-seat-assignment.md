---
id: EP-12-F02
title: Seat Assignment
epic: EP-12 Seating
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-12-F01, EP-03-F01, EP-04-F01]
---

# EP-12-F02 — Seat Assignment

## 1. Summary

Seat Assignment places individual guests into individual seats at a table, and takes them
back out again. On the tables page every table card renders one row per seat: an occupied
seat shows the guest's name with an `×` to release them, an empty seat shows a dropdown
listing every guest in the event who is not currently seated anywhere. Picking a name seats
that guest immediately — there is no save step and no drag-and-drop.

**This feature is defective.** Two confirmed defects are documented in §14: a seat-numbering
off-by-one that makes the last seat of every table impossible to fill (**DEF-12-01**, P0),
and a permission guard asymmetry that lets a `viewer` seat a guest they are not allowed to
unseat (**DEF-12-02**, P1). The business rules in §10 describe the behavior as built,
including the broken parts.

## 2. Actors & Permissions

| Actor                | Access          | Notes                                                                                                                                                                                       |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full            |                                                                                                                                                                                             |
| Co-owner (`planner`) | Full            |                                                                                                                                                                                             |
| Editor               | Full            | The intended floor for both mutations                                                                                                                                                       |
| Viewer               | **Assign only** | `assignGuestToSeat` is gated by `requireEventAccess` (`convex/tables.ts:171`), which admits any membership; `unassignGuestFromSeat` requires editor (`convex/tables.ts:206`). See DEF-12-02 |
| Public guest         | None            | No public function reads or writes `tableId`/`seatNumber`                                                                                                                                   |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md), where this asymmetry is already
recorded in the capability matrix. The gates applied here are
`requireUser` + `requireEventAccess(ctx, guest.eventId, user._id)` for assignment and
`requireEventEditor(ctx, guest.eventId)` for unassignment.

## 3. User Stories

- **US-12-F02-01** — As an Editor, I want to pick a guest for a specific seat so that I can
  build the seating plan seat by seat.
- **US-12-F02-02** — As an Editor, I want to release a seated guest so that I can rework a
  table.
- **US-12-F02-03** — As an Editor, I want to see which guests are still unseated so that I
  know how much of the plan is left.
- **US-12-F02-04** — As an Editor, I want every seat that a table physically has to be
  fillable so that a 10-seat table holds 10 guests. _(Not satisfied today — DEF-12-01.)_

## 4. Entry Points

| Entry point      | Route / control                                                                                                | Actor                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Seat dropdown    | `"Assign guest..."` select rendered in each empty seat row (`table-card.tsx:187-192`, `seat-select.tsx:19-35`) | Editor+ (and, server-side, viewer — DEF-12-02) |
| Release seat     | `×` button on an occupied seat row (`table-card.tsx:178-183`)                                                  | Editor+                                        |
| Unseated counter | "N unassigned" badge in the page header (`tables/page.tsx:28-32`)                                              | Editor+                                        |

Seat assignment has no route of its own and no deep link; it is entirely in-page.

## 5. UX Flow

### Happy path — seat a guest

1. `api.tables.getTablesAndGuests` returns `{tables, guestsByTable, unassignedGuests}`
   (`convex/tables.ts:20-57`).
2. `TableCard` builds its seat rows as `Array.from({length: table.seatsCount}, (_, i) => i + 1)`
   — i.e. `1..seatsCount` (`table-card.tsx:55`) — and indexes its assigned guests by their
   stored `seatNumber` (`table-card.tsx:56-61`).
3. A seat with no occupant renders `SeatSelect` with that seat number
   (`table-card.tsx:187-192`).
4. The Editor picks a guest; `SeatSelect` calls
   `onAssign(guestId, tableId, seatNumber)` (`seat-select.tsx:22`).
5. `TableGrid.handleAssign` calls `api.tables.assignGuestToSeat({guestId, tableId, seatNumber})`
   (`table-grid.tsx:36-41`).
6. The server loads guest and table, checks they share an event, guards, checks capacity,
   clears any other occupant of that exact seat, and patches the guest
   (`convex/tables.ts:161-198`).
7. The subscription re-renders: the seat row shows the guest's name, and the guest leaves
   every other seat's dropdown.

### Happy path — release a guest

1. The Editor clicks the `×` on an occupied seat row (`table-card.tsx:178-183`).
2. `TableGrid.handleUnassign` calls `api.tables.unassignGuestFromSeat({guestId})`
   (`table-grid.tsx:43-48`).
3. The server clears `tableId` and `seatNumber` (`convex/tables.ts:208-211`), the seat row
   reverts to a dropdown, and the header badge increments.

### Alternate & edge paths

- **A1 — the bump.** Assigning a guest to a seat that already has an occupant does **not**
  fail: the existing occupant is unassigned from the table entirely and the incoming guest
  takes the seat (`convex/tables.ts:178-192`). Because the UI only renders a dropdown on
  _empty_ seats, this path is unreachable from the grid and only occurs on a concurrent write
  or a direct API call.
- **A2 — moving a seated guest.** `unassignedGuests` contains only guests with no `tableId`
  (`convex/tables.ts:41-45`), so a guest who is already seated **never appears** in any seat
  dropdown. Moving someone requires releasing them first, then seating them. See TODO-12-07.
- **A3 — the last seat.** Choosing a guest for the highest-numbered seat of any table always
  fails; the toast reads "Failed to assign guest to seat" and the seat stays empty. This is
  DEF-12-01.
- **A4 — no unassigned guests.** The dropdown opens with an empty list; the placeholder
  "Assign guest..." remains and no empty-list message is shown (`seat-select.tsx:27-33`).
- **A5 — declined guest.** A guest whose `rsvpStatus` is `declined` appears in the dropdown
  like anyone else and can be seated; nothing filters on RSVP status. See TODO-12-04.
- **A6 — +1 guest.** A materialized +1 (`isPlusOne: true`) is an ordinary `guests` row in the
  same event, so it is listed and seatable exactly like a named guest.
- **A7 — guest deleted while seated.** `guests.deleteGuest` removes the row
  (`convex/guests.ts:313-341`); the seat becomes empty on the next render with no seating-side
  cleanup, because the assignment lived on the deleted row.
- **A8 — guest declines while seated.** `applyDeclineEffects` deletes special-invitation RSVPs
  and removes the +1 (`convex/lib/guests.ts:51-60`) but does **not** touch `tableId` or
  `seatNumber`. A declined guest keeps their seat. See TODO-12-04.
- **E1 — cross-event ids** → "Guest and table belong to different events"
  (`convex/tables.ts:168-170`).
- **E2 — unknown guest / table id** → "Guest not found" / "Table not found"
  (`convex/tables.ts:164`, `:166`).
- **E3 — any assignment failure** → the sonner toast "Failed to assign guest to seat"
  (`table-grid.tsx:19`). `useToastMutation` discards the `ConvexError` message, so every cause
  above is indistinguishable to the user.
- **E4 — any release failure** → "Failed to unassign guest" (`table-grid.tsx:23`).

## 6. States

| State             | Behavior                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Handled by the page: three skeleton cards while `getTablesAndGuests` is undefined (`tables/page.tsx:40-45`)              |
| Empty             | No tables → the page's empty state, so no seats render. Tables but no unseated guests → dropdowns render with no options |
| Error             | Mutation failures surface only as toasts; the seat row does not change. There is no optimistic update to roll back       |
| Success           | The seat row switches from dropdown to the guest's name plus an `×`; the header's unassigned badge updates               |
| Disabled / locked | None. Seat controls are never disabled, including on the unassignable last seat (DEF-12-01)                              |
| Mobile            | Seat rows are a flex row inside the card; the card grid collapses to one column below `sm` (`table-grid.tsx:65`)         |

## 7. UI Specification

### Screens & components

| Element                 | Component    | Path                                                        |
| ----------------------- | ------------ | ----------------------------------------------------------- |
| Page + unassigned badge | `TablesPage` | `src/app/(dashboard)/dashboard/[eventSlug]/tables/page.tsx` |
| Mutation wiring         | `TableGrid`  | `src/components/tables/table-grid.tsx`                      |
| Seat rows               | `TableCard`  | `src/components/tables/table-card.tsx`                      |
| Seat dropdown           | `SeatSelect` | `src/components/tables/seat-select.tsx`                     |

### Fields & validation

| Field         | Type           | Required | Rule                                                           | Message                                      |
| ------------- | -------------- | -------- | -------------------------------------------------------------- | -------------------------------------------- |
| `guestId`     | `Id<"guests">` | Yes      | Must resolve (`convex/tables.ts:163-164`)                      | "Guest not found"                            |
| `tableId`     | `Id<"tables">` | Yes      | Must resolve (`convex/tables.ts:165-166`)                      | "Table not found"                            |
| guest ↔ table | —              | Yes      | `guest.eventId === table.eventId` (`convex/tables.ts:168-170`) | "Guest and table belong to different events" |
| `seatNumber`  | number         | Yes      | `seatNumber < table.seatsCount` (`convex/tables.ts:173-175`)   | "Seat number exceeds table capacity"         |

There is no zod schema for seat assignment; `src/lib/validations/table.ts` covers table
creation only. No lower bound is enforced on `seatNumber`: a negative value passes the check
at `convex/tables.ts:173`.

### Copy deck

English-only surface; no guest-facing Spanish copy.

| Key                        | Copy                                         | Source                 |
| -------------------------- | -------------------------------------------- | ---------------------- |
| Seat dropdown placeholder  | "Assign guest..."                            | `seat-select.tsx:25`   |
| Dropdown option            | "{firstName} {lastName}"                     | `seat-select.tsx:31`   |
| Occupied seat label        | "{firstName} {lastName}"                     | `table-card.tsx:176`   |
| Fill indicator             | "{assigned}/{seatsCount} seats filled"       | `table-card.tsx:141`   |
| Unassigned badge           | "{n} unassigned"                             | `tables/page.tsx:31`   |
| Toast — assign error       | "Failed to assign guest to seat"             | `table-grid.tsx:19`    |
| Toast — unassign error     | "Failed to unassign guest"                   | `table-grid.tsx:23`    |
| Server error — capacity    | "Seat number exceeds table capacity"         | `convex/tables.ts:174` |
| Server error — cross-event | "Guest and table belong to different events" | `convex/tables.ts:169` |

Neither mutation declares a `success` message, so a successful seating or release is silent.

## 8. Data Model

| Table    | Fields                  | Read / Write | Index                                                |
| -------- | ----------------------- | ------------ | ---------------------------------------------------- |
| `guests` | `tableId`, `seatNumber` | Read + write | `by_tableId_and_seatNumber` (`convex/schema.ts:155`) |
| `guests` | all fields              | Read         | `by_eventId` (`convex/schema.ts:150`)                |
| `tables` | `seatsCount`, `eventId` | Read         | direct `db.get`                                      |

A seat assignment **is** the pair `(guests.tableId, guests.seatNumber)`
(`convex/schema.ts:147-148`); there is no join table. See the
[epic README](./README.md) for the consequences of that choice.

### Cascades and lifecycle side effects

**Bump.** `assignGuestToSeat` queries `by_tableId_and_seatNumber` for the exact
`(tableId, seatNumber)` pair with `.take(10)`, then iterates the results and patches
`{tableId: undefined, seatNumber: undefined}` on every row whose `_id` differs from the
incoming guest (`convex/tables.ts:178-192`). The `.take(10)` is a defensive bound: since the
index is not a uniqueness constraint, the query can legitimately return more than one row if
duplicates ever got written, and the loop clears all of them. Only after the loop does the
incoming guest get patched (`convex/tables.ts:194-197`). Re-assigning a guest to the seat they
already occupy is a no-op bump followed by an idempotent patch — the `_id` comparison stops
the guest from unassigning themselves.

**Guest deletion.** No seating cleanup exists or is needed: `deleteGuest` deletes the row that
held the assignment (`convex/guests.ts:313-341`).

**Guest decline.** `applyDeclineEffects` does not clear seat fields
(`convex/lib/guests.ts:51-60`), so a declining guest stays seated.

**Table deletion / shrink.** Both release seats; documented in
[EP-12-F01](./F01-manage-tables.md) §8.

**Foreign write path.** `guests.updateGuest` accepts `tableId` and `seatNumber` and patches
them without any capacity, occupancy or cross-event check
(`convex/guests.ts:208-209`, `:216-217`). See TODO-12-06.

## 9. Backend Contract

| Function                           | Type     | Args                             | Returns                                                                                                        | Guard                                                              | Caps                                                       |
| ---------------------------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `api.tables.getTablesAndGuests`    | query    | `{eventId}`                      | `{tables: Doc<"tables">[], guestsByTable: Record<string, Doc<"guests">[]>, unassignedGuests: Doc<"guests">[]}` | `requireEventEditor(ctx, eventId)`                                 | tables `.take(200)`, guests `.take(1000)`                  |
| `api.tables.assignGuestToSeat`     | mutation | `{guestId, tableId, seatNumber}` | `void`                                                                                                         | `requireUser` + `requireEventAccess(ctx, guest.eventId, user._id)` | occupant scan `.take(10)`; `seatNumber < table.seatsCount` |
| `api.tables.unassignGuestFromSeat` | mutation | `{guestId}`                      | `void`                                                                                                         | `requireEventEditor(ctx, guest.eventId)`                           | none                                                       |

## 10. Business Rules

- **BR-12-F02-01** `[AS-BUILT]` — A seat assignment is stored as `guests.tableId` +
  `guests.seatNumber` on the guest row; there is no assignment table
  (`convex/schema.ts:147-148`).
- **BR-12-F02-02** `[AS-BUILT]` — A guest can occupy at most one seat, because the assignment
  is a single pair of fields on their row.
- **BR-12-F02-03** `[AS-BUILT]` — `assignGuestToSeat` rejects the request when the guest and
  the table belong to different events (`convex/tables.ts:168-170`).
- **BR-12-F02-04** `[AS-BUILT]` — `assignGuestToSeat` rejects `seatNumber >= table.seatsCount`
  with "Seat number exceeds table capacity" (`convex/tables.ts:173-175`). The check treats
  seat numbers as **0-based**.
- **BR-12-F02-05** `[AS-BUILT]` — The client generates seat numbers `1..seatsCount`
  (`table-card.tsx:55`) and sends them unchanged (`seat-select.tsx:22`,
  `table-grid.tsx:37-38`), so stored seat numbers are **1-based**. Combined with
  BR-12-F02-04 the highest seat of every table is unassignable — see DEF-12-01.
- **BR-12-F02-06** `[AS-BUILT]` — Assigning a guest to an occupied seat unassigns the current
  occupant from the table entirely (`tableId` and `seatNumber` both cleared) rather than
  failing or swapping (`convex/tables.ts:185-192`).
- **BR-12-F02-07** `[AS-BUILT]` — The bump clears **every** row returned for that
  `(tableId, seatNumber)` pair, up to 10, excluding the incoming guest
  (`convex/tables.ts:178-192`).
- **BR-12-F02-08** `[AS-BUILT]` — Re-assigning a guest to the seat they already hold does not
  unassign them, because the bump loop skips rows whose `_id` equals `args.guestId`
  (`convex/tables.ts:186`).
- **BR-12-F02-09** `[AS-BUILT]` — The unassigned pool is exactly the event's guests with no
  `tableId`, computed in `getTablesAndGuests` (`convex/tables.ts:41-45`).
- **BR-12-F02-10** `[AS-BUILT]` — The pool is not filtered by RSVP status, `isPlusOne`,
  invitation membership, or anything else: every guest of the event with no table is offered
  (`convex/tables.ts:32-45`).
- **BR-12-F02-11** `[AS-BUILT]` — A materialized +1 is seatable exactly like any other guest;
  no code path distinguishes `isPlusOne` in `convex/tables.ts` or in the seating components.
- **BR-12-F02-12** `[AS-BUILT]` — A guest who is already seated is not offered in any seat
  dropdown, so seating is release-then-assign (`convex/tables.ts:41-45`).
- **BR-12-F02-13** `[AS-BUILT]` — Seated guests are returned per table sorted ascending by
  `seatNumber`, with an undefined seat number treated as 0
  (`convex/tables.ts:49-53`).
- **BR-12-F02-14** `[AS-BUILT]` — `unassignGuestFromSeat` clears both `tableId` and
  `seatNumber` in one patch (`convex/tables.ts:208-211`).
- **BR-12-F02-15** `[AS-BUILT]` — `unassignGuestFromSeat` requires `editor`
  (`convex/tables.ts:206`) while `assignGuestToSeat` requires only event membership
  (`convex/tables.ts:171`) — see DEF-12-02.
- **BR-12-F02-16** `[AS-BUILT]` — Deleting a guest removes their seat assignment implicitly;
  no seating cleanup runs (`convex/guests.ts:313-341`).
- **BR-12-F02-17** `[AS-BUILT]` — A guest who becomes `declined` keeps their seat;
  `applyDeclineEffects` does not touch `tableId`/`seatNumber`
  (`convex/lib/guests.ts:51-60`).
- **BR-12-F02-18** `[AS-BUILT]` — Seat assignment and release are not activity-logged; neither
  mutation calls `logActivity` (`convex/tables.ts:155-213`).
- **BR-12-F02-19** `[AS-BUILT]` — The seating grid has no drag-and-drop; assignment is a
  `Select` per empty seat and release is an `×` button (`seat-select.tsx:19-35`,
  `table-card.tsx:167-197`).

## 11. Acceptance Criteria

- **AC-12-F02-01** — **Given** an 8-seat table and an unseated guest **When** the Editor picks
  that guest in seat 3 **Then** seat 3 shows the guest's name, the fill indicator reads
  "1/8 seats filled", and the guest disappears from every other seat's dropdown.
- **AC-12-F02-02** — **Given** a seated guest **When** the Editor clicks the `×` **Then** the
  seat reverts to the "Assign guest..." dropdown and the header's unassigned badge increases
  by one.
- **AC-12-F02-03** — **Given** guest A in seat 2 **When** `assignGuestToSeat` is called for
  guest B on the same table and seat 2 **Then** guest A's `tableId` and `seatNumber` are
  cleared and guest B holds seat 2.
- **AC-12-F02-04** — **Given** guest A in seat 2 **When** `assignGuestToSeat` is called again
  for guest A on the same table and seat **Then** guest A remains seated in seat 2.
- **AC-12-F02-05** — **Given** a guest of event X and a table of event Y **When** assignment is
  attempted **Then** it throws "Guest and table belong to different events".
- **AC-12-F02-06** — **Given** a 10-seat table **When** `assignGuestToSeat` is called with
  `seatNumber: 10` **Then** it throws "Seat number exceeds table capacity" _(this is the
  server behavior the UI trips over — DEF-12-01)_.
- **AC-12-F02-07** — **Given** a 10-seat table rendered in the grid **When** the Editor picks a
  guest for the seat labelled "10" **Then** the assignment fails with the toast "Failed to
  assign guest to seat" **and** the seat stays empty. _(Expected once DEF-12-01 is fixed: the
  guest is seated.)_
- **AC-12-F02-08** — **Given** a guest seated at table A **Then** they do not appear in any
  dropdown of table A or table B until they are released.
- **AC-12-F02-09** — **Given** a guest whose `rsvpStatus` is `declined` **Then** they still
  appear in the seat dropdown and can be seated.
- **AC-12-F02-10** — **Given** a seated guest who is then set to `declined` **Then** their
  seat assignment is unchanged.
- **AC-12-F02-11** — **Given** a seated guest **When** they are deleted **Then** the seat
  renders empty on the next update and no orphan assignment remains.
- **AC-12-F02-12** — **Given** a materialized +1 **Then** it appears in the seat dropdown by
  its own name and can be seated independently of its host.
- **AC-12-F02-13** — **Given** a member with role `viewer` **When** `assignGuestToSeat` is
  called directly **Then** it succeeds, while `unassignGuestFromSeat` throws — DEF-12-02.
  _(Expected once fixed: both throw.)_
- **AC-12-F02-14** — **Given** a table with several seated guests **Then** they render in
  ascending seat order.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                              |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-12-F02-01 | unit        | `TableCard` seat generation for `seatsCount: 10` — assert the seat numbers sent match the range the server accepts (this test fails today: DEF-12-01) |
| TC-12-F02-02 | unit        | `getTablesAndGuests` partitioning: guests with `tableId` land in `guestsByTable`, others in `unassignedGuests`                                        |
| TC-12-F02-03 | integration | Assign to an empty seat writes `tableId` + `seatNumber`                                                                                               |
| TC-12-F02-04 | integration | Assign to an occupied seat clears the previous occupant's `tableId` and `seatNumber`                                                                  |
| TC-12-F02-05 | integration | Assign a guest to the seat they already hold leaves them seated                                                                                       |
| TC-12-F02-06 | integration | Two rows written with the same `(tableId, seatNumber)` are both cleared by the next assignment to that seat                                           |
| TC-12-F02-07 | integration | `seatNumber === table.seatsCount` throws "Seat number exceeds table capacity"; `seatsCount - 1` succeeds                                              |
| TC-12-F02-08 | integration | Cross-event guest/table throws "Guest and table belong to different events"                                                                           |
| TC-12-F02-09 | integration | `assignGuestToSeat` as `viewer` — asserts the intended rule (throws), failing today: DEF-12-02                                                        |
| TC-12-F02-10 | integration | `unassignGuestFromSeat` as `viewer` throws; as `editor` succeeds                                                                                      |
| TC-12-F02-11 | integration | Deleting a seated guest leaves no row referencing the table                                                                                           |
| TC-12-F02-12 | integration | Setting a seated guest to `declined` leaves `tableId`/`seatNumber` intact                                                                             |
| TC-12-F02-13 | e2e         | Seat a guest into the highest seat of a 10-seat table and assert success (fails today: DEF-12-01)                                                     |
| TC-12-F02-14 | e2e         | Seat, release, and re-seat a guest at a different table, asserting the unassigned badge each time                                                     |

### Manual QA checklist

- [ ] Seat a guest into seat 1 and confirm the row switches to their name
- [ ] Attempt to seat a guest into the highest-numbered seat of any table (reproduces DEF-12-01)
- [ ] Confirm the fill indicator and the "N unassigned" badge both update after each change
- [ ] Confirm a seated guest is absent from every dropdown across all tables
- [ ] Release a guest and confirm they reappear in the dropdowns
- [ ] Seat a `declined` guest and confirm nothing prevents it
- [ ] Seat a +1 guest independently of its host
- [ ] Delete a seated guest and confirm the seat frees up
- [ ] Set a seated guest to `declined` and confirm they stay seated
- [ ] Inspect stored `seatNumber` values and confirm they are 1-based (contradicting the schema comment — DEF-12-01)

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Occupant scan `.take(10)`; page guest read `.take(1000)`; seat numbers bounded above by `table.seatsCount`, unbounded below                                                                                                 |
| Performance      | One subscription feeds the page; `TableCard` is memoized and `TableGrid`'s handlers are `useCallback`-stable, so a seat change re-renders only the affected card (`table-card.tsx:40-42`, `table-grid.tsx:34-35`)           |
| Security & authz | Assignment is gated by `requireEventAccess` (any membership) — a real authorization hole for viewers (DEF-12-02). Both mutations verify the referenced ids resolve and, for assignment, that guest and table share an event |
| Accessibility    | The seat number is a bare `<span>`, not a label bound to the select; the release control is an unlabeled icon `<button>` (`table-card.tsx:172`, `:178-183`)                                                                 |
| i18n             | English only, hardcoded                                                                                                                                                                                                     |
| Analytics        | None; seat changes are not activity-logged (BR-12-F02-18)                                                                                                                                                                   |

## 14. TODOs & Open Questions

- **DEF-12-01** `[P0]` — Seat numbering is off by one: the last seat of every table is
  unassignable, and stored seat numbers contradict the documented convention.
  - **Evidence:**
    - `src/components/tables/table-card.tsx:55` —
      `const seats = Array.from({ length: table.seatsCount }, (_, i) => i + 1)` produces
      `1..seatsCount`.
    - `src/components/tables/table-card.tsx:187-192` passes that value to `SeatSelect` as
      `seatNumber`.
    - `src/components/tables/seat-select.tsx:22` — `onAssign(guestId, tableId, seatNumber)`
      forwards it unchanged.
    - `src/components/tables/table-grid.tsx:37-38` — `handleAssign` passes it straight into
      `assignGuestToSeat({ guestId, tableId, seatNumber })`.
    - `convex/tables.ts:173-175` — `if (args.seatNumber >= table.seatsCount) throw new
ConvexError("Seat number exceeds table capacity")`, a 0-based bound.
    - `convex/schema.ts:148` and the `guests.seatNumber` row in `AGENTS.md` both document the
      field as "0-based internally, 1-based in UI".
  - **Impact:**
    - **A — the last seat can never be filled.** For a table of N seats the UI offers seats
      `1..N` while the server accepts `0..N-1`; `seatNumber = N` is always rejected. A 10-seat
      table has 9 usable seats. The user sees only the generic toast "Failed to assign guest
      to seat" (`table-grid.tsx:19`), because `useToastMutation` swallows the `ConvexError`
      message — so the failure looks like a transient bug, not a rule. The seat count the host
      configured no longer matches the capacity the product delivers, and the fill indicator
      can never read "N/N seats filled".
    - **B — stored data contradicts the documented convention.** Seat index `0` is never
      written, and every stored `seatNumber` is 1-based, while the schema comment and
      `AGENTS.md` describe them as 0-based. Any future consumer (an export, a chart, a
      capacity report) that trusts the documentation will be off by one.
  - **Proposed fix:** **Change the client, not the server.** The server's 0-based bound is the
    convention documented in the schema and is depended on by `updateTableSeats`, which
    unassigns guests with `seatNumber >= seatsCount` (`convex/tables.ts:139-142`) — the same
    0-based arithmetic. `TableCard` should generate `0..seatsCount - 1` and render
    `seatNum + 1` as the visible label, keeping the UI 1-based and the storage 0-based.
    Independently, the server should also reject `seatNumber < 0`, which it does not today.
  - **Migration concern:** Existing events already hold **1-based** `seatNumber` values, so
    fixing the client alone silently shifts every seated guest one seat: a guest stored at
    `seatNumber: 1` would render in the seat labelled "2". A backfill is required —
    decrement `seatNumber` by 1 for every guest row where it is defined — and it must run
    exactly once. Note the interaction with `updateTableSeats`: under today's 1-based data the
    shrink rule already evicts one guest too many (a guest in the seat labelled "5" of a table
    shrunk to 5 seats is unassigned even though a 5th seat still exists), so the backfill also
    corrects that behavior.
- **DEF-12-02** `[P1]` — Guard asymmetry: a `viewer` can seat a guest but cannot unseat them.
  - **Evidence:** `convex/tables.ts:171` —
    `await requireEventAccess(ctx, guest.eventId, user._id)` in `assignGuestToSeat`;
    `requireEventAccess` accepts **any** membership with no role floor
    (`convex/lib/permissions.ts:16`). Its sibling `convex/tables.ts:206` —
    `await requireEventEditor(ctx, guest.eventId)` in `unassignGuestFromSeat` — applies the
    default `minRole: "editor"`. Every other mutation in the file uses `requireEventEditor`
    (`convex/tables.ts:70`, `:91`, `:103`, `:126`). Already recorded as a note in
    [roles-and-permissions.md](../../roles-and-permissions.md) §4.
  - **Impact:** A member holding `viewer` — a read-only role by design — can write seating
    data for the event, and the write is irreversible for them because the inverse operation
    is editor-gated. The bump rule (BR-12-F02-06) makes it worse: a viewer assigning into an
    occupied seat evicts the existing occupant, destroying an Editor's work. The exposure is
    API-level rather than UI-level, since `getTablesAndGuests` is editor-gated and a viewer
    cannot load the page — but the mutation is callable directly with any known guest and
    table id.
  - **Proposed fix:** `assignGuestToSeat` uses `requireEventEditor(ctx, guest.eventId)`,
    matching `unassignGuestFromSeat` and the rest of `convex/tables.ts`. The capability matrix
    row "Assign guest to seat" then loses its `!` note and reads identically to "Unassign
    guest from seat".
- **TODO-12-04** `[P1]` `[ADD]` — Nothing prevents or flags seating a guest who is `declined`
  or still `pending`.
  - **Evidence:** `getTablesAndGuests` partitions guests purely on `tableId`
    (`convex/tables.ts:40-46`) with no `rsvpStatus` consideration; `SeatSelect` renders every
    guest it is handed (`seat-select.tsx:28-33`); `assignGuestToSeat` performs no RSVP check
    (`convex/tables.ts:161-198`); and `applyDeclineEffects` does not clear seat fields
    (`convex/lib/guests.ts:51-60`), so a guest who declines after being seated keeps the seat.
  - **Rationale:** Seating is planned for people who are actually coming. Today a host can
    seat a guest who has already declined, and — more damaging — a guest who declines _after_
    being seated silently continues to occupy a seat that the host believes is spoken for.
    The seating plan therefore over-counts attendance, and the "N unassigned" badge
    under-counts the real work left. The `by_eventId_and_rsvpStatus` index
    (`convex/schema.ts:156`) already exists to support the filter.
  - **Proposed rule:** The unassigned pool marks each guest's RSVP status and defaults to
    offering `attending` guests, with `pending` behind an explicit toggle; `declined` guests
    are excluded. `applyDeclineEffects` additionally clears `tableId` and `seatNumber`, so a
    declining guest releases their seat as part of the existing decline cascade.
- **TODO-12-05** `[P2]` `[ADD]` — The grid has no drag-and-drop.
  - **Evidence:** Assignment is a `Select` per empty seat (`seat-select.tsx:19-35`) and
    release is an `×` button (`table-card.tsx:178-183`); no drag library is imported anywhere
    under `src/components/tables/`. The product describes the page as a _drag-free_ assignment
    grid, so this is deliberate, not an omission.
  - **Rationale:** Seating is inherently a rearrangement task — the dominant operation is
    moving a person from one seat to another, which today costs two interactions across two
    controls (see TODO-12-05). Dragging a guest chip between seats and between tables matches
    the mental model and would make balancing tables far quicker.
  - **Proposed rule:** Guests can be dragged from the unassigned pool onto a seat, and between
    seats and tables, with a keyboard-accessible fallback preserving the current controls.
- **TODO-12-06** `[P1]` `[CHANGE]` — `guests.updateGuest` writes seat fields with no seating
  validation.
  - **Evidence:** `convex/guests.ts:208-209` declares `tableId` and `seatNumber` as optional
    args and `convex/guests.ts:216-217` patches them wholesale. None of the seating rules run:
    no capacity bound, no occupancy bump, no guest/table same-event check.
  - **Rationale:** Every invariant this feature maintains can be bypassed through EP-04. Two
    guests can be written into the same seat, or a guest into a seat that does not exist, or
    into a table belonging to another event.
  - **Proposed rule:** `updateGuest` stops accepting `tableId`/`seatNumber`; seating is written
    only through `assignGuestToSeat` / `unassignGuestFromSeat`.
- **TODO-12-07** `[P2]` `[ADD]` — A seated guest cannot be moved directly.
  - **Evidence:** `unassignedGuests` contains only guests with no `tableId`
    (`convex/tables.ts:41-45`), so a seated guest never appears in a dropdown. The server would
    happily accept the move — `assignGuestToSeat` patches the guest's `tableId` and
    `seatNumber` unconditionally (`convex/tables.ts:194-197`) — the pool simply never offers
    them.
  - **Rationale:** Moving a guest requires releasing them and then finding them again in a
    dropdown of every unseated guest in the event; the capability exists server-side and is
    only withheld by the pool's shape.
  - **Proposed rule:** Seat dropdowns list seated guests in a separate "Currently seated"
    group showing their present table, and picking one moves them.
- **TODO-12-08** `[P2]` `[ADD]` — Seat changes leave no audit trail.
  - **Evidence:** Neither mutation calls `logActivity` (`convex/tables.ts:155-213`), and the
    `activityLogs.entity` union has no seating member (`convex/schema.ts` `activityLogs`).
  - **Rationale:** Seating is collaborative and destructive — the bump rule silently evicts a
    guest — yet the Activity page cannot show who moved whom.
  - **Proposed rule:** Seat assignment and release write an activity entry naming the guest and
    the table, including the bumped occupant when the bump fires.

### Open questions

- **Q1** — When the bump fires, should the evicted guest be unassigned entirely (today's
  behavior) or **swapped** into the incoming guest's previous seat? A swap is what a host
  usually means when rearranging a table.
- **Q2** — Should the last-seat fix (DEF-12-01) be shipped with a one-off backfill, or should
  the server accept both conventions during a transition window?
- **Q3** — Should seat capacity be reconciled with attendance — e.g. warn when total seats
  across all tables is below the `attending` guest count?

## 15. Traceability

| Concern                     | Source                                                         |
| --------------------------- | -------------------------------------------------------------- |
| Route                       | `src/app/(dashboard)/dashboard/[eventSlug]/tables/page.tsx:15` |
| Unassigned badge            | `src/app/(dashboard)/dashboard/[eventSlug]/tables/page.tsx:28` |
| Mutation wiring — assign    | `src/components/tables/table-grid.tsx:17`                      |
| Mutation wiring — unassign  | `src/components/tables/table-grid.tsx:21`                      |
| Assign handler              | `src/components/tables/table-grid.tsx:36`                      |
| Seat generation (DEF-12-01) | `src/components/tables/table-card.tsx:55`                      |
| Occupied seat row           | `src/components/tables/table-card.tsx:173`                     |
| Release control             | `src/components/tables/table-card.tsx:178`                     |
| Seat dropdown               | `src/components/tables/seat-select.tsx:19`                     |
| Seat number forwarding      | `src/components/tables/seat-select.tsx:22`                     |
| Backend — page data         | `convex/tables.ts:20`                                          |
| Backend — unassigned pool   | `convex/tables.ts:41`                                          |
| Backend — seat ordering     | `convex/tables.ts:49`                                          |
| Backend — assign            | `convex/tables.ts:155`                                         |
| Guard (DEF-12-02)           | `convex/tables.ts:171`                                         |
| Capacity check (DEF-12-01)  | `convex/tables.ts:173`                                         |
| Bump loop                   | `convex/tables.ts:178`                                         |
| Backend — unassign          | `convex/tables.ts:201`                                         |
| Guard — unassign            | `convex/tables.ts:206`                                         |
| Schema — seat fields        | `convex/schema.ts:147`                                         |
| Schema — seat index         | `convex/schema.ts:155`                                         |
| Foreign write path          | `convex/guests.ts:208`                                         |
| Decline cascade             | `convex/lib/guests.ts:51`                                      |
| Guest deletion              | `convex/guests.ts:313`                                         |
| Guards                      | `convex/lib/permissions.ts:16`, `convex/lib/permissions.ts:50` |

## 16. Changelog

| Version | Date       | Author        | Change                                                                                                    |
| ------- | ---------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification; records DEF-12-01 (P0 seat off-by-one) and DEF-12-02 (P1 guard asymmetry) |
