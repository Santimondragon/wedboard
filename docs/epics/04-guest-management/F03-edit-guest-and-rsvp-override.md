---
id: EP-04-F03
title: Edit Guest & RSVP Override
epic: EP-04 Guest Management
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-04-F02, EP-04-F04, EP-06-F01, EP-11-F01]
---

# EP-04-F03 — Edit Guest & RSVP Override

## 1. Summary

The host's editing surface for one guest: correct a name, add contact details, record allergies,
pick a menu and drink on the guest's behalf, and — the reason it exists — **override RSVP
answers**. Real weddings collect answers by phone, by message and in person, so an Editor must
be able to set the main-event status and each special-invitation status for any guest without
the guest ever opening their link. The dialog also hosts +1 management and deletion, specified
in [F04](./F04-plus-one-lifecycle.md) and [F05](./F05-delete-guest.md).

> **Naming note.** The component file is `src/components/guests/guest-details-sheet.tsx` and the
> exported component is `GuestDetailsSheet`, but it renders a **centered shadcn `Dialog`**, not a
> `Sheet` (`guest-details-sheet.tsx:152`). The name is historical; specs refer to it as the guest
> details dialog.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                               |
| -------------------- | ------ | ------------------------------------------------------------------- |
| Owner                | Full   |                                                                     |
| Co-owner (`planner`) | Full   |                                                                     |
| Editor               | Full   |                                                                     |
| Viewer               | None   | Cannot even reach the directory that opens the dialog               |
| Public guest         | None   | The public path is `submitPublicRsvp` (EP-07), a different contract |

Gates: `requireEventEditor(ctx, guest.eventId)` on `updateGuest` (`convex/guests.ts:215`),
`setSpecialEventRsvp` (`:261`) and `removeSpecialEventRsvp` (`:300`).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F03-01** — As an Editor, I want to fix a misspelt guest name so that the public
  invitation greets them correctly.
- **US-04-F03-02** — As an Editor, I want to set a guest's RSVP myself so that answers given by
  phone are recorded.
- **US-04-F03-03** — As an Editor, I want to set a guest's status for each special invitation so
  that the after-party head count is accurate.
- **US-04-F03-04** — As an Editor, I want to add a guest to a special invitation individually,
  even when their whole invitation was not granted access.
- **US-04-F03-05** — As an Editor, I want to record allergies and menu choices that a guest told
  me directly.
- **US-04-F03-06** — As an Editor, I want special-invitation changes saved the moment I pick
  them, without a separate save step.

## 4. Entry Points

| Entry point       | Route / control                                                                           | Actor   |
| ----------------- | ----------------------------------------------------------------------------------------- | ------- |
| Any directory row | `/dashboard/[eventSlug]/guests` → row click (`src/components/guests/guest-table.tsx:220`) | Editor+ |

The dialog is mounted once per page (`…/guests/page.tsx:201`) and driven by `selectedGuestId`.
There is no per-guest URL and no deep link.

## 5. UX Flow

### Happy path

1. The Editor clicks a row → `handleEditGuest` sets the id and opens the dialog
   (`…/guests/page.tsx:146`).
2. The dialog syncs its local form state from the selected guest **during render**, guarded by a
   previous-value comparison rather than an effect (`guest-details-sheet.tsx:112`).
3. The Editor edits First Name, Last Name, Email, Phone, the main-event RSVP select, the menu and
   drink selects and Allergies.
4. Special-invitation selects are **not** part of the form: choosing a value fires immediately
   (`guest-details-sheet.tsx:239`).
5. Clicking **"Save Changes"** calls `updateGuest.run({...})` (`guest-details-sheet.tsx:130`) →
   `api.guests.updateGuest` (`convex/guests.ts:190`).
6. The server patches the supplied fields, writes a `guest`/`update` activity entry
   (`convex/guests.ts:219`), then applies the decline and +1 side effects (`:231`, `:236`).
7. Toast "Guest updated successfully"; the dialog closes (`guest-details-sheet.tsx:142`).

### Alternate & edge paths

- **A1** — A special-invitation select set to a status → `setSpecialEventRsvp` upserts the row
  and toasts "Special event RSVP updated" (`guest-details-sheet.tsx:247`).
- **A2** — A special-invitation select set to "Not invited" → `removeSpecialEventRsvp` deletes
  the row and toasts "Removed from special event" (`guest-details-sheet.tsx:242`).
- **A3** — The guest **is** a +1 → the +1 panel is replaced by a read-only band
  "↳ +1 de {host}" (`guest-details-sheet.tsx:271`).
- **A4** — The event has no menu options → the Menu Selection select is not rendered
  (`guest-details-sheet.tsx:328`); same for drinks (`:350`).
- **A5** — Main-event status changed to Declined and saved → decline effects run: the guest's
  special-invitation RSVP rows are deleted and their +1 is destroyed (`convex/guests.ts:231`,
  `convex/lib/guests.ts:51`).
- **A6** — Email or Allergies cleared → `"" || undefined` is sent, which **unsets** the stored
  field via `ctx.db.patch` (`guest-details-sheet.tsx:134`).
- **E1** — Any mutation rejects → generic toast ("Failed to update guest", "Failed to update
  special event RSVP", …); the underlying `ConvexError` message is lost (`DEF-04-01`).
- **E2** — A guest invited to a special invitation _through their invitation's access_ is set to
  "Not invited" → nothing is deleted and the select snaps back to Pending (`DEF-04-02`).

## 6. States

| State             | Behavior                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | None — the guest is already in memory from the page query; `guest === null` renders the dialog chrome with an empty body (`guest-details-sheet.tsx:161`)                      |
| Empty             | Not applicable                                                                                                                                                                |
| Error             | Toast only; the dialog stays open and local edits are preserved                                                                                                               |
| Success           | Toast, dialog closes (main save). Special-invitation saves toast but keep the dialog open                                                                                     |
| Disabled / locked | Save shows "Saving..." while pending (`:412`); special-invitation selects are disabled while either special mutation is pending (`:235`); Delete shows "Deleting..." (`:405`) |
| Mobile            | `sm:max-w-lg`, `max-h-[90vh] overflow-y-auto` (`:153`)                                                                                                                        |

## 7. UI Specification

### Screens & components

| Element        | Component                                | Path                                                |
| -------------- | ---------------------------------------- | --------------------------------------------------- |
| Details dialog | `GuestDetailsSheet` (renders a `Dialog`) | `src/components/guests/guest-details-sheet.tsx:59`  |
| RSVPs group    | inline `div` bordered block              | `src/components/guests/guest-details-sheet.tsx:204` |
| +1 panel       | inline block                             | `src/components/guests/guest-details-sheet.tsx:271` |
| RSVP badge     | `RsvpStatusBadge`                        | `src/components/guests/rsvp-status-badge.tsx:11`    |
| Delete confirm | `AlertDialog`                            | `src/components/guests/guest-details-sheet.tsx:383` |

### Fields & validation

The dialog uses plain `useState`, **not** react-hook-form, and applies **no client-side
validation at all** — `guestSchema` is not imported here.

| Field                                                | Type             | Required     | Rule                                                            | Message |
| ---------------------------------------------------- | ---------------- | ------------ | --------------------------------------------------------------- | ------- |
| First Name                                           | text             | not enforced | none — an empty name saves                                      | —       |
| Last Name                                            | text             | not enforced | none                                                            | —       |
| Email                                                | email            | no           | none beyond the browser `type="email"` hint; `""` → `undefined` | —       |
| Phone                                                | tel              | no           | none                                                            | —       |
| Main event RSVP                                      | select           | yes          | `pending` · `attending` · `declined`                            | —       |
| Special invitation RSVP (one per special invitation) | select           | yes          | `notInvited` · `pending` · `attending` · `declined`             | —       |
| Allows +1                                            | checkbox         | —            | see [F04](./F04-plus-one-lifecycle.md)                          | —       |
| Menu Selection                                       | select           | no           | rendered only when options exist; "No selection" → `undefined`  | —       |
| Drink Selection                                      | select           | no           | as above                                                        | —       |
| Allergies                                            | textarea, 2 rows | no           | none; `""` → `undefined`                                        | —       |

`guests.specialRequests` exists in the schema (`convex/schema.ts:144`) and is written by the
public RSVP, but **is not shown or editable here** — `TODO-04-10`.

### Copy deck

| Key                          | Copy                                                            | Source                                        |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Dialog title                 | "Guest Details"                                                 | `guest-details-sheet.tsx:155`                 |
| RSVP group label             | "RSVPs"                                                         | `guest-details-sheet.tsx:205`                 |
| Main row label               | "Main event"                                                    | `guest-details-sheet.tsx:208`                 |
| Status options               | "Pending" · "Attending" · "Declined"                            | `guest-details-sheet.tsx:217`–`:219`          |
| Special "not invited" option | "Not invited"                                                   | `guest-details-sheet.tsx:259`                 |
| +1 host band                 | "↳ +1 de {host}"                                                | `guest-details-sheet.tsx:273`                 |
| +1 permission                | "Allows +1"                                                     | `guest-details-sheet.tsx:284`                 |
| +1 warning                   | "Turning off “Allows +1” and saving will remove the linked +1." | `guest-details-sheet.tsx:321`                 |
| Menu / drink labels          | "Menu Selection" · "Drink Selection" · "No selection"           | `guest-details-sheet.tsx:330`, `:352`, `:339` |
| Allergies                    | "Allergies"                                                     | `guest-details-sheet.tsx:373`                 |
| Save                         | "Save Changes" / "Saving..."                                    | `guest-details-sheet.tsx:412`                 |
| Toasts                       | "Guest updated successfully" / "Failed to update guest"         | `guest-details-sheet.tsx:70`                  |
| Special toasts               | "Special event RSVP updated" / "Removed from special event"     | `guest-details-sheet.tsx:86`, `:93`           |

## 8. Data Model

| Table                    | Fields                                                                                                                                                             | Read / Write           | Index                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | --------------------------------------------- |
| `guests`                 | `firstName`, `lastName`, `email`, `phone`, `rsvpStatus`, `allergies`, `specialRequests`, `menuOptionId`, `drinkOptionId`, `tableId`, `seatNumber`, `allowsPlusOne` | Write (patch)          | —                                             |
| `guestSpecialEventRsvps` | `eventId`, `guestId`, `specialEventId`, `status`                                                                                                                   | Read / Write / Delete  | `by_guestId_and_specialEventId`, `by_guestId` |
| `specialEvents`          | whole doc                                                                                                                                                          | Read (ownership check) | direct `get`                                  |
| `activityLogs`           | —                                                                                                                                                                  | Write                  | —                                             |

**Cascades.** When the patch moves a guest into `declined` from any other status, `updateGuest`
calls `applyDeclineEffects` (`convex/guests.ts:231`, `convex/lib/guests.ts:51`), which deletes
**every** `guestSpecialEventRsvps` row for the guest and deletes the guest's +1 record together
with that +1's own RSVP rows. The guest keeps its `invitationId`, so the invitation's public
`declined` layout still resolves. **Nothing is restored** if the status is later set back — see
`BR-04-F03-08`.

Note that `updateGuest`'s validator accepts `tableId`, `seatNumber`, `menuOptionId` and
`drinkOptionId` (`convex/guests.ts:206`–`:209`), but the dialog only ever sends the two option
ids; seating is written by [EP-12](../12-seating/).

## 9. Backend Contract

| Function                                  | Type     | Args                                                                                                                                                           | Returns | Guard                                                             | Caps                             |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- | -------------------------------- |
| `api.guests.updateGuest`                  | mutation | `{id, firstName?, lastName?, email?, phone?, rsvpStatus?, allergies?, specialRequests?, menuOptionId?, drinkOptionId?, tableId?, seatNumber?, allowsPlusOne?}` | `void`  | `requireEventEditor(ctx, guest.eventId)` (`convex/guests.ts:215`) | none                             |
| `api.guests.setSpecialEventRsvp`          | mutation | `{guestId, specialEventId, status}`                                                                                                                            | `void`  | `requireEventEditor` (`convex/guests.ts:261`)                     | none                             |
| `api.guests.removeSpecialEventRsvp`       | mutation | `{guestId, specialEventId}`                                                                                                                                    | `void`  | `requireEventEditor` (`convex/guests.ts:300`)                     | none                             |
| `api.guests.deleteGuest`                  | mutation | `{id}`                                                                                                                                                         | `void`  | `requireEventEditor`                                              | see [F05](./F05-delete-guest.md) |
| `api.guests.addPlusOne` / `removePlusOne` | mutation | see [F04](./F04-plus-one-lifecycle.md)                                                                                                                         |         |                                                                   |                                  |

## 10. Business Rules

- **BR-04-F03-01** `[AS-BUILT]` — Editing a guest requires at least the `editor` role on the
  guest's event (`convex/guests.ts:215`).
- **BR-04-F03-02** `[AS-BUILT]` — `updateGuest` patches exactly the arguments it received;
  omitted fields are left untouched, and an argument explicitly set to `undefined` unsets the
  stored field (`convex/guests.ts:217`).
- **BR-04-F03-03** `[AS-BUILT]` — Every successful `updateGuest` writes one `activityLogs` row
  with `entity: "guest"`, `action: "update"`, even when no value actually changed
  (`convex/guests.ts:219`).
- **BR-04-F03-04** `[AS-BUILT]` — An Editor may set a guest's main-event `rsvpStatus` to any of
  `pending`, `attending` or `declined` regardless of what the guest answered publicly
  (`convex/guests.ts:197`).
- **BR-04-F03-05** `[AS-BUILT]` — The decline cascade runs only on the **transition** into
  `declined`: the patch must set `declined` **and** the stored status must not already be
  `declined` (`convex/guests.ts:231`).
- **BR-04-F03-06** `[AS-BUILT]` — Declining deletes every `guestSpecialEventRsvps` row belonging
  to the guest (`convex/lib/guests.ts:55`).
- **BR-04-F03-07** `[AS-BUILT]` — Declining deletes the guest's +1 record and that +1's own RSVP
  rows (`convex/lib/guests.ts:56`).
- **BR-04-F03-08** `[AS-BUILT]` — **The decline cascade is irreversible.** Setting the guest back
  to `attending` or `pending` restores neither the deleted special-invitation RSVP rows nor the
  +1 record — `updateGuest` has no inverse branch (`convex/guests.ts:231` is the only cascade
  call). The +1 must be re-added by hand and each special-invitation status re-selected.
- **BR-04-F03-09** `[AS-BUILT]` — A declining guest **keeps** its `invitationId`; it is never
  unlinked (`convex/lib/guests.ts:51`, which touches only RSVP rows and the +1).
- **BR-04-F03-10** `[AS-BUILT]` — Special-invitation statuses are saved immediately on selection,
  independently of the "Save Changes" button (`guest-details-sheet.tsx:239`).
- **BR-04-F03-11** `[AS-BUILT]` — `setSpecialEventRsvp` upserts: it patches the existing
  `guestSpecialEventRsvps` row for the (guest, special invitation) pair, or inserts one
  (`convex/guests.ts:268`–`:284`).
- **BR-04-F03-12** `[AS-BUILT]` — **`setSpecialEventRsvp` ignores `invitationSpecialEventAccess`
  entirely.** It validates only that the special invitation belongs to the guest's event
  (`convex/guests.ts:263`), so an Editor can add any guest of the event to any special invitation
  of that event even when the guest's invitation was never granted access. Access controls what
  the _public page_ offers; the RSVP row is what the dashboard writes. This asymmetry is
  deliberate on the dashboard side and is the opposite of the public rule — `submitPublicRsvp`
  refuses a special RSVP without an access row (`convex/guests.ts:660`).
- **BR-04-F03-13** `[AS-BUILT]` — `setSpecialEventRsvp` does **not** check the special
  invitation's `isActive` flag, while the public path does (`convex/guests.ts:646`).
- **BR-04-F03-14** `[AS-BUILT]` — `setSpecialEventRsvp` throws "Special event does not belong to
  this event" when the special invitation belongs to another event (`convex/guests.ts:265`).
- **BR-04-F03-15** `[AS-BUILT]` — `removeSpecialEventRsvp` deletes the stored row if present and
  is a silent no-op otherwise (`convex/guests.ts:309`).
- **BR-04-F03-16** `[AS-BUILT]` — Neither `setSpecialEventRsvp` nor `removeSpecialEventRsvp`
  writes an activity-log entry (no `logActivity` call in either handler).
- **BR-04-F03-17** `[AS-BUILT]` — The Menu Selection and Drink Selection controls render only
  when the event has at least one option of that kind (`guest-details-sheet.tsx:328`, `:350`).
- **BR-04-F03-18** `[AS-BUILT]` — Choosing "No selection" for menu or drink clears the stored
  option id (`guest-details-sheet.tsx:333` sends `undefined`).
- **BR-04-F03-19** `[AS-BUILT]` — The dialog performs no validation: a guest may be saved with an
  empty first or last name, or a malformed email (no schema is applied in
  `guest-details-sheet.tsx`).
- **BR-04-F03-20** `[AS-BUILT]` — A guest cannot be moved to a different invitation from this
  dialog: `updateGuest` has no `invitationId` argument (`convex/guests.ts:191`–`:211`). Re-linking
  happens only through `invitations.updateInvitation`'s `guestIds` reconcile, which is refused
  once any linked guest has responded (the **[Composition Lock](../../glossary.md)**,
  [EP-05-F02](../05-invitations/F02-invitation-composition-and-lock.md)). In practice, once a guest has
  answered, the only way to change their household is to delete and recreate them.

## 11. Acceptance Criteria

- **AC-04-F03-01** — **Given** a guest row is clicked **When** the dialog opens **Then** all
  fields are pre-filled from that guest and switching to another guest re-syncs them.
- **AC-04-F03-02** — **Given** an edited first name **When** "Save Changes" is pressed **Then**
  the row updates, the toast reads "Guest updated successfully" and the dialog closes.
- **AC-04-F03-03** — **Given** a pending guest **When** an Editor sets Main event to "Attending"
  and saves **Then** `guests.rsvpStatus` is `attending` and the directory badge is green.
- **AC-04-F03-04** — **Given** a guest with two special-invitation RSVP rows and a +1 **When**
  an Editor sets Main event to "Declined" and saves **Then** both RSVP rows are deleted, the +1
  guest record no longer exists, and the guest still carries its `invitationId`.
- **AC-04-F03-05** — **Given** that same guest **When** the Editor immediately sets Main event
  back to "Attending" and saves **Then** the special-invitation rows are still absent and no +1
  record reappears.
- **AC-04-F03-06** — **Given** a guest already `declined` **When** they are saved again as
  `declined` **Then** no cascade runs a second time (nothing further is deleted).
- **AC-04-F03-07** — **Given** a special invitation the guest's invitation has **no** access to
  **When** the Editor picks "Attending" for it **Then** a `guestSpecialEventRsvps` row is created
  and the directory column shows Attending.
- **AC-04-F03-08** — **Given** a special invitation belonging to a different event **When**
  `setSpecialEventRsvp` is called with it **Then** it throws "Special event does not belong to
  this event".
- **AC-04-F03-09** — **Given** a guest with a stored special-invitation row **When** the Editor
  picks "Not invited" **Then** the row is deleted and the directory column reads "Not invited".
- **AC-04-F03-10** — **Given** a special-invitation select **When** a status is chosen **Then**
  the change persists without pressing "Save Changes", and closing the dialog without saving does
  not undo it.
- **AC-04-F03-11** — **Given** a special-invitation mutation in flight **When** the Editor tries
  another special select **Then** every special select is disabled until it settles.
- **AC-04-F03-12** — **Given** an event with no drink options **When** the dialog opens **Then**
  no "Drink Selection" control renders.
- **AC-04-F03-13** — **Given** a guest with a menu option **When** "No selection" is chosen and
  saved **Then** `menuOptionId` is unset and the directory Menu cell reads "—".
- **AC-04-F03-14** — **Given** a guest that is a +1 **When** the dialog opens **Then** it shows
  the read-only "↳ +1 de {host}" band and no "Allows +1" checkbox.
- **AC-04-F03-15** — **Given** any successful save **When** the Activity page is opened **Then**
  a `guest` / modified entry names that guest.
- **AC-04-F03-16** — **Given** a special-invitation status change **When** the Activity page is
  opened **Then** **no** entry was written for it.
- **AC-04-F03-17** — **Given** a Viewer **When** `updateGuest` is called **Then** it throws.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                              |
| ------------ | ----------- | ------------------------------------------------------------------------------------- |
| TC-04-F03-01 | integration | `updateGuest` patches only supplied fields and leaves omitted ones untouched          |
| TC-04-F03-02 | integration | Transition `pending → declined` deletes the guest's special RSVP rows and +1          |
| TC-04-F03-03 | integration | Transition `declined → declined` runs no cascade                                      |
| TC-04-F03-04 | integration | Transition `declined → attending` restores nothing                                    |
| TC-04-F03-05 | integration | `setSpecialEventRsvp` inserts when no row exists, patches when one does               |
| TC-04-F03-06 | integration | `setSpecialEventRsvp` succeeds with **no** `invitationSpecialEventAccess` row present |
| TC-04-F03-07 | integration | `setSpecialEventRsvp` throws for a special event of another event                     |
| TC-04-F03-08 | integration | `removeSpecialEventRsvp` deletes an existing row and no-ops when absent               |
| TC-04-F03-09 | integration | Neither special mutation writes an `activityLogs` row                                 |
| TC-04-F03-10 | e2e         | Setting a special status persists after closing the dialog without saving             |
| TC-04-F03-11 | e2e         | Declining from the dialog clears the guest's special columns in the table             |

### Manual QA checklist

- [ ] Opening a second guest without closing the dialog re-syncs every field
- [ ] Saving with an empty last name currently succeeds (see `TODO-04-16`)
- [ ] The +1 warning text appears when "Allows +1" is unticked while a +1 exists
- [ ] Menu/Drink controls disappear when the event's option lists are emptied
- [ ] A declined guest still shows its invitation title in the dialog header

## 13. Non-Functional

| Concern          | Specification                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `deleteSpecialEventRsvps` deletes at most 100 rows per guest (`convex/lib/guests.ts:27`) — above that the cascade is incomplete    |
| Performance      | Each save is one patch plus one activity insert; the cascade adds up to 100 deletes plus the +1 teardown                           |
| Performance (UI) | Form state syncs during render rather than in an effect, avoiding a cascading re-render (`guest-details-sheet.tsx:112`)            |
| Security & authz | Every mutation re-loads the guest and guards on **its** `eventId`, so a caller cannot edit a guest of an event they lack access to |
| Accessibility    | All inputs are labelled; the delete action is behind an `AlertDialog`                                                              |
| i18n             | English, except the Spanish "↳ +1 de" band                                                                                         |
| Analytics        | Main-event edits are activity-logged; special-invitation changes are not                                                           |

## 14. TODOs & Open Questions

- **DEF-04-02** `[P1]` — A guest invited to a special invitation **through their invitation's
  access** cannot be set to "Not invited".
  - **Evidence:** `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:99` derives the
    status as `pending` when the invitation has access but no row is stored;
    `src/components/guests/guest-details-sheet.tsx:242` then calls `removeSpecialEventRsvp`,
    which deletes nothing because no row exists (`convex/guests.ts:309`).
  - **Impact:** The select appears to accept "Not invited", toasts "Removed from special event",
    and then snaps back to Pending. There is no way from the guest dialog to exclude a single
    guest from a special invitation their household was granted; the Editor must revoke the whole
    invitation's access on the Special Events page.
  - **Proposed fix:** Either persist an explicit exclusion (e.g. store a row the derivation
    honours as "not invited"), or disable the "Not invited" option when the status derives from
    invitation access and explain why.
- **TODO-04-05** `[P1]` `[ADD]` — Declining from the dashboard destroys data with no warning.
  - **Rationale:** `BR-04-F03-08`. The select offers "Declined" like any other value, yet saving
    it permanently deletes the guest's special-invitation RSVP rows and their +1
    (`convex/lib/guests.ts:51`). Nothing in the dialog says so, and nothing restores it.
  - **Proposed rule:** Choosing "Declined" for a guest that has any special-invitation row or a
    +1 requires a confirmation that names exactly what will be deleted.
- **TODO-04-16** `[P1]` `[ADD]` — The details dialog applies no validation.
  - **Rationale:** `guestSchema` is enforced on create (`src/lib/validations/guest.ts:3`) but not
    on edit; `guest-details-sheet.tsx` uses raw `useState`, so a guest can be saved with empty
    names or a malformed email, and those names render on the public invitation.
  - **Proposed rule:** The edit dialog enforces the same schema as the add form.
- **TODO-04-08** `[P2]` `[ADD]` — A guest cannot be moved between invitations after responding.
  - **Rationale:** `BR-04-F03-20`. `updateGuest` takes no `invitationId`, and the only
    re-linking path is blocked by the Composition Lock once anyone in the household has answered
    ([EP-05-F02](../05-invitations/F02-invitation-composition-and-lock.md)). Splitting a family after a
    first answer therefore requires deleting and recreating the guest, losing their RSVP.
  - **Proposed rule:** An Editor can reassign a responded guest to another invitation from the
    guest dialog, with the consequences for the source invitation's RSVP state made explicit.
- **TODO-04-10** `[P2]` `[ADD]` — `guests.specialRequests` is write-only.
  - **Rationale:** Written by the public RSVP (`convex/guests.ts:577`) and accepted by
    `updateGuest` (`:205`), but rendered nowhere in the dashboard — not in the table and not in
    this dialog. A guest's request is silently discarded from the host's view.
  - **Proposed rule:** Special requests are visible and editable next to Allergies.
- **TODO-04-17** `[P2]` `[CHANGE]` — `setSpecialEventRsvp` ignores `specialEvents.isActive`.
  - **Rationale:** `BR-04-F03-13`. The public path refuses an inactive special invitation
    (`convex/guests.ts:646`) while the dashboard path does not (`convex/guests.ts:263`), so a
    dashboard-created row can exist for a special invitation the host has switched off.
  - **Proposed rule:** Both paths apply the same `isActive` check, or `isActive` is documented as
    a public-visibility flag only.
- **TODO-04-18** `[P2]` `[ADD]` — Special-invitation RSVP overrides are not activity-logged.
  - **Rationale:** `BR-04-F03-16`. Guest create/update/delete are logged, so a collaborator can
    see who changed what — but an override of who is coming to the after-party leaves no trace.
  - **Proposed rule:** `setSpecialEventRsvp` and `removeSpecialEventRsvp` log a `guest`/`update`
    entry naming the special invitation.

### Open questions

- **Q1** — Should an Editor's override be visually distinguishable from a guest's own answer, so
  the host knows which answers came from the guest?
- **Q2** — When an Editor adds a guest to a special invitation their household cannot see
  (`BR-04-F03-12`), should the invitation automatically be granted access so the guest can change
  their own mind later?

## 15. Traceability

| Concern                              | Source                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| Entry                                | `src/components/guests/guest-table.tsx:220`                     |
| Dialog mount                         | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:201` |
| UI                                   | `src/components/guests/guest-details-sheet.tsx:59`              |
| Renders a Dialog, not a Sheet        | `src/components/guests/guest-details-sheet.tsx:152`             |
| State sync during render             | `src/components/guests/guest-details-sheet.tsx:112`             |
| Save handler                         | `src/components/guests/guest-details-sheet.tsx:128`             |
| RSVPs group                          | `src/components/guests/guest-details-sheet.tsx:204`             |
| Special select handler               | `src/components/guests/guest-details-sheet.tsx:239`             |
| Backend — update                     | `convex/guests.ts:190`                                          |
| Decline cascade trigger              | `convex/guests.ts:231`                                          |
| Decline cascade                      | `convex/lib/guests.ts:51`                                       |
| Backend — set special RSVP           | `convex/guests.ts:248`                                          |
| Access-free write                    | `convex/guests.ts:263`                                          |
| Public counterpart (access required) | `convex/guests.ts:652`                                          |
| Backend — remove special RSVP        | `convex/guests.ts:292`                                          |
| Schema                               | `convex/schema.ts:122`, `convex/schema.ts:167`                  |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
