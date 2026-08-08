# EP-04 — Guest Management

**Primary actor:** Editor+ · **Status:** partial · **Last updated:** 2026-07-28

The host-facing guest directory: everything an Editor, Co-owner or Owner does to the people
on the list from inside the dashboard. Guests are created here, grouped into invitations,
given permission to bring a +1, corrected when they phone in their answer instead of using
the link, and removed when plans change.

This epic covers the **dashboard side only**. The public page where a guest answers for
themselves is [EP-07 — Guest Experience](../07-guest-experience/); it writes to the same
`guests` rows through `guests.submitPublicRsvp`, and the two surfaces share the +1 and
decline cascade helpers in `convex/lib/guests.ts`.

---

## 1. Guest lifecycle

A **[Guest](../../glossary.md)** is one individual attendee (`guests`), always scoped to
exactly one event. The record moves through five stages, and every stage in this epic is
reversible except the last two:

1. **Created.** An Editor+ adds the guest with a first and last name
   (`guests.createGuest`, `convex/guests.ts:148`). `rsvpStatus` starts at `pending` and
   `isPlusOne` at `false`. If no `invitationId` is supplied the guest is an
   **[Un-invited guest](../../glossary.md)** — visible in the directory, but with no URL
   through which to answer.
2. **Linked to an invitation.** The link is written from the invitation side
   ([EP-05-F02](../05-invitations/F02-invitation-composition-and-lock.md)), by passing the guest's id
   in `invitations.updateInvitation`'s `guestIds`, or at creation time by passing
   `invitationId` to `createGuest`. Once every named guest on an invitation is linked, the
   host sends the link.
3. **Responds.** The guest answers publicly (EP-07), or the host records the answer for them
   in the guest details dialog ([F03](./F03-edit-guest-and-rsvp-override.md)). Both paths
   write `guests.rsvpStatus`.
4. **Optionally hosts a +1.** `allowsPlusOne` is a **per-guest permission**. When it is
   granted and someone is actually brought, a second, real guest record is materialized
   (`isPlusOne: true`, `plusOneOfGuestId` → host) sharing the host's invitation. The whole
   model is specified in [F04](./F04-plus-one-lifecycle.md).
5. **Possibly declines — or is deleted.** A guest who becomes `declined` runs the
   **[Decline effects](../../glossary.md)** cascade (`convex/lib/guests.ts:51`): their
   special-invitation RSVP rows are deleted and their +1 is destroyed. The guest itself stays
   linked to its invitation. Deleting the guest removes the same rows plus the guest.
   **Neither cascade is undone if the status is later changed back** — see
   `BR-04-F03-08` and `BR-04-F04-12`.

A guest never leaves the event's directory by responding. The only way a `guests` row
disappears is `guests.deleteGuest`, a +1 teardown, or the event-level cascade delete.

---

## 2. Actors

| Actor                     | Access                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Owner · Co-owner · Editor | Full CRUD on guests, +1 management, RSVP override                                 |
| Viewer                    | Blocked — every function in this epic uses the default `requireEventEditor` floor |
| Superadmin                | Bypasses the guard on every event                                                 |
| Public guest              | Not an actor here; see EP-07                                                      |

Gate: `requireEventEditor(ctx, eventId)` with its default `minRole` of `"editor"`. Role
semantics live in [roles-and-permissions.md](../../roles-and-permissions.md).

---

## 3. Features

| ID                                                 | Feature                    | Status      | Summary                                                                       |
| -------------------------------------------------- | -------------------------- | ----------- | ----------------------------------------------------------------------------- |
| [EP-04-F01](./F01-add-guest.md)                    | Add a guest                | implemented | Single-guest create form; optional invitation link, optional +1 permission    |
| [EP-04-F02](./F02-guest-directory.md)              | Guest directory            | implemented | The searchable, filterable table; one round-trip page query                   |
| [EP-04-F03](./F03-edit-guest-and-rsvp-override.md) | Edit guest & RSVP override | defective   | Details dialog; main-event status plus a per-special-invitation status select |
| [EP-04-F04](./F04-plus-one-lifecycle.md)           | +1 lifecycle               | defective   | Permission, materialization, teardown and cascade of the +1 record            |
| [EP-04-F05](./F05-delete-guest.md)                 | Delete a guest             | implemented | Confirmed delete with RSVP-row and +1 cascade                                 |
| [EP-04-F06](./F06-bulk-guest-entry.md)             | Bulk guest entry           | defective   | `bulkCreateGuestsForInvitation`, ≤20 per call — backend only, no UI           |

---

## 4. Workflows

| ID       | Workflow                             | Spec                                         |
| -------- | ------------------------------------ | -------------------------------------------- |
| WF-04-01 | Add a single guest                   | [F01](./F01-add-guest.md)                    |
| WF-04-02 | Find a guest in the directory        | [F02](./F02-guest-directory.md)              |
| WF-04-03 | Record a guest's answer by hand      | [F03](./F03-edit-guest-and-rsvp-override.md) |
| WF-04-04 | Grant and manage a guest's +1        | [F04](./F04-plus-one-lifecycle.md)           |
| WF-04-05 | Remove a guest from the event        | [F05](./F05-delete-guest.md)                 |
| WF-04-06 | Add several guests to one invitation | [F06](./F06-bulk-guest-entry.md)             |

---

## 5. Cross-epic dependencies

| Depends on                                    | Why                                                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [EP-02](../02-event-setup/)                   | Every guest is scoped to an event; the directory lives under `/dashboard/[eventSlug]`                                                                           |
| [EP-03](../03-collaboration-and-permissions/) | The `requireEventEditor` gate, and `EP-03-F05` (activity log) which records guest create/update/delete                                                          |
| [EP-05](../05-invitations/)                   | Owns `invitationId` linkage and the **[Composition Lock](../../glossary.md)** — a guest cannot be moved between invitations once any linked guest has responded |
| [EP-06](../06-special-invitations/)           | Owns `specialEvents` and `invitationSpecialEventAccess`; this epic writes `guestSpecialEventRsvps` rows against them                                            |
| [EP-07](../07-guest-experience/)              | The public write path into the same rows (`submitPublicRsvp`)                                                                                                   |
| [EP-11](../11-catering/)                      | `menuOptionId` / `drinkOptionId` are set from the guest dialog; the option catalog is EP-11's                                                                   |
| [EP-12](../12-seating/)                       | `tableId` / `seatNumber` are displayed here and written by EP-12                                                                                                |

Nothing in this epic depends on EP-08 – EP-10 (design, media, sharing).

---

## 6. Epic-wide defects and gaps

Full entries live in each feature's §14. Indexed by ID; defects first:

| ID           | P   | Where                                                                                                                                                                               |
| ------------ | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEF-04-01`  | P1  | Server `ConvexError` messages (the ≤20 bulk cap, "This guest is not allowed a +1", …) never reach the user — `useToastMutation` swallows them. [F06 §14](./F06-bulk-guest-entry.md) |
| `DEF-04-02`  | P1  | A guest invited to a special invitation _via their invitation's access_ cannot be set back to "Not invited" from the dialog. [F03 §14](./F03-edit-guest-and-rsvp-override.md)       |
| `DEF-04-03`  | P1  | "Add +1" fails until "Allows +1" has been saved, with a generic toast. [F04 §14](./F04-plus-one-lifecycle.md)                                                                       |
| `TODO-04-01` | P1  | No guest import (CSV or paste). [F06](./F06-bulk-guest-entry.md)                                                                                                                    |
| `TODO-04-02` | P2  | No export of the guest list. [F02 §14](./F02-guest-directory.md)                                                                                                                    |
| `TODO-04-03` | P1  | `email` and `phone` are collected but never used. [F01 §14](./F01-add-guest.md)                                                                                                     |
| `TODO-04-04` | P2  | `guests.isPrimaryContact` is dead. [F01 §14](./F01-add-guest.md)                                                                                                                    |
| `TODO-04-05` | P1  | Declining from the dashboard silently destroys special-invitation RSVPs and the +1, with no warning and no undo. [F03](./F03-edit-guest-and-rsvp-override.md)                       |
| `TODO-04-06` | P1  | The bulk mutation has no UI. [F06 §14](./F06-bulk-guest-entry.md)                                                                                                                   |
| `TODO-04-07` | P2  | Guest reads are silently truncated. [F01 §14](./F01-add-guest.md)                                                                                                                   |
| `TODO-04-08` | P2  | A guest cannot be moved between invitations after responding. [F03 §14](./F03-edit-guest-and-rsvp-override.md)                                                                      |
| `TODO-04-09` | P2  | `guests.listByEvent` (`convex/guests.ts:13`), `guests.listByInvitation` (`:25`) and `guests.getGuestById` (`:138`) have no caller in `src/`. [F01 §14](./F01-add-guest.md)          |
| `TODO-04-10` | P2  | `guests.specialRequests` is write-only. [F03 §14](./F03-edit-guest-and-rsvp-override.md)                                                                                            |
| `TODO-04-11` | P2  | The directory table has no horizontal scroll container. [F02 §14](./F02-guest-directory.md)                                                                                         |
| `TODO-04-12` | P2  | Rows are mouse-only. [F02 §14](./F02-guest-directory.md)                                                                                                                            |
| `TODO-04-13` | P2  | No sorting or pagination. [F02 §14](./F02-guest-directory.md)                                                                                                                       |
| `TODO-04-14` | P2  | Search is name-only. [F02 §14](./F02-guest-directory.md)                                                                                                                            |
| `TODO-04-15` | P2  | The page has no error state. [F02 §14](./F02-guest-directory.md)                                                                                                                    |
| `TODO-04-16` | P1  | The details dialog applies no validation. [F03 §14](./F03-edit-guest-and-rsvp-override.md)                                                                                          |
| `TODO-04-17` | P2  | `setSpecialEventRsvp` ignores `specialEvents.isActive`. [F03 §14](./F03-edit-guest-and-rsvp-override.md)                                                                            |
| `TODO-04-18` | P2  | Special-invitation RSVP overrides are not activity-logged. [F03 §14](./F03-edit-guest-and-rsvp-override.md)                                                                         |
| `TODO-04-19` | P1  | The dashboard cannot name a +1 at creation. [F04 §14](./F04-plus-one-lifecycle.md)                                                                                                  |
| `TODO-04-20` | P2  | Dashboard and public paths disagree on the +1's initial status. [F04 §14](./F04-plus-one-lifecycle.md)                                                                              |
| `TODO-04-21` | P2  | Nothing enforces one +1 per host at the data layer. [F04 §14](./F04-plus-one-lifecycle.md)                                                                                          |
| `TODO-04-22` | P2  | Teardown is silent about what it destroys. [F04 §14](./F04-plus-one-lifecycle.md)                                                                                                   |
| `TODO-04-23` | P2  | A +1 can be given its own special-invitation RSVPs and seat but is invisible in the invitation composition UI. [F04 §14](./F04-plus-one-lifecycle.md)                               |
| `TODO-04-24` | P2  | The confirmation understates the blast radius. [F05 §14](./F05-delete-guest.md)                                                                                                     |
| `TODO-04-25` | P2  | No bulk delete and no delete from the table. [F05 §14](./F05-delete-guest.md)                                                                                                       |
| `TODO-04-26` | P2  | Deleting a guest who has already answered attending gets no extra friction. [F05 §14](./F05-delete-guest.md)                                                                        |
| `TODO-04-27` | P2  | The cascade is bounded at 100 RSVP rows. [F05 §14](./F05-delete-guest.md)                                                                                                           |
| `TODO-04-28` | P2  | The bulk path skips the name validation the single path applies. [F06 §14](./F06-bulk-guest-entry.md)                                                                               |
| `TODO-04-29` | P2  | The bulk path cannot create un-invited guests. [F06 §14](./F06-bulk-guest-entry.md)                                                                                                 |
