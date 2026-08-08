---
id: EP-12
title: Seating
version: 1.0.0
status: defective
last_updated: 2026-07-28
---

# EP-12 — Seating

## Purpose

Seating lets the host lay out the reception floor: create the tables that will physically
exist at the venue, size each one, and place named guests into individual seats. It answers
one operational question — _where does every person sit?_ — and produces the assignment data
the host reads off on the day of the event.

The whole epic lives on a single dashboard page, `/dashboard/[eventSlug]/tables`, described
in the product UI as a drag-free assignment grid: every table is a card, every seat is a row,
and an empty seat carries a dropdown of guests who are not seated yet.

## Primary actor

**Editor+** (see [roles-and-permissions.md](../../roles-and-permissions.md)). Table CRUD and
seat capacity changes are gated by `requireEventEditor`. Seat _assignment_ is gated only by
`requireEventAccess`, which admits a `viewer` — a recorded guard asymmetry, tracked here as
**DEF-12-02**.

| Actor                | Access                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full                                                                                                                  |
| Co-owner (`planner`) | Full                                                                                                                  |
| Editor               | Full                                                                                                                  |
| Viewer               | Cannot read the page's data (`getTablesAndGuests` is editor-gated) but _can_ call `assignGuestToSeat` — see DEF-12-02 |
| Public guest         | No access. Seating is never exposed on the public invitation                                                          |

## Data model choice — there is no seating-assignment table

Seating is deliberately **not** modelled as a join table. A seat assignment is two optional
fields on the guest row:

| Field               | Type            | Meaning                                             |
| ------------------- | --------------- | --------------------------------------------------- |
| `guests.tableId`    | `Id<"tables">?` | The table the guest sits at; `undefined` = unseated |
| `guests.seatNumber` | `number?`       | The seat within that table                          |

`convex/schema.ts:147-148`. Two indexes make this workable:

- `by_tableId` (`convex/schema.ts:154`) — every guest at a table, used by `deleteTable`,
  `updateTableSeats` and the grid's grouping.
- `by_tableId_and_seatNumber` (`convex/schema.ts:155`) — the occupant(s) of one specific
  seat, used by the bump logic in `assignGuestToSeat`.

Consequences of this choice, all of which the specs below document as behavior:

1. **A guest can hold at most one seat.** Uniqueness is structural, not enforced by a rule —
   there is only one pair of fields to write.
2. **Seat uniqueness is _not_ structural.** Nothing in the schema prevents two guests from
   carrying the same `(tableId, seatNumber)`; the index is a lookup, not a constraint. The
   application compensates with the bump loop in `assignGuestToSeat`
   (`convex/tables.ts:178-192`), which reads up to 10 occupants and clears every one that is
   not the incoming guest — an admission that duplicates are possible in principle.
3. **Deleting a guest silently frees the seat.** No cascade is needed: the row that held the
   assignment is gone (`convex/guests.ts:313`).
4. **Seat data is reachable from outside this epic.** `guests.updateGuest` accepts `tableId`
   and `seatNumber` as ordinary patchable fields (`convex/guests.ts:208-209`) with **no**
   capacity or occupancy check, so EP-04 can write seating state that this epic's rules never
   saw. Tracked as **TODO-12-06**.
5. **No history.** Seat changes are not activity-logged (`convex/lib/activity.ts` entity union
   has no seating member), so a reshuffle leaves no audit trail.

## Features

| ID        | Feature         | Status      | File                                               |
| --------- | --------------- | ----------- | -------------------------------------------------- |
| EP-12-F01 | Manage tables   | implemented | [F01-manage-tables.md](./F01-manage-tables.md)     |
| EP-12-F02 | Seat assignment | defective   | [F02-seat-assignment.md](./F02-seat-assignment.md) |

## Workflows

| ID       | Workflow                         | Feature   |
| -------- | -------------------------------- | --------- |
| WF-12-01 | Create a table for the reception | EP-12-F01 |
| WF-12-02 | Rename a table inline            | EP-12-F01 |
| WF-12-03 | Resize a table's seat count      | EP-12-F01 |
| WF-12-04 | Delete a table and free guests   | EP-12-F01 |
| WF-12-05 | Seat an unassigned guest         | EP-12-F02 |
| WF-12-06 | Unseat or move a seated guest    | EP-12-F02 |

## Backend surface

Every seating function lives in `convex/tables.ts`.

| Function                           | Type     | Feature         |
| ---------------------------------- | -------- | --------------- |
| `api.tables.listTablesByEvent`     | query    | EP-12-F01       |
| `api.tables.getTablesAndGuests`    | query    | EP-12-F01 / F02 |
| `api.tables.createTable`           | mutation | EP-12-F01       |
| `api.tables.updateTable`           | mutation | EP-12-F01       |
| `api.tables.deleteTable`           | mutation | EP-12-F01       |
| `api.tables.updateTableSeats`      | mutation | EP-12-F01       |
| `api.tables.assignGuestToSeat`     | mutation | EP-12-F02       |
| `api.tables.unassignGuestFromSeat` | mutation | EP-12-F02       |

## Dependencies

| Depends on                      | Why                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| EP-02 (Event setup)             | Tables are event-scoped; the page resolves its event through `useEvent()`                |
| EP-03-F01 (Roles & permissions) | All guards resolve through `convex/lib/permissions.ts`                                   |
| EP-04 (Guest management)        | The guest directory is the seating pool; `guests.updateGuest` can also write seat fields |

Nothing depends on seating: no public query, template block, metric card or export reads
`tableId`/`seatNumber` outside this epic.

## Known defects

| ID        | Priority | Summary                                                                                                                                        | Documented in |
| --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| DEF-12-01 | P0       | Seat numbering off-by-one — the last seat of every table is unassignable, and stored seat numbers contradict the documented 0-based convention | EP-12-F02 §14 |
| DEF-12-02 | P1       | `assignGuestToSeat` guard is `requireEventAccess` while `unassignGuestFromSeat` is `requireEventEditor` — a viewer can seat but not unseat     | EP-12-F02 §14 |

## Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built epic overview |
