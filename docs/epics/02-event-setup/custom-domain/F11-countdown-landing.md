---
id: EP-02-F11
title: Countdown Landing
epic: EP-02 Event Setup
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F03, EP-02-F08]
---

# EP-02-F11 — Countdown Landing

## 1. Summary

A connected custom domain has a root — `https://invites.mywedding.com/` — that no primary-domain
URL corresponds to. Rather than leaving it blank or falling through to the Wedboard marketing
site, the root serves a small public page in the wedding template's styling: the couple's names,
the date, a live countdown, and the venue with a map link. It is deliberately read-only: guests
still RSVP through their personal invitation link. Any other unrecognized path on the domain
renders a branded "Invitation Not Found" instead of anything Wedboard-branded, so a guest who
mistypes a link never lands somewhere that reveals the platform.

## 2. Actors & Permissions

| Actor                              | Access                | Notes                                                                                               |
| ---------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Public guest                       | Read, unauthenticated | The only actor; requests on a custom domain never touch Clerk (`src/middleware.ts:30`)              |
| Owner / Co-owner / Editor / Viewer | Indirect              | Authoring is `updateEvent` (see [F03](../F03-event-profile-settings.md)); this feature only renders |

No guard runs. `events.getPublicEventByHost` is a public query with no auth check
(`convex/events.ts:67`); the only gating is the archived-event check inside
`resolvePublicEventByHost` (`convex/lib/public.ts:42`).

Role semantics are defined once in [roles-and-permissions.md](../../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F11-01** — As a guest who typed the couple's domain without a path, I want to see
  something meaningful about the wedding rather than an error.
- **US-02-F11-02** — As a guest, I want to know how long is left until the day.
- **US-02-F11-03** — As a guest, I want to find the venue and open it in a map.
- **US-02-F11-04** — As a guest with a mistyped link, I want a page that clearly belongs to this
  wedding rather than an unrelated product's website.
- **US-02-F11-05** — As an owner, I want the domain root to expose only the details I already
  publish, and nothing about my guest list.

## 4. Entry Points

| Entry point      | Route / control                                                                                    | Actor        |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| Domain root      | `https://{customDomain}/` → rewritten to `/_domain/{host}`                                         | Public guest |
| Any unknown path | `https://{customDomain}/anything` → rewritten to `/_domain/{host}/anything`                        | Public guest |
| Settings "Visit" | `/dashboard/[eventSlug]/settings` → the live-state Visit button (`custom-domain-settings.tsx:213`) | Co-owner+    |

The invitation path itself is _not_ this feature: `https://{customDomain}/invitations/{slug}` is
served by the sibling route `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx` and
is specified under EP-07 Guest Experience.

### Why the folder is named `%5Fdomain`

An App Router folder literally named `_domain` would be a **private folder**: Next.js excludes
underscore-prefixed directories from routing entirely, so the rewrite target would not exist.
`%5F` is the percent-encoding of `_`, which Next.js decodes back into a route segment named
`_domain` while keeping the folder itself routable. The rewrite in middleware writes the
human-readable form `/_domain/{host}{path}` (`src/middleware.ts:35`) and it resolves to this
folder.

## 5. UX Flow

### Happy path — WF-02-11 Visit the custom domain landing

1. A guest requests `https://invites.mywedding.com/`. Middleware lowercases the `Host`, strips
   the port, and finds it is not a primary host (`src/middleware.ts:27`, `:16`).
2. The request is rewritten to `/_domain/invites.mywedding.com/` and **returns before any Clerk
   logic runs** (`src/middleware.ts:34`).
3. The catch-all segment matches with an empty `rest`, so the page renders
   `<EventLanding host={decodeURIComponent(host)} />`
   (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`).
4. `generateMetadata` server-fetches the same query and sets the tab title to
   `"{brideName} & {groomName}"` (falling back to the event name) with the description
   `Nuestra boda — {couple}` (`page.tsx:20`–`:24`).
5. `EventLanding` subscribes to `api.events.getPublicEventByHost` with the host
   (`event-landing.tsx:27`), which resolves through `resolvePublicEventByHost` and returns a
   seven-field display-safe projection (`convex/events.ts:72`).
6. The page renders inside `TemplateThemeProvider` + `ElegantFrame`, so it inherits the elegant
   template's palette and fonts (`event-landing.tsx:35`).
7. Content, in order: the formatted date, the couple heading, the countdown, then the venue block
   with the "Ver mapa" button (`event-landing.tsx:39`–`:80`).

### Alternate & edge paths

- **A1** — The event has both `brideName` and `groomName` → the heading renders `First & Second`;
  otherwise `coupleNames` falls back to whichever one is set, and failing that splits `event.name`
  on `&`/`y` (`primitives.tsx:287`, `:278`).
- **A2** — The event has no `date` → the date line and the entire countdown are omitted
  (`event-landing.tsx:39`, `:89`).
- **A3** — The date has arrived or passed → `useRemaining` clamps the difference at zero, so all
  three units read zero and the countdown is replaced by "¡Llegó el día!"
  (`event-landing.tsx:92`).
- **A4** — Neither `venueName` nor `venueAddress` is set → the whole venue block is omitted
  (`event-landing.tsx:57`).
- **A5** — `venueMapUrl` is set → "Ver mapa" links to it verbatim; otherwise it links to a Google
  Maps search of the address, or of the venue name when there is no address
  (`primitives.tsx:297`, `event-landing.tsx:71`).
- **A6** — Any path other than the root on the custom domain → `rest` is non-empty and
  `InvitationNotFound` renders; `generateMetadata` returns `{}` for those paths without querying
  Convex (`page.tsx:15`, `:35`).
- **A7** — The host has no matching event, or its event is `archived` → the query returns `null`
  and `EventLanding` renders `InvitationNotFound` (`event-landing.tsx:30`,
  `convex/lib/public.ts:42`).
- **E1** — `/_domain/...` is requested directly on the **primary** domain → middleware answers
  `404` with an empty body (`src/middleware.ts:40`). This covers both this route and the by-host
  invitation route.
- **E2** — The server-side metadata fetch throws → it is caught and `{}` is returned, so the page
  still renders with default metadata (`page.tsx:18`).

## 6. States

| State             | Behavior                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | `LoadingState` centered spinner while the query is `undefined` (`event-landing.tsx:29`)                                                    |
| Empty             | No date → no countdown; no venue → no venue block. The heading always renders                                                              |
| Error             | No error branch — a failed resolution is indistinguishable from "not found" and renders `InvitationNotFound`                               |
| Success           | Date, couple heading, countdown, venue, "Ver mapa"                                                                                         |
| Disabled / locked | The page is entirely read-only; there is no RSVP affordance by design (`event-landing.tsx:24`)                                             |
| Mobile            | `ElegantFrame` is a phone-width card; the section is `min-h-screen`, centered, with `text-balance` on the heading (`event-landing.tsx:37`) |

## 7. UI Specification

### Screens & components

| Element         | Component               | Path                                                                          |
| --------------- | ----------------------- | ----------------------------------------------------------------------------- |
| Catch-all route | `Page`                  | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`                            |
| Metadata        | `generateMetadata`      | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:9`                             |
| Landing         | `EventLanding`          | `src/components/public-invitation/event-landing.tsx:26`                       |
| Countdown       | `Countdown` (local)     | `src/components/public-invitation/event-landing.tsx:87`                       |
| Not found       | `InvitationNotFound`    | `src/components/public-invitation/invitation-not-found.tsx:1`                 |
| Frame           | `ElegantFrame`          | `src/components/public-invitation/templates/elegant`                          |
| Theme           | `TemplateThemeProvider` | `src/components/public-invitation/template-theme.tsx`                         |
| Map button      | `WeddingButton`         | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:22` |
| Countdown maths | `useRemaining`          | `primitives.tsx:313`                                                          |
| Name resolution | `coupleNames`           | `primitives.tsx:287`                                                          |
| Date formatting | `formatDate`            | `primitives.tsx:305`                                                          |
| Map URL         | `mapHref`               | `primitives.tsx:297`                                                          |
| Zero-padding    | `pad`                   | `primitives.tsx:311`                                                          |

### Fields & validation

No input. Everything rendered is derived from the event record and is authored in Settings
(EP-02-F03); nothing on this page is authorable through the Design Studio.

| Displayed value      | Source field                           | Formatting                                                                                    |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Date line            | `event.date`                           | `DD/MM/YYYY` from the **UTC** parts of the timestamp (`primitives.tsx:308`)                   |
| Couple heading       | `brideName` + `groomName`, else `name` | `First & Second`                                                                              |
| Countdown            | `event.date`                           | `DD:HH:MM`, each unit zero-padded to two digits, recomputed every 30 s (`primitives.tsx:326`) |
| Venue name / address | `venueName`, `venueAddress`            | Verbatim                                                                                      |
| Map link             | `venueMapUrl` else a Maps search       | `mapHref`                                                                                     |

### Copy deck

Quoted verbatim from source. All landing copy is Spanish; the not-found screen is English.

| Key                      | Copy                                                       | Source                                                        |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Countdown heading        | `Faltan`                                                   | `src/components/public-invitation/event-landing.tsx:103`      |
| Countdown unit — days    | `Días`                                                     | `event-landing.tsx:109`                                       |
| Countdown unit — hours   | `Horas`                                                    | `event-landing.tsx:110`                                       |
| Countdown unit — minutes | `Min`                                                      | `event-landing.tsx:111`                                       |
| Day-has-arrived          | `¡Llegó el día!`                                           | `event-landing.tsx:95`                                        |
| Map button               | `Ver mapa`                                                 | `event-landing.tsx:76`                                        |
| Metadata description     | `Nuestra boda — {couple}`                                  | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:24`            |
| Not found — title        | `Invitation Not Found`                                     | `src/components/public-invitation/invitation-not-found.tsx:6` |
| Not found — body         | `This invitation link may be invalid or has been removed.` | `invitation-not-found.tsx:9`                                  |

## 8. Data Model

| Table    | Fields                                                                               | Read / Write    | Index                                     |
| -------- | ------------------------------------------------------------------------------------ | --------------- | ----------------------------------------- |
| `events` | `customDomain` (match), `status` (gate)                                              | Read            | `by_customDomain` (`convex/schema.ts:81`) |
| `events` | `name`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl` | Read (returned) | —                                         |

Read-only. Nothing is written by this feature.

### The field whitelist is a privacy boundary

`getPublicEventByHost` does not return the event document. It constructs and returns exactly
seven display fields (`convex/events.ts:72`–`:80`), and the handler is commented as returning
"only display-safe fields" (`convex/events.ts:66`). Everything else on the record is therefore
unreachable from an unauthenticated request to the domain root: `ownerUserId`, `slug` (the event
key, which addresses the same invitations on the primary domain), `status`, `templateId`, the
whole `layoutVariants` page-builder payload, `meta`, `customDomain` and `customDomainVerified`,
plus the Convex `_id` and `_creationTime`. Nothing invitation- or guest-scoped is queried at all.

This matters because the domain root is the one public surface reachable **without knowing any
slug**. The by-host invitation query requires an `invitationSlug` and is therefore effectively
guarded by the secrecy of that slug; this page is not guarded by anything. Widening the
projection would turn a guessable URL into an enumeration surface, so any new field added here
is a deliberate publication decision, not a convenience.

## 9. Backend Contract

| Function                          | Type             | Args             | Returns                                                                              | Guard                                        | Caps                            |
| --------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------- |
| `api.events.getPublicEventByHost` | **public** query | `{host: string}` | `{name, brideName, groomName, date, venueName, venueAddress, venueMapUrl}` or `null` | None — public; archived events return `null` | Single indexed `.unique()` read |

Source: `convex/events.ts:67`. Resolver: `resolvePublicEventByHost`
(`convex/lib/public.ts:30`), which normalizes the host with `normalizeCustomDomain` before the
index lookup (`convex/lib/public.ts:34`).

The query is consumed twice per request: once server-side by `generateMetadata` via
`fetchQuery` (`page.tsx:16`) and once client-side by `EventLanding` via `useQuery`
(`event-landing.tsx:27`).

## 10. Business Rules

- **BR-02-F11-01** `[AS-BUILT]` — Every request whose `Host` is not a primary host is rewritten
  to `/_domain/{host}{path}` before any Clerk logic executes, so custom-domain traffic never
  touches authentication (`src/middleware.ts:30`–`:37`).
- **BR-02-F11-02** `[AS-BUILT]` — Primary hosts are `localhost`, `127.0.0.1`, any `*.vercel.app`
  host, and `NEXT_PUBLIC_PRIMARY_DOMAIN` plus its `www.` form (`src/middleware.ts:16`–`:24`).
- **BR-02-F11-03** `[AS-BUILT]` — A `/_domain` path requested directly on a primary host returns
  a bodyless `404` (`src/middleware.ts:40`).
- **BR-02-F11-04** `[AS-BUILT]` — The custom-domain root renders the countdown landing; every
  other path not matched by a more specific route renders `InvitationNotFound`
  (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:32`, `:35`).
- **BR-02-F11-05** `[AS-BUILT]` — `getPublicEventByHost` returns only the seven whitelisted
  display fields, never the event document (`convex/events.ts:72`).
- **BR-02-F11-06** `[AS-BUILT]` — The host is normalized with `normalizeCustomDomain` before the
  `by_customDomain` lookup, so a request carrying a port or trailing dot still resolves
  (`convex/lib/public.ts:34`).
- **BR-02-F11-07** `[AS-BUILT]` — An `archived` event does not resolve on its custom domain; the
  landing renders `InvitationNotFound` (`convex/lib/public.ts:42`).
- **BR-02-F11-08** `[AS-BUILT]` — Resolution does not consider `customDomainVerified`
  (`convex/lib/public.ts:39`) — see [F09](./F09-dns-verification.md) BR-02-F09-01.
- **BR-02-F11-09** `[AS-BUILT]` — The countdown is omitted entirely when the event has no date
  (`src/components/public-invitation/event-landing.tsx:89`).
- **BR-02-F11-10** `[AS-BUILT]` — The remaining time is clamped at zero, so a past date renders
  "¡Llegó el día!" rather than negative values
  (`primitives.tsx:316`, `event-landing.tsx:92`).
- **BR-02-F11-11** `[AS-BUILT]` — The countdown displays days, hours and minutes only — no
  seconds — and refreshes on a 30-second interval (`primitives.tsx:326`).
- **BR-02-F11-12** `[AS-BUILT]` — The couple heading prefers `brideName` + `groomName`, then
  whichever single name is set, then a split of the event name (`primitives.tsx:287`).
- **BR-02-F11-13** `[AS-BUILT]` — The venue block renders only when a venue name or address
  exists, and "Ver mapa" prefers `venueMapUrl` over a generated Maps search
  (`event-landing.tsx:57`, `primitives.tsx:300`).
- **BR-02-F11-14** `[AS-BUILT]` — The landing offers no RSVP or write affordance of any kind; it
  is documented as intentionally read-only (`event-landing.tsx:20`–`:25`).
- **BR-02-F11-15** `[AS-BUILT]` — Page metadata is the couple names as title and
  `Nuestra boda — {couple}` as description; for non-root paths metadata is empty and Convex is
  not queried (`page.tsx:15`, `:24`).
- **BR-02-F11-16** `[AS-BUILT]` — A failure of the metadata fetch degrades to empty metadata and
  never fails the page (`page.tsx:18`).

## 11. Acceptance Criteria

- **AC-02-F11-01** — **Given** an active event with a connected domain **When** a guest opens
  `https://{customDomain}/` **Then** the couple names, date, countdown and venue render, with no
  sign-in redirect.
- **AC-02-F11-02** — **Given** the event date is two days away **When** the page renders **Then**
  the countdown reads `02:HH:MM` under the heading "Faltan", labelled "Días", "Horas", "Min".
- **AC-02-F11-03** — **Given** the event date is in the past **When** the page renders **Then**
  "¡Llegó el día!" is shown in place of the countdown.
- **AC-02-F11-04** — **Given** the event has no `date` **When** the page renders **Then** neither
  the date line nor the countdown appears.
- **AC-02-F11-05** — **Given** `venueMapUrl` is set **When** the guest clicks "Ver mapa" **Then**
  the browser opens that exact URL.
- **AC-02-F11-06** — **Given** only `venueAddress` is set **When** the guest clicks "Ver mapa"
  **Then** a Google Maps search for that address opens.
- **AC-02-F11-07** — **Given** any custom-domain path other than the root and the invitation
  route **When** it is requested **Then** the branded "Invitation Not Found" screen renders and
  the Wedboard marketing site is never shown.
- **AC-02-F11-08** — **Given** the primary domain **When** `/_domain/anything` is requested
  **Then** the response is `404`.
- **AC-02-F11-09** — **Given** an `archived` event **When** its custom domain root is requested
  **Then** "Invitation Not Found" renders.
- **AC-02-F11-10** — **Given** the landing response **When** it is inspected **Then** it contains
  no event key, event id, owner identity, template layout, or any guest or invitation data.
- **AC-02-F11-11** — **Given** the event has `brideName` "Ana" and `groomName` "Luis" **When**
  the page is shared **Then** the document title is `Ana & Luis` and the description is
  `Nuestra boda — Ana & Luis`.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                               |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| TC-02-F11-01 | unit        | `useRemaining` clamps a past date to `{days:0,hours:0,minutes:0}`                                                      |
| TC-02-F11-02 | unit        | `coupleNames` covers both-names, single-name and name-split fallbacks                                                  |
| TC-02-F11-03 | unit        | `mapHref` prefers `venueMapUrl` and otherwise builds an encoded Maps search                                            |
| TC-02-F11-04 | unit        | `isPrimaryHost` accepts localhost, `*.vercel.app`, the primary domain and its `www.` form, and rejects everything else |
| TC-02-F11-05 | integration | `getPublicEventByHost` returns exactly the seven whitelisted keys                                                      |
| TC-02-F11-06 | integration | `getPublicEventByHost` returns `null` for an archived event and for an unknown host                                    |
| TC-02-F11-07 | integration | `getPublicEventByHost` resolves a host supplied with a port or trailing dot                                            |
| TC-02-F11-08 | e2e         | `curl -H "Host: mywedding.test" http://localhost:3000/` renders the landing                                            |
| TC-02-F11-09 | e2e         | `curl -H "Host: mywedding.test" http://localhost:3000/anything` renders the not-found screen                           |
| TC-02-F11-10 | e2e         | `/_domain/x` on the primary host returns 404                                                                           |

### Manual QA checklist

- [ ] Set an event date a few days out and confirm the countdown units are sensible.
- [ ] Set the date to yesterday and confirm "¡Llegó el día!".
- [ ] Clear the date and confirm the countdown disappears.
- [ ] Confirm "Ver mapa" opens the configured map URL.
- [ ] Open a nonsense path on the domain and confirm the branded not-found screen.
- [ ] Confirm the landing never redirects to sign-in, even in a logged-out browser.
- [ ] View source and confirm the event key does not appear.

## 13. Non-Functional

| Concern          | Specification                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | One indexed `.unique()` read per request; the query is issued twice (metadata + client)                                                   |
| Performance      | Countdown re-renders once per 30 s; no polling of Convex beyond the live subscription                                                     |
| Security & authz | Unauthenticated by design. The seven-field whitelist is the boundary (§8). Middleware guarantees custom-domain requests never enter Clerk |
| Accessibility    | The countdown is a decorative numeric string with separate unit labels and no live region; "Ver mapa" is a real anchor                    |
| i18n             | The landing is Spanish-only and hardcoded; the not-found screen is English — see TODO-02-46                                               |
| Analytics        | No page-view or landing analytics                                                                                                         |

## 14. TODOs & Open Questions

- **TODO-02-45** `[P2]` `[CHANGE]` — The countdown and the date line disagree about time zones.
  `useRemaining` subtracts `Date.now()` from the stored timestamp, so it counts down in the
  **viewer's** local zone (`primitives.tsx:316`), while `formatDate` renders the date from
  `getUTCDate()` / `getUTCMonth()` / `getUTCFullYear()` (`primitives.tsx:308`). `events.date` is
  a bare Unix-ms timestamp with no zone stored alongside it.
  - **Rationale:** A guest in a zone west of UTC can see a printed date one day later than the
    one the countdown is heading toward, and "¡Llegó el día!" appears at the wedding's UTC
    instant rather than at local midnight in the couple's own zone. For a wedding — an event
    whose whole meaning is a local wall-clock time — this is the wrong reference frame.
  - **Proposed rule:** The event stores an IANA time zone alongside `date`; both the printed date
    and the countdown are computed in that zone, so every guest sees the same numbers regardless
    of where they open the page.
- **TODO-02-46** `[P2]` `[CHANGE]` — The custom-domain fallback screen is English —
  "Invitation Not Found" / "This invitation link may be invalid or has been removed."
  (`src/components/public-invitation/invitation-not-found.tsx:6`, `:9`) — inside an otherwise
  fully Spanish guest experience, and it is styled in the dashboard's zinc/stone palette rather
  than the elegant template the rest of the domain uses.
  - **Rationale:** It is the one page a confused guest is most likely to reach, and it currently
    reads as belonging to a different product than the invitation they were sent.
  - **Proposed rule:** The fallback is Spanish and rendered inside `ElegantFrame`, consistent with
    the landing and the invitation pages.

### Open questions

- **Q1** — Should the landing be suppressible per event, for owners who would rather the domain
  root show nothing at all until the invitations go out?
- **Q2** — Should the landing link onward to anything (a shared gallery, a gift registry), or is
  read-only-with-no-exits the intended end state?
- **Q3** — Should the countdown include seconds on the day of the event?

## 15. Traceability

| Concern                              | Source                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Middleware rewrite                   | `src/middleware.ts:30`                                                         |
| Middleware primary-host test         | `src/middleware.ts:16`                                                         |
| Middleware `/_domain` 404 on primary | `src/middleware.ts:40`                                                         |
| Route (catch-all)                    | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:30`                             |
| Metadata                             | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:9`                              |
| UI landing                           | `src/components/public-invitation/event-landing.tsx:26`                        |
| UI countdown                         | `src/components/public-invitation/event-landing.tsx:87`                        |
| UI not found                         | `src/components/public-invitation/invitation-not-found.tsx:1`                  |
| Countdown maths                      | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:313` |
| Date formatting                      | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:305` |
| Couple names                         | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:287` |
| Map URL                              | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:297` |
| Backend (public query)               | `convex/events.ts:67`                                                          |
| Public resolution by host            | `convex/lib/public.ts:30`                                                      |
| Host normalization                   | `convex/lib/domains.ts:30`                                                     |
| Schema index                         | `convex/schema.ts:81`                                                          |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
