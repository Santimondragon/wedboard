---
id: EP-07-F05
title: Special-Invitation Response
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-07-F01, EP-07-F02, EP-06-F01, EP-06-F02, EP-08-F02]
---

# EP-07-F05 — Special-Invitation Response

## 1. Summary

A [Special Invitation](../../glossary.md) — a welcome dinner, a rehearsal dinner, an after-party
— appears on the public page as a decorated card describing the sub-event, with a button that
opens a themed modal. Inside, each person on the invitation answers yes or no for that sub-event
independently of the main RSVP. Responses persist to `guestSpecialEventRsvps`. The card is
visible **only** to invitations the host granted access to (EP-06-F02); on every other
invitation the block renders nothing at all, which is the mechanism that makes a single authored
layout serve both audiences.

## 2. Actors & Permissions

| Actor                | Access                                                                                                                    | Notes                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Owner                | Creates the sub-event, grants access, overrides responses (EP-06)                                                         |                                                                                         |
| Co-owner (`planner`) | Same                                                                                                                      |                                                                                         |
| Editor               | Same                                                                                                                      |                                                                                         |
| Viewer               | None                                                                                                                      |                                                                                         |
| Public guest         | Reads the sub-event details and writes a per-guest response, only for a special invitation their invitation has access to | Server re-checks `invitationSpecialEventAccess` on every write (`convex/guests.ts:652`) |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-05-01** — As a public guest, I want to see the extra gathering I have been invited to,
  with its date and place, so that I can plan.
- **US-07-05-02** — As a public guest, I want each person in my household to answer the sub-event
  separately, because we may not all attend.
- **US-07-05-03** — As a public guest, I want to reopen the card after answering and see what we
  chose, without accidentally changing it into a fresh prompt.
- **US-07-05-04** — As a host, I want the card to be invisible to households I did not invite to
  the sub-event, even though the layout is shared.
- **US-07-05-05** — As a host designing the page, I want to see the card in the preview with
  sample content, without being able to write real responses.

## 4. Entry Points

| Entry point                          | Route / control                   | Actor                     |
| ------------------------------------ | --------------------------------- | ------------------------- |
| `specialInvitation` card button      | Public invitation page            | Public guest              |
| The same block in the editor preview | `/dashboard/[eventSlug]/template` | Editor+ (button disabled) |

In the elegant template the block sits on the `accepted` preset layout
(`.../elegant/default-layout.ts:18`).

## 5. UX Flow

### Happy path

1. The block binds to a special invitation: the one whose `_id` matches the block's
   `specialEventId` config, or — when only one is accessible — that one
   (`.../blocks/special-invitation.tsx:31`).
2. The card renders the sub-event's **name, description, date and location sourced from the
   linked special invitation**, not from block config (`special-invitation.tsx:67`,
   `special-invitation-dialog.tsx:29`). The display template is chosen by the block's
   `specialTemplateId` — `elegant` (decorated card) or `with-image` (full-width photo)
   (`special-invitation.tsx:85`).
3. The guest presses the button, opening a shadcn `Dialog` (`special-invitation-dialog.tsx:145`).
4. The modal repeats the date (`EEEE d 'de' MMMM, p`, Spanish locale) and location with calendar
   and map-pin icons, then the description and a note
   (`special-invitation-dialog.tsx:155`–`:180`).
5. Below, one attending/declining radio pair per **eligible** guest — every guest on the
   invitation whose main `rsvpStatus` is not `declined` (`special-invitation-dialog.tsx:100`).
   Each is prefilled from `specialEvent.guestStatuses[guestId]` when that stored status is
   `attending` or `declined` (`:103`–`:111`).
6. Submit calls `submitPublicRsvp` with `guestUpdates: []` and one `specialEventRsvps` entry per
   eligible guest (`special-invitation-dialog.tsx:127`–`:136`). The empty `guestUpdates` array
   is what keeps this flow from touching main-event statuses.
7. On success the modal closes (`special-invitation-dialog.tsx:137`) and the toast
   `"¡Gracias! Tu confirmación fue recibida."` appears.

### Alternate & edge paths

- **A1** — The invitation has **no** access to any special invitation: `data.specialEvents` is
  empty, nothing binds, and on the live page the block returns `null`
  (`special-invitation.tsx:45`). Nothing renders — no heading, no placeholder.
- **A2** — Editor preview (`eventSlug`/`invitationSlug` absent): the block renders the sample
  card using `ELEGANT_COPY.dinnerName` / `dinnerDescription` with the button disabled
  (`special-invitation.tsx:40`, `:49`, `:67`).
- **A3** — Every eligible guest already has a stored `attending`/`declined` status: the button
  label switches from `confirmLabel` to `detailsLabel`, becoming a read-only "view details"
  affordance that opens the same modal with the saved choices selected
  (`special-invitation.tsx:54`–`:61`).
- **A4** — The block's `specialEventId` points at a special invitation this household cannot see:
  the `find` fails; if exactly one other is accessible the block silently binds to **that** one
  (`special-invitation.tsx:34`), otherwise nothing renders.
- **A5** — Every guest on the invitation declined the main event: `eligibleGuests` is empty,
  `canConfirm` is false and the button is disabled (`special-invitation.tsx:49`). In practice the
  invitation is then in the `declined` state, whose elegant preset omits this block anyway.
- **E1** — Not every eligible guest has answered in the modal: the submit button is disabled
  (`special-invitation-dialog.tsx:119`), and the guarded path toasts
  `"Por favor responde por cada invitado."` (`:124`).
- **E2** — The invitation's access row was revoked between load and submit: the server throws
  `"Invitation does not have access to this special event"` (`convex/guests.ts:661`) and the
  generic error toast appears; the modal stays open.
- **E3** — The special invitation was deactivated: `"Special event does not belong to this
event"` (`convex/guests.ts:648`).

## 6. States

| State             | Behavior                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | None of its own; the payload arrives with the page                                                                                                 |
| Empty             | No accessible special invitation → the block renders nothing on the live page                                                                      |
| Error             | Generic Spanish error toast; the modal remains open with the guest's choices intact                                                                |
| Success           | Modal closes, success toast, button label flips to `detailsLabel` on re-render                                                                     |
| Disabled / locked | Button disabled in the preview, when nothing is bound, or when no eligible guest exists; modal submit disabled until every eligible guest answered |
| Mobile            | Modal is `sm:max-w-sm` with `max-h-[90vh] overflow-y-auto` (`special-invitation-dialog.tsx:146`)                                                   |

## 7. UI Specification

### Screens & components

| Element                   | Component                   | Path                                              |
| ------------------------- | --------------------------- | ------------------------------------------------- |
| Block entry point         | `ElegantSpecialInvitation`  | `.../elegant/blocks/special-invitation.tsx:20`    |
| Display-template registry | `SPECIAL_TEMPLATES`         | `.../blocks/special-invitation.tsx:85`            |
| Decorated card            | `ElegantSpecialCard`        | `.../blocks/special-invitation.tsx:93`            |
| Photo card                | `WithImageSpecialCard`      | `.../blocks/special-invitation-with-image.tsx:16` |
| Date/location line        | `SpecialEventDetails`       | `.../blocks/special-invitation-dialog.tsx:29`     |
| RSVP modal                | `SpecialInvitationDialog`   | `.../blocks/special-invitation-dialog.tsx:84`     |
| Radio row                 | `CheckRow` (`type="radio"`) | `.../blocks/primitives.tsx:232`                   |
| Shared card props         | `SpecialCardProps`          | `.../blocks/special-invitation-dialog.tsx:67`     |

### Fields & validation

| Field              | Type                              | Required                      | Rule                                                             | Message                                   |
| ------------------ | --------------------------------- | ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Per-guest response | radio (`attending` \| `declined`) | Yes, for every eligible guest | `allAnswered` gates submit (`special-invitation-dialog.tsx:118`) | `"Por favor responde por cada invitado."` |

Block config fields the host authors (EP-08): `specialEventId` (select, sourced from the event's
special invitations), `specialTemplateId` (select), `confirmLabel`, `detailsLabel`, and `image`
for the `with-image` template. The card's name/description/date/location are **not** authorable
here — they come from the special invitation record (EP-06-F01).

### Copy deck

| Key                                  | Copy                                                                                                                                                              | Source                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `dinnerName` (preview sample)        | `"Una Noche para Compartir"`                                                                                                                                      | `.../elegant/default-copy.ts:38`               |
| `dinnerDescription` (preview sample) | `"Porque los mejores momentos comienzan alrededor de una mesa, los esperamos para compartir una cena especial y comenzar juntos este fin de semana inolvidable."` | `.../elegant/default-copy.ts:36`               |
| `dinnerConfirmLabel`                 | `"Confirmar asistencia"`                                                                                                                                          | `.../elegant/default-copy.ts:39`               |
| `dinnerDetailsLabel`                 | `"Ver detalles"`                                                                                                                                                  | `.../elegant/default-copy.ts:40`               |
| `dinnerModalTitle`                   | `"Confirma tu asistencia"`                                                                                                                                        | `.../elegant/default-copy.ts:41`               |
| `dinnerModalNote`                    | `"Indícanos quién podrá acompañarnos."`                                                                                                                           | `.../elegant/default-copy.ts:42`               |
| `dinnerAttendLabel`                  | `"Sí, asistiré"`                                                                                                                                                  | `.../elegant/default-copy.ts:43`               |
| `dinnerDeclineLabel`                 | `"No podré asistir"`                                                                                                                                              | `.../elegant/default-copy.ts:44`               |
| `dinnerModalSubmitLabel`             | `"Enviar"`                                                                                                                                                        | `.../elegant/default-copy.ts:45`               |
| Pending button label                 | `"Enviando…"`                                                                                                                                                     | `.../blocks/special-invitation-dialog.tsx:222` |
| Success toast                        | `"¡Gracias! Tu confirmación fue recibida."`                                                                                                                       | `.../blocks/special-invitation-dialog.tsx:114` |
| Error toast                          | `"No pudimos enviar tu confirmación. Inténtalo de nuevo."`                                                                                                        | `.../blocks/special-invitation-dialog.tsx:115` |
| Incomplete-answer toast              | `"Por favor responde por cada invitado."`                                                                                                                         | `.../blocks/special-invitation-dialog.tsx:124` |

`dinnerModalTitle` is defined but unused — the modal titles itself with the special invitation's
own `name` (`special-invitation-dialog.tsx:148`). The modal note, attend/decline labels and
submit label are read straight from `ELEGANT_COPY` and are **not** host-authorable.

## 8. Data Model

| Table                          | Fields                                                           | Read / Write                               | Index                                                   |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `invitationSpecialEventAccess` | —                                                                | Read (visibility, and re-checked on write) | `by_invitationId`, `by_invitationId_and_specialEventId` |
| `specialEvents`                | `name`, `description`, `date`, `location`, `isActive`, `eventId` | Read                                       | direct `db.get`                                         |
| `guestSpecialEventRsvps`       | `status`                                                         | **Upsert**                                 | `by_guestId`, `by_guestId_and_specialEventId`           |
| `guests`                       | `rsvpStatus`, names                                              | Read                                       | `by_invitationId`                                       |

A response writes **only** a `guestSpecialEventRsvps` row. There is no aggregate rollup onto the
guest or the invitation — the host counts responses by reading those rows (EP-06). Declining the
main event later deletes them (`convex/lib/guests.ts:55`), irreversibly.

## 9. Backend Contract

| Function                      | Type            | Args                                                                                                    | Returns | Guard                                      | Caps                     |
| ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------ | ------------------------ |
| `api.guests.submitPublicRsvp` | public mutation | `{eventSlug, invitationSlug, guestUpdates: [], specialEventRsvps: [{guestId, specialEventId, status}]}` | `void`  | none — data gating; per-entry access check | `specialEventRsvps` ≤100 |

Read path: `api.invitations.getPublicInvitation` / `getPublicInvitationByHost` supply
`specialEvents[]` with `guestStatuses` (`convex/invitations.ts:166`–`:183`).

## 10. Business Rules

### Visibility & binding

- **BR-07-05-01** `[AS-BUILT]` — The payload contains only special invitations the invitation has
  an access row for and that are `isActive` (`convex/invitations.ts:149`, `:155`).
- **BR-07-05-02** `[AS-BUILT]` — On the live page, a block with nothing bound renders `null`
  (`.../blocks/special-invitation.tsx:45`).
- **BR-07-05-03** `[AS-BUILT]` — Binding prefers the configured `specialEventId`; failing that, it
  falls back to the sole accessible special invitation, and only when exactly one is accessible
  (`special-invitation.tsx:34`).
- **BR-07-05-04** `[AS-BUILT]` — In the editor preview an unbound block still renders, using the
  sample name and description, with the button disabled (`special-invitation.tsx:40`, `:49`).
- **BR-07-05-05** `[AS-BUILT]` — The card's name, description, date and location come from the
  linked special invitation, never from block config (`special-invitation.tsx:67`,
  `special-invitation-dialog.tsx:36`).
- **BR-07-05-06** `[AS-BUILT]` — The display template is `specialTemplateId`, defaulting to
  `elegant`, with an unknown id falling back to `elegant` (`special-invitation.tsx:25`, `:63`).
- **BR-07-05-07** `[AS-BUILT]` — `SpecialEventDetails` renders nothing when the special invitation
  has neither a date nor a location (`special-invitation-dialog.tsx:41`).

### Answering

- **BR-07-05-08** `[AS-BUILT]` — Eligible guests are those whose main `rsvpStatus` is not
  `declined` (`special-invitation.tsx:48`, `special-invitation-dialog.tsx:100`).
- **BR-07-05-09** `[AS-BUILT]` — Materialized `+1` records **are** eligible rows in the modal; the
  filter excludes only declined guests, not `isPlusOne` (`special-invitation-dialog.tsx:100`).
- **BR-07-05-10** `[AS-BUILT]` — Each guest's radio is prefilled from
  `specialEvent.guestStatuses`, and a stored `pending` leaves the row unanswered
  (`special-invitation-dialog.tsx:106`).
- **BR-07-05-11** `[AS-BUILT]` — Submission requires every eligible guest to have answered
  (`special-invitation-dialog.tsx:118`, `:123`).
- **BR-07-05-12** `[AS-BUILT]` — Submission requires `eventSlug` and `invitationSlug`, so the
  editor preview cannot write (`special-invitation-dialog.tsx:119`, `:122`).
- **BR-07-05-13** `[AS-BUILT]` — The submission sends `guestUpdates: []`, so no main-event
  `rsvpStatus` is ever modified through this flow (`special-invitation-dialog.tsx:130`).
- **BR-07-05-14** `[AS-BUILT]` — The modal closes only on success (`special-invitation-dialog.tsx:137`).
- **BR-07-05-15** `[AS-BUILT]` — The button shows `detailsLabel` instead of `confirmLabel` once
  every eligible guest has a stored `attending` or `declined` status for the bound special
  invitation (`special-invitation.tsx:54`).
- **BR-07-05-16** `[AS-BUILT]` — The `detailsLabel` state is presentational only: the same modal
  opens and the same submission is still possible (`special-invitation.tsx:61`, the button's
  `onClick` is unchanged).
- **BR-07-05-17** `[AS-BUILT]` — The button is disabled when nothing is bound, in the preview, or
  when there are no eligible guests (`special-invitation.tsx:49`).

### Server enforcement

- **BR-07-05-18** `[AS-BUILT]` — Each `specialEventRsvps` entry's guest must belong to the
  resolved invitation (`convex/guests.ts:634`).
- **BR-07-05-19** `[AS-BUILT]` — The special event must exist, belong to the resolved event and be
  `isActive` (`convex/guests.ts:642`).
- **BR-07-05-20** `[AS-BUILT]` — The invitation must hold an `invitationSpecialEventAccess` row
  for it, re-checked at write time (`convex/guests.ts:652`).
- **BR-07-05-21** `[AS-BUILT]` — The write is an upsert keyed on
  `by_guestId_and_specialEventId` (`convex/guests.ts:666`, `:675`).
- **BR-07-05-22** `[AS-BUILT]` — A guest declining the main event in the **same** submission is
  skipped rather than erroring (`convex/guests.ts:638`).

## 11. Acceptance Criteria

- **AC-07-05-01** — **Given** an invitation with no access row **When** the page renders **Then**
  no special-invitation card appears anywhere on the page.
- **AC-07-05-02** — **Given** an invitation with access **When** the page renders **Then** the
  card shows the special invitation's own name, description, date and location.
- **AC-07-05-03** — **Given** the card **When** the button is pressed **Then** a modal opens
  listing one attending/declining pair per eligible guest.
- **AC-07-05-04** — **Given** one of two eligible guests has answered **When** the modal is open
  **Then** the modal's submit button is disabled.
- **AC-07-05-05** — **Given** both answered **When** submit is pressed **Then**
  `guestSpecialEventRsvps` rows exist with those statuses, the modal closes and the success toast
  appears.
- **AC-07-05-06** — **Given** the same submission **When** it completes **Then** no guest's
  main-event `rsvpStatus` has changed.
- **AC-07-05-07** — **Given** every eligible guest already has a stored status **When** the page
  renders **Then** the card button reads "Ver detalles" and the modal opens with those choices
  preselected.
- **AC-07-05-08** — **Given** a guest whose main RSVP is `declined` **When** the modal opens
  **Then** that guest has no row.
- **AC-07-05-09** — **Given** the Design Studio preview **When** the block renders **Then** the
  sample card appears with a disabled button.
- **AC-07-05-10** — **Given** a crafted submission for a special invitation the invitation has no
  access to **When** the mutation runs **Then** it throws
  `"Invitation does not have access to this special event"` and writes nothing.
- **AC-07-05-11** — **Given** a stored status of `pending` for a guest **When** the modal opens
  **Then** that guest's row is unanswered.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                                           |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------- |
| TC-07-05-01 | unit        | Binding: configured id, single-accessible fallback, multiple accessible with no config, unknown id |
| TC-07-05-02 | unit        | `hasResponded` label switch across mixed stored statuses incl. `pending`                           |
| TC-07-05-03 | unit        | `eligibleGuests` excludes declined, retains `+1`s                                                  |
| TC-07-05-04 | unit        | Prefill maps `attending`/`declined` and ignores `pending`                                          |
| TC-07-05-05 | unit        | `SpecialEventDetails` renders nothing with neither date nor location                               |
| TC-07-05-06 | integration | Upsert creates then updates a single row per (guest × special event)                               |
| TC-07-05-07 | integration | Access is re-checked at write time; revoked access is rejected                                     |
| TC-07-05-08 | integration | Inactive special event is rejected                                                                 |
| TC-07-05-09 | integration | `guestUpdates: []` leaves every main-event status untouched                                        |
| TC-07-05-10 | e2e         | Answer, reload, confirm "Ver detalles" and preselected choices                                     |
| TC-07-05-11 | e2e         | An invitation without access sees no card                                                          |

### Manual QA checklist

- [ ] The card is absent (not empty, not a placeholder) for an invitation without access
- [ ] The date renders in Spanish with a capitalized weekday
- [ ] Answers persist and repopulate after reload
- [ ] The button label flips to "Ver detalles" after everyone answered
- [ ] The modal is dismissible with Escape and traps focus
- [ ] Main-event statuses are unchanged after answering the sub-event

## 13. Non-Functional

| Concern          | Specification                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | ≤100 `specialEventRsvps` per submission; ≤2 special invitations per event (EP-06-F01)                                                       |
| Performance      | Statuses arrive with the page payload; one mutation per modal submission                                                                    |
| Security & authz | Access is enforced twice — read-side by the payload, write-side by the per-entry check at `convex/guests.ts:652`                            |
| Accessibility    | shadcn `Dialog` provides focus trap, Escape dismissal and a labelled title; the radio inputs share the `sr-only` limitation of `TODO-07-07` |
| i18n             | Spanish; only `confirmLabel` and `detailsLabel` are host-authorable                                                                         |
| Analytics        | None                                                                                                                                        |

## 14. TODOs & Open Questions

- **TODO-07-08** `[P2]` `[CHANGE]` — The modal treats materialized `+1` records as independent
  answering rows (`.../blocks/special-invitation-dialog.tsx:100` filters only on `declined`),
  while the main RSVP block deliberately excludes them
  (`.../blocks/rsvp.tsx:64`).
  - **Rationale:** The two flows disagree about who the answering parties are. A +1 whose name is
    the server placeholder "Acompañante de …" (EP-07-F03) appears as a row asking a question
    about a person nobody has named yet.
  - **Proposed rule:** One documented definition of "answering party" applies to every public
    block.
- **TODO-07-20** `[P2]` `[CHANGE]` — `detailsLabel` implies read-only but is not
  (`BR-07-05-16`): the modal remains fully submittable.
  - **Rationale:** Either the label is misleading or the intended read-only mode was never
    implemented.
  - **Proposed rule:** Either the "details" state genuinely disables submission, or the label
    reads as an edit affordance.
- **TODO-07-21** `[P2]` `[REMOVE]` — `ELEGANT_COPY.dinnerModalTitle`
  (`.../elegant/default-copy.ts:41`) has no reader; the modal title is the special invitation's
  `name` (`special-invitation-dialog.tsx:148`).
  - **Rationale:** Dead copy invites a host to "change" a string that renders nowhere.
  - **Proposed rule:** Remove the key, or wire it as the modal's heading.
- **TODO-07-22** `[P2]` `[CHANGE]` — When a block's configured `specialEventId` is not accessible
  but exactly one other special invitation is, the block silently binds to the _other_ one
  (`special-invitation.tsx:34`).
  - **Rationale:** A household can be shown a card the host bound to a different sub-event.
  - **Proposed rule:** A configured id that does not resolve renders nothing rather than
    substituting.
- **TODO-07-23** `[P2]` `[ADD]` — The modal's note, attend/decline labels and submit label are not
  block config fields, unlike the card's two button labels
  (`special-invitation-dialog.tsx:179`, `:194`, `:206`, `:222`).
  - **Rationale:** Partially authorable copy is confusing in the Design Studio.
  - **Proposed rule:** Every modal string becomes a `ConfigField`.

### Open questions

- **Q1** — Should responding to a special invitation be possible before the main RSVP is
  answered, given the card sits on the `accepted` layout but eligibility only excludes declined
  guests (so `pending` guests can answer the sub-event first)?
- **Q2** — Should a household be able to change a special-invitation answer after the deadline,
  given the modal permits resubmission indefinitely?

## 15. Traceability

| Concern                         | Source                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Block entry point               | `src/components/public-invitation/templates/elegant/blocks/special-invitation.tsx:20` |
| Binding logic                   | `.../blocks/special-invitation.tsx:31`                                                |
| Render-nothing rule             | `.../blocks/special-invitation.tsx:45`                                                |
| Eligible guests / `canConfirm`  | `.../blocks/special-invitation.tsx:48`                                                |
| `hasResponded` label switch     | `.../blocks/special-invitation.tsx:54`                                                |
| Display-template registry       | `.../blocks/special-invitation.tsx:85`                                                |
| Decorated card                  | `.../blocks/special-invitation.tsx:93`                                                |
| Photo card                      | `.../blocks/special-invitation-with-image.tsx:16`                                     |
| Details line                    | `.../blocks/special-invitation-dialog.tsx:29`                                         |
| Modal                           | `.../blocks/special-invitation-dialog.tsx:84`                                         |
| Eligibility filter              | `.../blocks/special-invitation-dialog.tsx:100`                                        |
| Prefill                         | `.../blocks/special-invitation-dialog.tsx:103`                                        |
| Completeness gate               | `.../blocks/special-invitation-dialog.tsx:118`                                        |
| Submission (`guestUpdates: []`) | `.../blocks/special-invitation-dialog.tsx:127`                                        |
| Copy                            | `.../elegant/default-copy.ts:36`–`:45`                                                |
| Block placement                 | `.../elegant/default-layout.ts:18`                                                    |
| Payload `guestStatuses`         | `convex/invitations.ts:166`                                                           |
| Access filter (read)            | `convex/invitations.ts:149`                                                           |
| Guest ownership check           | `convex/guests.ts:634`                                                                |
| Special-event ownership check   | `convex/guests.ts:642`                                                                |
| Access check (write)            | `convex/guests.ts:652`                                                                |
| Upsert                          | `convex/guests.ts:666`                                                                |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
