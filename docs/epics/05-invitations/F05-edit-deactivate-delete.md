---
id: EP-05-F05
title: Edit, Deactivate & Delete an Invitation
epic: EP-05 Invitations
version: 1.0.0
status: partial
last_updated: 2026-07-28
depends_on: [EP-05-F01, EP-05-F02, EP-05-F03, EP-04-F01]
---

# EP-05-F05 — Edit, Deactivate & Delete an Invitation

## 1. Summary

The lifecycle end of an invitation: renaming it, retitling the household, changing its slug or
notes, switching it off, and removing it. Two rules matter more than the rest. **Deactivating**
(`isActive: false`) makes the public page unresolvable — the household's link stops working
immediately for everyone who holds it, without the record being lost. **Deleting** removes the
invitation but _unassigns_ its guests rather than deleting them: the people return to the
un-invited pool and can be regrouped into another household. Deleting an invitation destroys the
grouping, not the guest list.

This is workflow **WF-05-05 — Edit, deactivate or delete an invitation**.

## 2. Actors & Permissions

| Actor                | Access        | Notes                                                                              |
| -------------------- | ------------- | ---------------------------------------------------------------------------------- |
| Owner                | Full          |                                                                                    |
| Co-owner (`planner`) | Full          |                                                                                    |
| Editor               | Full          | Including delete — invitation deletion is _not_ owner-gated, unlike event deletion |
| Viewer               | None          |                                                                                    |
| Public guest         | Affected only | Loses access the moment the invitation is deactivated or deleted                   |

Gate on both mutations: `requireEventEditor(ctx, invitation.eventId)`
(`convex/invitations.ts:353`, `:452`).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-05-F05-01** — As an Editor, I want to correct a household's title after creating it so that
  the invitation reads correctly.
- **US-05-F05-02** — As an Editor, I want to keep private notes on an invitation so that I remember
  context guests never see.
- **US-05-F05-03** — As a host, I want to switch an invitation off so that a link I shared by
  mistake stops working without me losing the household.
- **US-05-F05-04** — As an Editor, I want to delete a household I created in error so that the list
  stays clean.
- **US-05-F05-05** — As an Editor, I want the guests of a deleted invitation to survive so that I
  can regroup them instead of re-entering them.

## 4. Entry Points

| Entry point                            | Route / control                                                                             | Actor   |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------- |
| Pencil (edit) button                   | `/dashboard/[eventSlug]/invitations` (`src/components/invitations/invitation-list.tsx:182`) | Editor+ |
| Trash (delete) button → confirm dialog | Same route (`src/components/invitations/invitation-list.tsx:189`)                           | Editor+ |
| Status badge (read-only)               | Same route (`src/components/invitations/invitation-list.tsx:152`)                           | Editor+ |

There is **no UI control that writes `isActive`** — see TODO-05-05. The status badge only displays
it.

## 5. UX Flow

### Happy path — edit

1. The Editor presses the pencil; `InvitationForm` opens in `mode="edit"` with Title, Slug and
   Notes seeded from the row (`src/components/invitations/invitation-form.tsx:183`).
2. They change the fields and press "Save Changes" → `updateInvitation.run({id, title, slug,
notes, …})` (`invitation-form.tsx:230`).
3. The server re-slugifies and re-uniquifies the slug when one is supplied
   (`convex/invitations.ts:358`), patches the row (`convex/invitations.ts:367`), and logs an
   `invitation` / `update` entry (`convex/invitations.ts:437`).
4. Toast `"Invitation updated"`; the dialog closes.

Composition (guests and special invitations) travels on the same submit but obeys the
[Composition Lock](./F02-invitation-composition-and-lock.md); the scalar fields never do.

### Happy path — delete

1. The Editor presses the trash icon; an `AlertDialog` opens
   (`src/components/invitations/invitation-list.tsx:219`).
2. They confirm → `deleteInvitation.run({id})` (`invitation-list.tsx:80`).
3. The server, in one transaction (`convex/invitations.ts:447`–`:483`):
   - reads every guest with `invitationId === id` via `by_invitationId` (`.take(500)`) and patches
     each to `invitationId: undefined` — **guests are unassigned, not deleted**
     (`convex/invitations.ts:461`);
   - deletes every `invitationSpecialEventAccess` row for the invitation (`.take(100)`)
     (`convex/invitations.ts:470`);
   - deletes the invitation row (`convex/invitations.ts:474`);
   - logs an `invitation` / `delete` entry naming the title (`convex/invitations.ts:475`).
4. Toast `"Invitation deleted"`; the row disappears.

### Deactivation

`isActive` is part of `updateInvitation`'s validator (`convex/invitations.ts:342`) and is patched
through the generic `...rest` spread (`convex/invitations.ts:367`), so the capability exists on the
server. No component sends it: `InvitationForm` submits only `title`, `slug`, `notes` and the
optional composition arrays (`invitation-form.tsx:230`–`:242`), and `invitationSchema` has no
`isActive` field (`src/lib/validations/invitation.ts:3`). The list renders the state as a badge —
`"Active"` in green or `"Inactive"` in zinc (`invitation-list.tsx:160`) — but offers no control to
change it. Today the flag is reachable only through the Convex API.

Its effect is immediate and total: `resolvePublicInvitation` returns `null` for a non-active
invitation (`convex/lib/public.ts:61`), so both `getPublicInvitation` and
`getPublicInvitationByHost` return `null` and the public route renders the branded "Invitation Not
Found" screen. Guests who already hold the link lose access with no explanation and no way back
other than an Editor reactivating it.

### Alternate & edge paths

- **A1** — Editing only the title: the slug field still submits its unchanged value, and
  `generateUniqueInvitationSlug` excludes the invitation itself, so no `-2` suffix appears
  (`convex/lib/slug.ts:78`).
- **A2** — A deleted invitation's guests keep their `rsvpStatus`, menu, drink, table and +1 links;
  only `invitationId` is cleared. A materialized +1 is likewise merely unassigned — nothing in
  `deleteInvitation` calls `deletePlusOneCascade`, so orphaned +1 records survive with their
  `plusOneOfGuestId` intact.
- **A3** — Deleting an invitation whose guests have already answered: permitted. The Composition
  Lock guards `updateInvitation` only (`convex/invitations.ts:381`); `deleteInvitation` has no such
  check.
- **A4** — A deleted invitation's `guestMessages` rows (host messages left from the declined
  layout, [EP-13](../13-host-inbox/)) are **not** cleaned up — `deleteInvitation` touches only
  guests, access rows and the invitation itself (`convex/invitations.ts:456`–`:474`).
- **E1** — The invitation was already deleted in another tab: `ConvexError("Invitation not found")`
  (`convex/invitations.ts:451`), surfaced as the generic `"Failed to delete invitation"` toast.
- **E2** — Any lock rejection during a combined edit: see [F02](./F02-invitation-composition-and-lock.md)
  E1 — the scalar patch is rolled back with it.

## 6. States

| State             | Behavior                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Page-level skeletons only (`src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:23`)                               |
| Empty             | The whole list is replaced by the `EmptyState` once the last invitation is deleted (`.../page.tsx:46`)                        |
| Error             | `"Failed to update invitation"` / `"Failed to delete invitation"` toasts (`invitation-form.tsx:79`, `invitation-list.tsx:71`) |
| Success           | `"Invitation updated"` / `"Invitation deleted"`; the reactive list re-renders                                                 |
| Disabled / locked | Composition checklists disable under the lock; Title, Slug, Notes, delete and the Sent flag never do                          |
| Mobile            | Actions are a right-aligned icon cluster; the confirm dialog is a centered `AlertDialog`                                      |

## 7. UI Specification

### Screens & components

| Element             | Component                        | Path                                                 |
| ------------------- | -------------------------------- | ---------------------------------------------------- |
| List row + actions  | `InvitationList`                 | `src/components/invitations/invitation-list.tsx:59`  |
| Status badge        | `Badge`                          | `src/components/invitations/invitation-list.tsx:152` |
| Edit dialog         | `InvitationForm` (`mode="edit"`) | `src/components/invitations/invitation-form.tsx:64`  |
| Delete confirmation | `AlertDialog`                    | `src/components/invitations/invitation-list.tsx:219` |

### Fields & validation

| Field      | Type     | Required | Rule                                                     | Message                                                            |
| ---------- | -------- | -------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Title      | text     | Yes      | `min(2)` (`src/lib/validations/invitation.ts:4`)         | `"Title must be at least 2 characters"`                            |
| Slug       | text     | Yes      | `/^[a-z0-9-]+$/` (`src/lib/validations/invitation.ts:5`) | `"Slug must only contain lowercase letters, numbers, and hyphens"` |
| Notes      | textarea | No       | none                                                     | —                                                                  |
| `isActive` | boolean  | —        | Accepted by the server; **no UI field exists**           | —                                                                  |

### Copy deck

| Key                 | Copy                                                                   | Source                                             |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Dialog title        | `"Edit Invitation"`                                                    | `invitation-form.tsx:252`                          |
| Submit              | `"Save Changes"` / `"Saving..."`                                       | `invitation-form.tsx:472`, `:469`                  |
| Status badge        | `"Active"` / `"Inactive"`                                              | `invitation-list.tsx:160`                          |
| Delete dialog title | `"Delete Invitation"`                                                  | `invitation-list.tsx:225`                          |
| Delete dialog body  | `"This will permanently delete this invitation and cannot be undone."` | `invitation-list.tsx:227`                          |
| Delete confirm      | `"Delete"`                                                             | `invitation-list.tsx:236`                          |
| Delete cancel       | `"Cancel"`                                                             | `invitation-list.tsx:231`                          |
| Success toasts      | `"Invitation updated"`, `"Invitation deleted"`                         | `invitation-form.tsx:78`, `invitation-list.tsx:70` |
| Error toasts        | `"Failed to update invitation"`, `"Failed to delete invitation"`       | `invitation-form.tsx:79`, `invitation-list.tsx:71` |

## 8. Data Model

| Table                          | Fields                               | Read / Write                  | Index                                           |
| ------------------------------ | ------------------------------------ | ----------------------------- | ----------------------------------------------- |
| `invitations`                  | `title`, `slug`, `notes`, `isActive` | Read + Write (patch) / Delete | read by id                                      |
| `guests`                       | `invitationId`                       | Write (patch to `undefined`)  | `by_invitationId` (`convex/invitations.ts:458`) |
| `invitationSpecialEventAccess` | all                                  | Delete                        | `by_invitationId` (`convex/invitations.ts:468`) |
| `activityLogs`                 | —                                    | Write (insert)                | —                                               |

**Delete cascade — the non-obvious rule.** `deleteInvitation` deletes exactly two kinds of rows:
the invitation and its special-invitation access rows. Guests are **preserved and unassigned**
(`convex/invitations.ts:461`), which is what returns them to the un-invited pool queried by
`guests.listUnassignedByEvent`. This is the deliberate inverse of event deletion, which cascades
across every event-scoped table ([EP-02](../02-event-setup/)); the glossary records the contrast
under [Cascade delete](../../glossary.md). Not cleaned up: the guests' `guestSpecialEventRsvps`
rows (they now point at special invitations the guest can no longer reach) and any `guestMessages`
rows referencing the deleted `invitationId`.

## 9. Backend Contract

| Function                           | Type     | Args                                                                  | Returns        | Guard                                         | Caps                                          |
| ---------------------------------- | -------- | --------------------------------------------------------------------- | -------------- | --------------------------------------------- | --------------------------------------------- |
| `api.invitations.updateInvitation` | mutation | `{id, title?, slug?, isActive?, notes?, guestIds?, specialEventIds?}` | `void`         | `requireEventEditor(ctx, invitation.eventId)` | `.take(500)` / `.take(100)`                   |
| `api.invitations.deleteInvitation` | mutation | `{id}`                                                                | `void`         | `requireEventEditor(ctx, invitation.eventId)` | `.take(500)` guests, `.take(100)` access rows |
| `api.invitations.getById`          | query    | `{id}`                                                                | invitation doc | `requireEventEditor(ctx, invitation.eventId)` | —                                             |

## 10. Business Rules

- **BR-05-F05-01** `[AS-BUILT]` — Editing and deleting an invitation both require at least the
  `editor` role (`convex/invitations.ts:353`, `:452`).
- **BR-05-F05-02** `[AS-BUILT]` — `updateInvitation` patches whichever of `title`, `isActive` and
  `notes` are supplied, via the `...rest` spread (`convex/invitations.ts:355`, `:367`).
- **BR-05-F05-03** `[AS-BUILT]` — A supplied slug is re-slugified and re-uniquified within the
  event, excluding the invitation itself (`convex/invitations.ts:358`).
- **BR-05-F05-04** `[AS-BUILT]` — Every completed `updateInvitation` writes one `activityLogs`
  update row, whose `entityName` is the new title when supplied, otherwise the stored one
  (`convex/invitations.ts:437`–`:442`).
- **BR-05-F05-05** `[AS-BUILT]` — An invitation with `isActive: false` does not resolve publicly on
  either domain shape; `resolvePublicInvitation` returns `null` (`convex/lib/public.ts:61`).
- **BR-05-F05-06** `[AS-BUILT]` — Deactivation preserves the invitation and all its relationships;
  it is reversible by setting `isActive: true` (`convex/invitations.ts:342`).
- **BR-05-F05-07** `[AS-BUILT]` — Deleting an invitation clears `invitationId` on every guest linked
  to it; no guest row is deleted (`convex/invitations.ts:461`).
- **BR-05-F05-08** `[AS-BUILT]` — Deleting an invitation deletes all of its
  `invitationSpecialEventAccess` rows (`convex/invitations.ts:470`).
- **BR-05-F05-09** `[AS-BUILT]` — Deleting an invitation writes one `activityLogs` delete row naming
  the invitation's title (`convex/invitations.ts:475`).
- **BR-05-F05-10** `[AS-BUILT]` — Deletion is not blocked by the Composition Lock; an answered
  invitation can be deleted (`convex/invitations.ts:447`–`:483` contains no RSVP check).
- **BR-05-F05-11** `[AS-BUILT]` — Deletion is confirmed behind an `AlertDialog` before the mutation
  runs (`src/components/invitations/invitation-list.tsx:219`).
- **BR-05-F05-12** `[AS-BUILT]` — The list displays `isActive` as an `"Active"`/`"Inactive"` badge
  and provides no control to change it (`src/components/invitations/invitation-list.tsx:152`;
  `isActive` is absent from the form payload at `invitation-form.tsx:230`).

## 11. Acceptance Criteria

- **AC-05-F05-01** — **Given** an invitation titled `"Smith Family"` **When** an Editor renames it
  to `"The Smith Family"` and saves **Then** the row shows the new title and the slug is unchanged.
- **AC-05-F05-02** — **Given** an invitation **When** only its title is edited and saved **Then**
  the stored slug does not gain a `-2` suffix.
- **AC-05-F05-03** — **Given** notes are entered **When** the invitation is saved **Then** the
  notes persist and never appear in the public payload (`convex/invitations.ts:226`).
- **AC-05-F05-04** — **Given** an invitation with `isActive: false` **When** its public URL is
  opened on the primary domain **Then** `getPublicInvitation` returns `null` and the "Invitation
  Not Found" screen renders.
- **AC-05-F05-05** — **Given** the same invitation **When** its custom-domain URL is opened **Then**
  `getPublicInvitationByHost` also returns `null`.
- **AC-05-F05-06** — **Given** a deactivated invitation **When** `isActive` is set back to `true`
  **Then** the original URL resolves again unchanged.
- **AC-05-F05-07** — **Given** an invitation with three linked guests **When** it is deleted
  **Then** all three guests still exist, each with `invitationId === undefined`, and each appears in
  `listUnassignedByEvent`.
- **AC-05-F05-08** — **Given** the same deletion **When** the guests are inspected **Then** their
  `rsvpStatus`, `menuOptionId`, `drinkOptionId` and `tableId` are unchanged.
- **AC-05-F05-09** — **Given** an invitation with special-invitation access **When** it is deleted
  **Then** no `invitationSpecialEventAccess` row referencing it remains.
- **AC-05-F05-10** — **Given** an invitation whose guests have all answered **When** an Editor
  deletes it **Then** the deletion succeeds.
- **AC-05-F05-11** — **Given** the delete button is pressed **When** the confirmation dialog is
  cancelled **Then** no mutation runs and the invitation still exists.
- **AC-05-F05-12** — **Given** any invitation is deleted **When** the Activity page is opened
  **Then** a `delete` entry for entity `invitation` naming its title is present.
- **AC-05-F05-13** — **Given** an Editor viewing the list **When** they look for a way to deactivate
  an invitation **Then** none exists — only the read-only status badge (TODO-05-05).

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                       |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------- |
| TC-05-F05-01 | integration | `updateInvitation` patches title/notes/`isActive` independently                                |
| TC-05-F05-02 | integration | Re-saving an unchanged slug does not suffix it                                                 |
| TC-05-F05-03 | integration | `resolvePublicInvitation` returns `null` for `isActive: false`                                 |
| TC-05-F05-04 | integration | `deleteInvitation` unassigns guests and preserves every other guest field                      |
| TC-05-F05-05 | integration | `deleteInvitation` removes all access rows and the invitation                                  |
| TC-05-F05-06 | integration | `deleteInvitation` succeeds on an invitation with answered guests                              |
| TC-05-F05-07 | integration | `deleteInvitation` writes exactly one delete `activityLogs` row                                |
| TC-05-F05-08 | integration | A Viewer calling `deleteInvitation` is rejected                                                |
| TC-05-F05-09 | e2e         | Delete an invitation and confirm its guests reappear in the un-invited pool on the guests page |
| TC-05-F05-10 | e2e         | Deactivate via the API, then open the public URL and see the not-found screen                  |

### Manual QA checklist

- [ ] Rename an invitation and confirm the public URL still works.
- [ ] Delete an invitation and confirm the guest count on the Guests page is unchanged.
- [ ] Confirm the deleted invitation's guests are selectable when composing a new invitation.
- [ ] Confirm the delete confirmation copy does not mention what happens to guests (TODO-05-06).
- [ ] Confirm there is no toggle, switch or menu item anywhere that sets `isActive` (TODO-05-05).

## 13. Non-Functional

| Concern          | Specification                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Deletion unassigns at most 500 guests and removes at most 100 access rows in one transaction                                                  |
| Performance      | Deletion issues one patch per guest and one delete per access row, sequentially                                                               |
| Security & authz | `requireEventEditor` on both mutations; deletion is not owner-gated, unlike event deletion                                                    |
| Accessibility    | Icon-only edit and delete buttons carry no `aria-label` (`invitation-list.tsx:182`, `:189`); the delete flow is a focus-trapped `AlertDialog` |
| i18n             | Dashboard copy is English only                                                                                                                |
| Analytics        | Update and delete are activity-logged; deactivation, being an update, is logged as a generic update with no indication of what changed        |

## 14. TODOs & Open Questions

- **TODO-05-05** `[P1]` `[ADD]` — Expose a control for `isActive`.
  - **Rationale:** The server accepts `isActive` (`convex/invitations.ts:342`) and the list renders
    an `"Active"`/`"Inactive"` badge (`src/components/invitations/invitation-list.tsx:152`), but no
    component ever writes the field — it is absent from the form payload
    (`invitation-form.tsx:230`–`:242`) and from `invitationSchema`
    (`src/lib/validations/invitation.ts:3`). Switching a link off is the only non-destructive way to
    revoke access to a shared invitation, and today it requires an API call. The badge advertises a
    state the host cannot reach.
  - **Proposed rule:** The edit dialog carries an "Active" switch that sends `isActive` through
    `updateInvitation`, defaulting to on.
- **TODO-05-08** `[P2]` `[ADD]` — Warn that deactivating revokes guest access.
  - **Rationale:** Deactivation silently breaks every shared link
    (`convex/lib/public.ts:61`). No copy anywhere in `src/components/invitations/` explains this —
    the only destructive-action copy is the delete dialog's
    `"This will permanently delete this invitation and cannot be undone."`
    (`invitation-list.tsx:227`), which is about deletion. Depends on TODO-05-05, since there is no
    deactivation control to attach a warning to yet.
  - **Proposed rule:** Turning the Active switch off opens a confirmation stating that guests
    holding the link will see "Invitation Not Found" until it is switched back on.
- **TODO-05-06** `[P2]` `[CHANGE]` — Say what deletion does to the guests.
  - **Rationale:** The confirmation reads `"This will permanently delete this invitation and cannot
be undone."` (`src/components/invitations/invitation-list.tsx:227`). It omits the two things a
    host actually needs to know: their guests are **kept** and returned to the un-invited pool
    (`convex/invitations.ts:461`), and the invitation's special-invitation access is removed
    (`convex/invitations.ts:470`). "Permanently delete… cannot be undone" reads as though the
    guests go too, which discourages a safe, routine regrouping action.
  - **Proposed rule:** The dialog states that the invitation and its special-invitation access are
    removed, that its N guests are kept and returned to the un-invited list, and that the public
    link stops working.

### Open questions

- **Q1** — Should invitation deletion be owner/co-owner-gated? Event deletion is owner-only, while
  an Editor can delete an answered invitation and destroy its grouping (BR-05-F05-10).
- **Q2** — Should `deleteInvitation` clean up the freed guests' `guestSpecialEventRsvps` rows and
  the `guestMessages` rows pointing at the deleted invitation, both of which currently survive
  (A2, A4)?
- **Q3** — Should a materialized +1 be deleted rather than unassigned when its invitation is
  deleted? A +1 exists only as a companion within a household, so an un-invited +1 is a state the
  rest of the product does not model.

## 15. Traceability

| Concern                     | Source                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| Route                       | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14` |
| Edit button                 | `src/components/invitations/invitation-list.tsx:182`                |
| Delete button               | `src/components/invitations/invitation-list.tsx:189`                |
| Status badge                | `src/components/invitations/invitation-list.tsx:152`                |
| Delete confirmation         | `src/components/invitations/invitation-list.tsx:219`                |
| Delete handler              | `src/components/invitations/invitation-list.tsx:78`                 |
| Edit dialog seeding         | `src/components/invitations/invitation-form.tsx:183`                |
| Edit submit payload         | `src/components/invitations/invitation-form.tsx:230`                |
| `updateInvitation`          | `convex/invitations.ts:338`                                         |
| Scalar patch                | `convex/invitations.ts:367`                                         |
| Update activity log         | `convex/invitations.ts:437`                                         |
| `deleteInvitation`          | `convex/invitations.ts:447`                                         |
| Guest unassign (not delete) | `convex/invitations.ts:461`                                         |
| Access-row cleanup          | `convex/invitations.ts:470`                                         |
| Invitation row delete       | `convex/invitations.ts:474`                                         |
| Delete activity log         | `convex/invitations.ts:475`                                         |
| `isActive` validator        | `convex/invitations.ts:342`                                         |
| Public active-only gate     | `convex/lib/public.ts:61`                                           |
| Slug re-uniquify on update  | `convex/lib/slug.ts:78`                                             |
| Validation                  | `src/lib/validations/invitation.ts:3`                               |
| Schema                      | `convex/schema.ts:97`                                               |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
