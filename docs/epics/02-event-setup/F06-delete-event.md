---
id: EP-02-F06
title: Delete Event
epic: EP-02 Event Setup
version: 1.0.0
status: defective
last_updated: 2026-07-27
depends_on: [EP-02-F01, EP-02-F05]
---

# EP-02-F06 — Delete Event

## 1. Summary

Permanent destruction of an event board and everything that belongs to it. The owner — and
only the owner — can delete an event from the Danger Zone of Settings, behind a confirmation
dialog. Deletion is not a soft delete and not a status change: it removes the event row plus
every child row across all eleven event-scoped tables, plus every image in the event's media
library **and the underlying file blobs**. There is no trash, no undo and no export. Hosts
who want the board to stop being public but keep their data want
[archiving](./F05-event-status-lifecycle.md) instead.

## 2. Actors & Permissions

| Actor                | Access               | Notes                                                                               |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| Owner                | Full                 | The only actor who can delete; the Delete card renders for the owner only           |
| Co-owner (`planner`) | Blocked              | Reaches Settings, but the Delete card is not rendered and the mutation rejects them |
| Editor               | Blocked              | Cannot reach Settings at all                                                        |
| Viewer               | Blocked              | Same                                                                                |
| Public guest         | Affected, never acts | Every invitation URL for the event stops resolving permanently                      |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "owner")`
(`convex/events.ts:303`). Client gate: `const isOwner = event.myRole === "owner"`
(`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:43`), used to render the card
(`:419`). See [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F06-01** — As an owner, I want to permanently delete an event I created by mistake
  so that it stops cluttering my dashboard.
- **US-02-F06-02** — As an owner, I want deletion to remove the guests' personal data with the
  event so that nothing is left behind.
- **US-02-F06-03** — As an owner, I want to be told clearly, before I confirm, that deletion
  is irreversible and what it takes with it.
- **US-02-F06-04** — As a co-owner, I want to be unable to delete an event that is not mine.

## 4. Entry Points

| Entry point | Route / control                                            | Actor      |
| ----------- | ---------------------------------------------------------- | ---------- |
| Delete card | `/dashboard/[eventSlug]/settings` → Danger Zone → "Delete" | Owner only |

There is no delete control on the event directory, the sidebar switcher or the `/admin`
console; Settings is the single entry point.

## 5. UX Flow

### Happy path — WF-02-06 Permanently delete an event

1. The owner scrolls to **Danger Zone**. Below the archive card, a second bordered card reads
   "Delete this event" with the body "Permanently delete the event and all of its data —
   invitations, guests, special events, menus, tables, media, and messages. This cannot be
   undone." (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:422`, `:423`).
2. Pressing the rose **"Delete"** button (`:431`) opens an `AlertDialog` titled "Delete Event"
   (`:437`).
3. The dialog body reads "Are you sure you want to permanently delete &ldquo;{event.name}
   &rdquo;? This will remove the event and all related invitations, guests, special events,
   menus, drinks, tables, media, and messages. This action cannot be undone."
   (`:438`–`:444`). The only inputs are "Cancel" (`:447`) and "Delete Event" (`:448`) — no
   typed confirmation is required.
4. Confirming runs `handleDelete` (`:148`), which calls `api.events.deleteEvent({eventId})`.
5. The server resolves the caller, enforces the `owner` role, and runs
   `cascadeDeleteEvent(ctx, args.eventId)` (`convex/events.ts:301`–`:304`).
6. The cascade deletes every child row table by table, then the media rows and their storage
   blobs, then the event itself (`convex/lib/events.ts:28`–`:48`).
7. An "Event deleted" toast fires and the router **replaces** the current URL with
   `/dashboard` (`:152`, `:153`).

### Alternate & edge paths

- **A1** — The whole cascade runs inside one Convex mutation, so it is atomic: either every
  row is gone or none is. A partial delete cannot be observed.
- **A2** — The event's members lose the board with it: the `eventMembers` rows are part of the
  cascade (`convex/lib/events.ts:18`), so a co-owner's dashboard simply stops listing it.
- **A3** — Any collaborator sitting on a page of the deleted event has their `getEventBySlug`
  subscription return `null`, and `EventProvider` renders its not-found state.
- **A4** — The event's custom domain claim disappears with the event row, but the domain is
  **not** detached from the Vercel project — see DEF-02-02.
- **A5** — Deletion is not activity-logged, and it could not usefully be: the event's
  `activityLogs` rows are themselves deleted by the cascade
  (`convex/lib/events.ts:15`).
- **A6** — A public guest with the invitation URL gets the branded "Invitation Not Found"
  screen from then on, because `resolvePublicEvent` finds no row at all.
- **E1** — Any failure produces the generic toast "Failed to delete event" and re-enables the
  button (`:155`, `:156`); the server's `ConvexError` message is discarded.
- **E2** — A non-owner who reaches the mutation directly is rejected by
  `requireEventMember` before any row is touched (`convex/events.ts:303`).

## 6. States

| State             | Behavior                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Loading           | Shares the Settings page skeleton (`:183`)                                               |
| Empty             | Not applicable — an event with no children deletes just as well                          |
| Error             | "Failed to delete event" toast; the dialog closes and the board stays intact             |
| Success           | "Event deleted" toast, then a URL replace to `/dashboard`                                |
| Disabled / locked | The confirm button is disabled while `deleting` and reads "Deleting..." (`:450`, `:453`) |
| Hidden            | The entire Delete card is absent for co-owners (`:419`)                                  |
| Mobile            | Card keeps its horizontal label/button split; the dialog is full-width                   |

## 7. UI Specification

### Screens & components

| Element                   | Component            | Path                                                              |
| ------------------------- | -------------------- | ----------------------------------------------------------------- |
| Danger Zone section       | inline `<section>`   | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:376` |
| Delete card (owner-gated) | inline `<div>`       | `:420`                                                            |
| Confirmation dialog       | shadcn `AlertDialog` | `:429`                                                            |
| Delete handler            | `handleDelete`       | `:148`                                                            |
| Owner check               | `isOwner`            | `:43`                                                             |

### Fields & validation

| Field | Type | Required | Rule                                                                                                                        | Message |
| ----- | ---- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------- |
| —     | —    | —        | No input is collected. The only confirmation is the dialog's action button — the event name is displayed but never re-typed | —       |

### Copy deck

None guest-facing. The dialog is English dashboard chrome; quoted verbatim for QA:

| Key           | Copy                                                                                                                                                                                                                                | Source                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Card title    | "Delete this event"                                                                                                                                                                                                                 | `settings/page.tsx:422` |
| Card body     | "Permanently delete the event and all of its data — invitations, guests, special events, menus, tables, media, and messages. This cannot be undone."                                                                                | `settings/page.tsx:423` |
| Trigger       | "Delete"                                                                                                                                                                                                                            | `settings/page.tsx:432` |
| Dialog title  | "Delete Event"                                                                                                                                                                                                                      | `settings/page.tsx:437` |
| Dialog body   | "Are you sure you want to permanently delete &ldquo;{event.name}&rdquo;? This will remove the event and all related invitations, guests, special events, menus, drinks, tables, media, and messages. This action cannot be undone." | `settings/page.tsx:438` |
| Cancel        | "Cancel"                                                                                                                                                                                                                            | `settings/page.tsx:447` |
| Confirm       | "Delete Event" / "Deleting..."                                                                                                                                                                                                      | `settings/page.tsx:453` |
| Success toast | "Event deleted"                                                                                                                                                                                                                     | `settings/page.tsx:152` |
| Error toast   | "Failed to delete event"                                                                                                                                                                                                            | `settings/page.tsx:155` |

## 8. Data Model

The cascade is implemented once in `cascadeDeleteEvent` (`convex/lib/events.ts:24`) and
performed in exactly this order. Every step is an indexed `by_eventId` read bounded by
`take(5000)`, followed by a per-row delete.

| #   | Table                          | What is deleted                                   | Index        | Source                   |
| --- | ------------------------------ | ------------------------------------------------- | ------------ | ------------------------ |
| 1   | `guestSpecialEventRsvps`       | Every per-guest special-invitation response       | `by_eventId` | `convex/lib/events.ts:8` |
| 2   | `invitationSpecialEventAccess` | Every invitation → special-invitation grant       | `by_eventId` | `:9`                     |
| 3   | `guestMessages`                | Every message guests left for the host            | `by_eventId` | `:10`                    |
| 4   | `activityLogs`                 | The event's entire audit trail                    | `by_eventId` | `:11`                    |
| 5   | `guests`                       | Every guest, including materialized +1 records    | `by_eventId` | `:12`                    |
| 6   | `invitations`                  | Every invitation                                  | `by_eventId` | `:13`                    |
| 7   | `specialEvents`                | Every special invitation                          | `by_eventId` | `:14`                    |
| 8   | `menuOptions`                  | Every food option                                 | `by_eventId` | `:15`                    |
| 9   | `drinkOptions`                 | Every drink option                                | `by_eventId` | `:16`                    |
| 10  | `tables`                       | Every seating table                               | `by_eventId` | `:17`                    |
| 11  | `eventMembers`                 | Every membership row, the owner's included        | `by_eventId` | `:18`                    |
| 12  | `media` — storage blob         | `ctx.storage.delete(item.storageId)` for each row | `by_eventId` | `:44`                    |
| 13  | `media` — catalog row          | The `media` document itself                       | `by_eventId` | `:45`                    |
| 14  | `events`                       | The event document                                | —            | `:48`                    |

Steps 1–11 are driven by the `EVENT_SCOPED_TABLES` constant (`convex/lib/events.ts:7`);
`media` is handled separately, after the loop, precisely because each row also owns a file
blob (`:38`). The blob is deleted **before** its catalog row, so a failure between the two
cannot leave a row pointing at a blob that no longer exists — the whole mutation would roll
back anyway.

That list covers every table in `convex/schema.ts` carrying an `eventId`, so the cascade
leaves no orphaned Convex rows. What it does not reach is the **external** state: the event's
`customDomain` is deleted along with the event row, releasing the Convex-side claim, but
nothing detaches the hostname from the Vercel project (DEF-02-02).

Nothing is written before the deletes: there is no tombstone row, no soft-delete flag, no
export, and `deleteEvent` writes no activity entry.

## 9. Backend Contract

| Function                 | Type     | Args        | Returns | Guard                                            | Caps                                 |
| ------------------------ | -------- | ----------- | ------- | ------------------------------------------------ | ------------------------------------ |
| `api.events.deleteEvent` | mutation | `{eventId}` | `void`  | `requireUser` + `requireEventMember(…, "owner")` | Cascade reads `take(5000)` per table |

Helper: `cascadeDeleteEvent(ctx, eventId)` (`convex/lib/events.ts:24`) — not a Convex
function; it explicitly documents that "Caller is responsible for authorization" (`:23`).

## 10. Business Rules

- **BR-02-F06-01** `[AS-BUILT]` — Only the event owner may delete an event; every other role,
  including co-owner, is rejected (`convex/events.ts:303`).
- **BR-02-F06-02** `[AS-BUILT]` — Deletion is permanent. No soft-delete flag, tombstone or
  trash is written, and no undo path exists (`convex/lib/events.ts:24`–`:48`).
- **BR-02-F06-03** `[AS-BUILT]` — Deleting an event deletes every row in all eleven
  event-scoped tables listed in `EVENT_SCOPED_TABLES` (`convex/lib/events.ts:7`).
- **BR-02-F06-04** `[AS-BUILT]` — Deleting an event deletes each media row **and** its
  underlying storage blob (`convex/lib/events.ts:43`–`:46`).
- **BR-02-F06-05** `[AS-BUILT]` — The event document is deleted last, after every child row
  (`convex/lib/events.ts:48`).
- **BR-02-F06-06** `[AS-BUILT]` — The cascade runs inside a single Convex mutation, so it is
  atomic; no partially-deleted event is observable (`convex/events.ts:299`).
- **BR-02-F06-07** `[AS-BUILT]` — Deleting an event removes all collaborators' access by
  deleting the `eventMembers` rows (`convex/lib/events.ts:18`).
- **BR-02-F06-08** `[AS-BUILT]` — Deletion requires exactly one confirmation click in an
  `AlertDialog`; no typed confirmation of the event name is required
  (`settings/page.tsx:448`).
- **BR-02-F06-09** `[AS-BUILT]` — The Delete card is rendered only when the caller's role is
  `owner` (`settings/page.tsx:419`).
- **BR-02-F06-10** `[AS-BUILT]` — On success the browser is redirected to `/dashboard` with a
  `router.replace`, so the deleted board cannot be reached with the back button
  (`settings/page.tsx:153`).
- **BR-02-F06-11** `[AS-BUILT]` — After deletion every public URL for the event stops
  resolving, because both public resolvers look the event up by index and find no row
  (`convex/lib/public.ts:15`, `:37`).
- **BR-02-F06-12** `[AS-BUILT]` — Deletion is not activity-logged; the event's own audit trail
  is deleted as part of the cascade (`convex/lib/events.ts:11`).
- **BR-02-F06-13** `[AS-BUILT]` — Each cascade step reads at most 5000 rows
  (`convex/lib/events.ts:32`, `:42`).

## 11. Acceptance Criteria

- **AC-02-F06-01** — **Given** a co-owner on Settings **When** the page renders **Then** no
  Delete card appears.
- **AC-02-F06-02** — **Given** a co-owner **When** they call `deleteEvent` directly **Then**
  the mutation throws and the event still exists.
- **AC-02-F06-03** — **Given** an owner **When** they press "Delete" **Then** a dialog titled
  "Delete Event" naming the event appears and nothing is deleted until it is confirmed.
- **AC-02-F06-04** — **Given** the dialog is open **When** the owner presses "Cancel" **Then**
  the event and all its data are untouched.
- **AC-02-F06-05** — **Given** an event with guests, invitations, special invitations,
  messages, menu and drink options, tables, media and activity entries **When** the owner
  confirms deletion **Then** zero rows remain for that `eventId` in any of those tables.
- **AC-02-F06-06** — **Given** an event with media **When** it is deleted **Then** each
  media file's storage blob is also removed, not just its catalog row.
- **AC-02-F06-07** — **Given** a co-owner viewing the same board **When** the owner deletes it
  **Then** the board disappears from the co-owner's `/dashboard` list.
- **AC-02-F06-08** — **Given** a shared invitation URL **When** the event is deleted **Then**
  the URL renders the "Invitation Not Found" screen.
- **AC-02-F06-09** — **Given** deletion succeeded **When** the toast appears **Then** the
  browser is at `/dashboard` and pressing back does not return to the deleted board.
- **AC-02-F06-10** — **Given** an event with a connected custom domain **When** it is deleted
  **Then** the hostname is still attached to the Vercel project (DEF-02-02 — this AC records
  current behavior and must be inverted when the defect is fixed).

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                            |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| TC-02-F06-01 | unit        | `EVENT_SCOPED_TABLES` contains every table in `convex/schema.ts` that declares an `eventId` field   |
| TC-02-F06-02 | integration | `deleteEvent` as a `planner` throws; as `owner` succeeds                                            |
| TC-02-F06-03 | integration | After deleting a fully populated event, each event-scoped table returns zero rows for the `eventId` |
| TC-02-F06-04 | integration | `ctx.storage.delete` is called once per media row of the event                                      |
| TC-02-F06-05 | integration | `resolvePublicEvent(slug)` returns `null` after deletion                                            |
| TC-02-F06-06 | integration | A superadmin passes the owner guard via the `requireEventMember` bypass                             |
| TC-02-F06-07 | e2e         | The Delete card is absent for a co-owner and present for the owner                                  |
| TC-02-F06-08 | e2e         | Confirming the dialog lands the browser on `/dashboard` with the "Event deleted" toast              |

### Manual QA checklist

- [ ] Confirm a co-owner sees the Archive card but no Delete card.
- [ ] Confirm the dialog body names the event being deleted.
- [ ] Cancel the dialog and confirm nothing changed.
- [ ] Seed a demo event, delete it, and confirm the media library's images 404.
- [ ] Confirm a previously copied invitation link renders the not-found screen.
- [ ] Confirm the deleted event is gone from the sidebar event switcher.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `take(5000)` per table per step (`convex/lib/events.ts:32`, `:42`). The whole cascade is one unpaginated mutation — see TODO-02-17                                                                 |
| Performance      | Up to 12 indexed reads plus one `db.delete` per child row and one `storage.delete` per media file, all in a single transaction. For a normal wedding board (hundreds of rows) this is milliseconds |
| Security & authz | `owner` floor, server-enforced; superadmins bypass it via `requireEventMember`. The client-side `isOwner` check only hides the control                                                             |
| Accessibility    | The confirmation is a shadcn `AlertDialog` (focus-trapped, escapable); the destructive action is conveyed by copy, not colour alone                                                                |
| i18n             | English chrome                                                                                                                                                                                     |
| Analytics        | None. The deletion is not logged anywhere that survives it — see TODO-02-19                                                                                                                        |
| Data protection  | Deletion is the only mechanism in the product that erases guests' names, emails, phone numbers and allergy notes                                                                                   |

## 14. TODOs & Open Questions

- **DEF-02-02** `[P1]` — Deleting an event never detaches its custom domain from Vercel.
  `deleteEvent` runs the Convex cascade only; nothing calls `removeProjectDomain`, which lives
  in the `DELETE /api/domains` route handler and is unreachable once the event row is gone.
  - **Evidence:** `convex/events.ts:299`–`:305` (the mutation delegates solely to
    `cascadeDeleteEvent`); `convex/lib/events.ts:24`–`:48` (no external call);
    `src/app/api/domains/route.ts:117` is the only caller of `removeProjectDomain`, and it
    first reads the event via `getEventById` (`:110`) to learn the hostname — which fails once
    the event is deleted.
  - **Impact:** The hostname stays attached to the Wedboard Vercel project forever, consuming
    a project domain slot and continuing to route traffic into the app, where
    `resolvePublicEventByHost` now finds nothing and serves the "Invitation Not Found" screen
    on a domain the product has no record of. There is no in-product way to clean it up: the
    only detach path (`DELETE /api/domains`) requires an existing event that still holds the
    domain. Because Vercel refuses a hostname already attached elsewhere, no other Vercel
    project or account can claim it. Within Wedboard a second event can re-claim it, but only
    because `POST /api/domains` deliberately tolerates the `domain_already_in_use` error
    (`src/app/api/domains/route.ts:68`) — the recovery is incidental, not designed.
  - **Proposed fix:** Delete becomes a two-phase operation like connect: a route handler (or a
    Convex action) reads the event's `customDomain`, calls `removeProjectDomain` (tolerating
    404), and only then invokes `deleteEvent`. Cross-reference
    [EP-02-F10](./custom-domain/F10-remove-domain.md), which already implements exactly this
    detach-then-clear ordering and should be reused rather than duplicated.
- **TODO-02-17** `[P2]` `[CHANGE]` — The cascade is unbounded in intent but capped in
  practice: each step reads `take(5000)` once, with no pagination and no loop
  (`convex/lib/events.ts:32`, `:42`). An event exceeding 5000 rows in any single table would
  have its event document deleted while surplus child rows survive, permanently unreachable
  (no query can reach a row whose event no longer exists) and never garbage-collected. The
  whole cascade also runs in one Convex mutation, so a very large board risks the transaction
  size and time limits.
  - **Rationale:** No product cap enforces the ceiling — `guests` has no per-event maximum,
    and `guestMessages` is capped only per invitation (20), so a large event with many
    invitations can approach it. `media` is genuinely bounded (50 per event), the other ten
    tables are not.
  - **Proposed rule:** The cascade drains each table in pages until empty, and long deletes
    are moved to a scheduled/paginated job so that no single mutation must fit an entire
    board.
- **TODO-02-18** `[P2]` `[CHANGE]` — The confirmation is a single click on a button labelled
  "Delete Event", with no typed confirmation of the event name
  (`settings/page.tsx:448`), for the most destructive action in the product.
  - **Rationale:** The dialog and the card are the only friction between a stray click and
    the irreversible loss of every guest record, RSVP and uploaded image.
  - **Proposed rule:** The confirm button stays disabled until the owner types the event name
    (or the event key) exactly, matching the pattern the wider ecosystem uses for
    irreversible deletes.
- **TODO-02-19** `[P2]` `[ADD]` — A deleted event leaves no trace anywhere: its `activityLogs`
  rows are part of the cascade (`convex/lib/events.ts:11`) and no global log records the
  deletion, so neither a co-owner nor a superadmin can find out that a board existed, who
  deleted it, or when.
  - **Rationale:** Co-owners lose access silently. The `/admin` console (EP-15) has no way to
    show a deletion history.
  - **Proposed rule:** A platform-level, non-event-scoped audit record is written before the
    cascade, retaining the event id, name, owner and timestamp.
- **TODO-02-20** `[P2]` `[CHANGE]` — The Danger Zone card body and the dialog body list
  different things: the card omits "drinks" (`settings/page.tsx:423`) while the dialog
  includes it (`:438`), and neither mentions that collaborators lose access or that the
  activity log is erased.
  - **Rationale:** The confirmation copy is the owner's only description of what they are
    about to destroy; it should match the actual cascade in §8.
  - **Proposed rule:** Both strings enumerate the same list, derived from
    `EVENT_SCOPED_TABLES`, and state that members lose access.

### Open questions

- **Q1** — Should deletion be a scheduled grace period (e.g. 30 days of soft delete before the
  cascade) rather than immediate, given that no export or backup exists?
- **Q2** — Should an owner be able to delete an event that has invitations already marked
  sent, or should that require the same extra friction proposed for the event key
  ([TODO-02-10](./F04-event-key.md))?
- **Q3** — Should the `/admin` console be able to delete an event on a host's behalf, and if
  so, does it inherit this same cascade?

## 15. Traceability

| Concern                         | Source                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| Route                           | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:376` |
| UI (owner gate)                 | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:419` |
| UI (dialog)                     | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:429` |
| UI (handler)                    | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:148` |
| Backend (mutation)              | `convex/events.ts:299`                                            |
| Backend (guard)                 | `convex/events.ts:303`                                            |
| Backend (cascade)               | `convex/lib/events.ts:24`                                         |
| Backend (table list)            | `convex/lib/events.ts:7`                                          |
| Backend (media + blobs)         | `convex/lib/events.ts:39`                                         |
| Public resolution after delete  | `convex/lib/public.ts:15`                                         |
| Vercel detach (not called here) | `src/app/api/domains/route.ts:117`                                |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |

</content>
</invoke>
