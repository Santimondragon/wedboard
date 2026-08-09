---
id: EP-07-F02
title: Main RSVP Submission
epic: EP-07 Guest Experience
version: 1.0.2
status: partial
last_updated: 2026-08-09
depends_on: [EP-07-F01, EP-07-F03, EP-04-F02, EP-05-F01, EP-08-F02]
---

# EP-07-F02 — Main RSVP Submission

## 1. Summary

The single highest-traffic action in the product: a guest opens their invitation, says whether
each named person in their household is coming, and submits. One submission writes every named
guest's [RSVP Status](../../glossary.md), materializes or tears down each [+1](../../glossary.md)
(EP-07-F03), and runs the [decline effects](../../glossary.md) cascade for anyone who says no.
Because the invitation's [RSVP State](../../glossary.md) is derived from those statuses, the act
of submitting also changes which layout the guest sees on the next load — and, in the elegant
template, removes the RSVP form from the page entirely.

Status is `partial`: the submission path itself is correct and defensive, but there is no
supported way to revise a submitted answer (`TODO-07-01`), no prefill of an existing choice
(`TODO-07-03`), and no confirmation beyond a toast (`TODO-07-04`).

## 2. Actors & Permissions

| Actor                | Access                                                               | Notes                                                                                                |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Owner                | Not via this path                                                    | Overrides statuses in the dashboard (EP-04-F03)                                                      |
| Co-owner (`planner`) | Not via this path                                                    |                                                                                                      |
| Editor               | Not via this path                                                    |                                                                                                      |
| Viewer               | Not via this path                                                    |                                                                                                      |
| Public guest         | Writes the RSVP fields of every guest linked to **their** invitation | No auth; the mutation re-resolves the invitation and rejects any guest id that does not belong to it |

`guests.submitPublicRsvp` applies **no** role guard. Its authorization is entirely
data-derived: the event must resolve publicly, the invitation must be active, and every
referenced id must belong to that invitation/event (`convex/guests.ts:520`–`:549`).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-02-01** — As a public guest, I want to answer yes or no for each person on my
  invitation, so that the hosts get an accurate headcount.
- **US-07-02-02** — As a public guest, I want to be stopped from submitting a partial answer, so
  that I do not accidentally leave someone unanswered.
- **US-07-02-03** — As a host, I want a guest's decline to automatically clean up their
  special-invitation responses and their +1, so that my counts stay truthful.
- **US-07-02-04** — As a host, I want a guest to be unable to write anything about a guest on
  someone else's invitation.
- **US-07-02-05** — As a host designing the page, I want the submit button disabled in the
  Design Studio preview, so that I cannot corrupt real data while editing.

## 4. Entry Points

| Entry point                        | Route / control                                                               | Actor                         |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `rsvp` block on the public page    | `/{eventSlug}/invitations/{invitationSlug}` (or the custom-domain equivalent) | Public guest                  |
| `rsvp` block in the editor preview | `/dashboard/[eventSlug]/template`                                             | Editor+ (submission disabled) |

The `rsvp` block appears on a layout only if the host placed it there. In the elegant template's
presets it is present on **`pending` only** (`.../elegant/default-layout.ts:29`) — see
`TODO-07-01`.

## 5. UX Flow

### Happy path

1. The guest opens the invitation; `rsvpState` is `pending`, so the `pending` layout renders
   with the `rsvp` block.
2. The block lists **one radio group per named guest** — `data.guests` filtered to
   `!isPlusOne` (`.../blocks/rsvp.tsx:64`). Existing `+1` records never get their own row.
3. The guest picks "Si asistiré" or "Lamentablemente no podré asistir" for each person
   (`rsvp.tsx:33`, `:40`).
4. For each attending guest whose record allows it, a +1 sub-question appears (EP-07-F03,
   `rsvp.tsx:158`).
5. The guest presses the submit button. `handleSubmit` builds `guestUpdates` from the named
   guests only (`rsvp.tsx:104`) plus `plusOneUpdates` (`rsvp.tsx:109`) and calls
   `api.guests.submitPublicRsvp` through `useToastMutation` (`rsvp.tsx:88`).
6. The server re-resolves event → invitation → guests, validates, patches each guest, applies
   decline effects, and reconciles +1s (`convex/guests.ts:508`–`:629`).
7. A success toast appears: `"¡Gracias! Tu confirmación fue recibida."` The Convex query is
   reactive, so the page re-renders with the new `rsvpState` — usually `accepted`, whose elegant
   preset layout has **no** `rsvp` block, so the form disappears.

### Alternate & edge paths

- **A1** — Not every named guest has chosen: the submit button is disabled
  (`rsvp.tsx:95`, `:203`). If `handleSubmit` is reached anyway it toasts
  `"Por favor responde por cada invitado."` and returns (`rsvp.tsx:101`).
- **A2** — Editor preview: `data.eventSlug`/`data.invitationSlug` are absent, so `canSubmit` is
  false and the button stays disabled (`rsvp.tsx:96`).
- **A3** — Every named guest declines: `rsvpState` becomes `declined`, and the elegant
  `declined` layout renders the `guestMessage` block instead (EP-07-F06).
- **A4** — The invitation has zero linked guests: `namedGuests` is empty,
  `allNamedAnswered` is vacuously true, and the button is enabled — submitting sends an empty
  `guestUpdates` array, which the server accepts as a no-op.
- **E1** — The mutation throws (`ConvexError` for any validation failure): `useToastMutation`
  shows `"No pudimos enviar tu confirmación. Inténtalo de nuevo."` — the server's specific
  reason is not surfaced.
- **E2** — The invitation was deactivated between load and submit: the server throws
  `"Invitation not found or not active"` (`convex/guests.ts:531`) and the guest sees the generic
  error toast.
- **E3** — A guest revisits after submitting: the choices are **not** prefilled from
  `guests.rsvpStatus`; the local `choices` state starts empty (`rsvp.tsx:72`) — see
  `TODO-07-03`.

## 6. States

| State             | Behavior                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Loading           | Handled by the page shell (EP-07-F01); the block itself renders synchronously                  |
| Empty             | Zero named guests → title, deadline, note and an enabled button that submits nothing           |
| Error             | Generic Spanish error toast; the form keeps its local state so the guest can retry             |
| Success           | Success toast; the block disappears on re-render if the new layout omits it                    |
| Disabled / locked | Button disabled while any named guest is unanswered, while `pending`, or in the editor preview |
| Mobile            | Single-column inside the 390px elegant card; radio rows are full-width tap targets             |

## 7. UI Specification

### Screens & components

| Element               | Component          | Path                                                                    |
| --------------------- | ------------------ | ----------------------------------------------------------------------- |
| RSVP block            | `ElegantRsvp`      | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:51` |
| Per-guest radio group | `GuestRsvp`        | `.../blocks/rsvp.tsx:15`                                                |
| Radio / checkbox row  | `CheckRow`         | `.../blocks/primitives.tsx:232`                                         |
| Submit button         | `WeddingButton`    | `.../blocks/primitives.tsx`                                             |
| Section wrapper       | `ElegantSection`   | `.../blocks/primitives.tsx`                                             |
| Mutation wrapper      | `useToastMutation` | `src/hooks/use-toast-mutation.ts`                                       |

### Fields & validation

| Field                           | Type                              | Required                   | Rule                                                                | Message                                                      |
| ------------------------------- | --------------------------------- | -------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Per-guest choice                | radio (`attending` \| `declined`) | Yes, for every named guest | `allNamedAnswered` gates the button (`rsvp.tsx:95`)                 | `"Por favor responde por cada invitado."`                    |
| `+1` bring flag                 | checkbox                          | No                         | Only rendered when the host allows a +1 **and** is marked attending | —                                                            |
| `+1` name                       | text                              | No                         | Blank falls back to a server placeholder (EP-07-F03)                | —                                                            |
| `allergies` (server-side)       | string                            | No                         | ≤1000 chars (`convex/guests.ts:551`)                                | `"Allergies text is too long"` (server, not surfaced)        |
| `specialRequests` (server-side) | string                            | No                         | ≤1000 chars (`convex/guests.ts:554`)                                | `"Special requests text is too long"` (server, not surfaced) |

`src/lib/validations/public-rsvp.ts` defines `publicRsvpSchema` mirroring the mutation's arg
shape, but the `rsvp` block does **not** use react-hook-form — it manages local `useState` and
builds the payload directly (`rsvp.tsx:72`, `:104`).

### Copy deck

All strings are authorable per block; the values below are the elegant defaults used when the
host has not overridden them.

| Key                     | Copy                                                                                                         | Source                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `rsvpTitle`             | `"Confirma tu asistencia"`                                                                                   | `.../elegant/default-copy.ts:8`  |
| `rsvpDeadline`          | `"Antes del 00 del Mes"`                                                                                     | `.../elegant/default-copy.ts:9`  |
| `rsvpAttendLabel`       | `"Si asistiré"`                                                                                              | `.../elegant/default-copy.ts:10` |
| `rsvpDeclineLabel`      | `"Lamentablemente no podré asistir"`                                                                         | `.../elegant/default-copy.ts:11` |
| `rsvpNote`              | `"Aunque adoramos a los más pequeños, hemos decidido que esta celebración sea exclusivamente para adultos."` | `.../elegant/default-copy.ts:15` |
| `rsvpSubmitLabel`       | `"Enviar"`                                                                                                   | `.../elegant/default-copy.ts:14` |
| Pending button label    | `"Enviando…"`                                                                                                | `.../blocks/rsvp.tsx:205`        |
| Success toast           | `"¡Gracias! Tu confirmación fue recibida."`                                                                  | `.../blocks/rsvp.tsx:89`         |
| Error toast             | `"No pudimos enviar tu confirmación. Inténtalo de nuevo."`                                                   | `.../blocks/rsvp.tsx:90`         |
| Incomplete-answer toast | `"Por favor responde por cada invitado."`                                                                    | `.../blocks/rsvp.tsx:101`        |

## 8. Data Model

| Table                          | Fields                                                                        | Read / Write                        | Index                                         |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `events`                       | `slug`, `status`                                                              | Read                                | `by_slug`                                     |
| `invitations`                  | `slug`, `isActive`                                                            | Read                                | `by_eventId_and_slug`                         |
| `guests`                       | `rsvpStatus`, `menuOptionId`, `drinkOptionId`, `allergies`, `specialRequests` | **Write** (patch)                   | `by_invitationId`                             |
| `guests`                       | +1 record insert / patch / delete                                             | **Write**                           | `by_plusOneOf`                                |
| `menuOptions`                  | `eventId`, `isActive`                                                         | Read (ownership check)              | direct `db.get`                               |
| `drinkOptions`                 | `eventId`, `isActive`                                                         | Read (ownership check)              | direct `db.get`                               |
| `specialEvents`                | `eventId`, `isActive`                                                         | Read (ownership check)              | direct `db.get`                               |
| `invitationSpecialEventAccess` | —                                                                             | Read (access check)                 | `by_invitationId_and_specialEventId`          |
| `guestSpecialEventRsvps`       | `status`                                                                      | **Write** (upsert / cascade delete) | `by_guestId_and_specialEventId`, `by_guestId` |

**Whitelisted patching.** The patch object is assembled field by field, and an optional field is
only included when the key is actually present in the update — patching `undefined` would unset
a stored value (`convex/guests.ts:571`–`:579`). Seating (`tableId`, `seatNumber`), contact data
(`email`, `phone`), `invitationId`, `allowsPlusOne` and `isPlusOne` are therefore **unreachable**
from the public mutation.

**Decline cascade.** A guest whose submitted status is `declined` is added to
`declinedGuestIds` and passed to `applyDeclineEffects` (`convex/guests.ts:583`), which deletes
every `guestSpecialEventRsvps` row for that guest and cascade-deletes their +1 record together
with its own RSVP rows (`convex/lib/guests.ts:51`). **This is irreversible** — re-declaring
attendance later does not restore the destroyed rows.

**Not logged.** Public RSVP submissions write no `activityLogs` row (see `AGENTS.md`, Activity
logging convention), so the host's Activity page shows nothing when a guest responds.

## 9. Backend Contract

| Function                      | Type            | Args                                                                                                                                                                                                                                                           | Returns | Guard                                                                   | Caps                                                                                            |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `api.guests.submitPublicRsvp` | public mutation | `{eventSlug, invitationSlug, guestUpdates: [{guestId, rsvpStatus, menuOptionId?, drinkOptionId?, allergies?, specialRequests?}], plusOneUpdates?: [{hostGuestId, attending, firstName?, lastName?}], specialEventRsvps?: [{guestId, specialEventId, status}]}` | `void`  | none — data gating via `resolvePublicEvent` / `resolvePublicInvitation` | `guestUpdates` ≤20, `plusOneUpdates` ≤20, `specialEventRsvps` ≤100, invitation guests read ≤100 |

Every failure mode throws a `ConvexError`:

| Condition                                    | Message                                                   | Source                 |
| -------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| `guestUpdates.length > 20`                   | `"Too many guest updates"`                                | `convex/guests.ts:510` |
| `plusOneUpdates.length > 20`                 | `"Too many plus-one updates"`                             | `convex/guests.ts:513` |
| `specialEventRsvps.length > 100`             | `"Too many special event RSVPs"`                          | `convex/guests.ts:516` |
| Event unresolvable / archived                | `"Invitation not found or not active"`                    | `convex/guests.ts:522` |
| Invitation unresolvable / inactive           | `"Invitation not found or not active"`                    | `convex/guests.ts:531` |
| `guestId` not linked to this invitation      | `"Guest does not belong to this invitation"`              | `convex/guests.ts:549` |
| `allergies` > 1000 chars                     | `"Allergies text is too long"`                            | `convex/guests.ts:552` |
| `specialRequests` > 1000 chars               | `"Special requests text is too long"`                     | `convex/guests.ts:555` |
| Menu option foreign or inactive              | `"Menu option does not belong to this event"`             | `convex/guests.ts:561` |
| Drink option foreign or inactive             | `"Drink option does not belong to this event"`            | `convex/guests.ts:567` |
| `hostGuestId` not linked to this invitation  | `"Guest does not belong to this invitation"`              | `convex/guests.ts:594` |
| Special event foreign or inactive            | `"Special event does not belong to this event"`           | `convex/guests.ts:648` |
| Invitation lacks access to the special event | `"Invitation does not have access to this special event"` | `convex/guests.ts:661` |

## 10. Business Rules

### The form

- **BR-07-02-01** `[AS-BUILT]` — The RSVP form renders one radio group per **named** guest;
  records with `isPlusOne === true` are excluded from the list (`.../blocks/rsvp.tsx:64`).
- **BR-07-02-02** `[AS-BUILT]` — Each named guest's group offers exactly two choices,
  `attending` and `declined`; `pending` cannot be chosen (`rsvp.tsx:13`, `:33`, `:40`).
- **BR-07-02-03** `[AS-BUILT]` — Submission is blocked until every named guest has a choice
  (`rsvp.tsx:95`, enforced twice: the disabled button at `:203` and the guard at `:100`).
- **BR-07-02-04** `[AS-BUILT]` — Submission is blocked whenever `eventSlug` or `invitationSlug`
  is absent, which is exactly the Design Studio preview case (`rsvp.tsx:96`, `:99`).
- **BR-07-02-05** `[AS-BUILT]` — Only named guests appear in `guestUpdates`; a +1's status is
  never sent directly (`rsvp.tsx:104`).
- **BR-07-02-06** `[AS-BUILT]` — The form's local choice state starts empty on every mount and is
  never seeded from the guests' stored `rsvpStatus` (`rsvp.tsx:72`).

### The mutation

- **BR-07-02-07** `[AS-BUILT]` — The mutation re-resolves the event and invitation from the
  submitted slugs; it never trusts an id supplied by the client for scoping
  (`convex/guests.ts:520`, `:525`).
- **BR-07-02-08** `[AS-BUILT]` — Every `guestId` in `guestUpdates` must belong to the resolved
  invitation, or the whole mutation throws (`convex/guests.ts:548`).
- **BR-07-02-09** `[AS-BUILT]` — Only `rsvpStatus`, `menuOptionId`, `drinkOptionId`, `allergies`
  and `specialRequests` are patchable from the public path (`convex/guests.ts:573`–`:578`).
- **BR-07-02-10** `[AS-BUILT]` — An optional field absent from the update leaves the stored value
  untouched rather than clearing it (`convex/guests.ts:574`–`:578`).
- **BR-07-02-11** `[AS-BUILT]` — A referenced menu option must exist, belong to the resolved
  event, and be `isActive` (`convex/guests.ts:560`).
- **BR-07-02-12** `[AS-BUILT]` — A referenced drink option must exist, belong to the resolved
  event, and be `isActive` (`convex/guests.ts:566`).
- **BR-07-02-13** `[AS-BUILT]` — `allergies` and `specialRequests` are each capped at 1000
  characters (`convex/guests.ts:551`, `:554`).
- **BR-07-02-14** `[AS-BUILT]` — `guestUpdates` is capped at 20 entries, `plusOneUpdates` at 20,
  `specialEventRsvps` at 100 (`convex/guests.ts:509`–`:517`).
- **BR-07-02-15** `[AS-BUILT]` — A guest patched to `declined` runs `applyDeclineEffects`:
  their special-invitation RSVP rows are deleted and their +1 is cascade-deleted
  (`convex/guests.ts:583`, `convex/lib/guests.ts:51`).
- **BR-07-02-16** `[AS-BUILT]` — A declining guest stays **linked** to the invitation; the
  cascade never clears `invitationId` (`convex/lib/guests.ts:44`-`:59`). This is what keeps the
  `declined` layout resolvable.
- **BR-07-02-17** `[AS-BUILT]` — A guest declining in the same submission is skipped for
  `specialEventRsvps` rather than causing an error (`convex/guests.ts:638`).
- **BR-07-02-18** `[AS-BUILT]` — A special-invitation RSVP requires both that the special event
  belongs to the event and is active, **and** that the invitation holds an
  `invitationSpecialEventAccess` row for it (`convex/guests.ts:642`, `:652`).
- **BR-07-02-19** `[AS-BUILT]` — The mutation writes no `activityLogs` row.
- **BR-07-02-20** `[AS-BUILT]` — The mutation returns `void`; the client's only receipt is the
  success toast (`convex/guests.ts:687`, `rsvp.tsx:89`).

## 11. Acceptance Criteria

- **AC-07-02-01** — **Given** an invitation with two named guests **When** only one has answered
  **Then** the submit button is disabled.
- **AC-07-02-02** — **Given** both have answered **When** submit is pressed **Then**
  `submitPublicRsvp` receives exactly two `guestUpdates` and a success toast appears.
- **AC-07-02-03** — **Given** an invitation that already has a materialized +1 **When** the form
  renders **Then** the +1 has no radio group of its own.
- **AC-07-02-04** — **Given** the Design Studio preview **When** the RSVP block renders **Then**
  the submit button is disabled.
- **AC-07-02-05** — **Given** a guest belonging to a different invitation is injected into
  `guestUpdates` **When** the mutation runs **Then** it throws
  `"Guest does not belong to this invitation"` and nothing is written.
- **AC-07-02-06** — **Given** a `menuOptionId` from another event **When** the mutation runs
  **Then** it throws `"Menu option does not belong to this event"`.
- **AC-07-02-07** — **Given** an `allergies` string of 1001 characters **When** the mutation runs
  **Then** it throws `"Allergies text is too long"`.
- **AC-07-02-08** — **Given** a guest with an existing +1 and two special-invitation RSVP rows
  **When** that guest is submitted as `declined` **Then** the +1 record and both RSVP rows are
  deleted and the guest keeps its `invitationId`.
- **AC-07-02-09** — **Given** a submission containing 21 `guestUpdates` **When** the mutation runs
  **Then** it throws `"Too many guest updates"` before touching any document.
- **AC-07-02-10** — **Given** a guest with a stored `tableId` **When** they submit an RSVP
  **Then** `tableId` is unchanged.
- **AC-07-02-11** — **Given** an update omitting `allergies` **When** the mutation runs **Then**
  the guest's stored `allergies` value is unchanged.
- **AC-07-02-12** — **Given** all named guests decline **When** the page re-renders **Then**
  `rsvpState` is `declined` and the elegant `declined` layout is shown.
- **AC-07-02-13** — **Given** a guest who already answered `attending` **When** they reload the
  page **Then** no choice is preselected (documents `BR-07-02-06`; see `TODO-07-03`).

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                 |
| ----------- | ----------- | ------------------------------------------------------------------------ |
| TC-07-02-01 | unit        | `namedGuests` excludes `isPlusOne` records                               |
| TC-07-02-02 | unit        | `allNamedAnswered` / `canSubmit` truth table incl. missing slugs         |
| TC-07-02-03 | integration | Cross-invitation `guestId` is rejected                                   |
| TC-07-02-04 | integration | Foreign / inactive menu and drink options are rejected                   |
| TC-07-02-05 | integration | 1001-character `allergies` and `specialRequests` are rejected            |
| TC-07-02-06 | integration | Array caps (21 / 21 / 101) are rejected before any write                 |
| TC-07-02-07 | integration | Omitted optional fields do not unset stored values                       |
| TC-07-02-08 | integration | Decline deletes the +1 and every special RSVP row, keeps `invitationId`  |
| TC-07-02-09 | integration | Seating and contact fields are untouched by a public submission          |
| TC-07-02-10 | integration | A guest declining in the same call is skipped for `specialEventRsvps`    |
| TC-07-02-11 | integration | No `activityLogs` row is written                                         |
| TC-07-02-12 | e2e         | Two-guest invitation: answer both, submit, layout switches to `accepted` |
| TC-07-02-13 | e2e         | Submitting from a custom-domain URL persists correctly                   |

### Manual QA checklist

- [ ] Radio groups are keyboard-reachable and operable with arrow keys
- [ ] Submit stays disabled until every named guest is answered
- [ ] Success toast appears in Spanish and the page re-renders into the new variant
- [ ] Deactivate the invitation mid-session, then submit — the error toast appears
- [ ] Confirm no email is sent (the product sends none) and no receipt page appears
- [ ] Confirm a previously answered invitation shows no preselected choice

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 20 guest updates, 20 +1 updates, 100 special RSVPs, 1000 chars per free-text field, 100 guests read per invitation                                                                                       |
| Performance      | One mutation per submission; per-guest patches are sequential                                                                                                                                            |
| Security & authz | No auth. Every id is ownership-checked server-side; field whitelisting prevents privilege escalation into seating/contact data. **No rate limiting exists** (`TODO-07-02`)                               |
| Accessibility    | Real `<input type="radio">` elements inside `<label>` (`primitives.tsx:254`), but they are `sr-only` with no visible focus indicator, and the per-guest groups use no `fieldset`/`legend` (`TODO-07-07`) |
| i18n             | Spanish only; all block copy is host-authorable                                                                                                                                                          |
| Analytics        | None                                                                                                                                                                                                     |

## 14. TODOs & Open Questions

- **TODO-07-01** `[P1]` `[ADD]` — A guest cannot correct a submitted RSVP. The elegant
  template's `accepted` preset layout contains no `rsvp` block
  (`.../elegant/default-layout.ts:9`–`:20`), and neither does the `declined` preset
  (`:36`–`:42`); only `pending` has one (`:29`). Since submitting always moves the invitation out
  of `pending`, the form the guest used disappears on the next render.
  - **Evidence:** `src/components/public-invitation/templates/elegant/default-layout.ts:9`,
    `:29`, `:36`
  - **Impact:** A misclick is permanent from the guest's side. The only remedy is to contact the
    host, who must fix it in the dashboard (EP-04-F03). Note the _global_ fallback
    `DEFAULT_ORDER.accepted` **does** include `rsvp`
    (`src/components/public-invitation/blocks.ts:269`), so the behavior depends on which fallback
    applies — with `elegant` as the only template, the no-`rsvp` variant is what ships.
  - **Proposed rule:** The `accepted` layout includes an RSVP block (or a "change my answer"
    affordance) that prefills the stored choices.
- **TODO-07-02** `[P1]` `[ADD]` — Nothing rate-limits the public mutations, and invitation slugs
  are predictable. `generateSlug` derives the slug from the invitation title
  (`convex/lib/slug.ts:21`, called at `convex/invitations.ts:283`), so a "The Smith Family"
  invitation is `the-smith-family`. Event keys are equally guessable. A repo-wide search for
  rate-limiting found no implementation in `convex/` or `src/`.
  - **Rationale:** The invitation URL is the only credential. An enumerating attacker can read a
    household's guest names and **overwrite their RSVPs**, including triggering the destructive
    decline cascade (`BR-07-02-15`).
  - **Proposed rule:** Invitation slugs carry a high-entropy component, and public mutations are
    rate-limited per invitation and per IP.
- **TODO-07-03** `[P1]` `[CHANGE]` — The form never prefills a guest's stored choice
  (`.../blocks/rsvp.tsx:72`), unlike the +1 sub-question, which _is_ prefilled from an existing
  +1 record (`:76`–`:87`), and unlike the special-invitation modal, which prefills from
  `guestStatuses` (EP-07-F05).
  - **Rationale:** Inconsistent, and it makes any future edit-after-submit affordance misleading.
  - **Proposed rule:** Each named guest's radio group initializes from `guest.rsvpStatus` when it
    is `attending` or `declined`.
- **TODO-07-04** `[P2]` `[ADD]` — There is no confirmation receipt. The mutation returns `void`,
  the only feedback is a sonner toast, and **the product sends no email anywhere** — a repo-wide
  search finds no mail provider, no `sendEmail`, and no Convex action for delivery.
  - **Rationale:** Guests routinely want proof they answered, and hosts field "did it go
    through?" questions.
  - **Proposed rule:** After a successful submission the page renders a persistent summary of
    what was recorded for each guest.
- **TODO-07-07** `[P2]` `[ADD]` — The radio and checkbox controls are visually custom and
  `sr-only` (`.../blocks/primitives.tsx:259`), with no `:focus-visible` styling on the visible
  box, and each guest's two radios are not wrapped in a `fieldset` with a `legend`.
  - **Rationale:** A keyboard user cannot see where focus is; a screen-reader user gets no group
    name tying the two options to a person.
  - **Proposed rule:** Each guest's choices are a `fieldset`/`legend` group, and the visible
    control shows a focus ring driven by `peer-focus-visible`.
- **TODO-07-15** `[P2]` `[CHANGE]` — Server `ConvexError` messages reach the guest but are in
  English, on an otherwise Spanish page. _(Partially addressed: `useToastMutation` now unwraps
  the `ConvexError` payload, so the message is no longer swallowed — the RSVP and guest-message
  blocks both go through it. What remains is the language mismatch.)_
  - **Rationale:** Every server-side rejection in §9 is authored in English; a Spanish-speaking
    guest sees an English sentence in a Spanish toast.
  - **Proposed rule:** Known validation errors map to Spanish, guest-readable messages — either
    by authoring the `ConvexError` payloads in Spanish or by mapping them client-side.

### Open questions

- **Q1** — Should a household be able to submit answers for only some of its guests and return
  later for the rest, rather than being forced to answer for everyone at once?
- **Q2** — Should the decline cascade be reversible (soft-delete the special RSVP rows and the
  +1) so an accidental decline can be undone?
- **Q3** — With zero linked guests the form submits an empty payload. Should the block hide
  itself instead?

## 15. Traceability

| Concern                    | Source                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| RSVP block                 | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:51` |
| Named-guest filter         | `.../blocks/rsvp.tsx:64`                                                |
| Completeness gate          | `.../blocks/rsvp.tsx:95`                                                |
| Preview gate               | `.../blocks/rsvp.tsx:96`                                                |
| Submit handler             | `.../blocks/rsvp.tsx:98`                                                |
| Toasts                     | `.../blocks/rsvp.tsx:89`, `:90`, `:101`                                 |
| Radio primitive            | `.../blocks/primitives.tsx:232`                                         |
| Elegant layout presets     | `.../elegant/default-layout.ts:9`, `:25`, `:36`                         |
| Global fallback order      | `src/components/public-invitation/blocks.ts:268`                        |
| Copy defaults              | `.../elegant/default-copy.ts:8`–`:16`                                   |
| Mutation                   | `convex/guests.ts:466`                                                  |
| Array caps                 | `convex/guests.ts:509`                                                  |
| Slug re-resolution         | `convex/guests.ts:520`                                                  |
| Ownership check            | `convex/guests.ts:548`                                                  |
| Text caps                  | `convex/guests.ts:551`                                                  |
| Menu / drink ownership     | `convex/guests.ts:558`                                                  |
| Whitelisted patch          | `convex/guests.ts:571`                                                  |
| Decline effects call       | `convex/guests.ts:583`                                                  |
| Decline cascade            | `convex/lib/guests.ts:51`                                               |
| Special-event access check | `convex/guests.ts:652`                                                  |
| Zod mirror                 | `src/lib/validations/public-rsvp.ts:3`                                  |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                                 |
| ------- | ---------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.2   | 2026-08-09 | Dashboard redesign | TODO-07-15 narrowed: `useToastMutation` now surfaces `ConvexError` payloads, so server rejections reach the guest; only the English-on-a-Spanish-page mismatch remains |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                                                                                                         |
