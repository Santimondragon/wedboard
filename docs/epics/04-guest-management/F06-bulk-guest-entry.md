---
id: EP-04-F06
title: Bulk Guest Entry
epic: EP-04 Guest Management
version: 1.1.0
status: partial
last_updated: 2026-08-09
depends_on: [EP-04-F01, EP-05-F02]
---

# EP-04-F06 — Bulk Guest Entry

## 1. Summary

Creating several guests against one invitation in a single call. The backend supports it —
`guests.bulkCreateGuestsForInvitation` accepts up to 20 name-and-permission triples, inserts them
all linked to the given invitation, and records the whole batch as **one** activity entry rather
than twenty. The capability is **not reachable from the product today**: no component in `src/`
calls the mutation, so a host filling in a family of six still opens the Add Guest dialog six
times. This spec documents the contract as built and files the gap.

## 2. Actors & Permissions

| Actor                     | Access        | Notes                                                                  |
| ------------------------- | ------------- | ---------------------------------------------------------------------- |
| Owner · Co-owner · Editor | Would be full | `requireEventEditor(ctx, invitation.eventId)` (`convex/guests.ts:435`) |
| Viewer                    | None          |                                                                        |
| Public guest              | None          |                                                                        |

The guard is derived from the **invitation's** event, not from a caller-supplied `eventId`.

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F06-01** — As an Editor, I want to type a household's names in one go so that adding a
  family of six is one action, not six.
- **US-04-F06-02** — As an Editor, I want each person in the batch to get their own +1 permission
  so that the adults can bring companions and the children cannot.
- **US-04-F06-03** — As an Editor, I want the activity log to show "added 6 guests" rather than
  six separate lines so that the log stays readable.
- **US-04-F06-04** — As an Editor, I want to paste or upload a guest list so that I do not retype
  a spreadsheet I already have.

## 4. Entry Points

| Entry point | Route / control | Actor |
| ----------- | --------------- | ----- |
| **None**    | —               | —     |

`bulkCreateGuestsForInvitation` has no caller anywhere in `src/`. The nearest surfaces are the
Add Guest dialog ([F01](./F01-add-guest.md)), which creates one guest per submission, and the
invitation form's guest checklist ([EP-05-F02](../05-invitations/F02-invitation-composition-and-lock.md)),
which **links existing** guests rather than creating new ones.

## 5. UX Flow

### Happy path (backend contract; no UI today)

1. A caller sends `{invitationId, guests: [{firstName, lastName, allowsPlusOne?}, …]}`
   (`convex/guests.ts:418`).
2. The batch size is checked **before** anything else — more than 20 throws
   "Cannot create more than 20 guests at once" (`convex/guests.ts:430`).
3. The invitation is loaded; an unknown id throws "Invitation not found"
   (`convex/guests.ts:434`).
4. `requireEventEditor` guards on the invitation's event (`convex/guests.ts:435`).
5. Each entry is inserted sequentially with the invitation's `eventId`, the given
   `invitationId`, `isPlusOne: false`, `allowsPlusOne: g.allowsPlusOne ?? false` and
   `rsvpStatus: "pending"` (`convex/guests.ts:439`).
6. When at least one row was inserted, **one** activity entry is written: the single guest's name
   for a batch of one, otherwise `"{n} guests"` (`convex/guests.ts:450`).
7. The array of new ids is returned (`convex/guests.ts:462`).

### Alternate & edge paths

- **A1** — An empty `guests` array → nothing is inserted, no activity entry is written, and `[]`
  is returned (`convex/guests.ts:450`).
- **A2** — A batch of exactly one → the activity entry names that guest, matching what
  `createGuest` would have written.
- **E1** — More than 20 entries → the mutation throws before touching the database.
- **E2** — Any `ConvexError` reaching a `useToastMutation` caller is replaced by that caller's
  generic error string (`DEF-04-01`).

## 6. States

| State             | Behavior                             |
| ----------------- | ------------------------------------ |
| Loading           | Not applicable — no UI               |
| Empty             | An empty array is a successful no-op |
| Error             | Server-side `ConvexError` only       |
| Success           | Returns `Id<"guests">[]`             |
| Disabled / locked | None                                 |
| Mobile            | Not applicable                       |

## 7. UI Specification

### Screens & components

None. No component imports `api.guests.bulkCreateGuestsForInvitation`.

### Fields & validation

Server-side validators only (`convex/guests.ts:419`–`:428`):

| Field                    | Type                      | Required | Rule                   | Message                                     |
| ------------------------ | ------------------------- | -------- | ---------------------- | ------------------------------------------- |
| `invitationId`           | `v.id("invitations")`     | yes      | must exist             | "Invitation not found"                      |
| `guests`                 | array of objects          | yes      | length ≤ 20            | "Cannot create more than 20 guests at once" |
| `guests[].firstName`     | `v.string()`              | yes      | no length or trim rule | —                                           |
| `guests[].lastName`      | `v.string()`              | yes      | no length or trim rule | —                                           |
| `guests[].allowsPlusOne` | `v.optional(v.boolean())` | no       | defaults `false`       | —                                           |

Empty-string names are accepted: there is no `min(1)` equivalent to `guestSchema`
(`src/lib/validations/guest.ts:4`) on this path.

### Copy deck

No user-facing copy exists for this feature.

## 8. Data Model

| Table          | Fields                                                                                         | Read / Write | Index        |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------ | ------------ |
| `invitations`  | whole doc                                                                                      | Read         | direct `get` |
| `guests`       | `eventId`, `invitationId`, `firstName`, `lastName`, `isPlusOne`, `allowsPlusOne`, `rsvpStatus` | Insert × n   | —            |
| `activityLogs` | —                                                                                              | Write × 1    | —            |

No cascade. `email`, `phone` and any +1 record are out of scope for this path — the batch grants
the _permission_ only, exactly as `createGuest` does ([F04](./F04-plus-one-lifecycle.md)).

## 9. Backend Contract

| Function                                   | Type     | Args                                                              | Returns          | Guard                                                                  | Caps                  |
| ------------------------------------------ | -------- | ----------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- | --------------------- |
| `api.guests.bulkCreateGuestsForInvitation` | mutation | `{invitationId, guests: {firstName, lastName, allowsPlusOne?}[]}` | `Id<"guests">[]` | `requireEventEditor(ctx, invitation.eventId)` (`convex/guests.ts:435`) | ≤20 per call (`:430`) |

`convex/guests.ts:418`.

## 10. Business Rules

- **BR-04-F06-01** `[AS-BUILT]` — A batch may contain at most 20 guests; a larger batch throws
  "Cannot create more than 20 guests at once" and inserts nothing (`convex/guests.ts:430`).
- **BR-04-F06-02** `[AS-BUILT]` — The cap is enforced **before** the auth guard, so an
  over-sized batch fails with the cap error even for an unauthorized caller
  (`convex/guests.ts:430` precedes `:435`).
- **BR-04-F06-03** `[AS-BUILT]` — Every guest in a batch is linked to the given invitation; this
  path cannot create un-invited guests (`convex/guests.ts:441`).
- **BR-04-F06-04** `[AS-BUILT]` — The guests' `eventId` is taken from the invitation, never from
  the caller (`convex/guests.ts:440`).
- **BR-04-F06-05** `[AS-BUILT]` — Each guest is created `pending` and with `isPlusOne: false`
  (`convex/guests.ts:444`, `:446`).
- **BR-04-F06-06** `[AS-BUILT]` — `allowsPlusOne` is per entry and defaults to `false`
  (`convex/guests.ts:445`).
- **BR-04-F06-07** `[AS-BUILT]` — A batch writes **one** `activityLogs` row, whose `entityName` is
  the guest's name for a single-entry batch and `"{n} guests"` otherwise
  (`convex/guests.ts:451`). Cross-referenced by [EP-03-F05](../03-collaboration-and-permissions/F05-activity-log.md).
- **BR-04-F06-08** `[AS-BUILT]` — An empty batch writes no activity entry and returns `[]`
  (`convex/guests.ts:450`).
- **BR-04-F06-09** `[AS-BUILT]` — Insertion is sequential inside one Convex mutation, so the batch
  is atomic: a throw part-way leaves no rows behind (`convex/guests.ts:438`).
- **BR-04-F06-10** `[AS-BUILT]` — The mutation returns the new guest ids in input order
  (`convex/guests.ts:462`).
- **BR-04-F06-11** `[AS-BUILT]` — No caller in the product invokes this mutation; the capability is
  backend-only (verified by search across `src/`).

## 11. Acceptance Criteria

- **AC-04-F06-01** — **Given** an invitation and 6 name pairs **When**
  `bulkCreateGuestsForInvitation` is called **Then** 6 guests exist, all linked to that invitation,
  all `pending`, and 6 ids are returned in order.
- **AC-04-F06-02** — **Given** 21 name pairs **When** the mutation is called **Then** it throws
  "Cannot create more than 20 guests at once" and the event's guest count is unchanged.
- **AC-04-F06-03** — **Given** exactly 20 name pairs **When** the mutation is called **Then** all
  20 are created.
- **AC-04-F06-04** — **Given** a batch where entries 1 and 3 set `allowsPlusOne: true` **When**
  the mutation is called **Then** exactly those two guests carry the permission and none has a +1
  record.
- **AC-04-F06-05** — **Given** a batch of 6 **When** the Activity page is opened **Then** exactly
  one entry appears, reading that the actor created "6 guests".
- **AC-04-F06-06** — **Given** a batch of 1 **When** the Activity page is opened **Then** the
  single entry names that guest.
- **AC-04-F06-07** — **Given** an empty array **When** the mutation is called **Then** it returns
  `[]` and writes no activity entry.
- **AC-04-F06-08** — **Given** an invitation id from another event **When** an Editor of the first
  event calls the mutation **Then** the guard on the invitation's own event refuses it.
- **AC-04-F06-09** — **Given** a Viewer **When** the mutation is called with a valid batch
  **Then** it throws and no guest is created.
- **AC-04-F06-10** — **Given** an unknown `invitationId` **When** the mutation is called **Then**
  it throws "Invitation not found".

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                      |
| ------------ | ----------- | --------------------------------------------------------------------------------------------- |
| TC-04-F06-01 | integration | A 6-guest batch inserts 6 linked, pending guests and returns 6 ids in order                   |
| TC-04-F06-02 | integration | A 21-guest batch throws and inserts nothing                                                   |
| TC-04-F06-03 | integration | Per-entry `allowsPlusOne` is honoured and defaults to `false`                                 |
| TC-04-F06-04 | integration | The batch writes exactly one `activityLogs` row, `"{n} guests"` for n > 1                     |
| TC-04-F06-05 | integration | An empty array is a no-op with no activity row                                                |
| TC-04-F06-06 | integration | `viewer` and unknown-invitation cases throw                                                   |
| TC-04-F06-07 | unit        | The cap check precedes the auth guard (over-sized batch throws the cap error unauthenticated) |

### Manual QA checklist

- [ ] Confirm no UI path reaches the mutation (expected today)
- [ ] Once a UI exists: a 21-row paste surfaces the cap message, not a generic failure

## 13. Non-Functional

| Concern          | Specification                                                           |
| ---------------- | ----------------------------------------------------------------------- |
| Limits & caps    | 20 guests per call (`convex/guests.ts:430`); no cap on how many calls   |
| Performance      | n sequential inserts plus one activity insert in a single transaction   |
| Security & authz | Event is derived from the invitation, so the caller cannot cross events |
| Accessibility    | Not applicable                                                          |
| i18n             | Not applicable                                                          |
| Analytics        | One aggregate activity entry per batch                                  |

## 14. TODOs & Open Questions

- **TODO-04-06** `[P1]` `[ADD]` — The bulk mutation has no UI.
  - **Rationale:** `BR-04-F06-11`. The capability, its cap and its aggregate activity entry all
    exist and are tested by nothing, because nothing calls them. Meanwhile the only way to add a
    six-person family is six dialogs.
  - **Proposed rule:** The invitation form (or the Guests page) offers multi-row guest entry that
    calls `bulkCreateGuestsForInvitation`, surfacing the 20-row cap in the UI before submission.
- **TODO-04-01** `[P1]` `[ADD]` — No guest import.
  - **Rationale:** Nothing in `src/` or `convex/` parses CSV, TSV or pasted text; there is no
    parsing dependency in `package.json`. Hosts almost always arrive with a spreadsheet, and
    retyping it one dialog at a time is the single largest manual cost of setting up an event.
  - **Proposed rule:** An importer accepts a pasted or uploaded list of names (optionally with
    email, phone and +1 permission), previews the parsed rows, and creates them in batches of ≤20
    against a chosen invitation or as un-invited guests.
- **TODO-04-28** `[P2]` `[CHANGE]` — The bulk path skips the name validation the single path
  applies.
  - **Rationale:** `guestSchema` requires non-empty names (`src/lib/validations/guest.ts:4`), but
    `bulkCreateGuestsForInvitation` accepts `""` for both (`convex/guests.ts:423`). A batch can
    create nameless guests that then render as blank on the public invitation.
  - **Proposed rule:** The mutation rejects blank names, on both the single and bulk paths.
- **TODO-04-29** `[P2]` `[CHANGE]` — The bulk path cannot create un-invited guests.
  - **Rationale:** `BR-04-F06-03`. An importer's most common case — a list of names not yet grouped
    into households — cannot use this mutation at all, because `invitationId` is required.
  - **Proposed rule:** The batch accepts an event id with an optional invitation id, matching
    `createGuest`.

### Open questions

- **Q1** — Should the bulk entry surface live in the invitation form (where the household context
  already exists) or on the Guests page (where an un-invited batch would land)?
- **Q2** — For an import, what is the duplicate policy — skip, merge, or create regardless
  (`BR-04-F01-11` currently allows duplicates)?

## 15. Traceability

| Concern                       | Source                               |
| ----------------------------- | ------------------------------------ |
| Backend                       | `convex/guests.ts:418`               |
| Cap                           | `convex/guests.ts:430`               |
| Guard                         | `convex/guests.ts:435`               |
| Insert loop                   | `convex/guests.ts:438`               |
| Aggregate activity entry      | `convex/guests.ts:450`               |
| Return value                  | `convex/guests.ts:462`               |
| Error swallowing              | `src/hooks/use-toast-mutation.ts:39` |
| Single-guest counterpart      | `convex/guests.ts:148`               |
| Client validation it bypasses | `src/lib/validations/guest.ts:3`     |
| Schema                        | `convex/schema.ts:122`               |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                   |
| ------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **DEF-04-01 closed.** `useToastMutation` now unwraps `ConvexError` payloads, so server rejection messages reach the user |
| 1.0.1   | 2026-07-28 | Spec suite v1      | Status corrected to `defective` per authoring-guide §3 (spec carries a behaviour-breaking P1 defect)                     |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                                                           |
