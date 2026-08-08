---
id: EP-07-F04
title: Dietary Preferences
epic: EP-07 Guest Experience
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-07-F01, EP-07-F02, EP-11-F01]
---

# EP-07-F04 — Dietary Preferences

> **⚠️ This feature carries a P0 defect.** `DEF-07-01` — submitting the dietary form
> **overwrites every guest on the invitation with `rsvpStatus: "attending"`**, silently
> reversing a guest who had declined, after the decline cascade has already destroyed that
> guest's associated data. Read §14 before relying on any behavior described here.

## 1. Summary

Once a household is attending, the invitation asks what they can and cannot eat. The
`allergies` block presents, per guest, a two-option toggle ("no allergies" / "yes, some"), a
checklist of common restrictions, and a free-text "other" field. Submitting joins the answers
into one comma-separated string per guest and stores it on `guests.allergies`, which the host
reads in the guest table and the catering views (EP-11). It reuses `guests.submitPublicRsvp`
rather than having a mutation of its own — the root cause of `DEF-07-01`.

## 2. Actors & Permissions

| Actor                | Access                                                         | Notes                                                          |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| Owner                | Reads and edits `allergies` in the dashboard (EP-04-F03)       |                                                                |
| Co-owner (`planner`) | Same                                                           |                                                                |
| Editor               | Same                                                           |                                                                |
| Viewer               | None                                                           |                                                                |
| Public guest         | Writes `allergies` for **every** guest on their own invitation | Via `guests.submitPublicRsvp`; ownership validated server-side |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-04-01** — As a public guest, I want to declare my allergies and dietary restrictions,
  so that the catering accounts for them.
- **US-07-04-02** — As a public guest, I want to answer for each person in my household
  separately, because our diets differ.
- **US-07-04-03** — As a public guest, I want to add a restriction that is not on the list.
- **US-07-04-04** — As a host, I want the options list to be mine to author, so it matches the
  menu I am actually serving.
- **US-07-04-05** — As a public guest, I want answering the food question **not** to change
  whether anyone in my household is attending. _(Violated today — `DEF-07-01`.)_

## 4. Entry Points

| Entry point                             | Route / control                                                  | Actor                         |
| --------------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| `allergies` block on the public page    | The invitation page, when the resolved layout contains the block | Public guest                  |
| `allergies` block in the editor preview | `/dashboard/[eventSlug]/template`                                | Editor+ (submission disabled) |

In the elegant template the block sits on the **`accepted`** preset layout only
(`.../elegant/default-layout.ts:16`); the `pending` and `declined` presets omit it.

## 5. UX Flow

### Happy path

1. The invitation is in the `accepted` state, so the layout containing the `allergies` block
   renders.
2. The block lists **every** guest in `data.guests` — including materialized +1 records
   (`.../blocks/allergies.tsx:195`).
3. Each guest starts on `"No, como de todo"` (`allergies.tsx:21`, `:151`).
4. Choosing `"Sí, tengo algunas"` reveals the checklist plus an "Otra:" text field
   (`allergies.tsx:107`).
5. On submit, each guest's answer is flattened by `buildAllergies` into a comma-separated string
   — an unticked toggle yields `""` (`allergies.tsx:28`).
6. `handleSubmit` builds one `guestUpdates` entry per guest carrying
   `rsvpStatus: "attending"` and the `allergies` string, and calls `submitPublicRsvp`
   (`allergies.tsx:165`).
7. Success toast: `"¡Gracias! Guardamos tus preferencias alimentarias."`

### Alternate & edge paths

- **A1** — The invitation has no guests: the block renders the question text alone and submitting
  toasts `"No hay invitados para registrar."` without calling the mutation
  (`allergies.tsx:191`, `:170`).
- **A2** — The host authored a custom `options` list: it replaces the six defaults
  (`allergies.tsx:146`).
- **A3** — Editor preview: `canSubmit` is false, so the button is disabled
  (`allergies.tsx:160`, `:213`).
- **A4** — The guest reloads after submitting: every answer resets to "no allergies" — the block
  never reads the stored `guests.allergies` (`allergies.tsx:151`; `TODO-07-05`).
- **E1** — Mutation failure: `"No pudimos guardar tus preferencias. Inténtalo de nuevo."`
- **E2** — **A guest on this invitation had declined**: submitting this form flips them back to
  `attending` (`DEF-07-01`).

## 6. States

| State             | Behavior                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| Loading           | None of its own                                                         |
| Empty             | Zero guests → the question line renders instead of the per-guest rows   |
| Error             | Generic Spanish error toast; local answers are preserved                |
| Success           | Success toast; the block stays on the page with its state unchanged     |
| Disabled / locked | Button disabled in the editor preview and while the mutation is pending |
| Mobile            | Full-width pill toggle and stacked check rows in the 390px card         |

## 7. UI Specification

### Screens & components

| Element                | Component                      | Path                                                                          |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| Block                  | `ElegantAllergies`             | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:138` |
| Per-guest row          | `GuestAllergyRow`              | `.../blocks/allergies.tsx:77`                                                 |
| Two-option pill toggle | `AllergyToggle`                | `.../blocks/allergies.tsx:34`                                                 |
| Option checkbox        | `CheckRow` (`type="checkbox"`) | `.../blocks/primitives.tsx:232`                                               |
| Answer flattener       | `buildAllergies`               | `.../blocks/allergies.tsx:28`                                                 |

### Fields & validation

| Field               | Type              | Required              | Rule                                                            | Message                                       |
| ------------------- | ----------------- | --------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Has restrictions    | two-button toggle | No — defaults to "no" | `has: false` yields an empty stored string (`allergies.tsx:29`) | —                                             |
| Restriction options | checkbox set      | No                    | Values are the option labels themselves                         | —                                             |
| "Otra:"             | text              | No                    | Trimmed and appended to the joined list (`allergies.tsx:30`)    | —                                             |
| Stored `allergies`  | string            | —                     | Server cap 1000 chars (`convex/guests.ts:551`)                  | `"Allergies text is too long"` (not surfaced) |

The `AllergyToggle` uses plain `<button>` elements, not radio inputs (`allergies.tsx:49`,
`:60`) — it is not exposed as a radio group to assistive technology.

### Copy deck

| Key                    | Copy                                                                                                | Source                           |
| ---------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------- |
| `foodHeadline`         | `"Comida"`                                                                                          | `.../elegant/default-copy.ts:17` |
| `foodNote`             | `"Por favor, indícanos si tienes alguna alergia o restricción alimentaria para tenerlo en cuenta:"` | `.../elegant/default-copy.ts:18` |
| `foodQuestion`         | `"¿Tienes alguna alergia o restricción alimentaria?"`                                               | `.../elegant/default-copy.ts:28` |
| `foodNoneLabel`        | `"No, como de todo"`                                                                                | `.../elegant/default-copy.ts:29` |
| `foodHasLabel`         | `"Sí, tengo algunas"`                                                                               | `.../elegant/default-copy.ts:30` |
| `foodOtherLabel`       | `"Otra:"`                                                                                           | `.../elegant/default-copy.ts:31` |
| `foodOtherPlaceholder` | `"Cuéntanos…"`                                                                                      | `.../elegant/default-copy.ts:32` |
| `foodSubmitLabel`      | `"Enviar"`                                                                                          | `.../elegant/default-copy.ts:33` |
| `foodOptions[0]`       | `"Frutos secos"`                                                                                    | `.../elegant/default-copy.ts:21` |
| `foodOptions[1]`       | `"Mariscos / pescados"`                                                                             | `.../elegant/default-copy.ts:22` |
| `foodOptions[2]`       | `"Lácteos"`                                                                                         | `.../elegant/default-copy.ts:23` |
| `foodOptions[3]`       | `"Gluten"`                                                                                          | `.../elegant/default-copy.ts:24` |
| `foodOptions[4]`       | `"Huevo"`                                                                                           | `.../elegant/default-copy.ts:25` |
| `foodOptions[5]`       | `"Vegetariano / Vegano"`                                                                            | `.../elegant/default-copy.ts:26` |
| Pending button label   | `"Enviando…"`                                                                                       | `.../blocks/allergies.tsx:214`   |
| Success toast          | `"¡Gracias! Guardamos tus preferencias alimentarias."`                                              | `.../blocks/allergies.tsx:156`   |
| Error toast            | `"No pudimos guardar tus preferencias. Inténtalo de nuevo."`                                        | `.../blocks/allergies.tsx:157`   |
| No-guests toast        | `"No hay invitados para registrar."`                                                                | `.../blocks/allergies.tsx:171`   |

## 8. Data Model

| Table                    | Fields       | Read / Write                                                 | Index             |
| ------------------------ | ------------ | ------------------------------------------------------------ | ----------------- |
| `guests`                 | `allergies`  | **Write**                                                    | `by_invitationId` |
| `guests`                 | `rsvpStatus` | **Write — unconditionally set to `attending`** (`DEF-07-01`) | `by_invitationId` |
| `guestSpecialEventRsvps` | —            | Not written by this block                                    | —                 |

The stored value is a single flat string, e.g. `"Gluten, Lácteos, sin cebolla"`. There is no
structured representation, so the host reads free text and the checklist selections are not
separately queryable.

**Side effects via the shared mutation.** Because the block posts `rsvpStatus: "attending"`, a
guest who was `declined` transitions **out of** declined. `applyDeclineEffects` only runs on the
transition _into_ `declined` (`convex/guests.ts:583`), so nothing is restored — the special-
invitation RSVP rows and the +1 destroyed at decline time stay destroyed.

## 9. Backend Contract

| Function                      | Type            | Args                                                                                         | Returns | Guard              | Caps                                        |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------------------- | ------- | ------------------ | ------------------------------------------- |
| `api.guests.submitPublicRsvp` | public mutation | `{eventSlug, invitationSlug, guestUpdates: [{guestId, rsvpStatus: "attending", allergies}]}` | `void`  | none — data gating | `guestUpdates` ≤20; `allergies` ≤1000 chars |

No dedicated dietary mutation exists. `menuOptionId` and `drinkOptionId` are accepted by the
mutation (`convex/guests.ts:478`, `:479`) but **no guest-facing block sends them** — the elegant
template registers no `menuSelection` or `drinkSelection` component
(`.../elegant/blocks/index.ts:15`–`:27`). See `TODO-07-12`.

## 10. Business Rules

- **BR-07-04-01** `[AS-BUILT]` — Every guest in the payload gets their own answer row, keyed by
  guest id (`.../blocks/allergies.tsx:151`, `:195`).
- **BR-07-04-02** `[AS-BUILT]` — Each guest defaults to "no restrictions"
  (`allergies.tsx:21`).
- **BR-07-04-03** `[AS-BUILT]` — The checklist and the "other" field render only while the guest's
  toggle is on "yes" (`allergies.tsx:107`).
- **BR-07-04-04** `[AS-BUILT]` — A guest answering "no" stores the empty string, clearing any
  previously stored value (`allergies.tsx:29`).
- **BR-07-04-05** `[AS-BUILT]` — A guest answering "yes" stores the selected option labels and the
  trimmed "other" text joined by `", "`, with empty parts dropped (`allergies.tsx:30`).
- **BR-07-04-06** `[AS-BUILT]` — The options list comes from the block's `options` config when
  present, otherwise from `ELEGANT_COPY.foodOptions` (`allergies.tsx:146`).
- **BR-07-04-07** `[AS-BUILT]` — Submission requires `eventSlug` and `invitationSlug`, so the
  button is disabled in the Design Studio preview (`allergies.tsx:160`).
- **BR-07-04-08** `[AS-BUILT]` — An invitation with zero guests short-circuits with a toast and
  never calls the mutation (`allergies.tsx:170`).
- **BR-07-04-09** `[AS-BUILT]` — The block submits `rsvpStatus: "attending"` for every guest it
  renders (`allergies.tsx:167`). **This rule is the defect** — it is documented here because it
  is what the code does, and it is filed as `DEF-07-01`/`DEF-07-02` in §14.
- **BR-07-04-10** `[AS-BUILT]` — The server caps `allergies` at 1000 characters
  (`convex/guests.ts:551`); the client enforces no limit.
- **BR-07-04-11** `[AS-BUILT]` — Local answer state is never seeded from the stored
  `guests.allergies` (`allergies.tsx:151`).

## 11. Acceptance Criteria

- **AC-07-04-01** — **Given** an invitation with two attending guests **When** guest A selects
  "Gluten" and guest B stays on "No, como de todo" **Then** A's `allergies` is `"Gluten"` and B's
  is `""`.
- **AC-07-04-02** — **Given** a guest selects "Lácteos" and types "sin cebolla" in "Otra:"
  **When** submitted **Then** the stored value is `"Lácteos, sin cebolla"`.
- **AC-07-04-03** — **Given** the host authored a custom `options` list **When** the block renders
  **Then** only the authored options appear.
- **AC-07-04-04** — **Given** the Design Studio preview **When** the block renders **Then** the
  submit button is disabled.
- **AC-07-04-05** — **Given** an invitation with zero guests **When** submit is pressed **Then**
  `"No hay invitados para registrar."` is shown and no mutation runs.
- **AC-07-04-06** — **Given** a 1001-character combined answer **When** submitted **Then** the
  mutation throws and the generic error toast appears.
- **AC-07-04-07** — _(Regression guard for `DEF-07-01`.)_ **Given** an invitation with one
  `attending` guest and one `declined` guest **When** the dietary form is submitted **Then** the
  declined guest's `rsvpStatus` remains `declined`. **This fails today.**
- **AC-07-04-08** — _(Regression guard for `DEF-07-02`.)_ **Given** an invitation containing a
  materialized +1 **When** the dietary form is submitted **Then** the submission addresses only
  the guests the form is entitled to write. **Currently the +1 is included.**

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                                 |
| ----------- | ----------- | ---------------------------------------------------------------------------------------- |
| TC-07-04-01 | unit        | `buildAllergies`: no-restrictions, options only, other only, both, whitespace-only other |
| TC-07-04-02 | unit        | Options come from config when present, defaults otherwise                                |
| TC-07-04-03 | unit        | Toggle reveals/hides the checklist                                                       |
| TC-07-04-04 | integration | Answers persist to `guests.allergies` for each guest                                     |
| TC-07-04-05 | integration | **Mixed invitation: a declined guest is not flipped to attending** (`DEF-07-01`)         |
| TC-07-04-06 | integration | **A +1 record is not written by this block** (`DEF-07-02`)                               |
| TC-07-04-07 | integration | Over-length answer is rejected server-side                                               |
| TC-07-04-08 | e2e         | Submit dietary answers; the host's guest table shows them                                |

### Manual QA checklist

- [ ] Toggle each guest independently and confirm answers do not bleed between rows
- [ ] Verify the stored string format in the dashboard guest table
- [ ] **Set one guest to declined in the dashboard, submit the dietary form as a guest, and check whether that guest is now attending** (currently reproduces `DEF-07-01`)
- [ ] Confirm the block does not prefill previously saved answers on reload
- [ ] Confirm no menu or drink selection UI exists anywhere on the public page

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | ≤20 guests per submission; ≤1000 chars per guest's answer (server only)                                                                                       |
| Performance      | One mutation, one patch per guest                                                                                                                             |
| Security & authz | No auth; guest ids are ownership-checked server-side. The block's ability to set `rsvpStatus` is the integrity problem, not an access-control one             |
| Accessibility    | The two-option toggle is a pair of `<button>`s, not a radio group; checkboxes are `sr-only` with no visible focus ring; the "Otra:" input is inside its label |
| i18n             | Spanish; headline, note, options and labels are host-authorable                                                                                               |
| Analytics        | None                                                                                                                                                          |

## 14. TODOs & Open Questions

- **DEF-07-01** `[P0]` — **The dietary block silently reverses declined RSVPs.** The submit
  handler maps `data.guests` — _every_ guest on the invitation — to
  `{ guestId, rsvpStatus: "attending", allergies }`.
  - **Evidence:** `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:165`
    (the map) and `:167` (`rsvpStatus: "attending" as const`). The code comment at `:164` reads
    _"This block lives on the 'accepted' layout, so its guests are attending."_
  - **Why the comment is wrong:** the `accepted` state is derived from **any one** guest
    attending — `guests.some((g) => g.rsvpStatus === "attending")`
    (`convex/invitations.ts:138`). On a mixed invitation (one attending, one declined) the
    layout is `accepted`, and the declined guest is still in `data.guests`, because a declining
    guest deliberately **stays linked** to its invitation (`convex/lib/guests.ts:44`-`:59`,
    `BR-07-02-16`). The block's premise holds only for invitations where everyone attended.
  - **Trigger conditions (all must hold):** the invitation has ≥2 linked guests; at least one is
    `attending` (so the `accepted` layout renders); at least one is `declined`; the resolved
    layout contains an `allergies` block (true of the elegant `accepted` preset,
    `.../elegant/default-layout.ts:16`); any visitor presses the block's submit button. No
    special intent is required — a guest filling in the food form for the person who _is_ coming
    silently reverses the person who is not.
  - **Impact:** The declined guest is stored as `attending`. The head count, seating, catering
    counts and the invitation's derived state are all wrong. **The damage is not symmetric:**
    when that guest declined, `applyDeclineEffects` already deleted every one of their
    `guestSpecialEventRsvps` rows and cascade-deleted their +1 record
    (`convex/lib/guests.ts:51`–`:59`). Flipping them back to `attending` restores none of it —
    `applyDeclineEffects` runs only on the transition _into_ `declined`
    (`convex/guests.ts:583`). The result is a guest marked attending whose associated data was
    destroyed, with no audit trail: public RSVP submissions are deliberately not activity-logged
    (`BR-07-02-19`). Nothing in the UI tells anyone this happened.
  - **Proposed fix:** the dietary form must not express attendance at all. Preferred: send only
    the `allergies` field — `submitPublicRsvp` already leaves an omitted optional field untouched
    (`convex/guests.ts:576`), but `rsvpStatus` is a **required** arg
    (`convex/guests.ts:473`), so either make it optional (and patch it only when present) or add
    a dedicated `submitPublicDietary` mutation. Minimum viable fix without touching the backend:
    map each guest to their **own current** `rsvpStatus` and filter to
    `g.rsvpStatus === "attending" && !g.isPlusOne`.
- **DEF-07-02** `[P1]` — **The dietary block writes `+1` records the RSVP block deliberately
  excludes.** `data.guests` includes materialized +1s, and the block neither filters
  `isPlusOne` nor treats them differently — contrast `.../blocks/rsvp.tsx:64`, which filters
  them out precisely because a +1 is not an independently answering party.
  - **Evidence:** `.../blocks/allergies.tsx:165` and `:195` (both iterate the unfiltered
    `data.guests`) versus `.../blocks/rsvp.tsx:64`.
  - **Impact:** A +1 gets its own dietary row (arguably desirable) but is also swept into the
    `rsvpStatus: "attending"` write of `DEF-07-01`, and counts toward the 20-update cap. The two
    blocks disagree about who the answering parties are.
  - **Proposed fix:** decide one rule for "who does this invitation answer for" and apply it in
    both blocks. If +1s should declare dietary needs, keep them in the list but never write their
    `rsvpStatus`.
- **TODO-07-05** `[P1]` `[CHANGE]` — Answers are never prefilled from the stored
  `guests.allergies` (`.../blocks/allergies.tsx:151`).
  - **Rationale:** Any re-submission wipes previously recorded restrictions, since "no
    restrictions" is the default and stores `""` (`BR-07-04-04`). A guest who reloads and presses
    submit again erases their own allergy data.
  - **Proposed rule:** The block hydrates each guest's answer from the stored string, or the
    empty-string write is suppressed when the guest has an existing value.
- **TODO-07-12** `[P2]` `[ADD]` — `submitPublicRsvp` accepts `menuOptionId` and `drinkOptionId`
  and validates their ownership (`convex/guests.ts:558`–`:569`), but no guest-facing block ever
  sends them — the elegant template registers no menu or drink selection component
  (`.../elegant/blocks/index.ts:15`).
  - **Rationale:** A host can configure menu and drink options (EP-11) that guests can never
    choose; the catering completion metric on the overview can therefore never be satisfied from
    the public page.
  - **Proposed rule:** A `menuSelection` / `drinkSelection` block exists in the elegant template
    and posts the chosen option ids.
- **TODO-07-19** `[P2]` `[CHANGE]` — The "has restrictions" control is two `<button>`s rather
  than a radio group (`.../blocks/allergies.tsx:49`, `:60`), so its selected state is not
  announced.
  - **Rationale:** Assistive technology cannot tell which of the two is chosen.
  - **Proposed rule:** The toggle is a radio group with `aria-checked` semantics.

### Open questions

- **Q1** — Should dietary answers be structured (a list of restriction ids plus free text)
  instead of one flattened string, so the host can filter and count them?
- **Q2** — Should a +1 declare their own dietary restrictions, given nobody may know their name
  at declaration time (EP-07-F03)?
- **Q3** — Should the block render at all for a household where nobody is attending?

## 15. Traceability

| Concern                                        | Source                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Block                                          | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:138` |
| **Defective submit map**                       | `.../blocks/allergies.tsx:165`                                                |
| **`rsvpStatus: "attending"` literal**          | `.../blocks/allergies.tsx:167`                                                |
| Incorrect premise comment                      | `.../blocks/allergies.tsx:164`                                                |
| Unfiltered guest render                        | `.../blocks/allergies.tsx:195`                                                |
| Answer flattening                              | `.../blocks/allergies.tsx:28`                                                 |
| Default answer                                 | `.../blocks/allergies.tsx:21`                                                 |
| Options resolution                             | `.../blocks/allergies.tsx:146`                                                |
| Preview gate                                   | `.../blocks/allergies.tsx:160`                                                |
| No-guests guard                                | `.../blocks/allergies.tsx:170`                                                |
| Copy                                           | `.../elegant/default-copy.ts:17`–`:33`                                        |
| Block placement (accepted preset)              | `.../elegant/default-layout.ts:16`                                            |
| `rsvpState` derivation (why the premise fails) | `convex/invitations.ts:138`                                                   |
| Declined guests stay linked                    | `convex/lib/guests.ts:44`                                                     |
| Decline cascade (unrestorable)                 | `convex/lib/guests.ts:51`                                                     |
| Decline effects trigger point                  | `convex/guests.ts:583`                                                        |
| `rsvpStatus` is a required arg                 | `convex/guests.ts:473`                                                        |
| `allergies` cap                                | `convex/guests.ts:551`                                                        |
| Menu/drink args with no client                 | `convex/guests.ts:478`                                                        |
| Elegant block registry                         | `.../elegant/blocks/index.ts:15`                                              |

## 16. Changelog

| Version | Date       | Author        | Change                                                                    |
| ------- | ---------- | ------------- | ------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification; records DEF-07-01 (P0) and DEF-07-02 (P1) |
