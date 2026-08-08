---
id: EP-05-F04
title: Sent Tracking
epic: EP-05 Invitations
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-05-F01, EP-05-F03]
---

# EP-05-F04 — Sent Tracking

## 1. Summary

Wedboard does not send anything. There is no email provider, no SMS, no in-app messaging: an
invitation is "sent" when a human copies its link ([F03](./F03-invitation-link-and-slug.md)) and
delivers it through WhatsApp, a printed card, or a conversation. `invitations.isSent` is the host's
private checklist for that entirely off-platform act — a manually maintained flag that answers
"have I already given this household their link?" across an event with seventy of them. It drives
no behavior whatsoever: nothing is gated on it, no reminder is derived from it, and the public page
never reads it.

This is workflow **WF-05-04 — Track which invitations were sent**.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                            |
| -------------------- | ------ | ---------------------------------------------------------------- |
| Owner                | Toggle |                                                                  |
| Co-owner (`planner`) | Toggle |                                                                  |
| Editor               | Toggle | The flag uses the default content gate, so any Editor may set it |
| Viewer               | None   | Cannot list invitations                                          |
| Public guest         | None   | The flag is not in any public payload                            |

Gate: `requireEventEditor(ctx, invitation.eventId)` (`convex/invitations.ts:492`).

Despite the schema comment calling it "owner-managed"
(`convex/schema.ts:113`), no owner-specific check exists — the field is editable by every content
role.

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-05-F04-01** — As a host with seventy households, I want to tick off each invitation as I
  hand out its link so that I do not send the same one twice or forget one entirely.
- **US-05-F04-02** — As an Editor, I want the tick to save instantly without opening a dialog so
  that marking a run of invitations is fast.
- **US-05-F04-03** — As an Editor working inside the edit dialog, I want the same flag visible
  there so that I can set it while I am already looking at the invitation.

## 4. Entry Points

| Entry point                                    | Route / control                                                                                   | Actor   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| "Sent" checkbox in the invitations table       | `/dashboard/[eventSlug]/invitations` (`src/components/invitations/invitation-list.tsx:164`)       | Editor+ |
| Sent switch card at the top of the edit dialog | Same route, `InvitationForm` `mode="edit"` (`src/components/invitations/invitation-form.tsx:299`) | Editor+ |

## 5. UX Flow

### Happy path — list checkbox

1. The Editor ticks the "Sent" checkbox on a row.
2. `setInvitationSent.run({id, isSent: checked === true})` fires immediately — there is no Save
   step (`src/components/invitations/invitation-list.tsx:166`).
3. The server patches `isSent` and returns (`convex/invitations.ts:493`).
4. The reactive query re-renders the row with the new checkbox state. **No success toast appears**,
   because the `success` option is omitted from `useToastMutation`
   (`invitation-list.tsx:73`, hook behavior at `src/hooks/use-toast-mutation.ts:37`).

### Happy path — edit-dialog switch

1. The Editor opens the edit dialog. A bordered card sits above the Title field.
2. The card is green (`border-green-200 bg-green-50`) and reads `"Invitation sent"` when
   `isSent` is true; otherwise it is neutral zinc and reads `"Not sent yet"`
   (`src/components/invitations/invitation-form.tsx:284`, `:293`).
3. Toggling the `Switch` calls `setInvitationSent` immediately — the change is **not** part of the
   form submission and is unaffected by Cancel (`invitation-form.tsx:301`).
4. Because the list passes the freshest row by id into the dialog
   (`invitation-list.tsx:209`), the card's colour and label update in place.

### Alternate & edge paths

- **A1** — `isSent` has never been written: the field is `undefined` and both controls treat it as
  false (`invitation.isSent ?? false`, `invitation-list.tsx:165`, `invitation-form.tsx:300`).
  `createInvitation` never sets it (`convex/invitations.ts:291`).
- **A2** — Un-ticking: fully reversible; the same mutation writes `false`. No history is kept.
- **A3** — The invitation is later deactivated or its slug regenerated: `isSent` is untouched, so
  the flag can claim "sent" while the shared link no longer resolves. Nothing reconciles the two.
- **E1** — Mutation failure: toast `"Failed to update sent status"` (`invitation-list.tsx:75`,
  `invitation-form.tsx:86`). The control reverts on the next query result, since it is driven by
  server state rather than local state.

## 6. States

| State             | Behavior                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | None — the value ships with the list query                                                                                           |
| Empty             | Never sent → unchecked checkbox and the neutral "Not sent yet" card                                                                  |
| Error             | Red toast `"Failed to update sent status"`; the control snaps back to the server value                                               |
| Success           | Silent. The checkbox/switch reflects the new value; the dialog card changes colour                                                   |
| Disabled / locked | Never disabled. The [Composition Lock](../../glossary.md) does not apply — the card and checkbox stay live on an answered invitation |
| Mobile            | The checkbox occupies its own "Sent" table column (`invitation-list.tsx:94`); the dialog card is a full-width flex row               |

## 7. UI Specification

### Screens & components

| Element              | Component        | Path                                                 |
| -------------------- | ---------------- | ---------------------------------------------------- |
| "Sent" column header | `InvitationList` | `src/components/invitations/invitation-list.tsx:94`  |
| Row checkbox         | `Checkbox`       | `src/components/invitations/invitation-list.tsx:164` |
| Dialog sent card     | `InvitationForm` | `src/components/invitations/invitation-form.tsx:282` |
| Dialog switch        | `Switch`         | `src/components/invitations/invitation-form.tsx:299` |

### Fields & validation

| Field    | Type    | Required | Rule                                                         | Message |
| -------- | ------- | -------- | ------------------------------------------------------------ | ------- |
| `isSent` | boolean | No       | Free toggle; no validation, no dependency on any other field | —       |

### Copy deck

| Key                 | Copy                                                         | Source                                             |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Column header       | `"Sent"`                                                     | `invitation-list.tsx:94`                           |
| Checkbox aria-label | `` `Mark ${invitation.title} as sent` ``                     | `invitation-list.tsx:172`                          |
| Card title (on)     | `"Invitation sent"`                                          | `invitation-form.tsx:293`                          |
| Card title (off)    | `"Not sent yet"`                                             | `invitation-form.tsx:293`                          |
| Card helper text    | `"Mark this once you have shared the link with the guests."` | `invitation-form.tsx:296`                          |
| Switch aria-label   | `"Mark invitation as sent"`                                  | `invitation-form.tsx:307`                          |
| Error toast         | `"Failed to update sent status"`                             | `invitation-list.tsx:75`, `invitation-form.tsx:86` |

The helper copy is the product's own confirmation that sending is a manual, off-platform act.

## 8. Data Model

| Table         | Fields                               | Read / Write                      | Index      |
| ------------- | ------------------------------------ | --------------------------------- | ---------- |
| `invitations` | `isSent` (`v.optional(v.boolean())`) | Read (list query) + Write (patch) | read by id |

No cascade, no derived state, no side effects. `getInvitationsPageData` returns the whole
invitation document (`convex/invitations.ts:108` spreads `...inv`), which is how both controls
receive the value.

**Deliberately not activity-logged.** `setInvitationSent` contains no `logActivity` call
(`convex/invitations.ts:487`–`:495`), unlike `createInvitation`/`updateInvitation`/
`deleteInvitation`. Its own source comment states the rationale: it "follows the per-toggle
convention and is intentionally not activity-logged" (`convex/invitations.ts:485`). This matches
the project-wide convention that per-toggle flags stay out of the audit trail
([EP-03-F05](../03-collaboration-and-permissions/)).

## 9. Backend Contract

| Function                                 | Type     | Args           | Returns                 | Guard                                         | Caps                                  |
| ---------------------------------------- | -------- | -------------- | ----------------------- | --------------------------------------------- | ------------------------------------- |
| `api.invitations.setInvitationSent`      | mutation | `{id, isSent}` | `void`                  | `requireEventEditor(ctx, invitation.eventId)` | —                                     |
| `api.invitations.getInvitationsPageData` | query    | `{eventId}`    | rows including `isSent` | `requireEventEditor`                          | see [F01](./F01-create-invitation.md) |

`updateInvitation` does **not** accept `isSent` (`convex/invitations.ts:339`–`:349`), so the flag
has exactly one write path.

## 10. Business Rules

- **BR-05-F04-01** `[AS-BUILT]` — `isSent` is a free boolean toggle on an invitation, writable only
  through `setInvitationSent` (`convex/invitations.ts:487`; absent from `updateInvitation`'s args
  at `convex/invitations.ts:339`).
- **BR-05-F04-02** `[AS-BUILT]` — Setting it requires at least the `editor` role
  (`convex/invitations.ts:492`).
- **BR-05-F04-03** `[AS-BUILT]` — An invitation is created without `isSent`, and an unset value is
  presented as "not sent" (`convex/invitations.ts:291`; `invitation-list.tsx:165`).
- **BR-05-F04-04** `[AS-BUILT]` — Both controls save immediately on change; neither participates in
  the dialog's Save/Cancel cycle (`invitation-list.tsx:166`, `invitation-form.tsx:301`).
- **BR-05-F04-05** `[AS-BUILT]` — Toggling the flag produces no success toast
  (`invitation-list.tsx:73` and `invitation-form.tsx:84` omit `success`;
  `src/hooks/use-toast-mutation.ts:37` toasts only when it is present).
- **BR-05-F04-06** `[AS-BUILT]` — Toggling the flag writes no `activityLogs` row
  (`convex/invitations.ts:487`–`:495`).
- **BR-05-F04-07** `[AS-BUILT]` — The flag is informational: no query, mutation, public resolver or
  UI gate reads it other than the two controls that render it. It never appears in the public
  payload built by `buildPublicInvitationPayload` (`convex/invitations.ts:226`–`:230` returns only
  `_id`, `title`, `slug`).
- **BR-05-F04-08** `[AS-BUILT]` — The dialog card is green with the title `"Invitation sent"` when
  set, and neutral with `"Not sent yet"` when unset (`invitation-form.tsx:284`, `:293`).
- **BR-05-F04-09** `[AS-BUILT]` — The flag is never locked by the Composition Lock; it stays
  editable on an answered invitation (no `composeLocked` reference in the card,
  `invitation-form.tsx:282`–`:310`).

## 11. Acceptance Criteria

- **AC-05-F04-01** — **Given** a freshly created invitation **When** the list renders **Then** its
  "Sent" checkbox is unchecked.
- **AC-05-F04-02** — **Given** an unchecked row **When** the Editor ticks "Sent" **Then** the
  invitation's `isSent` is `true` in the database without any further confirmation step.
- **AC-05-F04-03** — **Given** the tick succeeded **When** the UI settles **Then** no success toast
  is shown.
- **AC-05-F04-04** — **Given** the tick succeeded **When** the Activity page is opened **Then** it
  contains no entry for the toggle.
- **AC-05-F04-05** — **Given** an invitation with `isSent: true` **When** the edit dialog opens
  **Then** the top card is green and reads "Invitation sent".
- **AC-05-F04-06** — **Given** the edit dialog is open **When** the Editor flips the switch and then
  presses "Cancel" **Then** the flag stays flipped — it was already saved.
- **AC-05-F04-07** — **Given** an invitation whose guests have all responded **When** the edit
  dialog opens **Then** the Sent switch is still enabled even though the composition checklists are
  locked.
- **AC-05-F04-08** — **Given** a public guest opens the invitation **When** the public payload is
  inspected **Then** it contains no `isSent` field.
- **AC-05-F04-09** — **Given** a Viewer **When** they call `setInvitationSent` **Then** it throws
  `Insufficient permissions`.
- **AC-05-F04-10** — **Given** the mutation fails **When** the toast fires **Then** it reads
  `"Failed to update sent status"` and the control shows the server's unchanged value.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------ |
| TC-05-F04-01 | integration | `setInvitationSent` patches `isSent` true and false                      |
| TC-05-F04-02 | integration | `setInvitationSent` writes no `activityLogs` row                         |
| TC-05-F04-03 | integration | A Viewer calling `setInvitationSent` is rejected                         |
| TC-05-F04-04 | integration | `updateInvitation` rejects an `isSent` argument (not in its validator)   |
| TC-05-F04-05 | unit        | The list checkbox and dialog switch both render `undefined` as unchecked |
| TC-05-F04-06 | e2e         | Ticking "Sent" persists across a page reload with no toast               |
| TC-05-F04-07 | e2e         | Flipping the dialog switch then pressing Cancel leaves the flag flipped  |

### Manual QA checklist

- [ ] Tick and untick several rows quickly; each persists.
- [ ] Confirm no success toast appears for either control.
- [ ] Open the dialog on a sent invitation and confirm the green card.
- [ ] Confirm the Activity page shows nothing for these toggles.
- [ ] Confirm the flag remains editable on a locked (answered) invitation.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. One boolean per invitation                                                                                                                                                         |
| Performance      | One indexed `get` + `patch` per toggle; the list is already loaded                                                                                                                       |
| Security & authz | `requireEventEditor`; the flag is excluded from every public payload                                                                                                                     |
| Accessibility    | Both controls carry explicit `aria-label`s, the row one naming the invitation (`invitation-list.tsx:172`, `invitation-form.tsx:307`). The silent save is not announced to assistive tech |
| i18n             | Dashboard copy is English only                                                                                                                                                           |
| Analytics        | None by design — see BR-05-F04-06                                                                                                                                                        |

## 14. TODOs & Open Questions

- **TODO-05-09** `[P2]` `[ADD]` — Record _when_ an invitation was marked sent.
  - **Rationale:** `isSent` is a bare boolean (`convex/schema.ts:115`) with no timestamp, and the
    toggle is deliberately excluded from the activity log (`convex/invitations.ts:485`), so there
    is no way to answer "when did we send this?" or "who marked it?". For a host chasing
    non-responders, elapsed time since sending is the actionable number, and the product offers no
    other reminder mechanism.
  - **Proposed rule:** `setInvitationSent` stores `sentAt` (Unix ms) when flipping to `true` and
    clears it when flipping to `false`; the list shows a relative "sent 12 days ago" next to the
    checkbox. The activity log stays untouched, preserving the per-toggle convention.

### Open questions

- **Q1** — Should `isSent` be auto-set when an Editor copies the invitation link
  ([F03](./F03-invitation-link-and-slug.md))? Copying is the closest observable proxy for sending,
  but it is also how a host previews their own page.
- **Q2** — Should regenerating a slug or deactivating an invitation reset `isSent` to false, given
  the previously shared link no longer resolves (A3 above)?
- **Q3** — The schema comment describes the flag as "owner-managed"
  (`convex/schema.ts:113`) while the code lets any Editor set it. Which is the intended product
  rule?

## 15. Traceability

| Concern                             | Source                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| Route                               | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14` |
| Column header                       | `src/components/invitations/invitation-list.tsx:94`                 |
| Row checkbox                        | `src/components/invitations/invitation-list.tsx:164`                |
| List mutation binding               | `src/components/invitations/invitation-list.tsx:73`                 |
| Dialog card                         | `src/components/invitations/invitation-form.tsx:282`                |
| Dialog switch                       | `src/components/invitations/invitation-form.tsx:299`                |
| Dialog mutation binding             | `src/components/invitations/invitation-form.tsx:84`                 |
| Live row into dialog                | `src/components/invitations/invitation-list.tsx:209`                |
| Backend                             | `convex/invitations.ts:487`                                         |
| Not-logged rationale comment        | `convex/invitations.ts:485`                                         |
| Absent from `updateInvitation` args | `convex/invitations.ts:339`                                         |
| Absent from the public payload      | `convex/invitations.ts:226`                                         |
| Schema field                        | `convex/schema.ts:115`                                              |
| Toast behavior                      | `src/hooks/use-toast-mutation.ts:37`                                |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
