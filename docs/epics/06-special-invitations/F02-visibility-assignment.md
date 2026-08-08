---
id: EP-06-F02
title: Visibility Assignment
epic: EP-06 Special Invitations
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-06-F01, EP-05-F01]
---

# EP-06-F02 — Visibility Assignment

## 1. Summary

A [special invitation](../../glossary.md) is not shown to everyone. The host decides, one
invitation at a time, which households may see it — the parents' invitation sees the welcome
dinner, the distant cousins' does not. That decision is a row in
`invitationSpecialEventAccess`, toggled from a checklist inside the special-invitation edit
dialog (and, from the other direction, from the invitation edit dialog in EP-05). Access is
granted **per invitation**, never per guest; the per-guest response is EP-06-F03.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                                                                                              |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full   |                                                                                                                                                    |
| Co-owner (`planner`) | Full   | No extra gate                                                                                                                                      |
| Editor               | Full   | `invitations.setSpecialEventAccess` uses `requireEventEditor(ctx, invitation.eventId)` at the default `editor` floor (`convex/invitations.ts:506`) |
| Viewer               | None   | Read-blocked from `getSpecialEventsPageData`                                                                                                       |
| Public guest         | None   | Reads the _consequence_ only — the public payload contains only special invitations their invitation has access to                                 |

Role semantics: [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-06-F02-01** — As an Editor, I want to tick which invitations can see a special
  invitation so that only the right households are told about it.
- **US-06-F02-02** — As an Editor, I want each ticked box to take effect immediately so that I
  can work through a long invitation list without a save step.
- **US-06-F02-03** — As an Editor, I want to see at a glance how many invitations a special
  invitation reaches so that I can spot one I forgot to assign.

## 4. Entry Points

| Entry point                                    | Route / control                                                                                                                                                                                                        | Actor   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| "Visible to invitations" checklist             | Edit dialog on `/dashboard/[eventSlug]/special-events`                                                                                                                                                                 | Editor+ |
| "Visible to N invitations" counter             | Each row of the special-invitation list                                                                                                                                                                                | Editor+ |
| Special-invitations checklist on an invitation | `/dashboard/[eventSlug]/invitations` edit dialog — writes the same table via `invitations.updateInvitation`'s `specialEventIds` reconciliation (`convex/invitations.ts:412`). Specified in [EP-05](../05-invitations/) | Editor+ |

## 5. UX Flow

### Happy path — assign visibility (WF-06-04)

1. The Editor opens `/dashboard/[eventSlug]/special-events`; `getSpecialEventsPageData`
   returns `{specialEvents, invitations, accessByEvent}` in one round trip, where
   `accessByEvent` maps each `specialEventId` to the invitation ids that currently have access
   (`convex/specialEvents.ts:38`).
2. The Editor clicks the pencil on a special invitation → the dialog opens in `edit` mode. The
   page passes down `accessIds = pageData.accessByEvent[specialEvent._id] ?? []`
   (`.../special-events/page.tsx:115`).
3. The panel headed "Visible to invitations" lists **every** invitation in the event as a
   labelled checkbox, checked when its id is in `accessIds`
   (`special-event-form.tsx:207`, `:224`).
4. Ticking a box calls `api.invitations.setSpecialEventAccess` with
   `{invitationId, specialEventId, hasAccess: true}`; unticking sends `hasAccess: false`
   (`special-event-form.tsx:142`).
5. The server verifies the special invitation belongs to the invitation's event, then inserts
   or deletes the `invitationSpecialEventAccess` row (`convex/invitations.ts:508`, `:522`).
6. The live query updates; the page re-derives `editingLive` from the fresh data so the
   checkboxes stay in sync (`.../special-events/page.tsx:60`), and the row's "Visible to N
   invitations" counter changes.

### Alternate & edge paths

- **A1** — The dialog is in `create` mode → the panel renders no checkboxes, only "Save first,
  then reopen to choose which invitations can see this." Assignment needs a saved special
  invitation id (`special-event-form.tsx:211`). See TODO-06-04.
- **A2** — The event has no invitations yet → the panel shows "No invitations yet."
  (`special-event-form.tsx:216`).
- **A3** — The box is already in the requested state → the mutation is a no-op; it inserts only
  when `hasAccess && !existing` and deletes only when `!hasAccess && existing`
  (`convex/invitations.ts:522`, `:528`).
- **A4** — Access is removed from an invitation whose guests already responded → the
  `guestSpecialEventRsvps` rows are **not** deleted; they persist and reappear if access is
  granted again. See BR-06-F02-06.
- **E1** — The special invitation belongs to a different event → `ConvexError("Special event
does not belong to this event")` (`convex/invitations.ts:510`).
- **E2** — The invitation id does not resolve → `ConvexError("Invitation not found")`
  (`convex/invitations.ts:505`).
- **E3** — Any of the above, or a permission failure → the checkbox handler catches and toasts
  "Failed to update visibility" (`special-event-form.tsx:151`). The checkbox reverts on the
  next query result because it is driven by server state, not local state.

### Consequence on the public page — cross-reference only

`invitations.getPublicInvitation` (and its by-host twin) builds the invitation's special
invitations by reading `invitationSpecialEventAccess.by_invitationId`, resolving each id, and
dropping inactive ones (`convex/invitations.ts:149`, `:155`). An invitation with no access row
therefore receives an **empty** `specialEvents` array, and the `specialInvitation` block finds
nothing to bind to and renders nothing at all. The block itself, its bound `specialEventId`
config and its confirm modal are specified in [EP-07](../07-guest-experience/) and
[EP-08](../08-invitation-design-studio/) — not here.

## 6. States

| State             | Behavior                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The dialog only opens from a loaded list, so the checklist never renders against undefined data; `invitations` defaults to `[]` (`.../special-events/page.tsx:114`) |
| Empty             | "No invitations yet." when the event has no invitations                                                                                                             |
| Error             | Toast "Failed to update visibility"; the checkbox falls back to server state                                                                                        |
| Success           | No toast — the change is silent and visible through the checkbox and the row counter                                                                                |
| Disabled / locked | Checkboxes are absent (not disabled) in `create` mode                                                                                                               |
| Mobile            | The panel is a vertical stack inside the scrollable `max-h-[90vh]` dialog                                                                                           |

## 7. UI Specification

### Screens & components

| Element                            | Component                  | Path                                                       |
| ---------------------------------- | -------------------------- | ---------------------------------------------------------- |
| Visibility checklist panel         | `SpecialEventForm`         | `src/components/special-events/special-event-form.tsx:206` |
| "Visible to N invitations" counter | `SpecialEventList`         | `src/components/special-events/special-event-list.tsx:83`  |
| Access map supplier                | `getSpecialEventsPageData` | `convex/specialEvents.ts:21`                               |

### Fields & validation

| Field                   | Type    | Required | Rule                                                                                                            | Message |
| ----------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| Per-invitation checkbox | boolean | No       | Checked ⇔ an `invitationSpecialEventAccess` row exists for the pair; `onCheckedChange` sends `checked === true` | —       |

There is no client-side validation and no form submission — each checkbox writes directly.

### Copy deck

Dashboard-facing English only.

| Key              | Copy                                                                | Source                       |
| ---------------- | ------------------------------------------------------------------- | ---------------------------- |
| Panel heading    | "Visible to invitations"                                            | `special-event-form.tsx:208` |
| Create-mode hint | "Save first, then reopen to choose which invitations can see this." | `special-event-form.tsx:213` |
| No invitations   | "No invitations yet."                                               | `special-event-form.tsx:216` |
| Checkbox label   | the invitation's `title`                                            | `special-event-form.tsx:230` |
| Row counter      | "Visible to {n} invitation" / "Visible to {n} invitations"          | `special-event-list.tsx:83`  |
| Error toast      | "Failed to update visibility"                                       | `special-event-form.tsx:151` |

## 8. Data Model

| Table                          | Fields                                  | Read / Write           | Index                                                                                                              |
| ------------------------------ | --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `invitationSpecialEventAccess` | `eventId, invitationId, specialEventId` | Read + insert + delete | `by_invitationId_and_specialEventId` (lookup), `by_specialEventId` (page data), `by_invitationId` (public payload) |
| `invitations`                  | `_id, eventId, title`                   | Read                   | `by_eventId`                                                                                                       |
| `specialEvents`                | `_id, eventId`                          | Read (ownership check) | —                                                                                                                  |

Schema: `convex/schema.ts:182`.

**Denormalized `eventId`.** The access row stores `eventId` alongside both foreign keys
(`convex/invitations.ts:524`), which is what makes the event-level cascade in
`events.deleteEvent` possible without a join.

**Uniqueness.** The pair is looked up with `.unique()` on
`by_invitationId_and_specialEventId` before writing, so the table holds at most one row per
(invitation, special invitation) pair — enforced by the read-before-write, not by a database
constraint (`convex/invitations.ts:513`).

**Cascades in.** Access rows are removed by `specialEvents.deleteSpecialEvent`
(`convex/specialEvents.ts:149`, EP-06-F01) and by `invitations.updateInvitation`'s
`specialEventIds` reconciliation (`convex/invitations.ts:412`, EP-05), and by
`invitations.deleteInvitation`, which deletes up to 100 access rows by `by_invitationId`
before deleting the invitation (`convex/invitations.ts:466`). Both directions of the join are
therefore cleaned on delete.

## 9. Backend Contract

| Function                                     | Type     | Args                                        | Returns                                       | Guard                                         | Caps                  |
| -------------------------------------------- | -------- | ------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------- |
| `api.invitations.setSpecialEventAccess`      | mutation | `{invitationId, specialEventId, hasAccess}` | `void`                                        | `requireEventEditor(ctx, invitation.eventId)` | —                     |
| `api.specialEvents.getSpecialEventsPageData` | query    | `{eventId}`                                 | `{specialEvents, invitations, accessByEvent}` | `requireEventEditor`                          | 100 / 500 / 500       |
| `api.invitations.createInvitation`           | mutation | `{..., specialEventIds?}`                   | `Id<"invitations">`                           | `requireEventEditor`                          | Specified in EP-05    |
| `api.invitations.updateInvitation`           | mutation | `{..., specialEventIds?}`                   | `void`                                        | `requireEventEditor`                          | Specified in EP-05    |
| `api.invitations.getPublicInvitation`        | query    | `{eventSlug, invitationSlug}`               | payload incl. `specialEvents`                 | **public**                                    | Consumer only — EP-07 |

## 10. Business Rules

- **BR-06-F02-01** `[AS-BUILT]` — Visibility is granted per invitation, never per guest: the
  only row written is `invitationSpecialEventAccess` (`convex/invitations.ts:523`).
- **BR-06-F02-02** `[AS-BUILT]` — A special invitation may only be granted to an invitation of
  the **same event**; a mismatch throws `ConvexError("Special event does not belong to this
event")` (`convex/invitations.ts:509`).
- **BR-06-F02-03** `[AS-BUILT]` — `setSpecialEventAccess` is idempotent: granting existing
  access and revoking absent access both write nothing (`convex/invitations.ts:522`, `:528`).
- **BR-06-F02-04** `[AS-BUILT]` — At most one access row exists per (invitation, special
  invitation) pair, guaranteed by the `.unique()` lookup before insert
  (`convex/invitations.ts:513`).
- **BR-06-F02-05** `[AS-BUILT]` — Granting access creates no `guestSpecialEventRsvps` rows; the
  invitation's guests start with no stored response.
- **BR-06-F02-06** `[AS-BUILT]` — Revoking access deletes only the access row; existing
  `guestSpecialEventRsvps` rows for that invitation's guests survive
  (`convex/invitations.ts:529`).
- **BR-06-F02-07** `[AS-BUILT]` — The public payload for an invitation contains exactly the
  special invitations it has an access row for, minus inactive ones
  (`convex/invitations.ts:149`, `:155`). An invitation with no access row receives an empty
  list, so the `specialInvitation` block renders nothing (behavior owned by EP-07/EP-08).
- **BR-06-F02-08** `[AS-BUILT]` — Visibility can only be assigned once the special invitation
  exists; in `create` mode the dialog renders the hint instead of the checklist
  (`special-event-form.tsx:211`).
- **BR-06-F02-09** `[AS-BUILT]` — `setSpecialEventAccess` writes no `activityLogs` row; access
  changes are invisible in the Activity page (`convex/invitations.ts:497`–`:532` contains no
  `logActivity` call). See [EP-03-F05](../03-collaboration-and-permissions/) and TODO-06-05.
- **BR-06-F02-10** `[AS-BUILT]` — Deleting an invitation deletes its access rows
  (`convex/invitations.ts:466`), and deleting a special invitation deletes its access rows
  (`convex/specialEvents.ts:149`), so no orphan access row outlives either side of the join.
- **BR-06-F02-11** `[AS-BUILT]` — The list's "Visible to N invitations" counter is the length
  of `accessByEvent[specialEventId]`, i.e. a live count of access rows, not of guests
  (`special-event-list.tsx:55`).

## 11. Acceptance Criteria

- **AC-06-F02-01** — **Given** a saved special invitation and 3 invitations **When** the Editor
  opens the edit dialog **Then** all 3 invitations appear as checkboxes, ticked exactly for
  those with an existing access row.
- **AC-06-F02-02** — **Given** an unticked invitation **When** the Editor ticks it **Then** one
  `invitationSpecialEventAccess` row is inserted with the invitation's `eventId`, and the row
  counter increments without a page reload.
- **AC-06-F02-03** — **Given** a ticked invitation **When** the Editor unticks it **Then** the
  access row is deleted and any `guestSpecialEventRsvps` rows for that invitation's guests
  still exist.
- **AC-06-F02-04** — **Given** a special invitation from another event **When**
  `setSpecialEventAccess` is called for this event's invitation **Then** it throws "Special
  event does not belong to this event" and writes nothing.
- **AC-06-F02-05** — **Given** an invitation that already has access **When**
  `setSpecialEventAccess` is called again with `hasAccess: true` **Then** the row count is
  unchanged.
- **AC-06-F02-06** — **Given** an invitation with no access row **When**
  `getPublicInvitation` resolves it **Then** its `specialEvents` array is empty.
- **AC-06-F02-07** — **Given** the create-mode dialog **When** it is open **Then** no
  invitation checkboxes render and the hint "Save first, then reopen to choose which
  invitations can see this." is shown.
- **AC-06-F02-08** — **Given** any successful access toggle **When** the Activity page is
  opened **Then** no new entry appears for it.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| TC-06-F02-01 | integration | `setSpecialEventAccess(hasAccess:true)` inserts exactly one row; calling it twice still yields one                       |
| TC-06-F02-02 | integration | `setSpecialEventAccess(hasAccess:false)` on an absent row is a no-op                                                     |
| TC-06-F02-03 | integration | Cross-event special invitation is rejected with the exact error message                                                  |
| TC-06-F02-04 | integration | Revoking access leaves `guestSpecialEventRsvps` untouched                                                                |
| TC-06-F02-05 | integration | `getSpecialEventsPageData.accessByEvent` matches the rows in the table                                                   |
| TC-06-F02-06 | integration | `getPublicInvitation` returns the special invitation for an assigned invitation and an empty array for an unassigned one |
| TC-06-F02-07 | integration | A Viewer calling `setSpecialEventAccess` is rejected                                                                     |
| TC-06-F02-08 | e2e         | Tick two invitations in the dialog, close it, and confirm the row reads "Visible to 2 invitations"                       |

### Manual QA checklist

- [ ] Create-mode dialog shows the hint, not the checklist
- [ ] Checkbox state survives closing and reopening the dialog
- [ ] Row counter matches the number of ticked boxes
- [ ] Public invitation page of an assigned invitation shows the special invitation card
- [ ] Public invitation page of an unassigned invitation shows nothing in its place
- [ ] Assigning from the invitation edit dialog (EP-05) shows the same state here
- [ ] Toast "Failed to update visibility" appears when the mutation is rejected

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `getSpecialEventsPageData` reads ≤500 invitations and ≤500 access rows per special invitation; the checklist is unpaginated, so a very large event renders a long list |
| Performance      | One indexed `.unique()` lookup plus one write per toggle; the access map costs one indexed query per special invitation (≤2)                                           |
| Security & authz | `requireEventEditor` on the invitation's event, plus an explicit same-event check on the special invitation                                                            |
| Accessibility    | Each checkbox is wrapped in a `<label>` making the invitation title the click target (`special-event-form.tsx:220`)                                                    |
| i18n             | English only                                                                                                                                                           |
| Analytics        | None — access changes are not activity-logged (BR-06-F02-09)                                                                                                           |

## 14. TODOs & Open Questions

- **TODO-06-04** `[P2]` `[ADD]` — Visibility cannot be assigned while creating a special
  invitation.
  - **Rationale:** the create dialog needs a saved id before it can write access rows, so it
    shows "Save first, then reopen to choose which invitations can see this."
    (`special-event-form.tsx:213`). Every new special invitation therefore starts invisible to
    every guest, and the Editor must remember a second, undirected step.
  - **Proposed rule:** the create dialog collects the selected invitation ids in local state
    and writes their access rows immediately after `createSpecialEvent` returns — the same
    pattern `invitations.createInvitation` already uses with `specialEventIds`
    (`convex/invitations.ts:313`).
- **TODO-06-08** `[P2]` `[ADD]` — The checklist gives no indication of an invitation's size or
  state.
  - **Rationale:** the panel renders only `invitation.title`
    (`special-event-form.tsx:230`), so an Editor assigning a welcome dinner cannot tell whether
    a household is two people or eight, nor whether its guests have already declined the main
    event (and therefore had their special-invitation responses destroyed — see EP-06-F03,
    TODO-06-03). `getSpecialEventsPageData` already loads the full invitation docs, but no
    guest counts.
  - **Proposed rule:** each checkbox row shows the invitation's linked-guest count alongside
    its title.

### Open questions

- **Q1** — Should revoking access also clear the responses collected under it, or is keeping
  them (BR-06-F02-06) the intended "re-invite restores their answer" behavior?
- **Q2** — Should the checklist offer a "select all" affordance for events where the special
  invitation is meant for nearly everyone?

## 15. Traceability

| Concern                                 | Source                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Route                                   | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:20`  |
| Access ids passed to the dialog         | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:115` |
| Live re-derivation of the edited row    | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:60`  |
| Checklist panel                         | `src/components/special-events/special-event-form.tsx:206`              |
| Toggle handler + error toast            | `src/components/special-events/special-event-form.tsx:142`              |
| Create-mode hint                        | `src/components/special-events/special-event-form.tsx:211`              |
| Row visibility counter                  | `src/components/special-events/special-event-list.tsx:55`, `:83`        |
| `setSpecialEventAccess`                 | `convex/invitations.ts:497`                                             |
| Same-event ownership check              | `convex/invitations.ts:508`                                             |
| Idempotent insert / delete              | `convex/invitations.ts:522`, `:528`                                     |
| Access map for the page                 | `convex/specialEvents.ts:38`                                            |
| Public consequence (access → payload)   | `convex/invitations.ts:149`, `:155`                                     |
| Reconciliation from the invitation side | `convex/invitations.ts:313`, `:412`                                     |
| Schema                                  | `convex/schema.ts:182`                                                  |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
