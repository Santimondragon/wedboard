---
id: EP-04-F04
title: +1 Lifecycle
epic: EP-04 Guest Management
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-04-F01, EP-04-F03, EP-05-F02, EP-07-F03]
---

# EP-04-F04 — +1 Lifecycle

## 1. Summary

A **[+1](../../glossary.md)** is a companion a guest may bring. Wedboard models it as a
_permission plus a materialization_: the permission (`guests.allowsPlusOne`) is granted per
**guest**, never per invitation; the companion, once real, is a **full guest record of its own**
(`isPlusOne: true`, `plusOneOfGuestId` → the **[Host guest](../../glossary.md)**) that shares the
host's invitation and can be named, seated, fed and counted like anybody else. That second record
is created either by the host in the dashboard or by the guest on the public RSVP form, and it is
torn down automatically whenever the reason for its existence disappears — the permission is
revoked, the host declines, or the host is deleted.

This is the most intricate feature in the epic because the same record is written by two
surfaces with different defaults, and because four separate code paths can destroy it.

## 2. Actors & Permissions

| Actor                     | Access                                                                | Notes                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner · Co-owner · Editor | Grant the permission, add, rename and remove the +1                   | `requireEventEditor` on `addPlusOne` (`convex/guests.ts:357`) and `removePlusOne` (`:401`)                                                                             |
| Viewer                    | None                                                                  |                                                                                                                                                                        |
| Public guest              | Materializes or removes **their own** host's +1 through the RSVP form | `submitPublicRsvp.plusOneUpdates` (`convex/guests.ts:591`), no auth — data-level checks only. Owned by [EP-07-F03](../07-guest-experience/F03-plus-one-declaration.md) |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F04-01** — As an Editor, I want to mark that a specific guest may bring someone so that
  the public RSVP form asks them about it.
- **US-04-F04-02** — As an Editor, I want to add the companion myself when the guest tells me
  their name by phone.
- **US-04-F04-03** — As an Editor, I want to add the companion before I know their name so that
  the head count is right today.
- **US-04-F04-04** — As an Editor, I want the companion to be a normal guest so that I can seat
  them, record their allergies and give them a menu.
- **US-04-F04-05** — As an Editor, I want revoking the permission to remove the companion so that
  the list never carries a companion nobody is bringing.
- **US-04-F04-06** — As an Editor, I want a declining guest's companion to disappear
  automatically so that the head count corrects itself.
- **US-04-F04-07** — As an Editor, I want to see at a glance which guests may bring someone and
  who that someone is.

## 4. Entry Points

| Entry point                                | Route / control                                                                                         | Actor                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------- |
| "Allows +1" checkbox on the add form       | `/dashboard/[eventSlug]/guests` → Add Guest (`src/components/guests/guest-form.tsx:91`)                 | Editor+              |
| "Allows +1" checkbox in the details dialog | row click → dialog (`src/components/guests/guest-details-sheet.tsx:278`)                                | Editor+              |
| "Add +1" button                            | details dialog, shown only when the checkbox is ticked and no +1 exists (`guest-details-sheet.tsx:309`) | Editor+              |
| "Remove +1" button                         | details dialog, shown when a +1 exists (`guest-details-sheet.tsx:296`)                                  | Editor+              |
| Public RSVP +1 question                    | the elegant `rsvp` block on the public invitation                                                       | Public guest (EP-07) |

## 5. UX Flow

### Happy path — host-side

1. The Editor grants the permission, either at creation ([F01](./F01-add-guest.md)) or by ticking
   **"Allows +1"** in the details dialog and pressing "Save Changes"
   (`guest-details-sheet.tsx:278`, `:130`).
2. With the checkbox ticked and no +1 yet, an **"Add +1"** button appears
   (`guest-details-sheet.tsx:309`).
3. Clicking it calls `addPlusOne.run({ hostGuestId })` with **no name arguments**
   (`guest-details-sheet.tsx:314`) → `api.guests.addPlusOne` (`convex/guests.ts:348`).
4. The server refuses if the host is itself a +1 or lacks the permission, returns the existing +1
   if there already is one, and otherwise inserts a new guest with the placeholder name
   `"Acompañante de {host first name}"`, `isPlusOne: true`, `allowsPlusOne: false`,
   `plusOneOfGuestId` = the host, `invitationId` = the host's invitation, and
   `rsvpStatus: "pending"` (`convex/guests.ts:369`–`:381`).
5. A `guest`/`create` activity entry is written for the +1 (`convex/guests.ts:382`).
6. Toast "+1 added". The dialog now shows the +1's name and RSVP badge next to a "Remove +1"
   button (`guest-details-sheet.tsx:289`).
7. The +1 appears in the directory as its own row labelled "↳ +1 de {host}", and on the host's row
   as the +1's name ([F02](./F02-guest-directory.md)).

### Happy path — public side (EP-07, summarized because it writes the same record)

1. The public RSVP form shows a "bring a +1" question under each host that `allowsPlusOne`, once
   the host is marked attending.
2. Submitting sends `plusOneUpdates: [{hostGuestId, attending, firstName?, lastName?}]`
   (`convex/guests.ts:484`).
3. For an attending host that allows a +1 and whose companion is coming, the record is inserted or
   patched with `rsvpStatus: "attending"` (`convex/guests.ts:604`–`:624`).
4. Otherwise any existing +1 is destroyed (`convex/guests.ts:625`).

### Teardown paths

| Trigger                                                             | Path                                     | Source                    |
| ------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| "Remove +1" pressed                                                 | `removePlusOne` → `deletePlusOneCascade` | `convex/guests.ts:396`    |
| "Allows +1" unticked and saved                                      | `updateGuest` post-patch branch          | `convex/guests.ts:236`    |
| Host set to `declined` (dashboard or public)                        | `applyDeclineEffects`                    | `convex/lib/guests.ts:56` |
| Host deleted                                                        | `deleteGuest`                            | `convex/guests.ts:330`    |
| Public form says the +1 is not coming, or the host is not attending | `submitPublicRsvp`                       | `convex/guests.ts:625`    |

Every one of these ends in `deletePlusOneCascade`, which deletes the +1's own
`guestSpecialEventRsvps` rows and then the +1 guest record (`convex/lib/guests.ts:36`).

### Alternate & edge paths

- **A1** — "Add +1" pressed twice → the second call finds the existing record and returns its id;
  no duplicate is created (`convex/guests.ts:366`).
- **A2** — The host has no invitation → the +1 inherits `invitationId: undefined` and is likewise
  un-invited (`convex/guests.ts:374`).
- **A3** — The guest being viewed **is** a +1 → the whole permission panel is replaced by the
  read-only band "↳ +1 de {host}"; a +1 can never be given its own +1
  (`guest-details-sheet.tsx:271`, `convex/guests.ts:359`).
- **A4** — The +1 is opened as a normal guest → its name, RSVP, menu, drink and allergies are all
  editable, and it can be deleted directly ([F05](./F05-delete-guest.md)).
- **E1** — "Add +1" pressed on a guest whose permission is ticked but **not yet saved** → the
  server throws "This guest is not allowed a +1" and the user sees only "Failed to add +1"
  (`DEF-04-03`).
- **E2** — Any failure → generic toast; the underlying message is swallowed (`DEF-04-01`).

## 6. States

| State                                 | Behavior                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                               | None — the +1 is resolved from the already-loaded page data (`…/guests/page.tsx:61`)                                                    |
| Empty                                 | Permission ticked, no +1 → only the "Add +1" button renders                                                                             |
| Error                                 | Toast only; local checkbox state is unchanged                                                                                           |
| Success                               | "+1 added" / "+1 removed"; the panel re-renders from the refreshed query                                                                |
| Disabled / locked                     | "Add +1" is disabled while `addPlusOne.pending`; "Remove +1" while `removePlusOne.pending` (`guest-details-sheet.tsx:313`, `:300`)      |
| Permission off with a +1 still stored | The buttons are hidden and a hint reads "Turning off “Allows +1” and saving will remove the linked +1." (`guest-details-sheet.tsx:319`) |
| Mobile                                | Inherits the dialog's `sm:max-w-lg` scroll container                                                                                    |

## 7. UI Specification

### Screens & components

| Element                            | Component            | Path                                                           |
| ---------------------------------- | -------------------- | -------------------------------------------------------------- |
| Permission checkbox (create)       | `GuestForm`          | `src/components/guests/guest-form.tsx:91`                      |
| Permission checkbox + panel (edit) | `GuestDetailsSheet`  | `src/components/guests/guest-details-sheet.tsx:276`            |
| +1 status badge                    | `RsvpStatusBadge`    | `src/components/guests/rsvp-status-badge.tsx:11`               |
| Host→+1 resolution                 | page-level `useMemo` | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:61` |
| "+1" directory column              | `GuestTable`         | `src/components/guests/guest-table.tsx:96`                     |

### Fields & validation

| Field           | Type     | Required          | Rule                                                                                                                                                                               | Message |
| --------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `allowsPlusOne` | checkbox | defaulted `false` | `z.boolean()` on create (`src/lib/validations/guest.ts:8`); unvalidated local state on edit                                                                                        | —       |
| +1 first name   | —        | —                 | **Not collected in the dashboard.** `addPlusOne` accepts optional `firstName`/`lastName` (`convex/guests.ts:351`) but the dialog never passes them (`guest-details-sheet.tsx:314`) | —       |

### Copy deck

| Key                               | Copy                                                                   | Source                                             |
| --------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Permission label                  | "Allows +1"                                                            | `guest-form.tsx:97`, `guest-details-sheet.tsx:284` |
| Add button                        | "Add +1"                                                               | `guest-details-sheet.tsx:316`                      |
| Remove button                     | "Remove +1"                                                            | `guest-details-sheet.tsx:305`                      |
| Revoke hint                       | "Turning off “Allows +1” and saving will remove the linked +1."        | `guest-details-sheet.tsx:321`                      |
| +1 host band                      | "↳ +1 de {host}"                                                       | `guest-details-sheet.tsx:273`                      |
| Directory label (host, no +1 yet) | "Allowed"                                                              | `…/guests/page.tsx:86`                             |
| Directory label (+1 row)          | "↳ +1 de {host}"                                                       | `…/guests/page.tsx:83`                             |
| Placeholder first name            | "Acompañante"                                                          | `convex/guests.ts:369`                             |
| Placeholder last name             | "de {host first name}"                                                 | `convex/guests.ts:370`                             |
| Toasts                            | "+1 added" / "Failed to add +1" / "+1 removed" / "Failed to remove +1" | `guest-details-sheet.tsx:78`, `:82`                |

The placeholder name is the one Spanish string the dashboard writes into the database, and it is
what the public invitation renders for an unnamed companion.

## 8. Data Model

| Table                    | Fields                                                                                                             | Read / Write            | Index          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------- |
| `guests` (host)          | `allowsPlusOne`                                                                                                    | Read / Write            | —              |
| `guests` (+1)            | `eventId`, `invitationId`, `firstName`, `lastName`, `isPlusOne`, `allowsPlusOne`, `plusOneOfGuestId`, `rsvpStatus` | Insert / Patch / Delete | `by_plusOneOf` |
| `guestSpecialEventRsvps` | rows belonging to the +1                                                                                           | Delete on teardown      | `by_guestId`   |
| `activityLogs`           | —                                                                                                                  | Write on add and remove | —              |

Schema: `convex/schema.ts:132`–`:137`; index `by_plusOneOf` at `convex/schema.ts:153`.

**The link is one-directional and singular.** Only the +1 carries `plusOneOfGuestId`; the host
stores nothing pointing back. `findPlusOne` resolves the relationship by querying
`by_plusOneOf` and taking `.first()` (`convex/lib/guests.ts:11`), so a host has at most one
_addressable_ +1 — the schema does not prevent a second row existing, it would simply be
invisible (`TODO-04-21`).

**Cascade.** `deletePlusOneCascade` (`convex/lib/guests.ts:36`) deletes the +1's special-invitation
RSVP rows (bounded at 100, `convex/lib/guests.ts:27`) and then the +1 row itself. It never touches
the host.

## 9. Backend Contract

| Function                      | Type            | Args                                   | Returns                          | Guard                                                            | Caps                                              |
| ----------------------------- | --------------- | -------------------------------------- | -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `api.guests.addPlusOne`       | mutation        | `{hostGuestId, firstName?, lastName?}` | `Id<"guests">` (new or existing) | `requireEventEditor(ctx, host.eventId)` (`convex/guests.ts:357`) | one +1 per host                                   |
| `api.guests.removePlusOne`    | mutation        | `{hostGuestId}`                        | `void`                           | `requireEventEditor` (`convex/guests.ts:401`)                    | —                                                 |
| `api.guests.updateGuest`      | mutation        | `{id, allowsPlusOne?, …}`              | `void`                           | `requireEventEditor`                                             | revokes → teardown (`convex/guests.ts:236`)       |
| `api.guests.deleteGuest`      | mutation        | `{id}`                                 | `void`                           | `requireEventEditor`                                             | tears down the host's +1 (`convex/guests.ts:330`) |
| `api.guests.submitPublicRsvp` | public mutation | `{…, plusOneUpdates?}`                 | `void`                           | none — data-level (`convex/guests.ts:466`)                       | ≤20 `plusOneUpdates` (`:512`)                     |

Helpers: `findPlusOne` (`convex/lib/guests.ts:7`), `deletePlusOneCascade` (`:36`),
`applyDeclineEffects` (`:51`).

## 10. Business Rules

### The permission

- **BR-04-F04-01** `[AS-BUILT]` — `allowsPlusOne` is stored on the **guest**, not the invitation
  (`convex/schema.ts:134`). Two guests on the same invitation can differ.
- **BR-04-F04-02** `[AS-BUILT]` — The permission defaults to `false` on both create paths
  (`convex/guests.ts:176`, `:445`).
- **BR-04-F04-03** `[AS-BUILT]` — Granting the permission creates no guest record; it only makes
  a +1 possible (`convex/guests.ts:168` inserts nothing else).
- **BR-04-F04-04** `[AS-BUILT]` — A +1 record is always created with `allowsPlusOne: false`
  (`convex/guests.ts:378`, `:620`).

### Creating the +1

- **BR-04-F04-05** `[AS-BUILT]` — `addPlusOne` throws "A +1 cannot have its own +1" when the host
  is itself a +1 (`convex/guests.ts:359`).
- **BR-04-F04-06** `[AS-BUILT]` — `addPlusOne` throws "This guest is not allowed a +1" when the
  host's stored `allowsPlusOne` is not true (`convex/guests.ts:362`).
- **BR-04-F04-07** `[AS-BUILT]` — `addPlusOne` is idempotent: when a +1 already exists it returns
  that record's id and inserts nothing (`convex/guests.ts:366`).
- **BR-04-F04-08** `[AS-BUILT]` — A blank or omitted first name becomes `"Acompañante"`, and a
  blank or omitted last name becomes `"de {host.firstName}"` (`convex/guests.ts:369`).
- **BR-04-F04-09** `[AS-BUILT]` — The +1 inherits the host's `invitationId` verbatim, including
  `undefined` (`convex/guests.ts:374`).
- **BR-04-F04-10** `[AS-BUILT]` — A +1 created from the dashboard starts `pending`
  (`convex/guests.ts:380`), whereas a +1 materialized from the public RSVP starts `attending`
  (`convex/guests.ts:611`, `:622`).
- **BR-04-F04-11** `[AS-BUILT]` — Adding a +1 writes a `guest`/`create` activity entry naming the
  +1 (`convex/guests.ts:382`); removing one writes a `guest`/`delete` entry (`:407`).

### Destroying the +1

- **BR-04-F04-12** `[AS-BUILT]` — Every teardown path routes through `deletePlusOneCascade`, which
  deletes the +1's `guestSpecialEventRsvps` rows and then the +1 guest itself
  (`convex/lib/guests.ts:36`). **A destroyed +1 is not recoverable**: no path restores it, and a
  re-added +1 is a new record with the placeholder name and no menu, allergies, seat or special
  RSVPs.
- **BR-04-F04-13** `[AS-BUILT]` — Unticking "Allows +1" removes the +1, but only on save, and only
  when the stored permission was previously true (`convex/guests.ts:236`).
- **BR-04-F04-14** `[AS-BUILT]` — A host transitioning to `declined` loses their +1, from either
  the dashboard (`convex/guests.ts:231`) or the public form (`convex/guests.ts:586`), via
  `applyDeclineEffects` (`convex/lib/guests.ts:56`).
- **BR-04-F04-15** `[AS-BUILT]` — Deleting a host deletes its +1 (`convex/guests.ts:330`).
- **BR-04-F04-16** `[AS-BUILT]` — `removePlusOne` on a host with no +1 is a silent no-op and logs
  nothing (`convex/guests.ts:403`).
- **BR-04-F04-17** `[AS-BUILT]` — Deleting a +1 **directly** (via the dialog's Delete) removes only
  that record; the host keeps `allowsPlusOne: true` and the directory reverts to showing "Allowed"
  (`convex/guests.ts:313`, `…/guests/page.tsx:86`).
- **BR-04-F04-18** `[AS-BUILT]` — Teardown never touches the host's own RSVP, seat or special
  invitations (`convex/lib/guests.ts:36` operates only on the +1).

### The +1 as a guest

- **BR-04-F04-19** `[AS-BUILT]` — A +1 is a first-class `guests` row: it appears in the directory,
  in `getGuestsPageData`, in the invitation's guest list and in the public invitation payload, and
  it can be edited, seated, fed and given special-invitation RSVPs like any other guest.
- **BR-04-F04-20** `[AS-BUILT]` — A +1's own RSVP status is independent of its host's after
  creation; nothing keeps them in sync except the teardown paths above (no code patches the +1's
  status when the host's changes, other than the public materialization branch at
  `convex/guests.ts:608`).
- **BR-04-F04-21** `[AS-BUILT]` — The public RSVP form only materializes a +1 for a host that is
  **attending in that same submission or already attending** and holds the permission; otherwise
  any existing +1 is destroyed (`convex/guests.ts:599`–`:628`).
- **BR-04-F04-22** `[AS-BUILT]` — Re-submitting the public form with a name patches the existing
  +1's `firstName`/`lastName` rather than creating a second record (`convex/guests.ts:608`).

## 11. Acceptance Criteria

- **AC-04-F04-01** — **Given** two guests on one invitation, one with the permission and one
  without **When** the directory renders **Then** only the permitted guest's "+1" cell reads
  "Allowed".
- **AC-04-F04-02** — **Given** a guest with the permission saved and no +1 **When** the Editor
  presses "Add +1" **Then** a new guest exists named "Acompañante de {host first name}", with
  `isPlusOne: true`, `plusOneOfGuestId` = the host, the host's `invitationId`, and status Pending.
- **AC-04-F04-03** — **Given** that +1 **When** the directory renders **Then** the +1 has its own
  row labelled "↳ +1 de {host}" and the host's "+1" cell shows the +1's name.
- **AC-04-F04-04** — **Given** an existing +1 **When** `addPlusOne` is called again for the same
  host **Then** it returns the existing id and the guest count does not change.
- **AC-04-F04-05** — **Given** a guest whose stored `allowsPlusOne` is false **When**
  `addPlusOne` is called **Then** it throws "This guest is not allowed a +1" and no record is
  created.
- **AC-04-F04-06** — **Given** a +1 record **When** `addPlusOne` is called with it as the host
  **Then** it throws "A +1 cannot have its own +1".
- **AC-04-F04-07** — **Given** a host with no invitation **When** a +1 is added **Then** the +1
  also has no invitation and appears in the un-invited pool.
- **AC-04-F04-08** — **Given** a host with a +1 **When** the Editor presses "Remove +1" **Then**
  the +1 record and its special-invitation RSVP rows are deleted, the host is untouched, and the
  toast reads "+1 removed".
- **AC-04-F04-09** — **Given** a host with a +1 **When** the Editor unticks "Allows +1" and
  presses "Save Changes" **Then** the +1 record is deleted.
- **AC-04-F04-10** — **Given** a host with a +1 **When** the Editor unticks the box but does
  **not** save **Then** the +1 record still exists.
- **AC-04-F04-11** — **Given** a host with a +1 **When** the host is set to Declined and saved
  **Then** the +1 is deleted along with the host's own special-invitation rows.
- **AC-04-F04-12** — **Given** the host from AC-04-F04-11 **When** the host is set back to
  Attending **Then** no +1 reappears and the "+1" cell reads "Allowed".
- **AC-04-F04-13** — **Given** a host with a +1 **When** the host is deleted **Then** the +1 is
  deleted too and no orphan remains.
- **AC-04-F04-14** — **Given** a +1 with allergies, a menu choice and a seat **When** it is torn
  down and later re-added **Then** the new record carries the placeholder name and none of the
  previous data.
- **AC-04-F04-15** — **Given** a +1 record **When** its own row is opened **Then** the dialog
  shows the read-only "↳ +1 de {host}" band and no "Allows +1" checkbox.
- **AC-04-F04-16** — **Given** a +1 record **When** it is deleted directly **Then** the host keeps
  the permission and the directory shows "Allowed" again.
- **AC-04-F04-17** — **Given** a public RSVP where an attending host brings a named companion
  **When** it is submitted **Then** the +1 exists with that name and status Attending.
- **AC-04-F04-18** — **Given** that same invitation **When** the form is re-submitted with the
  companion marked not coming **Then** the +1 record is deleted.
- **AC-04-F04-19** — **Given** a public submission where the host declines **When** it is
  processed **Then** no +1 is materialized even if `attending: true` was sent for it.
- **AC-04-F04-20** — **Given** an add or remove of a +1 **When** the Activity page is opened
  **Then** a `guest` created / removed entry names the companion.
- **AC-04-F04-21** — **Given** a Viewer **When** `addPlusOne` or `removePlusOne` is called
  **Then** it throws.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                               |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| TC-04-F04-01 | unit        | `findPlusOne` returns the record linked by `plusOneOfGuestId`, else null                                               |
| TC-04-F04-02 | unit        | `deletePlusOneCascade` deletes the +1's RSVP rows before the +1 row                                                    |
| TC-04-F04-03 | unit        | `applyDeclineEffects` deletes the guest's RSVP rows and its +1, and leaves `invitationId` intact                       |
| TC-04-F04-04 | integration | `addPlusOne` placeholder naming for blank, whitespace and omitted names                                                |
| TC-04-F04-05 | integration | `addPlusOne` idempotency returns the existing id                                                                       |
| TC-04-F04-06 | integration | `addPlusOne` throws for a +1 host and for a host without the permission                                                |
| TC-04-F04-07 | integration | The +1 inherits the host's `invitationId`, including `undefined`                                                       |
| TC-04-F04-08 | integration | `updateGuest({allowsPlusOne: false})` tears down the +1; `{allowsPlusOne: true}` on a host without one creates nothing |
| TC-04-F04-09 | integration | `deleteGuest(host)` leaves no row with `plusOneOfGuestId` pointing at it                                               |
| TC-04-F04-10 | integration | Dashboard-created +1 is `pending`; public-created +1 is `attending`                                                    |
| TC-04-F04-11 | integration | `submitPublicRsvp` removes the +1 when the host declines or the companion is not coming                                |
| TC-04-F04-12 | e2e         | Tick permission → save → Add +1 → +1 row appears → Remove +1 → row disappears                                          |
| TC-04-F04-13 | e2e         | Declining a host in the dialog removes the +1 row from the table without a reload                                      |

### Manual QA checklist

- [ ] "Add +1" is hidden until the permission checkbox is ticked
- [ ] Ticking the box and pressing "Add +1" **before** saving currently fails (`DEF-04-03`)
- [ ] The revoke hint appears when the box is unticked while a +1 exists
- [ ] The +1's row can be opened, renamed and given a menu choice
- [ ] Deleting the host removes both rows from the table at once
- [ ] The placeholder name renders correctly on the public invitation

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | One addressable +1 per host; a +1's cascade deletes at most 100 RSVP rows (`convex/lib/guests.ts:27`); ≤20 `plusOneUpdates` per public submission (`convex/guests.ts:512`) |
| Performance      | Every path is one indexed `by_plusOneOf` lookup plus at most two writes                                                                                                    |
| Security & authz | Dashboard paths guard on the **host's** `eventId`; the public path additionally requires the host to belong to the resolved invitation (`convex/guests.ts:592`)            |
| Data integrity   | The relationship is enforced only by convention — no schema constraint prevents two rows pointing at one host, or a `plusOneOfGuestId` pointing at a deleted guest         |
| Accessibility    | Checkbox and buttons are labelled; the +1 panel is a plain region with no live announcement of the add/remove                                                              |
| i18n             | The stored placeholder name is Spanish while the surrounding UI is English                                                                                                 |
| Analytics        | Add and remove are activity-logged; the permission grant is logged only as part of the guest update                                                                        |

## 14. TODOs & Open Questions

- **DEF-04-03** `[P1]` — "Add +1" fails when the permission was ticked but not yet saved.
  - **Evidence:** `src/components/guests/guest-details-sheet.tsx:287` renders the button from the
    **local** `allowsPlusOne` state, while `convex/guests.ts:362` requires the **stored**
    `allowsPlusOne` to be true.
  - **Impact:** The natural sequence — tick "Allows +1", press "Add +1" — throws
    "This guest is not allowed a +1", which the user sees only as "Failed to add +1"
    (compounded by `DEF-04-01`). The Editor has to save, reopen the dialog, and press the button
    again, with nothing explaining why.
  - **Proposed fix:** Either disable "Add +1" until the permission is persisted with an
    explanatory hint, or have `addPlusOne` grant the permission implicitly when the caller is an
    Editor.
- **TODO-04-19** `[P1]` `[ADD]` — The dashboard cannot name a +1 at creation.
  - **Rationale:** `addPlusOne` accepts `firstName`/`lastName` (`convex/guests.ts:351`) but the
    dialog never passes them (`guest-details-sheet.tsx:314`), so every host-created companion is
    born as "Acompañante de {host}" and must be renamed through a second dialog visit.
  - **Proposed rule:** The "Add +1" control collects an optional name and passes it through.
- **TODO-04-20** `[P2]` `[CHANGE]` — Dashboard and public paths disagree on the +1's initial
  status.
  - **Rationale:** `BR-04-F04-10`. A companion the host added by phone shows as Pending forever
    unless edited, even though the host has already confirmed they are coming.
  - **Proposed rule:** A +1 added for an already-attending host starts `attending`.
- **TODO-04-21** `[P2]` `[ADD]` — Nothing enforces one +1 per host at the data layer.
  - **Rationale:** `findPlusOne` takes `.first()` on `by_plusOneOf` (`convex/lib/guests.ts:11`),
    so a duplicate row created by a race or a direct write would be invisible to every teardown
    path and would survive as an orphan.
  - **Proposed rule:** Teardown operates on **all** rows matching the host, and creation is
    guarded against duplicates.
- **TODO-04-22** `[P2]` `[ADD]` — Teardown is silent about what it destroys.
  - **Rationale:** `BR-04-F04-12`. "Remove +1", revoking the permission and declining all delete a
    guest record with its own allergies, menu choice, seat and special-invitation answers, with no
    confirmation on any of the three paths.
  - **Proposed rule:** Removing a +1 that carries any of that data requires a confirmation naming
    it.
- **TODO-04-23** `[P2]` `[CHANGE]` — A +1 can be given its own special-invitation RSVPs and seat
  but is invisible in the invitation composition UI.
  - **Rationale:** `invitations.updateInvitation` reconciles only directly-linked, non-+1 guests
    ([EP-05-F02](../05-invitations/F02-invitation-composition-and-lock.md)), so a +1 cannot be moved or
    unlinked; it exists only as long as its host does.
  - **Proposed rule:** Document the +1 as permanently bound to its host in the invitation UI, or
    allow promoting a +1 into a full guest.

### Open questions

- **Q1** — Should revoking "Allows +1" be blocked (rather than cascading) when the +1 has already
  responded attending?
- **Q2** — Should a +1 count toward invitation-level head counts and seating capacity separately,
  or always as part of its host's household?
- **Q3** — Should a host be able to bring more than one companion, and if so does `allowsPlusOne`
  become a number?

## 15. Traceability

| Concern                  | Source                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Permission field         | `convex/schema.ts:134`                                                                                     |
| +1 marker + back-link    | `convex/schema.ts:132`, `convex/schema.ts:137`                                                             |
| Index                    | `convex/schema.ts:153`                                                                                     |
| Create at guest creation | `convex/guests.ts:176`                                                                                     |
| Add +1                   | `convex/guests.ts:348`                                                                                     |
| Nested-+1 guard          | `convex/guests.ts:359`                                                                                     |
| Permission guard         | `convex/guests.ts:362`                                                                                     |
| Idempotency              | `convex/guests.ts:366`                                                                                     |
| Placeholder naming       | `convex/guests.ts:369`                                                                                     |
| Remove +1                | `convex/guests.ts:396`                                                                                     |
| Revoke teardown          | `convex/guests.ts:236`                                                                                     |
| Delete-host teardown     | `convex/guests.ts:330`                                                                                     |
| Public materialization   | `convex/guests.ts:591`                                                                                     |
| Helpers                  | `convex/lib/guests.ts:7`, `:36`, `:51`                                                                     |
| UI — create checkbox     | `src/components/guests/guest-form.tsx:91`                                                                  |
| UI — permission panel    | `src/components/guests/guest-details-sheet.tsx:276`                                                        |
| UI — add/remove buttons  | `src/components/guests/guest-details-sheet.tsx:296`, `:309`                                                |
| UI — directory column    | `src/components/guests/guest-table.tsx:96`, `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:81` |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
