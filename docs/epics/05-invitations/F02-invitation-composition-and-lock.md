---
id: EP-05-F02
title: Invitation Composition & the Composition Lock
epic: EP-05 Invitations
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-05-F01, EP-04-F01, EP-04-F04, EP-06-F02]
---

# EP-05-F02 — Invitation Composition & the Composition Lock

## 1. Summary

An invitation's **composition** is two things: which guests belong to the household, and which
special invitations that household may see. Both are editable from the same dialog that edits the
title — but only for as long as the invitation has not yet been answered. The moment any guest
linked to the invitation stops being `pending`, composition freezes: the server rejects the
change and the dialog disables the two checklists behind an amber notice. This is the
[Composition Lock](../../glossary.md), and it exists to protect answers already given — moving a
guest out of an invitation after they replied would orphan their RSVP, their special-invitation
responses and their +1.

This is workflow **WF-05-02 — Adjust an invitation's guest composition**.

## 2. Actors & Permissions

| Actor                | Access                    | Notes                                                                                    |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Owner                | Full, subject to the lock | The lock is **not** a permission — no role can bypass it                                 |
| Co-owner (`planner`) | Full, subject to the lock |                                                                                          |
| Editor               | Full, subject to the lock |                                                                                          |
| Viewer               | None                      | Blocked by the default `minRole: "editor"`                                               |
| Public guest         | None                      | A guest changing their own RSVP is what _triggers_ the lock; they never edit composition |

Gate: `requireEventEditor(ctx, invitation.eventId)` (`convex/invitations.ts:353`). Superadmins
bypass the role gate but **not** the lock — the lock is a data rule evaluated after the guard.

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-05-F02-01** — As an Editor, I want to add a forgotten family member to an invitation before
  it is answered so that the household is complete when the link goes out.
- **US-05-F02-02** — As an Editor, I want to remove a guest from an invitation and return them to
  the un-invited pool so that I can regroup households while planning.
- **US-05-F02-03** — As an Editor, I want to change which special invitations a household sees so
  that the after-party list stays correct.
- **US-05-F02-04** — As a host, I want composition to freeze once someone has answered so that a
  later edit cannot silently discard a real response.
- **US-05-F02-05** — As an Editor, I want to see _why_ the checklists are disabled so that I do not
  think the app is broken.

## 4. Entry Points

| Entry point                                                  | Route / control                                                                             | Actor   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------- |
| Pencil (edit) button on an invitation row                    | `/dashboard/[eventSlug]/invitations` (`src/components/invitations/invitation-list.tsx:182`) | Editor+ |
| Guests + Special invitations checklists in the create dialog | Same route, `mode="create"` — see [F01](./F01-create-invitation.md)                         | Editor+ |

The edit dialog is rendered once per list and fed the **freshest** row by id
(`invitations.find((i) => i._id === editTarget._id) ?? editTarget`,
`src/components/invitations/invitation-list.tsx:209`), so the lock state stays live while open.

## 5. UX Flow

### Happy path (unlocked)

1. The Editor presses the pencil on a row whose guests are all `pending` →
   `InvitationForm` opens in `mode="edit"`.
2. The dialog seeds its selections from the invitation: `selectedGuestIds` = the linked guests
   **excluding +1 records**, `selectedSpecialIds` = the invitation's accessible special invitations
   (`src/components/invitations/invitation-form.tsx:141`, `:146`).
3. The guest checklist shows the union of the invitation's directly-linked (non-+1) guests and the
   event's un-invited pool (`invitation-form.tsx:112`), so guests can be both removed and added in
   one pass.
4. The Editor ticks and unticks, then presses "Save Changes" → `updateInvitation.run({id, title,
slug, notes, guestIds, specialEventIds})` (`invitation-form.tsx:230`).
5. The server patches the scalar fields, re-reads the linked guests, confirms all are `pending`,
   then reconciles both sets and logs an `invitation` / `update` activity entry
   (`convex/invitations.ts:367`–`:443`).
6. Toast `"Invitation updated"`; the dialog closes.

### Locked path

1. The Editor opens an invitation where at least one linked guest is not `pending`.
2. `composeLocked` is `true` (`invitation-form.tsx:107`). An amber notice appears above the
   checklists and every checkbox is `disabled` with `cursor-not-allowed opacity-60`
   (`invitation-form.tsx:358`, `:409`, `:444`).
3. Title, Slug, Notes and the Sent switch remain editable.
4. On save the client **omits** `guestIds` and `specialEventIds` entirely
   (`invitation-form.tsx:236`), so the server's lock branch is never entered and the scalar edit
   succeeds.

### Alternate & edge paths

- **A1** — Only `specialEventIds` is supplied (no guest change): the lock still applies, because
  the guard runs when **either** array is present (`convex/invitations.ts:375`).
- **A2** — A guest is removed who hosts a materialized +1: the +1 is deleted first via
  `findPlusOne` + `deletePlusOneCascade`, then the host is unassigned
  (`convex/invitations.ts:394`). The +1's `guestSpecialEventRsvps` rows go with it
  (`convex/lib/guests.ts`).
- **A3** — A +1 record is in `linked` but never in `guestIds`: the removal loop skips every
  `isPlusOne` guest (`convex/invitations.ts:392`), so a +1 is never unassigned by reconciliation —
  only by its host's removal.
- **A4** — A `guestId` names a guest already linked to a _different_ invitation: silently skipped
  (`convex/invitations.ts:402`), same rule as create.
- **A5** — Special-invitation access already granted and still selected: left untouched — the
  reconcile inserts only ids not already present (`convex/invitations.ts:424`).
- **A6** — Access rows for special invitations of another event: never inserted
  (`convex/invitations.ts:426`).
- **E1** — A non-pending guest exists and `guestIds`/`specialEventIds` are sent anyway (API caller,
  or a stale client whose invitation was answered while the dialog was open): the server throws
  `ConvexError("Cannot edit guests or special invitations after a guest has responded")`
  (`convex/invitations.ts:382`). The mutation is transactional, so the title/slug/notes patch
  applied moments earlier at `convex/invitations.ts:367` is rolled back with it.
- **E2** — Same as E1 from the dialog: the Editor sees only `"Failed to update invitation"`,
  because `useToastMutation` discards the `ConvexError` message. See DEF-05-02.

## 6. States

| State             | Behavior                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The special-invitation checklist shows `"Loading…"` until `listByEvent` resolves (`invitation-form.tsx:371`); the guest checklist renders whatever is available                                           |
| Empty             | No candidate guests → `"No guests available. Add guests to this event first."` (`invitation-form.tsx:423`). No special invitations → the dashed empty card with a create link (`invitation-form.tsx:373`) |
| Error             | Generic `"Failed to update invitation"` toast; the dialog stays open with selections intact                                                                                                               |
| Success           | `"Invitation updated"` toast; dialog closes                                                                                                                                                               |
| Disabled / locked | Amber `Lock`-icon notice plus both checklists disabled and dimmed (`invitation-form.tsx:358`)                                                                                                             |
| Mobile            | The guest checklist scrolls at `max-h-48` inside a `max-h-[90vh]` dialog (`invitation-form.tsx:431`, `:249`)                                                                                              |

## 7. UI Specification

### Screens & components

| Element           | Component                        | Path                                                 |
| ----------------- | -------------------------------- | ---------------------------------------------------- |
| Row edit button   | `InvitationList`                 | `src/components/invitations/invitation-list.tsx:182` |
| Edit dialog       | `InvitationForm` (`mode="edit"`) | `src/components/invitations/invitation-form.tsx:64`  |
| Lock notice       | inline `div` + `Lock` icon       | `src/components/invitations/invitation-form.tsx:358` |
| Guest checklist   | `Checkbox` rows                  | `src/components/invitations/invitation-form.tsx:432` |
| Special checklist | `Checkbox` rows                  | `src/components/invitations/invitation-form.tsx:397` |

### Fields & validation

| Field                | Type                                       | Required | Rule                                                                        | Message                                                                                                           |
| -------------------- | ------------------------------------------ | -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Guests               | checkbox list                              | No       | Disabled while `composeLocked`; server requires all linked guests `pending` | `"Cannot edit guests or special invitations after a guest has responded"` (server only — not surfaced, DEF-05-02) |
| Special invitations  | checkbox list                              | No       | Same lock; ids must belong to the event                                     | Same                                                                                                              |
| Title / Slug / Notes | see [F05](./F05-edit-deactivate-delete.md) | —        | Never locked                                                                | —                                                                                                                 |

### Copy deck

| Key              | Copy                                                                                 | Source                      |
| ---------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| Lock notice      | `"Guests and special invitations are locked because a guest has already responded."` | `invitation-form.tsx:362`   |
| Guests hint      | `"Select the guests included in this invitation."`                                   | `invitation-form.tsx:429`   |
| Special hint     | `"Choose which special invitations this group can see."`                             | `invitation-form.tsx:394`   |
| No candidates    | `"No guests available. Add guests to this event first."`                             | `invitation-form.tsx:423`   |
| Server rejection | `"Cannot edit guests or special invitations after a guest has responded"`            | `convex/invitations.ts:383` |
| Success toast    | `"Invitation updated"`                                                               | `invitation-form.tsx:78`    |
| Error toast      | `"Failed to update invitation"`                                                      | `invitation-form.tsx:79`    |

## 8. Data Model

| Table                          | Fields                                                        | Read / Write                        | Index                                                                               |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `invitations`                  | `title`, `slug`, `notes`, `isActive`                          | Write (patch)                       | read by id                                                                          |
| `guests`                       | `invitationId`, `rsvpStatus`, `isPlusOne`, `plusOneOfGuestId` | Read + Write (patch `invitationId`) | `by_invitationId` (`convex/invitations.ts:378`), `by_plusOneOf` (via `findPlusOne`) |
| `invitationSpecialEventAccess` | all                                                           | Read + Write (insert/delete)        | `by_invitationId` (`convex/invitations.ts:415`)                                     |
| `guestSpecialEventRsvps`       | all                                                           | Delete (cascade with a removed +1)  | `by_guestId`                                                                        |
| `activityLogs`                 | —                                                             | Write (insert)                      | —                                                                                   |

**Cascade.** Removing a directly-linked guest from an invitation runs `findPlusOne` and, when a +1
exists, `deletePlusOneCascade` — deleting the +1 guest row and its special-invitation RSVP rows —
before clearing the host's `invitationId` (`convex/invitations.ts:394`–`:396`). The host guest
itself is **never deleted**; it returns to the un-invited pool.

---

### The Composition Lock — the server rule

Stated precisely, as implemented at `convex/invitations.ts:375`–`:385`:

1. The lock is evaluated **only** when `updateInvitation` receives `guestIds !== undefined` **or**
   `specialEventIds !== undefined`. An update carrying only title/slug/notes/`isActive` never
   touches it.
2. The evaluated set is `linked` = **every** `guests` row whose `invitationId` equals this
   invitation, read via `by_invitationId` with `.take(500)` (`convex/invitations.ts:376`).
3. The predicate is `linked.every((g) => g.rsvpStatus === "pending")`. If it is false the mutation
   throws and the entire transaction — including the scalar patch already issued at
   `convex/invitations.ts:367` — is rolled back.
4. An invitation with **zero** linked guests passes vacuously (`[].every(...)` is `true`), so a
   brand-new or emptied invitation is always editable.
5. `isActive: false` does **not** unlock anything. Deactivating an answered invitation and editing
   its composition still throws.

**What the predicate means for +1 records.** `linked` is not filtered by `isPlusOne`, so a
materialized +1 is part of the lock evaluation. In practice this never fires independently of its
host:

| How the +1 was created         | Its `rsvpStatus`                       | Its host's status                                                                         | Net effect on the lock       |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| Dashboard `guests.addPlusOne`  | `"pending"` (`convex/guests.ts:380`)   | any                                                                                       | Does not lock by itself      |
| Public RSVP `submitPublicRsvp` | `"attending"` (`convex/guests.ts:622`) | `"attending"` (`convex/guests.ts:611`, the +1 is only materialized for an attending host) | Locked already — by the host |

So the rule reads correctly as _"every guest linked to this invitation, +1 records included, must
still be `pending`"_, and a +1 can only be the _sole_ non-pending row if an Editor manually
overrides a +1's RSVP in the guest dialog while its host stays pending.

**What reconciliation does to +1 records.** `guestIds` is the desired set of **directly-linked,
non-+1** guests:

- Removal loop: `if (g.isPlusOne) continue;` (`convex/invitations.ts:392`) — a +1 is never
  unassigned by reconciliation, and its absence from `guestIds` is not treated as a removal
  instruction. The client agrees, seeding `selectedGuestIds` from non-+1 guests only
  (`invitation-form.tsx:141`).
- A +1 disappears only as collateral of its host's removal (A2 above).
- Addition loop: only guests with **no** `invitationId` are added (`convex/invitations.ts:402`), so
  a +1 (which always carries its host's `invitationId`) can never be added to another invitation.

---

### The Composition Lock — the client mirror

The dialog computes its own, **independent** predicate at
`src/components/invitations/invitation-form.tsx:104`–`:108`:

```
const currentGuests = invitation?.guests ?? [];
const composeLocked = mode === "edit" && currentGuests.some((g) => g.rsvpStatus !== "pending");
```

Notes on the mirror:

- Its input is `invitation.guests` from `getInvitationsPageData`, which includes +1 records
  (`convex/invitations.ts:71`–`:80` pushes every guest with an `invitationId`). The client set is
  therefore the same set the server evaluates, and `.some(≠pending)` is the exact negation of the
  server's `.every(=pending)`.
- It is `false` in create mode by construction, so create-mode composition is always editable.
- Its only effects are cosmetic-plus-omission: it disables the checkboxes and, on submit, **omits**
  `guestIds`/`specialEventIds` from the payload (`invitation-form.tsx:236`). It never blocks the
  save itself.
- The list feeds the dialog the live row by id (`invitation-list.tsx:209`), so a guest answering
  while the dialog is open flips `composeLocked` to `true` in place.
- The mirror is convenience only. The server rule at `convex/invitations.ts:381` is the source of
  truth, and it is the one that must be tested.

## 9. Backend Contract

| Function                                 | Type     | Args                                                                  | Returns                                           | Guard                                         | Caps                                                                                  |
| ---------------------------------------- | -------- | --------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `api.invitations.updateInvitation`       | mutation | `{id, title?, slug?, isActive?, notes?, guestIds?, specialEventIds?}` | `void`                                            | `requireEventEditor(ctx, invitation.eventId)` | `.take(500)` linked guests, `.take(100)` access rows. **No ≤20 cap** — see TODO-05-02 |
| `api.invitations.setSpecialEventAccess`  | mutation | `{invitationId, specialEventId, hasAccess}`                           | `void`                                            | `requireEventEditor(ctx, invitation.eventId)` | —                                                                                     |
| `api.invitations.getInvitationsPageData` | query    | `{eventId}`                                                           | rows + `guests[]` (incl. +1s) + `specialEvents[]` | `requireEventEditor`                          | see [F01](./F01-create-invitation.md)                                                 |
| `api.guests.listUnassignedByEvent`       | query    | `{eventId}`                                                           | un-invited guests                                 | `requireEventEditor` (EP-04)                  | —                                                                                     |

`setSpecialEventAccess` is the single-toggle sibling used by the Special Invitations page
([EP-06](../06-special-invitations/)). It is **not** subject to the Composition Lock — it never
inspects guest RSVP status (`convex/invitations.ts:497`–`:532`).

## 10. Business Rules

- **BR-05-F02-01** `[AS-BUILT]` — `updateInvitation` reconciles composition only when `guestIds` or
  `specialEventIds` is present in the args (`convex/invitations.ts:375`).
- **BR-05-F02-02** `[AS-BUILT]` — Composition may be reconciled only while **every** guest linked
  to the invitation has `rsvpStatus === "pending"`; otherwise the mutation throws
  (`convex/invitations.ts:381`).
- **BR-05-F02-03** `[AS-BUILT]` — The lock's guest set includes materialized +1 records; it is not
  filtered by `isPlusOne` (`convex/invitations.ts:376`).
- **BR-05-F02-04** `[AS-BUILT]` — An invitation with no linked guests always passes the lock
  (vacuous `.every`, `convex/invitations.ts:381`).
- **BR-05-F02-05** `[AS-BUILT]` — Because the mutation is transactional, a lock rejection also
  discards the title/slug/notes/`isActive` patch issued earlier in the same call
  (`convex/invitations.ts:367` vs `:382`).
- **BR-05-F02-06** `[AS-BUILT]` — `guestIds` is interpreted as the desired set of directly-linked,
  non-+1 guests: linked non-+1 guests absent from it are unassigned
  (`invitationId` set to `undefined`) (`convex/invitations.ts:393`–`:397`).
- **BR-05-F02-07** `[AS-BUILT]` — Removing a host guest first deletes its +1 via
  `deletePlusOneCascade` (`convex/invitations.ts:394`).
- **BR-05-F02-08** `[AS-BUILT]` — A +1 record is never unassigned by reconciliation; the removal
  loop skips `isPlusOne` guests (`convex/invitations.ts:392`).
- **BR-05-F02-09** `[AS-BUILT]` — A guest id is added only when it exists, belongs to the same
  event, and has no `invitationId`; otherwise it is skipped silently
  (`convex/invitations.ts:402`).
- **BR-05-F02-10** `[AS-BUILT]` — `specialEventIds` is a full replacement: access rows not in the
  desired set are deleted (`convex/invitations.ts:420`) and missing ones are inserted
  (`convex/invitations.ts:423`).
- **BR-05-F02-11** `[AS-BUILT]` — Access is granted only for special events belonging to the same
  event (`convex/invitations.ts:426`).
- **BR-05-F02-12** `[AS-BUILT]` — Every `updateInvitation` call that reaches the end writes one
  `activityLogs` row with `action: "update"`, `entity: "invitation"`
  (`convex/invitations.ts:437`).
- **BR-05-F02-13** `[AS-BUILT]` — In the edit dialog, composition controls are disabled when any
  linked guest (including a +1) is not `pending` (`invitation-form.tsx:107`).
- **BR-05-F02-14** `[AS-BUILT]` — When the dialog is locked it omits `guestIds` and
  `specialEventIds` from the update payload, so scalar edits still save
  (`invitation-form.tsx:236`).
- **BR-05-F02-15** `[AS-BUILT]` — The edit dialog seeds its guest selection from non-+1 linked
  guests only (`invitation-form.tsx:141`).
- **BR-05-F02-16** `[AS-BUILT]` — `setSpecialEventAccess` toggles a single access row and is not
  subject to the Composition Lock (`convex/invitations.ts:497`).

## 11. Acceptance Criteria

- **AC-05-F02-01** — **Given** an invitation whose three linked guests are all `pending` **When**
  an Editor unticks one and saves **Then** that guest's `invitationId` is `undefined` and it
  reappears in `listUnassignedByEvent`.
- **AC-05-F02-02** — **Given** the same invitation **When** an un-invited guest is ticked and saved
  **Then** that guest's `invitationId` points at the invitation.
- **AC-05-F02-03** — **Given** an invitation with one guest whose `rsvpStatus` is `"attending"`
  **When** `updateInvitation` is called with any `guestIds` **Then** it throws
  `"Cannot edit guests or special invitations after a guest has responded"`.
- **AC-05-F02-04** — **Given** the same invitation **When** `updateInvitation` is called with a new
  `title` **and** a `guestIds` array **Then** it throws **and** the title is unchanged afterwards.
- **AC-05-F02-05** — **Given** the same invitation **When** `updateInvitation` is called with only
  a new `title` **Then** the title is updated and no error is raised.
- **AC-05-F02-06** — **Given** an invitation with one guest whose `rsvpStatus` is `"declined"`
  **When** `updateInvitation` is called with `specialEventIds` **Then** it throws — the lock is not
  limited to attending guests.
- **AC-05-F02-07** — **Given** an invitation with zero linked guests **When**
  `updateInvitation` is called with `guestIds: [someUnInvitedGuest]` **Then** it succeeds.
- **AC-05-F02-08** — **Given** a pending host guest that has a dashboard-created +1 (also pending)
  **When** the host is unticked and saved **Then** the +1 guest row is deleted, its
  `guestSpecialEventRsvps` rows are deleted, and the host is unassigned but still exists.
- **AC-05-F02-09** — **Given** a pending host with a pending +1 **When** the dialog is opened
  **Then** the +1 does not appear as a tickable candidate and the checklists are **not** locked.
- **AC-05-F02-10** — **Given** a linked guest is set to `"attending"` while the edit dialog is open
  **When** the list query updates **Then** the checklists become disabled and the amber notice
  reads `"Guests and special invitations are locked because a guest has already responded."`.
- **AC-05-F02-11** — **Given** a locked invitation **When** the Editor changes the title and presses
  "Save Changes" **Then** the save succeeds, because the client omits the composition arrays.
- **AC-05-F02-12** — **Given** an invitation with access to special invitations A and B **When**
  `specialEventIds: [B]` is saved on an all-pending invitation **Then** the A access row is deleted
  and the B row is left in place (not duplicated).
- **AC-05-F02-13** — **Given** an answered invitation **When** an Editor toggles its special-event
  access from the Special Invitations page via `setSpecialEventAccess` **Then** the toggle
  succeeds — that path is not locked.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                       |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TC-05-F02-01 | unit        | `composeLocked` is `false` in create mode, `false` when all linked guests are pending, `true` when any (including a +1) is not |
| TC-05-F02-02 | integration | `updateInvitation` with `guestIds` throws when one linked guest is `attending`, and when one is `declined`                     |
| TC-05-F02-03 | integration | The throw rolls back the title patch issued in the same call                                                                   |
| TC-05-F02-04 | integration | `updateInvitation` with only scalar fields succeeds on an answered invitation                                                  |
| TC-05-F02-05 | integration | Reconciliation unassigns dropped non-+1 guests and adds un-invited ones                                                        |
| TC-05-F02-06 | integration | Removing a host deletes its +1 and the +1's special RSVP rows                                                                  |
| TC-05-F02-07 | integration | A +1 omitted from `guestIds` is not unassigned                                                                                 |
| TC-05-F02-08 | integration | An empty invitation passes the lock vacuously                                                                                  |
| TC-05-F02-09 | integration | `specialEventIds` replaces the access set exactly, without duplicate inserts                                                   |
| TC-05-F02-10 | e2e         | Answering an invitation as a public guest disables the composition controls in an already-open edit dialog                     |

### Manual QA checklist

- [ ] Open an all-pending invitation: both checklists are interactive, no amber notice.
- [ ] Answer as a guest in another tab, then reload the dashboard: the amber notice appears.
- [ ] With the lock on, edit the title and save — it succeeds and the composition is untouched.
- [ ] Remove a host guest with a +1 and confirm the +1 disappears from the Guests page.
- [ ] Confirm a removed guest is _unassigned_, not deleted.
- [ ] Reproduce DEF-05-02: force the server rejection and observe the unhelpful toast.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | `.take(500)` linked guests, `.take(100)` access rows per invitation. No `guestIds` length cap on update (TODO-05-02)                                                     |
| Performance      | Reconciliation is sequential: one `ctx.db.get` per added guest and one `findPlusOne` per removed host (`convex/invitations.ts:392`–`:409`). Bounded by the 500/100 takes |
| Security & authz | `requireEventEditor` before any read; every id re-checked against `invitation.eventId` before it is written                                                              |
| Accessibility    | Disabled checkboxes carry `cursor-not-allowed opacity-60` and are preceded by a text explanation, but the notice is not wired to the inputs via `aria-describedby`       |
| i18n             | Dashboard copy is English only                                                                                                                                           |
| Analytics        | One `activityLogs` row per successful update                                                                                                                             |

## 14. TODOs & Open Questions

- **DEF-05-02** `[P1]` — The Composition Lock rejection (and every other `ConvexError` from these
  mutations) reaches the user as a contentless failure toast.
  - **Evidence:** `src/hooks/use-toast-mutation.ts:39` — `catch { toast.error(error) }` discards
    the thrown value, so the server's
    `"Cannot edit guests or special invitations after a guest has responded"`
    (`convex/invitations.ts:383`) and `"Cannot link more than 20 guests at once"`
    (`convex/invitations.ts:301`) are replaced by `"Failed to update invitation"` /
    `"Failed to create invitation"` (`src/components/invitations/invitation-form.tsx:75`, `:79`).
  - **Impact:** Whenever the client mirror and the server disagree — a stale dialog, a collaborator
    answering concurrently, or any non-dialog caller — the Editor is told the save failed but not
    that composition is frozen, and the reason is unrecoverable from the UI.
  - **Proposed fix:** In `useToastMutation`, catch `ConvexError` specifically and toast
    `err.data` when it is a string, falling back to the configured generic message. This is a
    project-wide convention change; it should be made once in the hook, not per call site.
- **TODO-05-02** `[P1]` `[ADD]` — Apply the ≤20 guest cap to `updateInvitation`.
  - **Rationale:** `createInvitation` rejects more than 20 guest ids (`convex/invitations.ts:300`),
    but `updateInvitation` has no equivalent check anywhere in its handler
    (`convex/invitations.ts:350`–`:445`). An invitation can therefore be grown past the documented
    limit by creating it small and editing it large, and the reconcile then performs an unbounded
    sequential `ctx.db.get` per id.
  - **Proposed rule:** `updateInvitation` throws `"Cannot link more than 20 guests at once"` when
    `guestIds.length > 20`, matching create.

### Open questions

- **Q1** — Should the lock be releasable by an Owner (an explicit "unlock composition" action that
  resets the affected guests to `pending`), or is a permanent freeze the intended product answer?
- **Q2** — Should a `declined` guest lock composition at all? Their answer is preserved by the
  decline cascade (`convex/lib/guests.ts` `applyDeclineEffects`), so removing them from the
  household destroys less than removing an attending guest.
- **Q3** — `setSpecialEventAccess` bypasses the lock entirely. Is that an intentional escape hatch
  for the Special Invitations page, or an inconsistency to close?

## 15. Traceability

| Concern                          | Source                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| Route                            | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14` |
| Edit entry point                 | `src/components/invitations/invitation-list.tsx:182`                |
| Live row passed to dialog        | `src/components/invitations/invitation-list.tsx:209`                |
| Client lock predicate            | `src/components/invitations/invitation-form.tsx:107`                |
| Lock notice                      | `src/components/invitations/invitation-form.tsx:358`                |
| Candidate pool                   | `src/components/invitations/invitation-form.tsx:112`                |
| Selection seeding (non-+1)       | `src/components/invitations/invitation-form.tsx:141`                |
| Payload omission when locked     | `src/components/invitations/invitation-form.tsx:236`                |
| Server scalar patch              | `convex/invitations.ts:367`                                         |
| Server lock read                 | `convex/invitations.ts:376`                                         |
| Server lock predicate + throw    | `convex/invitations.ts:381`                                         |
| +1 skip in removal loop          | `convex/invitations.ts:392`                                         |
| +1 cascade on host removal       | `convex/invitations.ts:394`                                         |
| Guest addition guard             | `convex/invitations.ts:402`                                         |
| Special-access reconcile         | `convex/invitations.ts:412`                                         |
| Activity log                     | `convex/invitations.ts:437`                                         |
| Single-toggle access (unlocked)  | `convex/invitations.ts:497`                                         |
| Dashboard +1 status              | `convex/guests.ts:380`                                              |
| Public +1 status                 | `convex/guests.ts:622`                                              |
| Guests-per-invitation enrichment | `convex/invitations.ts:71`                                          |
| Toast wrapper                    | `src/hooks/use-toast-mutation.ts:39`                                |
| Schema                           | `convex/schema.ts:97`, `convex/schema.ts:182`                       |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
