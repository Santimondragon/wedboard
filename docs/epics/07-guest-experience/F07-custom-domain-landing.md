---
id: EP-07-F07
title: Custom-Domain Landing (Guest View)
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F11, EP-07-F01, EP-07-F08]
---

# EP-07-F07 — Custom-Domain Landing (Guest View)

> **Scope note.** The countdown landing is specified in full — resolution, metadata, the
> `events.getPublicEventByHost` contract, the countdown mechanics — by
> **[EP-02-F11](../02-event-setup/custom-domain/F11-countdown-landing.md)**. This spec covers
> only what a **guest** experiences when they arrive at it, and deliberately does not repeat the
> mechanism.

## 1. Summary

A guest who types the couple's domain into a browser — or clips the path off an invitation link
they were sent — lands on the root of a custom domain rather than on their invitation. Instead
of an error, they get a read-only countdown page: the couple's names, the date, a live countdown
and the venue with a map link. It is a graceful, on-brand destination that answers "when and
where" without exposing anything about any household. It offers **no** route onward to a
personal invitation — the guest still needs the link they were sent.

## 2. Actors & Permissions

| Actor                | Access                                      | Notes                                         |
| -------------------- | ------------------------------------------- | --------------------------------------------- |
| Owner                | Sees the same page as anyone                | Configures the domain in Settings (EP-02-F08) |
| Co-owner (`planner`) | Same as any visitor                         |                                               |
| Editor               | Same as any visitor                         |                                               |
| Viewer               | Same as any visitor                         |                                               |
| Public guest         | Read-only view of display-safe event fields | No auth; no invitation context                |

The query returns only display-safe fields — `{name, brideName, groomName, date, venueName,
venueAddress, venueMapUrl}` — so nothing about guests, invitations or the owner is reachable
from the domain root. Archived events return `null` (EP-02-F11).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-07-01** — As a public guest who visits the couple's domain root, I want to see when and
  where the wedding is, so that the visit is not wasted.
- **US-07-07-02** — As a public guest, I want the page to look like the invitation I was sent, so
  that I trust I am in the right place.
- **US-07-07-03** — As a host, I want the domain root to reveal nothing about who is invited.

## 4. Entry Points

| Entry point                          | Route / control                                                    | Actor        |
| ------------------------------------ | ------------------------------------------------------------------ | ------------ |
| Custom-domain root                   | `https://{customDomain}/` (rewritten to `/_domain/{host}`)         | Public guest |
| Any other unknown path on the domain | `https://{customDomain}/{anything}` → not-found screen (EP-07-F08) | Public guest |

The same URL on the **primary** domain does not exist: `/_domain` paths return 404 there
(`src/middleware.ts:40`).

## 5. UX Flow

### Happy path

1. The guest opens the domain root; middleware rewrites to `/_domain/{host}` without touching
   Clerk (`src/middleware.ts:30`).
2. The catch-all route sees an empty `rest` and renders `EventLanding`
   (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`).
3. The page shows, inside the elegant frame: the formatted date, the couple names (or the event
   name when either name is missing), the countdown, and the venue block with a "Ver mapa"
   button (`src/components/public-invitation/event-landing.tsx:37`–`:80`).
4. The guest reads it. There is nothing to submit.

### Alternate & edge paths

- **A1** — The event has no `date`: the date line and the whole countdown are omitted
  (`event-landing.tsx:39`, `:89`).
- **A2** — The event day has arrived (the countdown clamps to zero): the countdown is replaced by
  `"¡Llegó el día!"` (`event-landing.tsx:92`).
- **A3** — Neither `venueName` nor `venueAddress` is set: the venue block is omitted entirely
  (`event-landing.tsx:57`).
- **A4** — Only `brideName` or only `groomName` is set: the heading falls back to the event name
  (`event-landing.tsx:45`).
- **A5** — Any path other than the root: the branded not-found screen renders (EP-07-F08).
- **E1** — The host resolves to no event, or the event is archived: `InvitationNotFound`
  (`event-landing.tsx:30`).

## 6. States

| State             | Behavior                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| Loading           | Shared `LoadingState` spinner (`event-landing.tsx:29`)                     |
| Empty             | Missing date / venue / couple names each degrade to a shorter page (A1–A4) |
| Error             | Indistinguishable from "no such event" — the not-found screen              |
| Success           | Full countdown landing                                                     |
| Disabled / locked | Read-only by design; there is no interactive control except the map link   |
| Mobile            | Rendered inside `ElegantFrame`, min-height full screen, centered           |

## 7. UI Specification

### Screens & components

| Element            | Component                                         | Path                                                          |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| Catch-all route    | `Page`                                            | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`            |
| Landing            | `EventLanding`                                    | `src/components/public-invitation/event-landing.tsx:26`       |
| Countdown          | `Countdown`                                       | `src/components/public-invitation/event-landing.tsx:87`       |
| Frame + primitives | `ElegantFrame`, `ElegantSection`, `WeddingButton` | `.../templates/elegant/`                                      |
| Not-found fallback | `InvitationNotFound`                              | `src/components/public-invitation/invitation-not-found.tsx:1` |

### Fields & validation

None — the page is read-only.

### Copy deck

| Key                  | Copy                             | Source                                                   |
| -------------------- | -------------------------------- | -------------------------------------------------------- |
| Countdown heading    | `"Faltan"`                       | `src/components/public-invitation/event-landing.tsx:103` |
| Day-arrived heading  | `"¡Llegó el día!"`               | `src/components/public-invitation/event-landing.tsx:95`  |
| Countdown unit 1     | `"Días"`                         | `src/components/public-invitation/event-landing.tsx:109` |
| Countdown unit 2     | `"Horas"`                        | `src/components/public-invitation/event-landing.tsx:110` |
| Countdown unit 3     | `"Min"`                          | `src/components/public-invitation/event-landing.tsx:111` |
| Map button           | `"Ver mapa"`                     | `src/components/public-invitation/event-landing.tsx:76`  |
| Metadata description | `` `Nuestra boda — ${couple}` `` | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:24`       |

None of these strings is host-authorable — the landing is not a page-builder surface.

## 8. Data Model

| Table    | Fields                                                                                                         | Read / Write | Index             |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------ | ----------------- |
| `events` | `name`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl`, `status`, `customDomain` | Read only    | `by_customDomain` |

No guest, invitation or member data is read. Nothing is written.

## 9. Backend Contract

| Function                          | Type         | Args     | Returns                                                                            | Guard                                             | Caps |
| --------------------------------- | ------------ | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- | ---- |
| `api.events.getPublicEventByHost` | public query | `{host}` | `{name, brideName, groomName, date, venueName, venueAddress, venueMapUrl} \| null` | none — data gating via `resolvePublicEventByHost` | —    |

Contract details and the metadata path are specified in EP-02-F11.

## 10. Business Rules

Mechanism rules live in EP-02-F11. The guest-facing rules are:

- **BR-07-07-01** `[AS-BUILT]` — The custom-domain root renders the countdown landing, never the
  Wedboard marketing site (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`).
- **BR-07-07-02** `[AS-BUILT]` — Any non-root, non-`/invitations/{slug}` path on a custom domain
  renders the branded not-found screen (`.../[[...rest]]/page.tsx:35`).
- **BR-07-07-03** `[AS-BUILT]` — The landing exposes only display-safe event fields; no guest,
  invitation or owner data is reachable from it.
- **BR-07-07-04** `[AS-BUILT]` — The landing is read-only: it renders no form and no public
  mutation is reachable from it.
- **BR-07-07-05** `[AS-BUILT]` — The countdown is omitted when the event has no date, and replaced
  by `"¡Llegó el día!"` once it reaches zero (`event-landing.tsx:89`, `:92`).
- **BR-07-07-06** `[AS-BUILT]` — An unresolvable host, or an archived event, renders the same
  not-found screen a bad invitation slug renders (`event-landing.tsx:30`; see EP-07-F08).

## 11. Acceptance Criteria

- **AC-07-07-01** — **Given** a connected custom domain with a dated event **When** a guest opens
  its root **Then** the couple names, date, countdown and venue render with no sign-in prompt.
- **AC-07-07-02** — **Given** the event date has passed **When** the root is opened **Then**
  `"¡Llegó el día!"` renders instead of the counter.
- **AC-07-07-03** — **Given** the event has no date **When** the root is opened **Then** no
  countdown and no date line render.
- **AC-07-07-04** — **Given** the event is archived **When** the root is opened **Then** the
  not-found screen renders.
- **AC-07-07-05** — **Given** any path such as `/rsvp` on the custom domain **When** it is opened
  **Then** the not-found screen renders, not the Wedboard marketing site.
- **AC-07-07-06** — **Given** the landing page's network responses **When** inspected **Then** no
  guest or invitation data is present in any payload.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                   |
| ----------- | ----------- | -------------------------------------------------------------------------- |
| TC-07-07-01 | integration | `getPublicEventByHost` returns only the seven display-safe fields          |
| TC-07-07-02 | unit        | Countdown renders "Faltan" vs "¡Llegó el día!" vs nothing                  |
| TC-07-07-03 | unit        | Couple-name fallback to `event.name` when a name is missing                |
| TC-07-07-04 | e2e         | Root of a custom domain renders the landing; `/anything` renders not-found |
| TC-07-07-05 | e2e         | Archived event renders not-found at the root                               |

### Manual QA checklist

- [ ] Open the domain root and confirm the countdown, styled like the invitation
- [ ] Confirm no sign-in redirect and no Wedboard chrome
- [ ] Open an arbitrary path and confirm the branded not-found screen
- [ ] Confirm the "Ver mapa" button opens the venue map
- [ ] Confirm the page offers no way to reach any invitation

## 13. Non-Functional

| Concern          | Specification                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None                                                                                                                                  |
| Performance      | One indexed query (`by_customDomain`); the countdown ticks client-side                                                                |
| Security & authz | No auth; field-whitelisted projection; routing never gates on `customDomainVerified` (EP-02-F09)                                      |
| Accessibility    | The countdown's three unit labels are separate `<span>`s not programmatically tied to the digits; the numeric string is a single line |
| i18n             | Spanish, hard-coded — not host-authorable                                                                                             |
| Analytics        | None                                                                                                                                  |

## 14. TODOs & Open Questions

- **TODO-07-11** `[P2]` `[ADD]` — The landing gives a guest no route to their own invitation: no
  slug entry, no explanation, no "check your invitation link" message.
  - **Rationale:** This is the page a guest reaches when they lose the path portion of their
    link, which is exactly when they need help.
  - **Proposed rule:** The landing explains that the personal invitation is reached through the
    link the hosts sent.
- **TODO-07-27** `[P2]` `[ADD]` — The countdown's digits and unit labels are not associated
  (`event-landing.tsx:105`–`:112`), so a screen reader announces `"05:12:30"` followed by
  "Días Horas Min".
  - **Rationale:** The remaining time is unintelligible to assistive technology.
  - **Proposed rule:** The countdown exposes a single readable label such as "Faltan 5 días, 12
    horas y 30 minutos".

### Open questions

- **Q1** — Should the landing be host-authorable (a fourth layout variant) rather than a
  hard-coded page?

## 15. Traceability

| Concern              | Source                                                                         |
| -------------------- | ------------------------------------------------------------------------------ |
| Full mechanism spec  | [EP-02-F11](../02-event-setup/custom-domain/F11-countdown-landing.md)          |
| Catch-all route      | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`                             |
| Root vs unknown path | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`, `:35`                      |
| Landing metadata     | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:9`                              |
| Landing component    | `src/components/public-invitation/event-landing.tsx:26`                        |
| Countdown            | `src/components/public-invitation/event-landing.tsx:87`                        |
| Copy                 | `src/components/public-invitation/event-landing.tsx:76`, `:95`, `:103`, `:109` |
| Host rewrite         | `src/middleware.ts:30`                                                         |
| Public query         | `convex/events.ts` (`getPublicEventByHost`)                                    |
| Host resolver        | `convex/lib/public.ts:30`                                                      |

## 16. Changelog

| Version | Date       | Author        | Change                                                                          |
| ------- | ---------- | ------------- | ------------------------------------------------------------------------------- |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification (guest-perspective only; mechanism in EP-02-F11) |
