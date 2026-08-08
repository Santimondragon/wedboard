---
id: EP-14
title: Insights
version: 1.0.0
status: partial
last_updated: 2026-07-28
---

# EP-14 — Insights

## Purpose

Insights is the event's answer to "where do we stand?". It is the landing page of every event
dashboard — `/dashboard/[eventSlug]` — and it consists of a single row of metric cards plus a
Quick Actions panel. The metrics are computed live from the guest and invitation tables at
read time; nothing is stored, denormalized or historical.

The epic is intentionally one page and one Convex query. Its value is orientation: the host
opens an event and immediately sees how many people are invited, how many have answered, and
what operational work is outstanding (missing menu choices, unseated guests).

## Primary actor

**Editor+** (see [roles-and-permissions.md](../../roles-and-permissions.md)).
`dashboard.getOverviewStats` is guarded by `requireEventEditor(ctx, eventId)` with the default
`minRole: "editor"` (`convex/dashboard.ts:8`).

| Actor                | Access                                                    |
| -------------------- | --------------------------------------------------------- |
| Owner                | Read                                                      |
| Co-owner (`planner`) | Read                                                      |
| Editor               | Read                                                      |
| Viewer               | None — the editor floor rejects them                      |
| Public guest         | None. No aggregate is ever exposed on a public invitation |

## Design choice — compute on read, not denormalized counters

There is no `eventStats` table. `getOverviewStats` reads up to 1000 invitations and up to 1000
guests on every page load and folds them in a single loop (`convex/dashboard.ts:13-43`). The
source acknowledges the trade-off in a comment: _"Bounded scan is fine at wedding scale
(≤ ~1000 guests). If events ever outgrow this, move to denormalized counters in an eventStats
table updated transactionally by the guest/invitation mutations."_ (`convex/dashboard.ts:10-12`).

Three consequences the feature spec documents as behavior:

1. **Metrics are always live.** Any mutation to a guest or invitation is reflected on the next
   query re-run, with no cache to invalidate.
2. **There is a hard scale ceiling of 1000 rows per table.** Beyond it the counts are silently
   wrong — no warning, no error, no indication of truncation. Tracked as **DEF-14-01**.
3. **There is no history.** Every number is an instantaneous snapshot; nothing records what it
   was yesterday, so no trend, velocity or burn-down is derivable from stored data.

## The 8 computed values vs. the 7 rendered cards

`getOverviewStats` returns eight numbers. The overview page renders **seven** cards, two of
which are not returned values but subtractions performed client-side, and one returned value —
`allergyCount` — is never displayed anywhere in the product.

| Returned value         | Rendered?  | Card                                                               |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `totalInvitations`     | Yes        | "Total Invitations"                                                |
| `totalGuests`          | Yes        | "Total Guests"                                                     |
| `attendingCount`       | Yes        | "Attending"                                                        |
| `declinedCount`        | Yes        | "Declined"                                                         |
| `pendingCount`         | Yes        | "Pending"                                                          |
| `menuCompletionCount`  | Indirectly | "Menu Selections Missing" = `attendingCount - menuCompletionCount` |
| `tableAssignmentCount` | Indirectly | "Guests Without Table" = `totalGuests - tableAssignmentCount`      |
| `allergyCount`         | **No**     | — (computed, transmitted, never shown; **DEF-14-03**)              |

This is why the epic's status is `partial`.

## Features

| ID        | Feature            | Status    | File                                                     |
| --------- | ------------------ | --------- | -------------------------------------------------------- |
| EP-14-F01 | Overview dashboard | defective | [F01-overview-dashboard.md](./F01-overview-dashboard.md) |

## Workflows

| ID       | Workflow                                         | Feature   |
| -------- | ------------------------------------------------ | --------- |
| WF-14-01 | Host checks event status at a glance             | EP-14-F01 |
| WF-14-02 | Host jumps to a section via Quick Actions        | EP-14-F01 |
| WF-14-03 | New host seeds demo data from the empty overview | EP-14-F01 |

## Backend surface

| Function                               | Type            | Feature                                                                   |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `api.dashboard.getOverviewStats`       | query           | EP-14-F01                                                                 |
| `api.seed.seedDemoEventForCurrentUser` | public mutation | EP-14-F01 (empty-state affordance only; the seed itself belongs to EP-02) |

`convex/dashboard.ts` contains exactly one function. There is no per-special-invitation
breakdown query, no time series and no export endpoint anywhere in `convex/`.

## Dependencies

| Depends on                          | Why                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| EP-01 (Account & access)            | Dashboard routes require an authenticated session                                          |
| EP-02 (Event setup)                 | The page resolves its event via `useEvent()`; the seed affordance creates a new demo event |
| EP-03 (Collaboration & permissions) | The editor floor comes from `requireEventEditor`                                           |
| EP-04 (Guest management)            | Every guest-derived metric reads `guests` rows, including `isPlusOne` records              |
| EP-05 (Invitations)                 | `totalInvitations` counts `invitations` rows                                               |
| EP-11 (Catering)                    | `menuCompletionCount` reads `guests.menuOptionId`                                          |
| EP-12 (Seating)                     | `tableAssignmentCount` reads `guests.tableId`                                              |

Nothing depends on Insights — no other page, template block or export consumes
`getOverviewStats`.

## Known defects

| ID        | Priority | Summary                                                                                                                                                        | Documented in |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| DEF-14-01 | P1       | Counts are silently truncated at 1000 invitations / 1000 guests with no user-visible signal                                                                    | EP-14-F01 §14 |
| DEF-14-02 | P1       | "Menu Selections Missing" measures a field no guest can set — there is no guest-facing menu selection UI, so the number can only fall through host data entry  | EP-14-F01 §14 |
| DEF-14-03 | P2       | `allergyCount` is computed and returned but never rendered — dead payload, and the allergy information guests actually submit surfaces on no dashboard summary | EP-14-F01 §14 |
| DEF-14-04 | P2       | "Guests Without Table" counts declined guests and +1 records, overstating the seating work outstanding                                                         | EP-14-F01 §14 |

## Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built epic overview |
