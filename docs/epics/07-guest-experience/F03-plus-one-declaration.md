---
id: EP-07-F03
title: +1 Declaration
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-07-F01, EP-07-F02, EP-04-F04]
---

# EP-07-F03 — +1 Declaration

## 1. Summary

Some guests are permitted to bring a companion. When such a guest confirms attendance on their
invitation page, a sub-question appears: are they bringing someone, and what is that person's
name? Answering yes **materializes** the [+1](../../glossary.md) as a real, fully-manageable
guest record sharing the host guest's invitation — it becomes a countable head, seatable in the
dashboard. Answering no, or the host declining, tears that record down again. The permission
itself (`guests.allowsPlusOne`) is set by the host in the dashboard (EP-04-F04); the guest only
exercises it.

## 2. Actors & Permissions

| Actor                | Access                                                                       | Notes                                  |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| Owner                | Grants the permission and can add/remove a +1 from the dashboard (EP-04-F04) |                                        |
| Co-owner (`planner`) | Same as Owner for this capability                                            |                                        |
| Editor               | Same as Owner for this capability                                            |                                        |
| Viewer               | None                                                                         |                                        |
| Public guest         | Declares or withdraws a +1 for a host guest **on their own invitation**      | Cannot grant themselves the permission |

The declaration travels inside `guests.submitPublicRsvp` (`convex/guests.ts:466`) — there is no
separate public mutation. The host guest id is validated against the resolved invitation
(`convex/guests.ts:592`).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-03-01** — As a public guest permitted a companion, I want to say whether I am bringing
  one while I confirm my own attendance, so that it is a single decision.
- **US-07-03-02** — As a public guest, I want to give my companion's name so that they appear by
  name to the hosts, but not be forced to know it yet.
- **US-07-03-03** — As a host, I want a declared +1 to become a real guest record so that my head
  count, seating and catering all include them.
- **US-07-03-04** — As a host, I want a +1 removed automatically if the host guest declines, so
  that I never seat a companion of someone who is not coming.
- **US-07-03-05** — As a host, I want a guest without the permission to be unable to add a
  companion, however the request is crafted.

## 4. Entry Points

| Entry point                               | Route / control                                             | Actor        |
| ----------------------------------------- | ----------------------------------------------------------- | ------------ |
| "+1" sub-question inside the `rsvp` block | Public invitation page, under a host guest marked attending | Public guest |
| Add/Remove +1 in the guest details dialog | `/dashboard/[eventSlug]/guests` (EP-04-F04)                 | Editor+      |

## 5. UX Flow

### Happy path

1. The guest selects "Si asistiré" for a person whose record has `allowsPlusOne`.
2. A checkbox appears immediately below that person's radio group, labelled
   `"Vendré con un acompañante (+1)"` (`.../blocks/rsvp.tsx:158`, `:163`).
3. Ticking it reveals a free-text name input placeholdered
   `"Nombre del acompañante (opcional)"` (`rsvp.tsx:175`, `:188`).
4. On submit, the block emits one `plusOneUpdates` entry **per host guest that allows a +1**,
   carrying `attending` (true only when the host chose attending _and_ ticked the box) and the
   name split on whitespace into `firstName` / `lastName` (`rsvp.tsx:109`–`:123`).
5. The server, for each entry: looks up any existing +1 via `by_plusOneOf`
   (`convex/lib/guests.ts:7`), then either upserts it as `attending` or deletes it
   (`convex/guests.ts:596`–`:628`).

### Alternate & edge paths

- **A1** — The host guest already has a +1: the checkbox is pre-ticked and the name pre-filled
  from the existing record (`rsvp.tsx:76`–`:87`).
- **A2** — The name is left blank: the server substitutes `"Acompañante"` as the first name and
  `"de {host first name}"` as the last name (`convex/guests.ts:605`, `:606`).
- **A3** — The guest un-ticks the box for a host that already has a +1: the entry is sent with
  `attending: false` and the existing record is cascade-deleted (`convex/guests.ts:625`).
- **A4** — The host guest switches to declined: the checkbox disappears (the sub-question renders
  only while the choice is `attending`, `rsvp.tsx:158`), the entry is sent with
  `attending: false`, and both the +1 branch and `applyDeclineEffects` remove the record.
- **A5** — A host guest without `allowsPlusOne` never produces a `plusOneUpdates` entry
  (`rsvp.tsx:110`), and would be rejected server-side anyway (`convex/guests.ts:604`).
- **E1** — A `hostGuestId` not linked to the resolved invitation: the mutation throws
  `"Guest does not belong to this invitation"` (`convex/guests.ts:594`).
- **E2** — More than 20 `plusOneUpdates`: `"Too many plus-one updates"` (`convex/guests.ts:513`).

## 6. States

| State             | Behavior                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| Loading           | None of its own — part of the RSVP block                                      |
| Empty             | No host guest has `allowsPlusOne` → no sub-question renders anywhere          |
| Error             | Shares the RSVP block's generic error toast                                   |
| Success           | Shares the RSVP success toast; the +1 appears as a linked guest to the host   |
| Disabled / locked | The sub-question is hidden (not disabled) unless the host is marked attending |
| Mobile            | Indented sub-block (`pl-4`) inside the guest's row (`rsvp.tsx:159`)           |

## 7. UI Specification

### Screens & components

| Element              | Component                      | Path                              |
| -------------------- | ------------------------------ | --------------------------------- |
| +1 checkbox          | `CheckRow` (`type="checkbox"`) | `.../elegant/blocks/rsvp.tsx:160` |
| Companion name input | native `<input type="text">`   | `.../elegant/blocks/rsvp.tsx:176` |
| Host lookup helper   | `findPlusOne`                  | `convex/lib/guests.ts:7`          |
| Teardown helper      | `deletePlusOneCascade`         | `convex/lib/guests.ts:36`         |

### Fields & validation

| Field          | Type     | Required | Rule                                                                                                | Message |
| -------------- | -------- | -------- | --------------------------------------------------------------------------------------------------- | ------- |
| Bring a +1     | checkbox | No       | Rendered only when `allowsPlusOne` **and** the host's choice is `attending` (`rsvp.tsx:158`)        | —       |
| Companion name | text     | No       | Trimmed and split on whitespace: first token → `firstName`, remainder → `lastName` (`rsvp.tsx:114`) | —       |

No zod schema governs the name; `publicRsvpSchema` declares `firstName`/`lastName` as optional
strings (`src/lib/validations/public-rsvp.ts:14`) but the block does not run it. There is **no
length limit** on the companion name at any layer.

### Copy deck

| Key                           | Copy                                  | Source                           |
| ----------------------------- | ------------------------------------- | -------------------------------- |
| `rsvpPlusOneQuestion`         | `"Vendré con un acompañante (+1)"`    | `.../elegant/default-copy.ts:12` |
| `rsvpPlusOneNamePlaceholder`  | `"Nombre del acompañante (opcional)"` | `.../elegant/default-copy.ts:13` |
| Server placeholder first name | `"Acompañante"`                       | `convex/guests.ts:605`           |
| Server placeholder last name  | `` `de ${host.firstName}` ``          | `convex/guests.ts:606`           |

The two `ELEGANT_COPY` strings are **not** exposed as block config fields — they are read
directly from the copy deck (`rsvp.tsx:163`, `:188`), so unlike the rest of the RSVP block they
are not host-authorable.

## 8. Data Model

| Table                    | Fields                                                                                                             | Read / Write                | Index             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------- | ----------------- |
| `guests` (host)          | `allowsPlusOne`, `rsvpStatus`, `firstName`, `eventId`, `invitationId`                                              | Read                        | `by_invitationId` |
| `guests` (+1)            | `firstName`, `lastName`, `rsvpStatus`, `isPlusOne`, `allowsPlusOne`, `plusOneOfGuestId`, `eventId`, `invitationId` | **Insert / patch / delete** | `by_plusOneOf`    |
| `guestSpecialEventRsvps` | —                                                                                                                  | **Delete** on teardown      | `by_guestId`      |

**Materialization.** A new +1 is inserted with the host's `eventId` and `invitationId`,
`isPlusOne: true`, `allowsPlusOne: false`, `plusOneOfGuestId` pointing at the host, and
`rsvpStatus: "attending"` (`convex/guests.ts:614`–`:623`). It is therefore a linked guest of the
invitation from that moment: it counts toward `guestCount` in the dashboard, appears in the
public payload's `guests` array, and — because `rsvpState` counts all linked guests — can by
itself hold the invitation in the `accepted` state (EP-07-F01, `BR-07-01-09`).

**Teardown.** `deletePlusOneCascade` deletes the +1's `guestSpecialEventRsvps` rows and then the
guest document (`convex/lib/guests.ts:36`). It is invoked from two places in one submission: the
+1 branch (`convex/guests.ts:627`) and `applyDeclineEffects` when the host declines
(`convex/lib/guests.ts:56`). Both are permanent deletes.

**At most one.** `findPlusOne` uses `.first()` on `by_plusOneOf` (`convex/lib/guests.ts:14`), and
the materialization branch patches the existing record rather than inserting a second — so a
host can never accumulate more than one +1 through this path.

## 9. Backend Contract

| Function                      | Type            | Args                                                                                                     | Returns | Guard                                                              | Caps        |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | ----------- |
| `api.guests.submitPublicRsvp` | public mutation | `plusOneUpdates?: [{hostGuestId, attending, firstName?, lastName?}]` (with the rest of the RSVP payload) | `void`  | none — data gating; host must be linked to the resolved invitation | ≤20 entries |

Dashboard counterparts, for reference only: `api.guests.addPlusOne` and
`api.guests.removePlusOne` (EP-04-F04) — both `requireEventEditor`-guarded and not reachable
from the public page.

## 10. Business Rules

- **BR-07-03-01** `[AS-BUILT]` — The +1 sub-question renders only when the host guest's record
  has `allowsPlusOne` **and** the guest has currently chosen `attending`
  (`.../blocks/rsvp.tsx:158`).
- **BR-07-03-02** `[AS-BUILT]` — The companion name field renders only once the "bring a +1"
  checkbox is ticked (`rsvp.tsx:175`).
- **BR-07-03-03** `[AS-BUILT]` — The client emits a `plusOneUpdates` entry for **every** host
  guest that allows a +1, including entries with `attending: false`, so that withdrawing is
  expressible (`rsvp.tsx:109`).
- **BR-07-03-04** `[AS-BUILT]` — The client sets `attending: true` only when the host's choice is
  `attending` **and** the checkbox is ticked (`rsvp.tsx:112`).
- **BR-07-03-05** `[AS-BUILT]` — The server materializes a +1 only when all three hold: the entry
  says `attending`, the host record has `allowsPlusOne`, and the host's effective status in this
  submission is `attending` (`convex/guests.ts:604`).
- **BR-07-03-06** `[AS-BUILT]` — The host's effective status is the status submitted in this call
  if present, otherwise the stored one (`convex/guests.ts:601`).
- **BR-07-03-07** `[AS-BUILT]` — A host present in `declinedGuestIds` can never materialize a +1
  in the same submission (`convex/guests.ts:600`).
- **BR-07-03-08** `[AS-BUILT]` — A blank first name becomes `"Acompañante"`; a blank last name
  becomes `"de {host.firstName}"` (`convex/guests.ts:605`, `:606`).
- **BR-07-03-09** `[AS-BUILT]` — An existing +1 is patched (name + `rsvpStatus: "attending"`)
  rather than duplicated (`convex/guests.ts:607`).
- **BR-07-03-10** `[AS-BUILT]` — A new +1 is inserted with `isPlusOne: true`,
  `allowsPlusOne: false`, `plusOneOfGuestId` = host, `rsvpStatus: "attending"`, and the host's
  `eventId`/`invitationId` (`convex/guests.ts:614`).
- **BR-07-03-11** `[AS-BUILT]` — When the conditions of `BR-07-03-05` do not hold and a +1 record
  exists, it is cascade-deleted (`convex/guests.ts:625`).
- **BR-07-03-12** `[AS-BUILT]` — A host guest has at most one +1 (`convex/lib/guests.ts:14`).
- **BR-07-03-13** `[AS-BUILT]` — A materialized +1 never gets its own radio group in the RSVP
  form (`rsvp.tsx:64`; see `BR-07-02-01`).
- **BR-07-03-14** `[AS-BUILT]` — A `hostGuestId` outside the resolved invitation throws
  `"Guest does not belong to this invitation"` (`convex/guests.ts:594`).
- **BR-07-03-15** `[AS-BUILT]` — The public path can never set `allowsPlusOne`; it is not a
  patchable field of `guestUpdates` (`convex/guests.ts:573`).

## 11. Acceptance Criteria

- **AC-07-03-01** — **Given** a guest whose record allows a +1 **When** they select "Si asistiré"
  **Then** the `"Vendré con un acompañante (+1)"` checkbox appears.
- **AC-07-03-02** — **Given** the same guest **When** they select the decline option **Then** the
  checkbox is not rendered.
- **AC-07-03-03** — **Given** a guest without `allowsPlusOne` **When** they select attending
  **Then** no +1 sub-question appears.
- **AC-07-03-04** — **Given** the checkbox is ticked and the name left blank **When** the RSVP is
  submitted **Then** a guest named "Acompañante de {host}" exists with `isPlusOne: true` and the
  host's `invitationId`.
- **AC-07-03-05** — **Given** the name "Ana María Ruiz" is entered **When** submitted **Then** the
  +1 record has `firstName: "Ana"` and `lastName: "María Ruiz"`.
- **AC-07-03-06** — **Given** a host with an existing +1 **When** the page loads **Then** the
  checkbox is pre-ticked and the name pre-filled.
- **AC-07-03-07** — **Given** a host with an existing +1 **When** they un-tick the box and submit
  **Then** the +1 record and its special-invitation RSVP rows are deleted.
- **AC-07-03-08** — **Given** a host with an existing +1 **When** they submit `declined` **Then**
  the +1 is deleted and no second +1 can be created in the same call.
- **AC-07-03-09** — **Given** a crafted request declaring a +1 for a host without
  `allowsPlusOne` **When** the mutation runs **Then** no +1 is created.
- **AC-07-03-10** — **Given** a host that already has a +1 **When** they submit attending with the
  box ticked again **Then** exactly one +1 record exists afterwards.
- **AC-07-03-11** — **Given** a materialized +1 **When** the invitation page reloads **Then** the
  +1 has no radio group of its own but does count toward the derived `rsvpState`.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                             |
| ----------- | ----------- | ------------------------------------------------------------------------------------ |
| TC-07-03-01 | unit        | Sub-question visibility across `allowsPlusOne` × choice                              |
| TC-07-03-02 | unit        | Name splitting: empty, single token, multi-token, extra whitespace                   |
| TC-07-03-03 | unit        | `plusOneUpdates` is emitted for every allowing host, with the right `attending` flag |
| TC-07-03-04 | integration | Materialization sets every field of `BR-07-03-10`                                    |
| TC-07-03-05 | integration | Blank name falls back to the Spanish placeholders                                    |
| TC-07-03-06 | integration | Re-submitting patches instead of duplicating                                         |
| TC-07-03-07 | integration | `attending: false` deletes the +1 and its special RSVP rows                          |
| TC-07-03-08 | integration | Host declining deletes the +1 via both code paths without error                      |
| TC-07-03-09 | integration | Host without `allowsPlusOne` cannot materialize a +1                                 |
| TC-07-03-10 | integration | Foreign `hostGuestId` is rejected                                                    |
| TC-07-03-11 | e2e         | Declare a +1, verify it appears in the dashboard guest table with its host           |

### Manual QA checklist

- [ ] Toggle attending/declining and confirm the sub-question appears and disappears
- [ ] Submit with a blank name and confirm the Spanish placeholder in the dashboard
- [ ] Un-tick an existing +1, submit, and confirm the record is gone
- [ ] Decline the host and confirm the +1 is gone
- [ ] Confirm the +1 is seatable and counted in the dashboard after materialization

## 13. Non-Functional

| Concern          | Specification                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | ≤20 `plusOneUpdates` per submission; at most one +1 per host; **no length cap on the companion name**              |
| Performance      | One index lookup (`by_plusOneOf`) plus at most one write per host guest                                            |
| Security & authz | The host guest must belong to the resolved invitation; `allowsPlusOne` is server-checked and never client-settable |
| Accessibility    | Shares the RSVP block's `sr-only` control issue (`TODO-07-07`); the name input has a placeholder but no `<label>`  |
| i18n             | Spanish; the two +1 strings are hard-coded to `ELEGANT_COPY` and not host-authorable                               |
| Analytics        | None                                                                                                               |

## 14. TODOs & Open Questions

- **TODO-07-16** `[P2]` `[ADD]` — The companion name has no maximum length at any layer — no zod
  rule, no server check (contrast the 1000-char caps on `allergies`/`specialRequests`,
  `convex/guests.ts:551`).
  - **Rationale:** An arbitrarily long name is stored verbatim and rendered in the dashboard
    guest table and seating grid.
  - **Proposed rule:** The companion first and last names are each capped server-side.
- **TODO-07-17** `[P2]` `[ADD]` — The +1 question and name placeholder are not block config
  fields, so a host cannot reword them although every other string in the RSVP block is
  authorable (`.../blocks/rsvp.tsx:163`, `:188`).
  - **Rationale:** Inconsistent with the block's own authoring model (EP-08).
  - **Proposed rule:** Both strings become `ConfigField`s of the `rsvp` block.
- **TODO-07-18** `[P2]` `[ADD]` — The companion name input has no visible label, only a
  placeholder.
  - **Rationale:** Placeholder-only labelling disappears on input and is weakly announced.
  - **Proposed rule:** The input carries an associated visible label.

### Open questions

- **Q1** — Should a guest be allowed to name their companion later, given the placeholder name
  is the fallback and there is no way to revise an RSVP (`TODO-07-01`)?
- **Q2** — Should a materialized +1 be able to hold an invitation in the `accepted` state on its
  own, or should `rsvpState` be derived from named guests only?

## 15. Traceability

| Concern                       | Source                                                                   |
| ----------------------------- | ------------------------------------------------------------------------ |
| +1 sub-question render gate   | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:158` |
| Prefill from existing +1      | `.../blocks/rsvp.tsx:76`                                                 |
| Name input                    | `.../blocks/rsvp.tsx:176`                                                |
| `plusOneUpdates` construction | `.../blocks/rsvp.tsx:109`                                                |
| Copy                          | `.../elegant/default-copy.ts:12`, `:13`                                  |
| Host validation               | `convex/guests.ts:592`                                                   |
| Effective host status         | `convex/guests.ts:599`                                                   |
| Materialization conditions    | `convex/guests.ts:604`                                                   |
| Placeholder names             | `convex/guests.ts:605`                                                   |
| Patch existing +1             | `convex/guests.ts:607`                                                   |
| Insert new +1                 | `convex/guests.ts:614`                                                   |
| Teardown branch               | `convex/guests.ts:625`                                                   |
| `findPlusOne`                 | `convex/lib/guests.ts:7`                                                 |
| `deletePlusOneCascade`        | `convex/lib/guests.ts:36`                                                |
| Decline-driven teardown       | `convex/lib/guests.ts:56`                                                |
| Arg validator                 | `convex/guests.ts:484`                                                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
