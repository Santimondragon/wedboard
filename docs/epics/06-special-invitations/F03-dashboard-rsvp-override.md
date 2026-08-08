---
id: EP-06-F03
title: Dashboard RSVP Override
epic: EP-06 Special Invitations
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-06-F01, EP-06-F02, EP-04-F02]
---

# EP-06-F03 — Dashboard RSVP Override

## 1. Summary

Guests do not always answer online. A host takes a phone call, hears "we'll come to the
welcome dinner but not the after-party", and needs to record it. The guest details dialog
therefore carries an **RSVPs** group: the main-event status plus one editable status per
[special invitation](../../glossary.md) in the event — including special invitations the guest
was never offered. Setting a status writes the guest's `guestSpecialEventRsvps` row; choosing
"Not invited" deletes it. This is a per-guest response override; it does **not** grant the
guest's invitation access (that is EP-06-F02).

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                                                                      |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full   |                                                                                                                            |
| Co-owner (`planner`) | Full   | No extra gate                                                                                                              |
| Editor               | Full   | Both mutations use `requireEventEditor(ctx, guest.eventId)` at the default `editor` floor (`convex/guests.ts:261`, `:300`) |
| Viewer               | None   | Read-blocked from `getGuestsPageData`                                                                                      |
| Public guest         | None   | Guests write the same table through `submitPublicRsvp` (EP-07), never through these functions                              |

Role semantics: [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-06-F03-01** — As an Editor, I want to record a guest's answer to a special invitation
  myself so that phone and in-person replies land in the same place as online ones.
- **US-06-F03-02** — As an Editor, I want to add a guest to a special invitation they were not
  offered so that a late addition does not require rebuilding the invitation's access.
- **US-06-F03-03** — As an Editor, I want to set a guest back to "Not invited" so that a
  mistaken entry can be undone.
- **US-06-F03-04** — As an Editor, I want each change saved immediately so that I can work
  through a list during a phone call.

## 4. Entry Points

| Entry point                                | Route / control                                    | Actor   |
| ------------------------------------------ | -------------------------------------------------- | ------- |
| Guest details dialog → "RSVPs" group       | `/dashboard/[eventSlug]/guests`, click a guest row | Editor+ |
| Per-special-invitation columns (read-only) | The guests table on the same page                  | Editor+ |

## 5. UX Flow

### Happy path — override one guest's response (WF-06-05)

1. The Editor opens `/dashboard/[eventSlug]/guests`. `guests.getGuestsPageData` returns
   guests, invitations, special events, `accessByEvent` and `specialRsvpByGuest` in one round
   trip.
2. The page derives each guest's `specialStatuses`, one entry per special invitation, using
   the two-source rule: an explicit RSVP row wins; otherwise the guest counts as invited when
   they have an invitation, are not `declined`, and that invitation holds an access row;
   otherwise `"notInvited"`
   (`src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:90`–`:106`).
3. The Editor clicks a guest → the details dialog opens with an "RSVPs" group: a "Main event"
   select, then one select per special invitation in the event, labelled with the special
   invitation's name (`guest-details-sheet.tsx:202`).
4. Each special select shows `guest.specialStatuses[se._id] ?? "notInvited"` with options
   "Not invited" / "Pending" / "Attending" / "Declined" (`guest-details-sheet.tsx:234`, `:259`).
5. Picking a status other than "Not invited" calls `api.guests.setSpecialEventRsvp` with
   `{guestId, specialEventId, status}`. The server checks the special invitation belongs to
   the guest's event, then patches the existing `guestSpecialEventRsvps` row or inserts one
   (`convex/guests.ts:263`, `:275`).
6. Picking "Not invited" calls `api.guests.removeSpecialEventRsvp`, which deletes the row if it
   exists (`convex/guests.ts:302`).
7. The change is saved immediately — there is no Save button for this group — and the guests
   table column updates from the live query.

### Alternate & edge paths

- **A1** — The guest's invitation has no access to the special invitation → the select still
  renders and still writes. The guest is now recorded as attending something they cannot see
  on their own invitation page. See BR-06-F03-03 and the asymmetry note below.
- **A2** — "Not invited" is chosen for a guest who has no RSVP row → `removeSpecialEventRsvp`
  finds nothing and does nothing (`convex/guests.ts:309`).
- **A3** — The guest is invited via access but has never answered → the derived status is
  `"pending"`, and picking "Not invited" removes nothing while the derived value snaps back to
  `"pending"` on the next query, because access still implies invited
  (`.../guests/page.tsx:100`).
- **A4** — The guest's main-event status is changed to Declined in the same dialog → saving the
  guest runs `applyDeclineEffects`, destroying every one of their special-invitation RSVP rows
  (`convex/lib/guests.ts:51`). See BR-06-F03-07 and TODO-06-03.
- **A5** — A mutation is in flight → every special select in the dialog is disabled while
  either `setSpecialEventRsvp.pending` or `removeSpecialEventRsvp.pending` is true
  (`guest-details-sheet.tsx:236`).
- **E1** — The special invitation belongs to another event → `ConvexError("Special event does
not belong to this event")` (`convex/guests.ts:265`).
- **E2** — The guest id does not resolve → `ConvexError("Guest not found")`
  (`convex/guests.ts:260`, `:299`).
- **E3** — Any failure → the `useToastMutation` error toast fires and the select reverts to
  server state on the next query result (`guest-details-sheet.tsx:85`, `:89`).

### The access / response asymmetry

This is the surprising part of the feature and is worth stating plainly.

|                                                 | Writes access (`invitationSpecialEventAccess`) |  Writes response (`guestSpecialEventRsvps`)  |
| ----------------------------------------------- | :--------------------------------------------: | :------------------------------------------: |
| `invitations.setSpecialEventAccess` (EP-06-F02) |                      yes                       |                      no                      |
| `guests.setSpecialEventRsvp` (this feature)     |                     **no**                     |                     yes                      |
| `guests.removeSpecialEventRsvp` (this feature)  |                       no                       |                   deletes                    |
| `guests.submitPublicRsvp` (EP-07)               |                       no                       | yes, only for accessible special invitations |

So an Editor who sets a guest to "Attending" on a special invitation their invitation cannot
see produces a **half-invited** guest: they are counted in the dashboard and in the guests
table, but `getPublicInvitation` still returns nothing for their invitation, so they never see
the card and can never change their own answer. The reverse also holds — revoking an
invitation's access leaves its guests' responses intact (EP-06-F02, BR-06-F02-06). Nothing in
the UI explains either direction. To make a guest fully invited, the Editor must **also** tick
their invitation in EP-06-F02's checklist.

## 6. States

| State             | Behavior                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The dialog opens only from a loaded guests page; `specialStatuses` is derived client-side from already-fetched data                            |
| Empty             | The event has no special invitations → the RSVPs group shows only the "Main event" row (`guest-details-sheet.tsx:227` iterates an empty array) |
| Error             | `useToastMutation` error toast; the select falls back to server state                                                                          |
| Success           | Silent for `removeSpecialEventRsvp`; both mutations are configured through `useToastMutation` at `guest-details-sheet.tsx:85` and `:89`        |
| Disabled / locked | Every special select disables while either mutation is pending                                                                                 |
| Mobile            | The RSVPs group is a bordered vertical stack inside the scrollable dialog; each select is `w-40`                                               |

## 7. UI Specification

### Screens & components

| Element                              | Component                  | Path                                                           |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------- |
| Guest details dialog, RSVPs group    | `GuestDetailsSheet`        | `src/components/guests/guest-details-sheet.tsx:202`            |
| Per-special-invitation table columns | `GuestTable`               | `src/components/guests/guest-table.tsx`                        |
| Derived `specialStatuses`            | Guests page                | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:90` |
| Page data                            | `guests.getGuestsPageData` | `convex/guests.ts`                                             |

### Fields & validation

| Field                         | Type   | Required | Rule                                                                                                                                  | Message |
| ----------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Main event status             | select | Yes      | `pending` / `attending` / `declined`; saved with the guest (EP-04)                                                                    | —       |
| Per-special-invitation status | select | No       | `notInvited` / `pending` / `attending` / `declined`; `notInvited` maps to `removeSpecialEventRsvp`, the rest to `setSpecialEventRsvp` | —       |

No Zod schema governs this group — the values are constrained by the select options and by the
Convex `v.union` of the three literals (`convex/guests.ts:252`).

### Copy deck

Dashboard-facing English only.

| Key               | Copy                                                 | Source                               |
| ----------------- | ---------------------------------------------------- | ------------------------------------ |
| Group label       | "RSVPs"                                              | `guest-details-sheet.tsx:205`        |
| Main row label    | "Main event"                                         | `guest-details-sheet.tsx:209`        |
| Special row label | the special invitation's `name`                      | `guest-details-sheet.tsx:232`        |
| Options           | "Not invited" · "Pending" · "Attending" · "Declined" | `guest-details-sheet.tsx:259`–`:262` |

## 8. Data Model

| Table                          | Fields                                     | Read / Write                                      | Index                                                                                                                                |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `guestSpecialEventRsvps`       | `eventId, guestId, specialEventId, status` | Read + insert + patch + delete                    | `by_guestId_and_specialEventId` (lookup), `by_guestId` (page data, decline cascade), `by_specialEventId` (special-invitation delete) |
| `guests`                       | `_id, eventId, rsvpStatus, invitationId`   | Read                                              | —                                                                                                                                    |
| `specialEvents`                | `_id, eventId, name`                       | Read                                              | `by_eventId`                                                                                                                         |
| `invitationSpecialEventAccess` | `invitationId, specialEventId`             | Read (only to derive the table's "invited" state) | `by_specialEventId`                                                                                                                  |

Schema: `convex/schema.ts:167`.

**Uniqueness.** At most one row per (guest, special invitation) pair, enforced by the
`.unique()` lookup on `by_guestId_and_specialEventId` before the insert/patch branch
(`convex/guests.ts:268`).

**Denormalized `eventId`.** The row carries the guest's `eventId`
(`convex/guests.ts:279`), which is what lets `events.deleteEvent` cascade without a join.

**Cascades that destroy these rows.** Four paths delete `guestSpecialEventRsvps` rows:
`guests.deleteGuest` (`convex/guests.ts:321`), `deletePlusOneCascade` when a +1 is torn down
(`convex/lib/guests.ts:40`), `applyDeclineEffects` when a guest becomes `declined`
(`convex/lib/guests.ts:55`), and `specialEvents.deleteSpecialEvent` (`convex/specialEvents.ts:158`).
None of them is reversible.

## 9. Backend Contract

| Function                            | Type            | Args                                                                        | Returns                                                                                                      | Guard                                    | Caps                                            |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------- |
| `api.guests.setSpecialEventRsvp`    | mutation        | `{guestId, specialEventId, status: "pending" \| "attending" \| "declined"}` | `void`                                                                                                       | `requireEventEditor(ctx, guest.eventId)` | —                                               |
| `api.guests.removeSpecialEventRsvp` | mutation        | `{guestId, specialEventId}`                                                 | `void`                                                                                                       | `requireEventEditor(ctx, guest.eventId)` | —                                               |
| `api.guests.getGuestsPageData`      | query           | `{eventId}`                                                                 | `{guests, invitations, menuOptions, drinkOptions, tables, specialEvents, accessByEvent, specialRsvpByGuest}` | `requireEventEditor`                     | Specified in EP-04                              |
| `api.guests.updateGuest`            | mutation        | `{id, ..., rsvpStatus?}`                                                    | `void`                                                                                                       | `requireEventEditor`                     | Runs `applyDeclineEffects` — EP-04              |
| `api.guests.submitPublicRsvp`       | public mutation | `{eventSlug, invitationSlug, ...}`                                          | —                                                                                                            | none                                     | The guest-side writer of the same table — EP-07 |

## 10. Business Rules

- **BR-06-F03-01** `[AS-BUILT]` — `setSpecialEventRsvp` upserts: it patches the existing row's
  `status` when one exists for the (guest, special invitation) pair, otherwise inserts a new
  row with the guest's `eventId` (`convex/guests.ts:275`).
- **BR-06-F03-02** `[AS-BUILT]` — The special invitation must belong to the guest's event;
  otherwise `ConvexError("Special event does not belong to this event")`
  (`convex/guests.ts:264`). The same check guards `removeSpecialEventRsvp`'s sibling path in
  `setSpecialEventRsvp` only — `removeSpecialEventRsvp` needs none, because it can only delete
  a row already keyed by that guest.
- **BR-06-F03-03** `[AS-BUILT]` — `setSpecialEventRsvp` adds a guest to a special invitation
  **regardless of invitation access**: it never reads or writes
  `invitationSpecialEventAccess` (`convex/guests.ts:258`–`:285`). The guest counts as
  responding without their invitation being able to see the special invitation.
- **BR-06-F03-04** `[AS-BUILT]` — `removeSpecialEventRsvp` deletes only the RSVP row; the
  invitation's access row is untouched (`convex/guests.ts:309`).
- **BR-06-F03-05** `[AS-BUILT]` — `removeSpecialEventRsvp` is idempotent: no row, no write.
- **BR-06-F03-06** `[AS-BUILT]` — The guests table treats a guest as invited to a special
  invitation when **either** an explicit RSVP row exists **or** the guest has an invitation,
  is not `declined`, and that invitation holds an access row; otherwise the cell reads "Not
  invited". A guest invited via access with no row displays as `pending`
  (`src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:98`–`:106`).
- **BR-06-F03-07** `[AS-BUILT]` — When a guest transitions to `declined` on the **main** event,
  `applyDeclineEffects` deletes **all** of their `guestSpecialEventRsvps` rows
  (`convex/lib/guests.ts:51`, `:55`). Their special-invitation answers are destroyed, not
  archived.
- **BR-06-F03-08** `[AS-BUILT]` — Reversing a decline does not restore the deleted rows; there
  is no restore path in `convex/guests.ts` or `convex/lib/guests.ts`. The guest returns to
  "Not invited" for every special invitation unless an Editor re-enters each answer, or their
  invitation's access rows make them derive as `pending` again.
- **BR-06-F03-09** `[AS-BUILT]` — Declined guests are also excluded from the public payload's
  `guestStatuses`, so even a surviving row would not surface for them
  (`convex/invitations.ts:170`).
- **BR-06-F03-10** `[AS-BUILT]` — Deleting a guest deletes their `guestSpecialEventRsvps` rows
  (`convex/guests.ts:321`), and tearing down a +1 deletes the +1's rows
  (`convex/lib/guests.ts:40`).
- **BR-06-F03-11** `[AS-BUILT]` — Neither `setSpecialEventRsvp` nor `removeSpecialEventRsvp`
  calls `logActivity`; per-toggle status changes are deliberately absent from the Activity
  page, consistent with the project convention for per-toggle mutations
  (`convex/guests.ts:248`–`:311`). See [EP-03-F05](../03-collaboration-and-permissions/).
- **BR-06-F03-12** `[AS-BUILT]` — The dialog offers a select for **every** special invitation in
  the event, not only those the guest's invitation can see
  (`guest-details-sheet.tsx:227`).

## 11. Acceptance Criteria

- **AC-06-F03-01** — **Given** a guest with no response to a special invitation **When** the
  Editor picks "Attending" **Then** one `guestSpecialEventRsvps` row exists with
  `status: "attending"` and the guest's `eventId`.
- **AC-06-F03-02** — **Given** that row **When** the Editor picks "Declined" **Then** the same
  row is patched to `declined` and no second row is created.
- **AC-06-F03-03** — **Given** that row **When** the Editor picks "Not invited" **Then** the
  row is deleted.
- **AC-06-F03-04** — **Given** a guest whose invitation has **no** access to a special
  invitation **When** the Editor sets them to "Attending" **Then** the RSVP row is created,
  **and** `getPublicInvitation` for that invitation still returns an empty `specialEvents`
  array, **and** no `invitationSpecialEventAccess` row is created.
- **AC-06-F03-05** — **Given** a guest with 2 special-invitation responses **When** their main
  RSVP status is set to `declined` **Then** both rows are deleted.
- **AC-06-F03-06** — **Given** that guest **When** their status is set back to `attending`
  **Then** the deleted responses are not restored.
- **AC-06-F03-07** — **Given** a guest invited through their invitation's access with no stored
  row **When** the guests table renders **Then** the cell reads "Pending".
- **AC-06-F03-08** — **Given** a special invitation from a different event **When**
  `setSpecialEventRsvp` is called **Then** it throws "Special event does not belong to this
  event" and writes nothing.
- **AC-06-F03-09** — **Given** any override on this surface **When** the Activity page is
  opened **Then** no new entry appears for it.
- **AC-06-F03-10** — **Given** a Viewer on the event **When** `setSpecialEventRsvp` is called
  **Then** it throws `Insufficient permissions`.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                           |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| TC-06-F03-01 | integration | `setSpecialEventRsvp` inserts once then patches on the second call                                                 |
| TC-06-F03-02 | integration | `removeSpecialEventRsvp` deletes an existing row and no-ops on an absent one                                       |
| TC-06-F03-03 | integration | `setSpecialEventRsvp` on a guest whose invitation lacks access creates the RSVP row and no access row              |
| TC-06-F03-04 | integration | A cross-event `specialEventId` is rejected with the exact message                                                  |
| TC-06-F03-05 | integration | `applyDeclineEffects` deletes every RSVP row for the declining guest and leaves other guests' rows alone           |
| TC-06-F03-06 | integration | Un-declining a guest leaves them with zero RSVP rows                                                               |
| TC-06-F03-07 | integration | `deleteGuest` and the +1 teardown each remove the affected guest's RSVP rows                                       |
| TC-06-F03-08 | integration | Neither mutation appends an `activityLogs` row                                                                     |
| TC-06-F03-09 | unit        | The `specialStatuses` derivation returns `notInvited` / `pending` / the explicit status for the three input shapes |
| TC-06-F03-10 | e2e         | Set a guest to Attending on a special invitation, confirm the guests-table cell, then set it back to Not invited   |

### Manual QA checklist

- [ ] Every special invitation in the event appears in the RSVPs group, including unassigned ones
- [ ] Changing a select saves without a Save button and the table cell follows
- [ ] All special selects disable while a change is in flight
- [ ] Setting a guest to Attending on an unassigned special invitation leaves their public page unchanged
- [ ] Declining the main event clears every special select back to "Not invited"
- [ ] Un-declining does not bring the previous answers back
- [ ] Activity page shows no entries for these changes

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None on this mutation; at most 2 special invitations per guest by BR-06-F01-01. The decline cascade reads `.take(100)` RSVP rows per guest (`convex/lib/guests.ts:27`) |
| Performance      | One indexed `.unique()` lookup plus one write per change; the guests page derives all statuses client-side from a single query                                         |
| Security & authz | `requireEventEditor` on the guest's event, plus an explicit same-event check on the special invitation in `setSpecialEventRsvp`                                        |
| Accessibility    | Each select sits opposite a text label carrying the special invitation's name; the group is labelled "RSVPs"                                                           |
| i18n             | English only                                                                                                                                                           |
| Analytics        | None — deliberately not activity-logged (BR-06-F03-11)                                                                                                                 |

## 14. TODOs & Open Questions

- **TODO-06-03** `[P1]` `[CHANGE]` — Declining the main event silently destroys a guest's
  special-invitation answers.
  - **Rationale:** `applyDeclineEffects` deletes every `guestSpecialEventRsvps` row for the
    guest (`convex/lib/guests.ts:55`), reached from `guests.updateGuest` and from the public
    `submitPublicRsvp`. This is defensible as a product rule — someone not coming to the
    wedding is not coming to the after-party — but it is **destructive and irreversible**
    (BR-06-F03-08), it happens with no warning in the dashboard dialog, and it is triggerable
    by a guest themselves from the public page. An Editor who mis-clicks Declined loses the
    data with a success toast.
  - **Proposed rule:** the decline cascade sets the guest's special-invitation rows to
    `declined` instead of deleting them, so the answers survive a reversal; alternatively the
    dashboard dialog confirms before a `pending`/`attending` → `declined` transition when the
    guest holds special-invitation responses.
- **TODO-06-05** `[P2]` `[CHANGE]` — Special-invitation responses and access changes leave no
  audit trail.
  - **Rationale:** `setSpecialEventRsvp`, `removeSpecialEventRsvp` and
    `invitations.setSpecialEventAccess` all skip `logActivity`, matching the per-toggle
    convention. But unlike the "invitation sent" flag, these are _guest answers_ on a shared
    board, and the decline cascade can delete them without any record of who caused it. On a
    co-owned event nobody can reconstruct who changed a response.
  - **Proposed rule:** an override of a special-invitation response appends an `activityLogs`
    entry; `activityLogs.entity` gains a `specialEventRsvp` member. Requires an EP-03-F05
    schema change.
- **TODO-06-09** `[P1]` `[ADD]` — Nothing warns that a response override does not grant access.
  - **Rationale:** BR-06-F03-03 lets an Editor record a guest as attending a special
    invitation their invitation cannot see. The result is a guest counted internally who never
    sees the card and cannot change their own answer. The guests page comment acknowledges the
    two-source rule (`.../guests/page.tsx:91`) but the UI says nothing.
  - **Proposed rule:** setting a status for a guest whose invitation lacks access shows an
    inline notice offering to grant the invitation access at the same time.

### Open questions

- **Q1** — Should the dashboard override be allowed at all for a guest whose invitation lacks
  access, or should the select be disabled until access is granted?
- **Q2** — Is "Not invited" the right label for a state that, for an access-invited guest, the
  Editor cannot actually reach (A3)?
- **Q3** — Should a guest's own public decline destroy their special-invitation answers, or
  only an Editor's?

## 15. Traceability

| Concern                                     | Source                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Route                                       | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx`                   |
| Derived `specialStatuses` (two-source rule) | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:90`, `:98`, `:103` |
| RSVPs group in the dialog                   | `src/components/guests/guest-details-sheet.tsx:202`                           |
| Mutation wiring + pending disable           | `src/components/guests/guest-details-sheet.tsx:85`, `:89`, `:236`             |
| Select options                              | `src/components/guests/guest-details-sheet.tsx:259`                           |
| `setSpecialEventRsvp`                       | `convex/guests.ts:248`                                                        |
| Same-event check                            | `convex/guests.ts:263`                                                        |
| Upsert branch                               | `convex/guests.ts:275`                                                        |
| `removeSpecialEventRsvp`                    | `convex/guests.ts:292`, `:309`                                                |
| `deleteGuest` RSVP cleanup                  | `convex/guests.ts:321`                                                        |
| Decline cascade                             | `convex/lib/guests.ts:20`, `:51`, `:55`                                       |
| +1 teardown cascade                         | `convex/lib/guests.ts:36`                                                     |
| Declined guests excluded publicly           | `convex/invitations.ts:170`                                                   |
| Schema                                      | `convex/schema.ts:167`                                                        |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
