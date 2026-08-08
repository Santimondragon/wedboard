---
id: EP-07-F06
title: Message to the Hosts
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-07-F01, EP-07-F02, EP-13-F01]
---

# EP-07-F06 — Message to the Hosts

## 1. Summary

When a household cannot attend, the invitation stops asking for logistics and offers something
else: a short note to the couple. The `guestMessage` block — placed on the `declined` layout in
the elegant template's preset — is a name field and a message field that write a `guestMessages`
row. The host reads them at `/dashboard/[eventSlug]/messages` (EP-13). It is the only public
write in the product that creates a new record rather than updating a guest's own data.

## 2. Actors & Permissions

| Actor                | Access                                                                                       | Notes                                              |
| -------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Owner                | Reads messages in the host inbox (EP-13)                                                     |                                                    |
| Co-owner (`planner`) | Same                                                                                         |                                                    |
| Editor               | Same — `listMessagesByEvent` uses the default `requireEventEditor` (`convex/messages.ts:13`) |                                                    |
| Viewer               | None                                                                                         |                                                    |
| Public guest         | Writes a message against their own invitation                                                | No auth; the invitation is re-resolved server-side |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-06-01** — As a public guest who cannot attend, I want to leave the couple a few words,
  so that declining does not feel like a dead end.
- **US-07-06-02** — As a public guest, I want my name prefilled so that leaving a note takes one
  action.
- **US-07-06-03** — As a host, I want each message tied to the invitation it came from, so I know
  who wrote it.
- **US-07-06-04** — As a host, I want a cap on messages per invitation so that the form cannot be
  used to flood my inbox.

## 4. Entry Points

| Entry point                             | Route / control                                                 | Actor                         |
| --------------------------------------- | --------------------------------------------------------------- | ----------------------------- |
| `guestMessage` block on the public page | The invitation page when the resolved layout contains the block | Public guest                  |
| The same block in the editor preview    | `/dashboard/[eventSlug]/template`                               | Editor+ (submission disabled) |
| Host inbox                              | `/dashboard/[eventSlug]/messages` (EP-13)                       | Editor+                       |

The elegant `declined` preset layout is `hero → guestMessage → footer`
(`.../elegant/default-layout.ts:36`–`:42`). The block can be placed on any variant by the host
(EP-08).

## 5. UX Flow

### Happy path

1. Every guest on the invitation has declined, so `rsvpState` resolves to `declined`
   (EP-07-F01) and the `declined` layout renders.
2. The block shows the headline, an explanatory note, a name input prefilled with the
   invitation's **first** guest's full name (`.../blocks/guest-message.tsx:25`), and an empty
   textarea (4 rows).
3. The guest writes a message and presses "Enviar".
4. `handleSubmit` trims both fields and calls `api.messages.submitGuestMessage`
   (`guest-message.tsx:45`).
5. The server trims again, validates lengths, re-resolves event → invitation, enforces the
   20-message cap and inserts the row with `createdAt: Date.now()`
   (`convex/messages.ts:44`–`:89`).
6. Success toast `"¡Gracias! Tu mensaje fue enviado."`, and the textarea is cleared while the
   name is kept (`guest-message.tsx:51`).

### Alternate & edge paths

- **A1** — The invitation has no linked guests: the name field starts empty
  (`guest-message.tsx:26`).
- **A2** — Editor preview: `canSubmit` is false and the button is disabled
  (`guest-message.tsx:37`, `:90`).
- **A3** — The guest submits several messages: allowed, up to the cap.
- **E1** — Empty or whitespace-only message: the client toasts
  `"Escribe un mensaje antes de enviar."` and does not call the mutation
  (`guest-message.tsx:41`).
- **E2** — Message longer than 1000 characters: the client does not check, so the mutation throws
  `"Message is too long"` and the guest sees the generic error toast
  (`convex/messages.ts:51`).
- **E3** — Name longer than 200 characters: `"Name is too long"`, same generic toast
  (`convex/messages.ts:54`).
- **E4** — The invitation already has 20 messages: `"Too many messages for this invitation"`,
  same generic toast (`convex/messages.ts:80`).
- **E5** — The event was archived or the invitation deactivated since load:
  `"Invitation not found or not active"` (`convex/messages.ts:61`, `:69`).

## 6. States

| State             | Behavior                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Loading           | None of its own                                                                                                |
| Empty             | Textarea empty; the name may be empty when the invitation has no guests                                        |
| Error             | Generic Spanish error toast; the typed message is preserved so the guest can retry                             |
| Success           | Success toast; the textarea clears, the name persists; **no record of the sent message is shown to the guest** |
| Disabled / locked | Button disabled in the editor preview and while pending                                                        |
| Mobile            | Full-width inputs inside the 390px card                                                                        |

## 7. UI Specification

### Screens & components

| Element         | Component             | Path                                                                             |
| --------------- | --------------------- | -------------------------------------------------------------------------------- |
| Block           | `ElegantGuestMessage` | `src/components/public-invitation/templates/elegant/blocks/guest-message.tsx:12` |
| Submit button   | `WeddingButton`       | `.../blocks/primitives.tsx`                                                      |
| Host inbox list | `MessageList`         | `src/components/messages/message-list.tsx` (EP-13)                               |

### Fields & validation

| Field   | Type              | Required | Rule                                                                                                                               | Message                                                                                                                        |
| ------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Name    | text              | No       | Trimmed; server max 200 (`convex/messages.ts:54`)                                                                                  | `"Name is too long"` (server, not surfaced)                                                                                    |
| Message | textarea (4 rows) | Yes      | Trimmed; non-empty checked client-side (`guest-message.tsx:41`) and server-side (`convex/messages.ts:48`); server max 1000 (`:51`) | `"Escribe un mensaje antes de enviar."` (client) / `"Message cannot be empty"`, `"Message is too long"` (server, not surfaced) |

`guestMessageSchema` (`src/lib/validations/guest-message.ts:3`) mirrors these limits — name
optional ≤200, message 1–1000 — but the block does **not** use it; validation is the inline
emptiness check plus the server. Neither input carries a `maxLength` attribute.

### Copy deck

| Key                   | Copy                                                                                              | Source                            |
| --------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------- |
| `messageHeadline`     | `"Déjanos un mensaje"`                                                                            | `.../elegant/default-copy.ts:48`  |
| `messageNote`         | `"Sentimos que no puedas acompañarnos. Si quieres, déjanos unas palabras: nos encantará leerte."` | `.../elegant/default-copy.ts:49`  |
| `messageNameLabel`    | `"Tu nombre"`                                                                                     | `.../elegant/default-copy.ts:51`  |
| `messageMessageLabel` | `"Tu mensaje"`                                                                                    | `.../elegant/default-copy.ts:52`  |
| `messagePlaceholder`  | `"Escribe aquí…"`                                                                                 | `.../elegant/default-copy.ts:53`  |
| `messageSubmitLabel`  | `"Enviar"`                                                                                        | `.../elegant/default-copy.ts:54`  |
| Pending button label  | `"Enviando…"`                                                                                     | `.../blocks/guest-message.tsx:91` |
| Success toast         | `"¡Gracias! Tu mensaje fue enviado."`                                                             | `.../blocks/guest-message.tsx:32` |
| Error toast           | `"No pudimos enviar tu mensaje. Inténtalo de nuevo."`                                             | `.../blocks/guest-message.tsx:33` |
| Empty-message toast   | `"Escribe un mensaje antes de enviar."`                                                           | `.../blocks/guest-message.tsx:42` |

Every one of the six `ELEGANT_COPY` strings above is a block config field
(`.../elegant/default-copy.ts:91`–`:98`), so the host can reword all of them (EP-08).

## 8. Data Model

| Table           | Fields                                                    | Read / Write | Index                                                   |
| --------------- | --------------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `events`        | `slug`, `status`                                          | Read         | `by_slug`                                               |
| `invitations`   | `slug`, `isActive`                                        | Read         | `by_eventId_and_slug`                                   |
| `guestMessages` | `eventId`, `invitationId`, `name`, `message`, `createdAt` | **Insert**   | `by_invitationId` (cap check), `by_eventId` (host read) |

Messages are **append-only from the public side**: there is no public query to read them back, no
edit and no delete. The guest gets one toast and no receipt. A message is not linked to a
`guests` row — only to the invitation — so the stored `name` is free text, not an identity.

`guestMessages` rows are deleted only by the event cascade delete (EP-02-F06).

## 9. Backend Contract

| Function                           | Type            | Args                                         | Returns                                                           | Guard                                                                   | Caps                                                         |
| ---------------------------------- | --------------- | -------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `api.messages.submitGuestMessage`  | public mutation | `{eventSlug, invitationSlug, name, message}` | `void`                                                            | none — data gating via `resolvePublicEvent` / `resolvePublicInvitation` | message 1–1000 chars; name ≤200; ≤20 messages per invitation |
| `api.messages.listMessagesByEvent` | query           | `{eventId}`                                  | `[{_id, name, message, createdAt, invitationTitle}]` newest first | `requireEventEditor`                                                    | `.take(500)`                                                 |

Failure modes:

| Condition                          | Message                                   | Source                  |
| ---------------------------------- | ----------------------------------------- | ----------------------- |
| Trimmed message empty              | `"Message cannot be empty"`               | `convex/messages.ts:49` |
| Message > 1000                     | `"Message is too long"`                   | `convex/messages.ts:52` |
| Name > 200                         | `"Name is too long"`                      | `convex/messages.ts:55` |
| Event unresolvable / archived      | `"Invitation not found or not active"`    | `convex/messages.ts:61` |
| Invitation unresolvable / inactive | `"Invitation not found or not active"`    | `convex/messages.ts:69` |
| Invitation already at 20 messages  | `"Too many messages for this invitation"` | `convex/messages.ts:80` |

Note the validation order: length checks run **before** the invitation is resolved
(`convex/messages.ts:44`–`:56`), so an over-long message is rejected without a database read.

## 10. Business Rules

- **BR-07-06-01** `[AS-BUILT]` — The name field is prefilled with the invitation's **first**
  guest's full name, or left empty when there are no guests
  (`.../blocks/guest-message.tsx:25`).
- **BR-07-06-02** `[AS-BUILT]` — Both fields are trimmed on the client before submission
  (`guest-message.tsx:48`, `:49`) and trimmed again on the server
  (`convex/messages.ts:45`, `:46`).
- **BR-07-06-03** `[AS-BUILT]` — A whitespace-only message is refused client-side with a Spanish
  toast and never reaches the mutation (`guest-message.tsx:41`).
- **BR-07-06-04** `[AS-BUILT]` — A trimmed-empty message is refused server-side
  (`convex/messages.ts:48`).
- **BR-07-06-05** `[AS-BUILT]` — The message is capped at 1000 characters after trimming
  (`convex/messages.ts:51`).
- **BR-07-06-06** `[AS-BUILT]` — The name is capped at 200 characters after trimming
  (`convex/messages.ts:54`); an empty name is accepted.
- **BR-07-06-07** `[AS-BUILT]` — Length validation runs before the event/invitation lookup
  (`convex/messages.ts:44`).
- **BR-07-06-08** `[AS-BUILT]` — The message is stored against the invitation resolved from the
  submitted slugs, never against a client-supplied id (`convex/messages.ts:59`, `:63`).
- **BR-07-06-09** `[AS-BUILT]` — An invitation may hold at most 20 messages; the 21st is rejected
  (`convex/messages.ts:8`, `:78`, `:79`).
- **BR-07-06-10** `[AS-BUILT]` — `createdAt` is the server's `Date.now()`, not a client value
  (`convex/messages.ts:88`).
- **BR-07-06-11** `[AS-BUILT]` — Submission requires `eventSlug` and `invitationSlug`, so the
  Design Studio preview cannot write (`guest-message.tsx:37`, `:40`).
- **BR-07-06-12** `[AS-BUILT]` — On success the message field is cleared and the name is retained
  (`guest-message.tsx:51`).
- **BR-07-06-13** `[AS-BUILT]` — The mutation writes no `activityLogs` row.
- **BR-07-06-14** `[AS-BUILT]` — No public query returns stored messages; the guest cannot read
  back what they or anyone else sent.
- **BR-07-06-15** `[AS-BUILT]` — The host's list is ordered newest first and enriched with the
  invitation title, falling back to `"—"` when the invitation is gone
  (`convex/messages.ts:21`, `:30`).

## 11. Acceptance Criteria

- **AC-07-06-01** — **Given** every guest on an invitation declined **When** the page loads
  **Then** the message block renders with the name prefilled from the first guest.
- **AC-07-06-02** — **Given** a message is typed **When** submit is pressed **Then** a
  `guestMessages` row exists for that invitation, the success toast appears and the textarea is
  cleared while the name remains.
- **AC-07-06-03** — **Given** the textarea contains only spaces **When** submit is pressed
  **Then** `"Escribe un mensaje antes de enviar."` is shown and no mutation runs.
- **AC-07-06-04** — **Given** a 1001-character message **When** submitted **Then** the mutation
  throws and nothing is inserted.
- **AC-07-06-05** — **Given** a 201-character name **When** submitted **Then** the mutation throws
  and nothing is inserted.
- **AC-07-06-06** — **Given** an invitation already holding 20 messages **When** a 21st is
  submitted **Then** it is rejected and the count stays 20.
- **AC-07-06-07** — **Given** the event was archived after the page loaded **When** submit is
  pressed **Then** the mutation throws `"Invitation not found or not active"`.
- **AC-07-06-08** — **Given** the Design Studio preview **When** the block renders **Then** the
  submit button is disabled.
- **AC-07-06-09** — **Given** a submitted message **When** the host opens
  `/dashboard/[eventSlug]/messages` **Then** the message appears newest-first with its invitation
  title.
- **AC-07-06-10** — **Given** a submitted message **When** the guest reloads the page **Then** no
  record of it is visible to them.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------------ |
| TC-07-06-01 | unit        | Name prefill: with guests, without guests                                      |
| TC-07-06-02 | unit        | Whitespace-only message is blocked client-side                                 |
| TC-07-06-03 | unit        | `canSubmit` false without slugs                                                |
| TC-07-06-04 | integration | Insert stores trimmed values and a server `createdAt`                          |
| TC-07-06-05 | integration | Boundary lengths: 1000 accepted, 1001 rejected; 200 accepted, 201 rejected     |
| TC-07-06-06 | integration | The 20-message cap rejects the 21st                                            |
| TC-07-06-07 | integration | Archived event and inactive invitation both reject                             |
| TC-07-06-08 | integration | Length validation precedes lookup (invalid slug + long message → length error) |
| TC-07-06-09 | integration | `listMessagesByEvent` orders newest-first and resolves the invitation title    |
| TC-07-06-10 | e2e         | Decline all guests, leave a message, verify it in the host inbox               |

### Manual QA checklist

- [ ] Name is prefilled and editable
- [ ] Empty message shows the Spanish inline toast
- [ ] Textarea clears on success but the name survives
- [ ] Paste a >1000-character message and confirm the generic error toast (no character counter exists)
- [ ] Submit 20 messages, then confirm the 21st fails
- [ ] Message appears in the host inbox with the right invitation title

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | Message 1–1000 chars, name ≤200, 20 messages per invitation, host list `.take(500)`                                                                                                              |
| Performance      | One indexed read (`by_invitationId`, `take(21)`) plus one insert                                                                                                                                 |
| Security & authz | No auth; the invitation is re-resolved from slugs. The 20-per-invitation cap is the only spam guard — there is **no rate limiting** (`TODO-07-02`) and the content is not sanitized or moderated |
| Accessibility    | Both fields use real `<label>` wrappers with visible text (`guest-message.tsx:65`, `:76`); no `maxLength`, no character counter, no `aria-live` feedback                                         |
| i18n             | Spanish; all six visible strings are host-authorable                                                                                                                                             |
| Analytics        | None                                                                                                                                                                                             |

## 14. TODOs & Open Questions

- **TODO-07-09** `[P2]` `[ADD]` — The form enforces no client-side length limits and never
  surfaces the 20-message cap. The inputs carry no `maxLength`
  (`.../blocks/guest-message.tsx:69`, `:80`), `guestMessageSchema` is unused, and every
  server rejection collapses into one generic Spanish toast.
  - **Rationale:** A guest who writes a long note loses it to an error that does not say why.
  - **Proposed rule:** The textarea enforces 1000 characters with a visible counter, the name
    field 200, and the cap message is surfaced in Spanish.
- **TODO-07-24** `[P2]` `[ADD]` — The guest gets no receipt: no public read-back, no
  confirmation panel, and the product sends no email at all.
  - **Rationale:** After the toast fades there is no evidence the note was delivered.
  - **Proposed rule:** After a successful submission the block renders the sent message in place
    of the form.
- **TODO-07-25** `[P2]` `[ADD]` — Messages are attributed only by free-text name; the writing
  guest is not linked (`guestMessages` has no `guestId`).
  - **Rationale:** The host cannot tell which member of a household wrote a note, and the
    prefilled name is always the first guest's.
  - **Proposed rule:** Record the invitation's guest ids or an explicit selection alongside the
    message.
- **TODO-07-26** `[P2]` `[ADD]` — Message content is stored and rendered without moderation or
  any host-side delete.
  - **Rationale:** With no rate limiting, 20 abusive messages per invitation are permanent.
  - **Proposed rule:** The host can delete a message from the inbox (EP-13).

### Open questions

- **Q1** — Should the block appear on the `pending` and `accepted` layouts too, so attending
  guests can also leave a note?
- **Q2** — Should the cap be per invitation (today) or per invitation per time window, given the
  cap is the only spam control?

## 15. Traceability

| Concern                           | Source                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Block                             | `src/components/public-invitation/templates/elegant/blocks/guest-message.tsx:12` |
| Name prefill                      | `.../blocks/guest-message.tsx:25`                                                |
| Empty-message guard               | `.../blocks/guest-message.tsx:41`                                                |
| Preview gate                      | `.../blocks/guest-message.tsx:37`                                                |
| Clear-on-success                  | `.../blocks/guest-message.tsx:51`                                                |
| Toasts                            | `.../blocks/guest-message.tsx:32`, `:33`, `:42`                                  |
| Copy                              | `.../elegant/default-copy.ts:48`–`:54`                                           |
| Config fields                     | `.../elegant/default-copy.ts:91`                                                 |
| Block placement (declined preset) | `.../elegant/default-layout.ts:39`                                               |
| Mutation                          | `convex/messages.ts:37`                                                          |
| Length caps                       | `convex/messages.ts:6`, `:7`, `:48`–`:56`                                        |
| Slug re-resolution                | `convex/messages.ts:59`                                                          |
| 20-message cap                    | `convex/messages.ts:8`, `:73`                                                    |
| Insert                            | `convex/messages.ts:83`                                                          |
| Host read                         | `convex/messages.ts:10`                                                          |
| Zod mirror (unused)               | `src/lib/validations/guest-message.ts:3`                                         |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
