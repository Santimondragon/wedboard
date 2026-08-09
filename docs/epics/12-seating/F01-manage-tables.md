---
id: EP-12-F01
title: Manage Tables
epic: EP-12 Seating
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: [EP-02-F01, EP-03-F01, EP-04-F01]
---

# EP-12-F01 — Manage Tables

## 1. Summary

Manage Tables lets an Editor+ build the reception floor plan: create each physical table,
give it a name, and set how many seats it has. Tables are the containers seating assignments
hang off — without at least one table no guest can be seated. A table carries almost nothing
of its own: a name, a seat count between 1 and 20, and a sort order that fixes its position
in the grid. Deleting a table never deletes guests; it releases them back into the unassigned
pool. Shrinking a table releases only the guests whose seat no longer exists.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                                             |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Owner                | Full   |                                                                                                   |
| Co-owner (`planner`) | Full   |                                                                                                   |
| Editor               | Full   | The floor of every function in this feature                                                       |
| Viewer               | None   | `requireEventEditor` defaults to `minRole: "editor"`, so a viewer cannot even read the table list |
| Public guest         | None   | No public query reads `tables`                                                                    |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate applied here is
`requireEventEditor(ctx, eventId)` on every query and mutation
(`convex/tables.ts:10`, `:23`, `:70`, `:91`, `:103`, `:126`).

## 3. User Stories

- **US-12-F01-01** — As an Editor, I want to create a named table with a seat count so that I
  can mirror the venue's floor plan in the dashboard.
- **US-12-F01-02** — As an Editor, I want to rename a table inline so that I can correct a
  label without opening a dialog.
- **US-12-F01-03** — As an Editor, I want to grow or shrink a table's seat count so that the
  grid matches the furniture actually booked.
- **US-12-F01-04** — As an Editor, I want to delete a table so that a cancelled table
  disappears without losing the guests that were seated at it.
- **US-12-F01-05** — As an Editor, I want to see how full each table is so that I can balance
  the room at a glance.

## 4. Entry Points

| Entry point                | Route / control                                                 | Actor   |
| -------------------------- | --------------------------------------------------------------- | ------- |
| Tables page                | `/dashboard/[eventSlug]/tables`                                 | Editor+ |
| Sidebar link               | "Tables" (`minRole: editor`) in `dashboard-sidebar.tsx`         | Editor+ |
| Create table               | "Add Table" button in the page header (`tables/page.tsx:34-37`) | Editor+ |
| Create table (empty state) | "Add Table" action on the empty state (`tables/page.tsx:51`)    | Editor+ |
| Rename                     | Pencil icon beside the table title (`table-card.tsx:99-107`)    | Editor+ |
| Resize                     | `−` / `+` buttons in the card header (`table-card.tsx:144-162`) | Editor+ |
| Delete                     | Trash icon → confirmation dialog (`table-card.tsx:110-136`)     | Editor+ |

There are no deep links into an individual table; the page has a single URL.

## 5. UX Flow

### Happy path — create a table

1. The Editor opens `/dashboard/[eventSlug]/tables`; the page issues
   `api.tables.getTablesAndGuests` with the event id from `useEvent()`
   (`tables/page.tsx:16-18`).
2. The Editor clicks "Add Table" → `AddTableDialog` opens with `name: ""` and
   `seatsCount: 8` (`add-table-dialog.tsx:39`).
3. The Editor types a name and optionally changes the seat number, then submits.
4. `tableSchema` validates client-side (`src/lib/validations/table.ts:3-6`); on success
   `createTable.run({eventId, name, seatsCount})` fires
   (`add-table-dialog.tsx:43-47`).
5. `api.tables.createTable` range-checks `seatsCount`, guards, and inserts with
   `sortOrder = nextSortOrder(ctx, "tables", eventId)` (`convex/tables.ts:66-79`).
6. The toast reads "Table created"; the dialog resets and closes
   (`add-table-dialog.tsx:27-30`, `:48-51`). The Convex subscription re-renders the grid.

### Happy path — rename a table

1. The Editor clicks the pencil; the title becomes an `Input` seeded with the current name
   (`table-card.tsx:52-53`, `:77-95`).
2. Enter or the check button calls `updateTable({id, name})` (`table-card.tsx:66`).
3. Escape restores the previous name and exits edit mode (`table-card.tsx:85-88`).

### Happy path — resize a table

1. The Editor clicks `+` or `−`; the card calls
   `onUpdateSeats(table._id, table.seatsCount ± 1)` (`table-card.tsx:149`, `:159`).
2. `TableGrid.handleUpdateSeats` calls `api.tables.updateTableSeats`
   (`table-grid.tsx:50-55`).
3. Growing: the server patches `seatsCount` and the card renders extra empty seat rows.
4. Shrinking: before patching, the server unassigns every guest at that table whose
   `seatNumber >= seatsCount` (`convex/tables.ts:133-149`).

### Happy path — delete a table

1. The Editor clicks the trash icon; an `AlertDialog` opens.
2. When guests are seated the description is prefixed with the count and the sentence "This
   table has N guest(s) assigned. They will be unassigned." (`table-card.tsx:120-123`).
3. Confirming calls `api.tables.deleteTable`, which clears `tableId` and `seatNumber` on up
   to 500 guests found through `by_tableId`, then deletes the table row
   (`convex/tables.ts:105-114`).
4. The toast reads "Table deleted" (`table-grid.tsx:30`).

### Alternate & edge paths

- **A1** — No tables exist → `EmptyState` "No tables yet" with the description "Create
  tables to start assigning guests to seats" (`tables/page.tsx:46-52`).
- **A2** — Seat count is 1 → the `−` button is disabled (`table-card.tsx:148`).
- **A3** — Seat count is 20 → the `+` button is disabled (`table-card.tsx:158`).
- **A4** — Rename submitted blank/whitespace → `handleSaveName` returns early and nothing is
  sent; the input stays open with no message (`table-card.tsx:64`).
- **A5** — Shrinking a table below an occupied seat → an `AlertDialog` opens first, naming the
  guest who would be displaced (or, for several, the count and the list of names) and offering
  "Keep the seat" / confirm. Only on confirm does `updateTableSeats` run. Shrinking into
  empty seats is not confirmed. See BR-12-F01-15.
- **E1** — `createTable` rejected server-side → the sonner error toast "Failed to create
  table"; the `ConvexError` text is swallowed by `useToastMutation`
  (`add-table-dialog.tsx:29`).
- **E2** — `updateTableSeats` rejected → "Failed to update seat count" (`table-grid.tsx:27`).
- **E3** — `deleteTable` rejected → "Failed to delete table" (`table-grid.tsx:31`).
- **E4** — `updateTable` (rename) rejected → this path does **not** use `useToastMutation`;
  it hand-rolls a try/catch and toasts "Failed to update table name"
  (`table-card.tsx:63-71`), a deviation from the project's toast-mutation convention.

## 6. States

| State             | Behavior                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `data === undefined` renders three `Skeleton` cards in the grid (`tables/page.tsx:21`, `:40-45`)                                                                                                   |
| Empty             | `EmptyState` with a `TableIcon`, title "No tables yet", and an "Add Table" action (`tables/page.tsx:46-52`)                                                                                        |
| Error             | Convex query errors are caught by the `(dashboard)` route error boundary (`StateBlock kind="error"` + retry). Mutation errors surface as sonner toasts carrying the server's `ConvexError` message |
| Success           | Grid of `TableCard`s ordered by `sortOrder`; the header shows an amber "N unassigned" badge when guests remain unseated (`tables/page.tsx:28-32`)                                                  |
| Disabled / locked | `−` disabled at 1 seat, `+` disabled at 20 seats; the create submit button reads "Creating..." while `isSubmitting` (`add-table-dialog.tsx:88-90`)                                                 |
| Mobile            | The grid is `grid-cols-1` below `sm`, two columns at `sm`, three at `lg` (`table-grid.tsx:65`)                                                                                                     |

## 7. UI Specification

### Screens & components

| Element        | Component              | Path                                                        |
| -------------- | ---------------------- | ----------------------------------------------------------- |
| Tables page    | `TablesPage`           | `src/app/(dashboard)/dashboard/[eventSlug]/tables/page.tsx` |
| Card grid      | `TableGrid`            | `src/components/tables/table-grid.tsx`                      |
| One table card | `TableCard` (memoized) | `src/components/tables/table-card.tsx`                      |
| Create dialog  | `AddTableDialog`       | `src/components/tables/add-table-dialog.tsx`                |
| Empty state    | `EmptyState`           | `src/components/app/empty-state.tsx`                        |

### Fields & validation

| Field                         | Type   | Required | Rule                                                                                                                    | Message                               |
| ----------------------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `name` (create)               | text   | Yes      | `z.string().min(1)` (`validations/table.ts:4`)                                                                          | "Table name is required"              |
| `seatsCount` (create)         | number | Yes      | `z.number().min(1).max(20)` (`validations/table.ts:5`); input carries `min={1} max={20}` (`add-table-dialog.tsx:75-76`) | Zod default message                   |
| `seatsCount` (create, server) | number | Yes      | `< 1 \|\| > 20` rejected (`convex/tables.ts:67-69`)                                                                     | "Seat count must be between 1 and 20" |
| `name` (rename)               | text   | Yes      | Non-empty after `trim()`, client-only (`table-card.tsx:64`)                                                             | None — the save is silently ignored   |
| `seatsCount` (resize, server) | number | Yes      | `< 1 \|\| > 20` rejected (`convex/tables.ts:128-130`)                                                                   | "Seat count must be between 1 and 20" |

`updateTable` applies **no** validation to `name` server-side: an empty or arbitrarily long
string is accepted (`convex/tables.ts:88-95`). See TODO-12-02.

### Copy deck

This surface is English-only; no guest-facing Spanish copy exists in this feature.

| Key                  | Copy                                                              | Source                    |
| -------------------- | ----------------------------------------------------------------- | ------------------------- |
| Page title           | "Tables"                                                          | `tables/page.tsx:27`      |
| Unassigned badge     | "{n} unassigned"                                                  | `tables/page.tsx:31`      |
| Create button        | "Add Table"                                                       | `tables/page.tsx:36`      |
| Empty title          | "No tables yet"                                                   | `tables/page.tsx:49`      |
| Empty description    | "Create tables to start assigning guests to seats"                | `tables/page.tsx:50`      |
| Dialog title         | "Add Table"                                                       | `add-table-dialog.tsx:58` |
| Name label           | "Table Name \*"                                                   | `add-table-dialog.tsx:63` |
| Name placeholder     | "e.g. Table 1, Head Table"                                        | `add-table-dialog.tsx:64` |
| Seats label          | "Number of Seats"                                                 | `add-table-dialog.tsx:71` |
| Submit               | "Create Table" / "Creating..."                                    | `add-table-dialog.tsx:89` |
| Cancel               | "Cancel"                                                          | `add-table-dialog.tsx:86` |
| Fill indicator       | "{assigned}/{seatsCount} seats filled"                            | `table-card.tsx:141`      |
| Delete title         | "Delete Table"                                                    | `table-card.tsx:118`      |
| Delete warning       | "This table has {n} guest(s) assigned. They will be unassigned. " | `table-card.tsx:121`      |
| Delete question      | "Are you sure you want to delete “{name}”?"                       | `table-card.tsx:123`      |
| Delete confirm       | "Delete"                                                          | `table-card.tsx:132`      |
| Toast — created      | "Table created"                                                   | `add-table-dialog.tsx:28` |
| Toast — deleted      | "Table deleted"                                                   | `table-grid.tsx:30`       |
| Toast — create error | "Failed to create table"                                          | `add-table-dialog.tsx:29` |
| Toast — seats error  | "Failed to update seat count"                                     | `table-grid.tsx:27`       |
| Toast — delete error | "Failed to delete table"                                          | `table-grid.tsx:31`       |
| Toast — rename error | "Failed to update table name"                                     | `table-card.tsx:69`       |
| Seat placeholder     | "Assign guest..."                                                 | `seat-select.tsx:25`      |

## 8. Data Model

| Table    | Fields                                       | Read / Write       | Index                                 |
| -------- | -------------------------------------------- | ------------------ | ------------------------------------- |
| `tables` | `eventId`, `name`, `seatsCount`, `sortOrder` | Read + write       | `by_eventId` (`convex/schema.ts:226`) |
| `guests` | `tableId`, `seatNumber`                      | Write (clear only) | `by_tableId` (`convex/schema.ts:154`) |
| `guests` | all fields                                   | Read               | `by_eventId` (`convex/schema.ts:150`) |

`tables` is defined at `convex/schema.ts:221-226`. There is no seating-assignment table; see
the [epic README](./README.md).

### Cascades and lifecycle side effects

**Delete.** `deleteTable` is a two-phase operation: it first pages up to 500 guests through
`by_tableId` and patches each with `{tableId: undefined, seatNumber: undefined}`, then
deletes the table row (`convex/tables.ts:105-114`). Guests are never deleted — they return to
the unassigned pool and reappear in every seat dropdown on the page. Because the loop is
capped at `.take(500)`, a table holding more than 500 guests would leave orphan references;
with a hard seat ceiling of 20 this is unreachable in practice.

**Shrink.** `updateTableSeats` runs the same unassignment pass, but conditionally: only when
`args.seatsCount < table.seatsCount`, and only for guests whose `seatNumber` is defined and
`>= args.seatsCount` (`convex/tables.ts:133-149`). Grows perform no guest writes at all. This
release of guests is confirmed client-side before the mutation runs (BR-12-F01-15); the
server itself performs it unconditionally.

**Sort order.** `nextSortOrder(ctx, "tables", eventId)` reads up to 200 existing tables and
returns `max(sortOrder) + 1` (`convex/lib/options.ts:11-21`), so new tables always land at
the end of the grid. `updateTable` accepts an explicit `sortOrder`
(`convex/tables.ts:86`) but no UI sends one — reordering is not exposed.

## 9. Backend Contract

| Function                        | Type     | Args                                      | Returns                                     | Guard                                    | Caps                                       |
| ------------------------------- | -------- | ----------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| `api.tables.listTablesByEvent`  | query    | `{eventId}`                               | `Doc<"tables">[]` sorted by `sortOrder`     | `requireEventEditor(ctx, eventId)`       | `.take(200)`                               |
| `api.tables.getTablesAndGuests` | query    | `{eventId}`                               | `{tables, guestsByTable, unassignedGuests}` | `requireEventEditor(ctx, eventId)`       | tables `.take(200)`, guests `.take(1000)`  |
| `api.tables.createTable`        | mutation | `{eventId, name, seatsCount, sortOrder?}` | `Id<"tables">`                              | `requireEventEditor(ctx, eventId)`       | `seatsCount` 1–20                          |
| `api.tables.updateTable`        | mutation | `{id, name?, sortOrder?}`                 | `void`                                      | `requireEventEditor(ctx, table.eventId)` | none                                       |
| `api.tables.deleteTable`        | mutation | `{id}`                                    | `void`                                      | `requireEventEditor(ctx, table.eventId)` | guest unassign `.take(500)`                |
| `api.tables.updateTableSeats`   | mutation | `{id, seatsCount}`                        | `void`                                      | `requireEventEditor(ctx, table.eventId)` | `seatsCount` 1–20; guest scan `.take(500)` |

`listTablesByEvent` is exported but no component in `src/` calls it; the page uses
`getTablesAndGuests` exclusively.

## 10. Business Rules

- **BR-12-F01-01** `[AS-BUILT]` — A table belongs to exactly one event via `eventId`
  (`convex/schema.ts:222`).
- **BR-12-F01-02** `[AS-BUILT]` — `createTable` rejects a `seatsCount` below 1 or above 20
  with "Seat count must be between 1 and 20" (`convex/tables.ts:67-69`).
- **BR-12-F01-03** `[AS-BUILT]` — The seat range check in `createTable` runs **before** the
  permission guard, so an out-of-range value is rejected regardless of the caller's role
  (`convex/tables.ts:67-70`).
- **BR-12-F01-04** `[AS-BUILT]` — `updateTableSeats` rejects a `seatsCount` below 1 or above
  20 with the same message (`convex/tables.ts:128-130`).
- **BR-12-F01-05** `[AS-BUILT]` — A new table's `sortOrder` defaults to one more than the
  highest existing `sortOrder` for that event (`convex/tables.ts:76-77`,
  `convex/lib/options.ts:20`).
- **BR-12-F01-06** `[AS-BUILT]` — Tables are presented in ascending `sortOrder`
  (`convex/tables.ts:16`, `:30`).
- **BR-12-F01-07** `[AS-BUILT]` — Deleting a table unassigns every guest seated at it before
  the table row is deleted; no guest is deleted (`convex/tables.ts:105-114`).
- **BR-12-F01-08** `[AS-BUILT]` — Reducing a table's seat count unassigns every guest at that
  table whose `seatNumber >= seatsCount` (`convex/tables.ts:133-149`).
- **BR-12-F01-15** `[AS-BUILT]` — Before shrinking a table, the client computes the guests
  whose `seatNumber >=` the requested count and, when there is at least one, requires explicit
  confirmation in an `AlertDialog` that names them (`table-card.tsx:95-113`, `:314-343`). The
  server-side unassignment (BR-12-F01-08) is unchanged and remains unconditional. _(Added in
  1.1.0.)_
- **BR-12-F01-09** `[AS-BUILT]` — Increasing a table's seat count never touches guest
  assignments; the unassignment pass is skipped entirely
  (`convex/tables.ts:133`).
- **BR-12-F01-10** `[AS-BUILT]` — `createTable`, `updateTable`, `deleteTable` and
  `updateTableSeats` all throw `Unauthorized`/`Insufficient permissions` for callers below
  `editor` (`convex/tables.ts:70`, `:91`, `:103`, `:126`).
- **BR-12-F01-11** `[AS-BUILT]` — `updateTable` and `deleteTable` throw "Table not found"
  when the id does not resolve (`convex/tables.ts:90`, `:101`).
- **BR-12-F01-12** `[AS-BUILT]` — The client blocks the seat stepper at both bounds: `−` is
  disabled at 1 seat, `+` at 20 (`table-card.tsx:148`, `:158`).
- **BR-12-F01-13** `[AS-BUILT]` — An inline rename with an empty or whitespace-only value is
  not submitted (`table-card.tsx:64`).
- **BR-12-F01-14** `[AS-BUILT]` — Table create/rename/resize/delete are **not** written to the
  activity log; no `tables` call reaches `logActivity` (`convex/tables.ts` imports no
  activity helper).

## 11. Acceptance Criteria

- **AC-12-F01-01** — **Given** an Editor on the tables page **When** they submit "Head Table"
  with 10 seats **Then** a table card titled "Head Table" appears showing "0/10 seats filled"
  and the toast "Table created".
- **AC-12-F01-02** — **Given** the create dialog **When** the name field is left blank
  **Then** the message "Table name is required" is shown and no mutation fires.
- **AC-12-F01-03** — **Given** a direct `createTable` call with `seatsCount: 21` **Then** the
  mutation throws "Seat count must be between 1 and 20" and no row is inserted.
- **AC-12-F01-04** — **Given** two existing tables **When** a third is created **Then** it
  renders last in the grid.
- **AC-12-F01-05** — **Given** a table with 3 guests seated **When** the Editor confirms
  delete **Then** the dialog first showed "This table has 3 guest(s) assigned. They will be
  unassigned. ", the table disappears, the three guests still exist, and the header's
  unassigned badge increases by 3.
- **AC-12-F01-06** — **Given** a 10-seat table with a guest in the highest occupied seat
  **When** the seat count is reduced below that seat **Then** that guest's `tableId` and
  `seatNumber` are cleared and they reappear in the seat dropdowns.
- **AC-12-F01-07** — **Given** an 8-seat table with guests seated **When** the count is
  raised to 9 **Then** no guest assignment changes and one empty seat row is added.
- **AC-12-F01-08** — **Given** a table at 1 seat **Then** the `−` button is disabled; at 20
  seats the `+` button is disabled.
- **AC-12-F01-09** — **Given** a Viewer **When** the tables page loads **Then**
  `getTablesAndGuests` throws and no table data is returned.
- **AC-12-F01-10** — **Given** the inline rename input **When** Escape is pressed **Then**
  the original name is restored and no mutation fires.
- **AC-12-F01-11** — **Given** an event with no tables **Then** the empty state "No tables
  yet" is rendered with an "Add Table" action.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                           |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------- |
| TC-12-F01-01 | unit        | `tableSchema` rejects an empty name and a `seatsCount` of 0 or 21                                  |
| TC-12-F01-02 | unit        | `nextSortOrder(ctx, "tables", eventId)` returns `max + 1` and `1` for an empty event               |
| TC-12-F01-03 | integration | `createTable` with `seatsCount` 0 and 21 both throw "Seat count must be between 1 and 20"          |
| TC-12-F01-04 | integration | `createTable` as a `viewer` throws; as an `editor` succeeds                                        |
| TC-12-F01-05 | integration | `deleteTable` clears `tableId`/`seatNumber` on every seated guest and leaves the guest rows intact |
| TC-12-F01-06 | integration | `updateTableSeats` shrinking from 10 to 5 unassigns exactly the guests with `seatNumber >= 5`      |
| TC-12-F01-07 | integration | `updateTableSeats` growing from 5 to 10 performs zero guest writes                                 |
| TC-12-F01-08 | integration | `updateTable` / `deleteTable` with an unknown id throw "Table not found"                           |
| TC-12-F01-09 | e2e         | Create → rename inline → resize → delete a table, asserting each toast                             |
| TC-12-F01-10 | e2e         | Deleting a table with seated guests raises the header's "N unassigned" badge by the seated count   |

### Manual QA checklist

- [ ] Create a table from both the header button and the empty-state action
- [ ] Submit the create form with a blank name and confirm the inline error
- [ ] Rename a table with Enter, with the check button, and cancel with Escape
- [ ] Attempt a blank rename and confirm nothing happens
- [ ] Step the seat count to 1 and to 20 and confirm the stepper buttons disable
- [ ] Shrink a table under an occupied seat and confirm the guest silently returns to the pool
- [ ] Delete a table with guests and confirm the warning text and the unassigned badge
- [ ] Reload with 3+ tables and confirm creation order is preserved
- [ ] Verify the page at mobile width (single column)

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `seatsCount` 1–20 (client + server); tables read `.take(200)`; guests read `.take(1000)`; unassignment loops `.take(500)`. No cap on the number of tables per event                                             |
| Performance      | One query powers the whole page. `TableCard` is memoized with stable `useCallback` handlers so a change in one table does not re-render the others (`table-card.tsx:40-42`, `table-grid.tsx:34-35`)             |
| Security & authz | `requireEventEditor` on all six functions; the seat-range check in `createTable` runs before the guard, so an unauthorized caller with a bad payload sees the validation error rather than the permission error |
| Accessibility    | Icon-only buttons (pencil, trash, `−`, `+`) carry no `aria-label`; the rename input has no label. Delete uses a focus-trapping `AlertDialog`                                                                    |
| i18n             | English only; strings are hardcoded in the components                                                                                                                                                           |
| Analytics        | None. Table mutations are not activity-logged (BR-12-F01-14)                                                                                                                                                    |

## 14. TODOs & Open Questions

- **TODO-12-02** `[P2]` `[ADD]` — `updateTable` validates nothing server-side.
  - **Evidence:** `convex/tables.ts:88-95` patches `{name?, sortOrder?}` directly; only the
    client checks for a non-empty name (`table-card.tsx:64`), and `tableSchema` is not applied
    to the rename path at all.
  - **Rationale:** A direct API call can set a table name to `""` or to an unbounded string,
    which then renders in the grid and in the delete confirmation.
  - **Proposed rule:** `updateTable` rejects a name that is empty after trimming and caps its
    length, matching `tableSchema`.
- **TODO-12-03** `[P2]` `[ADD]` — There is no seating chart export, print view, or capacity
  summary across tables.
  - **Evidence:** The tables route renders only the grid and the "N unassigned" badge
    (`tables/page.tsx:23-67`); no component under `src/components/tables/` produces a
    printable or downloadable artifact, and no Convex function returns aggregate seating
    counts. `convex/dashboard.ts` `getOverviewStats` exposes `tableAssignmentCount` but that
    number is not surfaced on this page.
  - **Rationale:** The seating plan is an operational document used on the day of the event by
    people who do not have dashboard access; today the only way to take it off-screen is a
    manual screenshot per table.
  - **Proposed rule:** The tables page offers a print/export view listing every table, its
    seats and occupants, plus a summary of total seats, seats filled and guests unseated.

### Open questions

- **Q1** — Should tables be reorderable? `updateTable` already accepts `sortOrder` but no UI
  sends one, so the grid order is permanently creation order.
- **Q2** — Is 20 the right ceiling for a seat count? Long banquet tables and head tables
  regularly exceed it, and the limit is duplicated in three places
  (`validations/table.ts:5`, `convex/tables.ts:67`, `convex/tables.ts:128`).
- **Q3** — Should table create/delete be activity-logged, given guests, invitations and
  special invitations all are?

## 15. Traceability

| Concern               | Source                                                         |
| --------------------- | -------------------------------------------------------------- |
| Route                 | `src/app/(dashboard)/dashboard/[eventSlug]/tables/page.tsx:15` |
| Grid                  | `src/components/tables/table-grid.tsx:16`                      |
| Card                  | `src/components/tables/table-card.tsx:42`                      |
| Seat stepper          | `src/components/tables/table-card.tsx:144`                     |
| Inline rename         | `src/components/tables/table-card.tsx:63`                      |
| Delete confirmation   | `src/components/tables/table-card.tsx:110`                     |
| Create dialog         | `src/components/tables/add-table-dialog.tsx:26`                |
| Validation            | `src/lib/validations/table.ts:3`                               |
| Backend — list        | `convex/tables.ts:7`                                           |
| Backend — page data   | `convex/tables.ts:20`                                          |
| Backend — create      | `convex/tables.ts:59`                                          |
| Backend — update      | `convex/tables.ts:82`                                          |
| Backend — delete      | `convex/tables.ts:98`                                          |
| Backend — resize      | `convex/tables.ts:118`                                         |
| Sort order helper     | `convex/lib/options.ts:11`                                     |
| Schema — tables       | `convex/schema.ts:221`                                         |
| Schema — seat fields  | `convex/schema.ts:147`                                         |
| Schema — `by_tableId` | `convex/schema.ts:154`                                         |
| Guard                 | `convex/lib/permissions.ts:50`                                 |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                  |
| ------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                                                                                          |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-12-01 closed.** Added BR-12-F01-15 (shrink confirmation naming displaced guests); updated §5 A5 and §8. Page restyled onto the shared primitives |
