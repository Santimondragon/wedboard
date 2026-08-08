---
id: EP-04-F05
title: Delete a Guest
epic: EP-04 Guest Management
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-04-F03, EP-04-F04]
---

# EP-04-F05 — Delete a Guest

## 1. Summary

Permanently removes one guest from the event. Deleting is the only way a `guests` row leaves the
directory short of the event-level cascade, and it is destructive in two directions: the guest's
own special-invitation answers go with it, and so does the companion they were bringing. The
action lives inside the guest details dialog, behind a confirmation.

## 2. Actors & Permissions

| Actor                     | Access | Notes                                                                   |
| ------------------------- | ------ | ----------------------------------------------------------------------- |
| Owner · Co-owner · Editor | Full   | `requireEventEditor(ctx, guest.eventId)` (`convex/guests.ts:318`)       |
| Viewer                    | None   |                                                                         |
| Public guest              | None   | The public RSVP never deletes a named guest; it can only tear down a +1 |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F05-01** — As an Editor, I want to delete a guest who is no longer invited so that the
  head count and the seating plan are correct.
- **US-04-F05-02** — As an Editor, I want to confirm before deleting so that a mis-click on a
  table row cannot destroy data.
- **US-04-F05-03** — As an Editor, I want a deleted host's companion to go with them so that no
  orphan record is left in the list.

## 4. Entry Points

| Entry point                                 | Route / control                                                                                                   | Actor   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| "Delete" button in the guest details dialog | `/dashboard/[eventSlug]/guests` → row click → dialog footer (`src/components/guests/guest-details-sheet.tsx:385`) | Editor+ |

There is no bulk delete, no delete from the table row, and no delete from the invitations page.

## 5. UX Flow

### Happy path

1. The Editor opens a guest's details dialog ([F03](./F03-edit-guest-and-rsvp-override.md)).
2. They press the rose-coloured **"Delete"** button with a trash icon in the dialog footer
   (`guest-details-sheet.tsx:385`).
3. An `AlertDialog` asks "Delete Guest" / "Are you sure you want to delete {first} {last}? This
   action cannot be undone." (`guest-details-sheet.tsx:392`).
4. Pressing the destructive **"Delete"** action calls `deleteGuest.run({ id })`
   (`guest-details-sheet.tsx:147`) → `api.guests.deleteGuest` (`convex/guests.ts:313`).
5. The server loads the guest, guards on its event, deletes up to 100 of its
   `guestSpecialEventRsvps` rows (`convex/guests.ts:321`), tears down its +1 if it hosts one
   (`:330`), deletes the guest row (`:333`), and writes a `guest`/`delete` activity entry
   (`:334`).
6. Toast "Guest deleted"; the details dialog closes (`guest-details-sheet.tsx:148`).
7. The directory re-renders without the row — and without the +1's row, if there was one.

### Alternate & edge paths

- **A1** — Cancelling the `AlertDialog` closes it and leaves the details dialog open with all
  local edits intact.
- **A2** — The guest is a +1 → only that record is deleted; its host keeps `allowsPlusOne` and
  the directory shows "Allowed" again (`BR-04-F04-17`).
- **A3** — The guest is seated → the row is deleted outright; nothing rewrites the `tables` doc,
  because seat assignments live on the guest ([EP-12](../12-seating/)).
- **A4** — The guest was the only guest on its invitation → the invitation survives with zero
  guests, and its public **[RSVP State](../../glossary.md)** falls back to `pending`.
- **E1** — The guest was deleted by a collaborator moments earlier → the server throws
  "Guest not found" (`convex/guests.ts:316`); the user sees "Failed to delete guest".

## 6. States

| State             | Behavior                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Loading           | None                                                                                                           |
| Empty             | Not applicable                                                                                                 |
| Error             | Toast "Failed to delete guest"; both dialogs remain open                                                       |
| Success           | Toast "Guest deleted"; the details dialog closes                                                               |
| Disabled / locked | The confirm action is disabled while pending, its label becoming "Deleting..." (`guest-details-sheet.tsx:405`) |
| Mobile            | Standard `AlertDialog` layout                                                                                  |

## 7. UI Specification

### Screens & components

| Element          | Component                | Path                                                |
| ---------------- | ------------------------ | --------------------------------------------------- |
| Delete trigger   | `Button` + `Trash2` icon | `src/components/guests/guest-details-sheet.tsx:385` |
| Confirmation     | `AlertDialog`            | `src/components/guests/guest-details-sheet.tsx:383` |
| Mutation wrapper | `useToastMutation`       | `src/components/guests/guest-details-sheet.tsx:73`  |

### Fields & validation

None — the action takes no input.

### Copy deck

| Key            | Copy                                                                            | Source                        |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| Trigger        | "Delete"                                                                        | `guest-details-sheet.tsx:387` |
| Confirm title  | "Delete Guest"                                                                  | `guest-details-sheet.tsx:392` |
| Confirm body   | "Are you sure you want to delete {first} {last}? This action cannot be undone." | `guest-details-sheet.tsx:393` |
| Cancel         | "Cancel"                                                                        | `guest-details-sheet.tsx:399` |
| Confirm action | "Delete" / "Deleting..."                                                        | `guest-details-sheet.tsx:405` |
| Toasts         | "Guest deleted" / "Failed to delete guest"                                      | `guest-details-sheet.tsx:74`  |

The confirmation body names the guest but **does not** mention the +1 or the special-invitation
answers that go with them — `TODO-04-24`.

## 8. Data Model

| Table                           | Fields             | Read / Write         | Index          |
| ------------------------------- | ------------------ | -------------------- | -------------- |
| `guests`                        | whole doc          | Read then Delete     | direct `get`   |
| `guestSpecialEventRsvps`        | rows of this guest | Delete, `.take(100)` | `by_guestId`   |
| `guests` (+1)                   | the linked +1      | Delete via cascade   | `by_plusOneOf` |
| `guestSpecialEventRsvps` (+1's) | rows of the +1     | Delete               | `by_guestId`   |
| `activityLogs`                  | —                  | Write                | —              |

**Cascade order** (`convex/guests.ts:313`–`:341`): the guest's own special-invitation RSVP rows
first, then `deletePlusOneCascade` on the +1 (its RSVP rows then the +1 row), then the guest, then
the activity entry.

**Not cascaded:** the `invitations` row the guest belonged to is untouched; menu, drink and table
documents are untouched; `guestMessages` are not linked to guests at all. Nothing anywhere holds a
foreign key to a guest except `guestSpecialEventRsvps` and the +1's `plusOneOfGuestId`, both of
which are handled.

## 9. Backend Contract

| Function                 | Type     | Args   | Returns | Guard                                                             | Caps                            |
| ------------------------ | -------- | ------ | ------- | ----------------------------------------------------------------- | ------------------------------- |
| `api.guests.deleteGuest` | mutation | `{id}` | `void`  | `requireEventEditor(ctx, guest.eventId)` (`convex/guests.ts:318`) | ≤100 RSVP rows deleted (`:324`) |

Helper: `deletePlusOneCascade` (`convex/lib/guests.ts:36`).

## 10. Business Rules

- **BR-04-F05-01** `[AS-BUILT]` — Deleting a guest requires at least the `editor` role on that
  guest's event (`convex/guests.ts:318`).
- **BR-04-F05-02** `[AS-BUILT]` — Deleting an unknown id throws "Guest not found"
  (`convex/guests.ts:316`).
- **BR-04-F05-03** `[AS-BUILT]` — Deletion removes every `guestSpecialEventRsvps` row belonging to
  the guest, up to 100 (`convex/guests.ts:321`).
- **BR-04-F05-04** `[AS-BUILT]` — Deletion removes the guest's +1 record and that +1's own
  special-invitation RSVP rows (`convex/guests.ts:330`, `convex/lib/guests.ts:36`).
- **BR-04-F05-05** `[AS-BUILT]` — Deleting a +1 record removes only that record; its host is left
  untouched, permission included (`convex/guests.ts:313` has no host branch).
- **BR-04-F05-06** `[AS-BUILT]` — The guest's invitation is never deleted or modified by this
  mutation.
- **BR-04-F05-07** `[AS-BUILT]` — Deletion is permanent; there is no soft-delete flag, archive or
  restore path anywhere in `guests`.
- **BR-04-F05-08** `[AS-BUILT]` — Every deletion writes one `activityLogs` row with
  `entity: "guest"`, `action: "delete"` and the guest's name (`convex/guests.ts:334`), which is the
  only surviving record of the guest.
- **BR-04-F05-09** `[AS-BUILT]` — The UI requires an explicit confirmation before calling the
  mutation (`guest-details-sheet.tsx:383`); the mutation itself has no such requirement.
- **BR-04-F05-10** `[AS-BUILT]` — Deletion is permitted at any RSVP status; a guest who has
  already answered attending can be deleted with no additional warning
  (`convex/guests.ts:313` inspects only the id).

## 11. Acceptance Criteria

- **AC-04-F05-01** — **Given** a guest's details dialog **When** "Delete" is pressed **Then** a
  confirmation naming that guest appears and nothing has been deleted yet.
- **AC-04-F05-02** — **Given** the confirmation **When** "Cancel" is pressed **Then** the guest
  still exists and the details dialog is still open.
- **AC-04-F05-03** — **Given** the confirmation **When** "Delete" is pressed **Then** the guest
  row disappears from the directory, the toast reads "Guest deleted" and the dialog closes.
- **AC-04-F05-04** — **Given** a guest with two special-invitation RSVP rows **When** they are
  deleted **Then** both rows are gone.
- **AC-04-F05-05** — **Given** a host with a materialized +1 **When** the host is deleted **Then**
  both guest rows disappear and no row retains a `plusOneOfGuestId` pointing at the deleted host.
- **AC-04-F05-06** — **Given** a +1 record **When** it alone is deleted **Then** the host remains
  with `allowsPlusOne: true` and the directory "+1" cell reads "Allowed".
- **AC-04-F05-07** — **Given** the last guest on an invitation **When** they are deleted **Then**
  the invitation still exists and its public page renders the `pending` layout.
- **AC-04-F05-08** — **Given** a seated guest **When** they are deleted **Then** their seat shows
  as free on the seating page.
- **AC-04-F05-09** — **Given** any deletion **When** the Activity page is opened **Then** an entry
  records that the actor removed that guest by name.
- **AC-04-F05-10** — **Given** a Viewer **When** `deleteGuest` is called **Then** it throws and
  the guest survives.
- **AC-04-F05-11** — **Given** an id that no longer exists **When** `deleteGuest` is called
  **Then** it throws "Guest not found" and the user sees "Failed to delete guest".

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                              |
| ------------ | ----------- | ------------------------------------------------------------------------------------- |
| TC-04-F05-01 | integration | `deleteGuest` removes the guest and all of its `guestSpecialEventRsvps` rows          |
| TC-04-F05-02 | integration | `deleteGuest` on a host removes the +1 and the +1's RSVP rows                         |
| TC-04-F05-03 | integration | `deleteGuest` on a +1 leaves the host and its `allowsPlusOne` intact                  |
| TC-04-F05-04 | integration | `deleteGuest` throws for an unknown id and for a `viewer`                             |
| TC-04-F05-05 | integration | The deletion writes exactly one `activityLogs` row with `action: "delete"`            |
| TC-04-F05-06 | integration | The guest's invitation document is unchanged after the delete                         |
| TC-04-F05-07 | e2e         | Cancelling the confirmation deletes nothing                                           |
| TC-04-F05-08 | e2e         | Deleting a host removes both its row and its +1's row from the table without a reload |

### Manual QA checklist

- [ ] The confirmation names the correct guest
- [ ] The confirm button shows "Deleting..." while in flight
- [ ] Deleting a host also clears the +1 row from the table
- [ ] The seating page frees the deleted guest's seat
- [ ] The activity log records the removal

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | At most 100 special-invitation RSVP rows are deleted per guest and per +1 (`convex/guests.ts:324`, `convex/lib/guests.ts:27`); beyond that, rows are orphaned |
| Performance      | One read, up to 101 deletes plus the +1 teardown, one insert                                                                                                  |
| Security & authz | The guard is derived from the loaded guest's own `eventId`, so a caller cannot delete across events                                                           |
| Accessibility    | The destructive action is an `AlertDialog` with a labelled cancel and confirm                                                                                 |
| i18n             | English                                                                                                                                                       |
| Analytics        | Activity log only                                                                                                                                             |

## 14. TODOs & Open Questions

- **TODO-04-24** `[P2]` `[CHANGE]` — The confirmation understates the blast radius.
  - **Rationale:** `BR-04-F05-04`. Deleting a host silently deletes a second guest record — the
    +1, with its own name, menu choice, allergies and seat — yet the copy names only the guest
    being deleted (`src/components/guests/guest-details-sheet.tsx:393`).
  - **Proposed rule:** The confirmation names the +1 and any special invitations that will lose
    this guest's answer.
- **TODO-04-25** `[P2]` `[ADD]` — No bulk delete and no delete from the table.
  - **Rationale:** Removal is one guest at a time through the details dialog; clearing a
    cancelled household of six means six dialogs.
  - **Proposed rule:** The directory supports multi-select removal behind one confirmation.
- **TODO-04-26** `[P2]` `[ADD]` — Deleting a guest who has already answered attending gets no
  extra friction.
  - **Rationale:** `BR-04-F05-10`. An attending guest's RSVP, menu choice and seat are destroyed
    on the same single confirmation as an untouched pending row.
  - **Proposed rule:** A guest with a non-pending status requires a stronger confirmation.
- **TODO-04-27** `[P2]` `[CHANGE]` — The cascade is bounded at 100 RSVP rows.
  - **Rationale:** `convex/guests.ts:324` and `convex/lib/guests.ts:27` both `.take(100)`. The cap
    is unreachable today (2 special invitations per event), but it is a silent partial delete if
    that cap ever rises.
  - **Proposed rule:** The cascade loops until no rows remain, or asserts the bound.

### Open questions

- **Q1** — Should deleting a guest be reversible (soft delete) given `BR-04-F05-07` makes the
  activity log the only trace?

## 15. Traceability

| Concern      | Source                                              |
| ------------ | --------------------------------------------------- |
| Trigger      | `src/components/guests/guest-details-sheet.tsx:385` |
| Confirmation | `src/components/guests/guest-details-sheet.tsx:383` |
| Handler      | `src/components/guests/guest-details-sheet.tsx:145` |
| Toast config | `src/components/guests/guest-details-sheet.tsx:73`  |
| Backend      | `convex/guests.ts:313`                              |
| Guard        | `convex/guests.ts:318`                              |
| RSVP cascade | `convex/guests.ts:321`                              |
| +1 cascade   | `convex/guests.ts:330`, `convex/lib/guests.ts:36`   |
| Activity log | `convex/guests.ts:334`                              |
| Schema       | `convex/schema.ts:122`, `convex/schema.ts:167`      |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
