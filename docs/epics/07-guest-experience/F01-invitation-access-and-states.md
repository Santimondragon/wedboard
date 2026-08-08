---
id: EP-07-F01
title: Invitation Access & State Resolution
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F04, EP-02-F05, EP-02-F08, EP-05-F01, EP-08-F01]
---

# EP-07-F01 — Invitation Access & State Resolution

## 1. Summary

A public guest reaches their invitation by opening a link — either
`/{event-key}/invitations/{invitation-slug}` on the Wedboard primary domain, or
`/invitations/{invitation-slug}` on the host's own custom domain. This feature covers how that
URL is resolved into a page: which events and invitations are publicly reachable, how the
invitation's aggregate [RSVP State](../../glossary.md) is derived from its guests, and which of
the host's three authored layout variants is therefore rendered. It is the gate every other
feature in this epic sits behind.

## 2. Actors & Permissions

| Actor                | Access                                | Notes                                                   |
| -------------------- | ------------------------------------- | ------------------------------------------------------- |
| Owner                | Full                                  | Reaches the same public page; no privileged view exists |
| Co-owner (`planner`) | Same as any visitor                   |                                                         |
| Editor               | Same as any visitor                   |                                                         |
| Viewer               | Same as any visitor                   |                                                         |
| Public guest         | Full read of one invitation's payload | No auth; knowledge of the URL is the only credential    |

Public routes bypass Clerk entirely (`src/middleware.ts:9`, `:11`). Gating is **data-level**:
`convex/lib/public.ts` refuses archived events and inactive invitations. See
[roles-and-permissions.md §6](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-01-01** — As a public guest, I want to open the link I was sent and immediately see my
  invitation, so that I do not have to create an account.
- **US-07-01-02** — As a public guest, I want the page to reflect what my household has already
  answered, so that it does not ask me again for something already settled.
- **US-07-01-03** — As a host, I want an archived event to stop serving its invitations, so that
  old links go dark.
- **US-07-01-04** — As a host, I want a deactivated invitation to stop resolving, so that I can
  revoke a link I sent by mistake.
- **US-07-01-05** — As a host, I want my `draft` event's invitations to be reachable, so that I
  can preview the real page before going live.

## 4. Entry Points

| Entry point                        | Route / control                                                                                                     | Actor        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| Primary-domain invitation link     | `/{eventSlug}/invitations/{invitationSlug}`                                                                         | Public guest |
| Custom-domain invitation link      | `https://{customDomain}/invitations/{invitationSlug}` (rewritten to `/_domain/{host}/invitations/{invitationSlug}`) | Public guest |
| Copy-link control in the dashboard | `src/components/invitations/copy-invitation-link-button.tsx`                                                        | Editor+      |

## 5. UX Flow

### Happy path

1. The guest opens the link. On a non-primary host, `src/middleware.ts:30` rewrites the request
   to `/_domain/{host}{path}` **before any Clerk logic**.
2. The route's `generateMetadata` fetches `api.meta.getPublicInvitationMeta` server-side and
   builds the social card (`src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:13`;
   custom domain: `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:13`).
3. `PublicInvitationPage` runs exactly one of the two queries and skips the other
   (`src/components/public-invitation/public-invitation-page.tsx:22`).
4. The server resolves the event (by slug or by host), then the invitation, then loads its
   guests (`convex/invitations.ts:130`).
5. It derives `rsvpState` from those guests (`convex/invitations.ts:138`), selects the matching
   saved layout (`convex/invitations.ts:188`), resolves media ids in that layout to URLs
   (`convex/invitations.ts:194`) and returns the payload.
6. `InvitationTemplate` renders the template's `Frame` plus one component per block, passing
   `rsvpState` so an unset variant falls back to the template default.

### Alternate & edge paths

- **A1** — Custom domain: the URL carries no event key, so the client sources it from
  `data.event.slug` (`public-invitation-page.tsx:51`). Every public mutation is slug-based, so
  without this the RSVP, dietary, special-invitation and message forms would all fail.
- **A2** — The event is `draft`: it still resolves (`convex/lib/public.ts:20` only excludes
  `archived`), so the host can preview.
- **A3** — `layoutVariants[rsvpState]` is unset: the payload's `event.layoutBlocks` is
  `undefined` and the client falls back to the template's `defaultLayouts[rsvpState]()`
  (EP-08-F02).
- **A4** — `rsvpState` is `accepted` and only the legacy `events.layoutBlocks` is set: that
  legacy layout is used (`convex/invitations.ts:190`).
- **E1** — Event slug unknown, event archived, invitation slug unknown, or invitation
  `isActive === false`: the query returns `null` and the branded not-found screen renders
  (EP-07-F08).
- **E2** — A media id in the layout config points at another event's media: it is skipped and
  no URL is emitted (`convex/invitations.ts:203`), so the block renders its placeholder.

## 6. States

| State             | Behavior                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| Loading           | Full-screen centered spinner on `bg-stone-50` while the query is `undefined` (`public-invitation-page.tsx:32`)    |
| Empty             | An invitation with zero linked guests resolves and renders the **`pending`** layout (`convex/invitations.ts:142`) |
| Error             | A `null` payload renders `InvitationNotFound`; there is no distinct error screen                                  |
| Success           | The template frame plus the resolved layout's blocks                                                              |
| Disabled / locked | None at this level — gating is all-or-nothing                                                                     |
| Mobile            | The elegant frame is a fixed 390px-wide card centered on the page (EP-08)                                         |

## 7. UI Specification

### Screens & components

| Element                   | Component              | Path                                                                 |
| ------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Primary route             | `Page`                 | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:20`       |
| Custom-domain route       | `Page`                 | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:23`  |
| Page shell / query switch | `PublicInvitationPage` | `src/components/public-invitation/public-invitation-page.tsx:17`     |
| Template renderer         | `InvitationTemplate`   | `src/components/public-invitation/templates/invitation-template.tsx` |
| Not-found screen          | `InvitationNotFound`   | `src/components/public-invitation/invitation-not-found.tsx:1`        |
| Payload types             | `PublicInvitationData` | `src/components/public-invitation/types.ts:48`                       |

### Fields & validation

None — this feature reads only.

### Copy deck

The only copy this feature owns is the fallback page title used when the invitation does not
resolve; every rendered string otherwise belongs to a block (EP-07-F02…F06, EP-08).

| Key                     | Copy                     | Source                              |
| ----------------------- | ------------------------ | ----------------------------------- |
| Metadata fallback title | `"Invitation Not Found"` | `src/lib/invitation-metadata.ts:17` |

## 8. Data Model

| Table                          | Fields                                                                                                                                                                 | Read / Write | Index                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------- |
| `events`                       | `slug`, `customDomain`, `status`, `name`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl`, `templateId`, `layoutBlocks`, `layoutVariants` | Read         | `by_slug`, `by_customDomain` |
| `invitations`                  | `slug`, `title`, `isActive`                                                                                                                                            | Read         | `by_eventId_and_slug`        |
| `guests`                       | `firstName`, `lastName`, `rsvpStatus`, `allowsPlusOne`, `isPlusOne`, `plusOneOfGuestId`                                                                                | Read         | `by_invitationId`            |
| `invitationSpecialEventAccess` | `specialEventId`                                                                                                                                                       | Read         | `by_invitationId`            |
| `specialEvents`                | `name`, `description`, `date`, `location`, `isActive`                                                                                                                  | Read         | direct `db.get`              |
| `guestSpecialEventRsvps`       | `specialEventId`, `status`                                                                                                                                             | Read         | `by_guestId`                 |
| `media`                        | `storageId`, `eventId`                                                                                                                                                 | Read         | `normalizeId` + `db.get`     |

**Field whitelisting.** The payload never returns the whole event or guest document. It
projects an explicit field list (`convex/invitations.ts:209`–`:242`) — no `notes`, no `email`,
no `phone`, no `tableId`, no `menuOptionId`, no owner identity.

**Bounds.** Guests are capped at `.take(100)` per invitation (`convex/invitations.ts:133`),
access rows at `.take(100)` (`:152`), and each guest's special RSVP rows at `.take(100)`
(`:163`).

## 9. Backend Contract

| Function                                    | Type         | Args                                  | Returns                                                                        | Guard                                             | Caps        |
| ------------------------------------------- | ------------ | ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- | ----------- |
| `api.invitations.getPublicInvitation`       | public query | `{eventSlug, invitationSlug}`         | `{event, rsvpState, invitation, guests[], specialEvents[], mediaUrls} \| null` | none — data gating via `resolvePublicEvent`       | guests ≤100 |
| `api.invitations.getPublicInvitationByHost` | public query | `{host, invitationSlug}`              | identical payload                                                              | none — data gating via `resolvePublicEventByHost` | guests ≤100 |
| `api.meta.getPublicInvitationMeta`          | public query | `{eventSlug?, host?, invitationSlug}` | `{title, description, imageUrl, faviconUrl, faviconMimeType} \| null`          | none                                              | see EP-10   |

Both queries delegate to the shared `buildPublicInvitationPayload`
(`convex/invitations.ts:120`), so the two URL shapes cannot drift.

## 10. Business Rules

- **BR-07-01-01** `[AS-BUILT]` — An event whose `status` is `archived` never resolves publicly,
  by slug or by host (`convex/lib/public.ts:20`, `:42`).
- **BR-07-01-02** `[AS-BUILT]` — An event whose `status` is `draft` **does** resolve publicly.
- **BR-07-01-03** `[AS-BUILT]` — An invitation resolves only when `isActive` is true
  (`convex/lib/public.ts:61`).
- **BR-07-01-04** `[AS-BUILT]` — An invitation slug is matched **within its event only**, via
  `by_eventId_and_slug` (`convex/lib/public.ts:56`).
- **BR-07-01-05** `[AS-BUILT]` — Host-based resolution normalizes the Host header before lookup
  and never gates on `customDomainVerified` (`convex/lib/public.ts:34`, `:39`).
- **BR-07-01-06** `[AS-BUILT]` — `rsvpState` is `accepted` when **any** linked guest has
  `rsvpStatus === "attending"` (`convex/invitations.ts:138`).
- **BR-07-01-07** `[AS-BUILT]` — Otherwise `rsvpState` is `pending` when the invitation has no
  linked guests **or** any linked guest is `pending` (`convex/invitations.ts:142`).
- **BR-07-01-08** `[AS-BUILT]` — Otherwise — every linked guest is `declined` — `rsvpState` is
  `declined` (`convex/invitations.ts:144`).
- **BR-07-01-09** `[AS-BUILT]` — `rsvpState` counts **all** linked guests, including materialized
  `+1` records, because the derivation reads the unfiltered `guests` array
  (`convex/invitations.ts:130`, `:138`).
- **BR-07-01-10** `[AS-BUILT]` — The returned `event.layoutBlocks` is
  `layoutVariants[rsvpState]`; when that is unset and the state is `accepted`, the legacy
  `events.layoutBlocks` is used; otherwise it is `undefined`
  (`convex/invitations.ts:188`).
- **BR-07-01-11** `[AS-BUILT]` — Media ids are resolved **only** for the selected layout's block
  configs, and only for media rows belonging to the same event
  (`convex/invitations.ts:195`, `:203`).
- **BR-07-01-12** `[AS-BUILT]` — The payload's `specialEvents` contains only special invitations
  the invitation has an `invitationSpecialEventAccess` row for **and** that are `isActive`
  (`convex/invitations.ts:149`, `:155`).
- **BR-07-01-13** `[AS-BUILT]` — A guest whose `rsvpStatus` is `declined` contributes no entries
  to any special invitation's `guestStatuses` map (`convex/invitations.ts:171`).
- **BR-07-01-14** `[AS-BUILT]` — The payload includes `event.slug` so that slug-based public
  mutations work on a custom domain, where the URL carries no event key
  (`convex/invitations.ts:215`, consumed at `public-invitation-page.tsx:51`).
- **BR-07-01-15** `[AS-BUILT]` — Exactly one of the two public queries runs per page; the other
  is passed `"skip"` (`public-invitation-page.tsx:24`, `:28`).
- **BR-07-01-16** `[AS-BUILT]` — Requests to a non-primary host are rewritten to `/_domain/...`
  before Clerk executes, so a custom-domain request never touches auth
  (`src/middleware.ts:30`).
- **BR-07-01-17** `[AS-BUILT]` — `/_domain` paths requested directly on the primary domain
  return HTTP 404 (`src/middleware.ts:40`).

## 11. Acceptance Criteria

- **AC-07-01-01** — **Given** an `active` event and an `isActive` invitation **When** a guest
  opens `/{event-key}/invitations/{slug}` **Then** the invitation renders with no sign-in prompt.
- **AC-07-01-02** — **Given** the event is `archived` **When** the same URL is opened **Then**
  the not-found screen renders.
- **AC-07-01-03** — **Given** the event is `draft` **When** the URL is opened **Then** the
  invitation renders normally.
- **AC-07-01-04** — **Given** the invitation's `isActive` is false **When** the URL is opened
  **Then** the not-found screen renders.
- **AC-07-01-05** — **Given** an invitation with two guests, one `attending` and one `declined`
  **When** the page loads **Then** `rsvpState` is `accepted`.
- **AC-07-01-06** — **Given** an invitation whose guests are all `declined` **When** the page
  loads **Then** `rsvpState` is `declined` and the `declined` layout renders.
- **AC-07-01-07** — **Given** an invitation with zero linked guests **When** the page loads
  **Then** `rsvpState` is `pending`.
- **AC-07-01-08** — **Given** an invitation reached on a custom domain **When** the guest submits
  any public form **Then** the mutation succeeds, because `eventSlug` came from
  `data.event.slug`.
- **AC-07-01-09** — **Given** an invitation with no `invitationSpecialEventAccess` rows **When**
  the page loads **Then** the payload's `specialEvents` array is empty.
- **AC-07-01-10** — **Given** `/_domain/anything` is requested on the primary domain **Then** the
  response status is 404.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                                                  |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| TC-07-01-01 | unit        | `rsvpState` derivation: attending-only, mixed, all-declined, all-pending, empty                           |
| TC-07-01-02 | unit        | Layout selection: variant set / variant unset / legacy `layoutBlocks` on `accepted`                       |
| TC-07-01-03 | integration | `resolvePublicEvent` returns null for `archived`, non-null for `draft`                                    |
| TC-07-01-04 | integration | `resolvePublicInvitation` returns null for `isActive: false`                                              |
| TC-07-01-05 | integration | Two events with the same invitation slug resolve independently                                            |
| TC-07-01-06 | integration | `getPublicInvitationByHost` and `getPublicInvitation` return an identical payload for the same invitation |
| TC-07-01-07 | integration | Media belonging to another event is excluded from `mediaUrls`                                             |
| TC-07-01-08 | integration | A declined guest contributes no `guestStatuses` entry                                                     |
| TC-07-01-09 | e2e         | Custom-domain page loads and an RSVP submitted from it persists                                           |
| TC-07-01-10 | e2e         | Primary-domain request to `/_domain/x` returns 404                                                        |

### Manual QA checklist

- [ ] Open an invitation on the primary domain; no sign-in redirect occurs
- [ ] Archive the event, reload — the not-found screen appears
- [ ] Reactivate, deactivate the invitation instead — the not-found screen appears
- [ ] Set a custom domain and load the same invitation by host; confirm identical rendering
- [ ] Submit an RSVP from the custom-domain page and confirm it persists
- [ ] Flip one guest of a two-guest invitation to `attending` and confirm the layout switches to `accepted`

## 13. Non-Functional

| Concern          | Specification                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Guests ≤100, access rows ≤100, special RSVP rows ≤100 per guest                                                       |
| Performance      | One Convex query for the whole page; media URLs resolved server-side for the selected layout only                     |
| Security & authz | No auth. Field-whitelisted projection; the payload exposes no owner identity, guest contact data, or invitation notes |
| Accessibility    | Loading state is a bare spinner with no `role="status"` or accessible text                                            |
| i18n             | Guest-facing copy is Spanish only; the metadata fallback title is English                                             |
| Analytics        | None — no page-view or open tracking exists                                                                           |

## 14. TODOs & Open Questions

- **TODO-07-13** `[P2]` `[ADD]` — The loading spinner has no accessible label.
  - **Rationale:** A screen-reader user gets silence while the invitation loads.
  - **Proposed rule:** The loading state exposes `role="status"` and a Spanish label.
- **TODO-07-14** `[P2]` `[ADD]` — No open/view tracking exists, so a host cannot tell whether an
  invitation link was ever opened.
  - **Rationale:** "Has anyone seen this?" is the first question a host asks after sending.
  - **Proposed rule:** Record a first-open timestamp per invitation.

### Open questions

- **Q1** — Should `draft` events really serve live invitations to anyone holding a link, or
  should preview be gated behind an authenticated host session?
- **Q2** — When an invitation has zero linked guests, `pending` renders an RSVP form with no
  guests to answer for. Should that case have its own state?

## 15. Traceability

| Concern                   | Source                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| Primary route             | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:20`      |
| Custom-domain route       | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:23` |
| Host rewrite              | `src/middleware.ts:30`                                              |
| `/_domain` 404 on primary | `src/middleware.ts:40`                                              |
| Page shell / query switch | `src/components/public-invitation/public-invitation-page.tsx:22`    |
| Event slug injection      | `src/components/public-invitation/public-invitation-page.tsx:51`    |
| Payload builder           | `convex/invitations.ts:120`                                         |
| `rsvpState` derivation    | `convex/invitations.ts:138`                                         |
| Layout selection          | `convex/invitations.ts:188`                                         |
| Media resolution          | `convex/invitations.ts:194`                                         |
| Payload projection        | `convex/invitations.ts:209`                                         |
| Public query (slug)       | `convex/invitations.ts:245`                                         |
| Public query (host)       | `convex/invitations.ts:258`                                         |
| Archived-event gate       | `convex/lib/public.ts:20`                                           |
| Host resolver             | `convex/lib/public.ts:30`                                           |
| Inactive-invitation gate  | `convex/lib/public.ts:61`                                           |
| Payload types             | `src/components/public-invitation/types.ts:48`                      |
| Metadata builder          | `src/lib/invitation-metadata.ts:15`                                 |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
