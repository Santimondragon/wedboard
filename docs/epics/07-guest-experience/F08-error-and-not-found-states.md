---
id: EP-07-F08
title: Error & Not-Found States
epic: EP-07 Guest Experience
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-07-F01, EP-07-F07]
---

# EP-07-F08 — Error & Not-Found States

## 1. Summary

Every way a public invitation can fail to resolve ends in the same place: a single, branded
"Invitation Not Found" screen. A mistyped slug, an archived event, an invitation the host
deactivated, an unknown path on a custom domain — a guest sees identical output in all four
cases. That uniformity is a privacy property as much as a UX one: because the invitation URL is
the only credential a guest holds (EP-07-F01), the failure screen must not confirm which part of
a guessed URL was right.

## 2. Actors & Permissions

| Actor                | Access                                          | Notes                                                    |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Owner                | Sees the same screen                            | A host testing a link cannot tell _why_ it failed either |
| Co-owner (`planner`) | Same                                            |                                                          |
| Editor               | Same                                            |                                                          |
| Viewer               | Same                                            |                                                          |
| Public guest         | Sees the screen; learns nothing about the event |                                                          |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-07-08-01** — As a public guest following a broken link, I want a clear, on-brand message
  rather than a raw error, so that I know to ask the hosts for a new link.
- **US-07-08-02** — As a host, I want deactivating an invitation to revoke the link immediately.
- **US-07-08-03** — As a host, I want a stranger guessing at URLs to learn nothing about my event
  from the failures.

## 4. Entry Points

| Entry point                             | Route / control                      | Actor        |
| --------------------------------------- | ------------------------------------ | ------------ |
| Unknown event key                       | `/{anything}/invitations/{anything}` | Public guest |
| Unknown invitation slug on a real event | `/{event-key}/invitations/{wrong}`   | Public guest |
| Archived event                          | `/{event-key}/invitations/{slug}`    | Public guest |
| Deactivated invitation                  | `/{event-key}/invitations/{slug}`    | Public guest |
| Unknown path on a custom domain         | `https://{customDomain}/{anything}`  | Public guest |
| Unresolvable custom-domain host         | `https://{unknown-host}/`            | Public guest |

## 5. UX Flow

### Happy path

There is no happy path. The successful case belongs to EP-07-F01.

### Failure paths

1. **Query-driven (five of the six entry points):** `PublicInvitationPage` receives `null` from
   whichever public query it ran and renders `<InvitationNotFound />`
   (`src/components/public-invitation/public-invitation-page.tsx:40`). The `null` originates from
   one of four server checks:
   - event slug not found or archived (`convex/lib/public.ts:20`)
   - custom-domain host unresolvable or archived (`convex/lib/public.ts:42`)
   - invitation slug not found within the event, or `isActive === false`
     (`convex/lib/public.ts:61`)
   - `buildPublicInvitationPayload` returning `null` for the same reason
     (`convex/invitations.ts:126`)
2. **Route-driven (unknown path on a custom domain):** the catch-all renders the same component
   with no query at all (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:35`).
3. **Landing failure:** `EventLanding` renders the same component when its query returns `null`
   (`src/components/public-invitation/event-landing.tsx:30`).

### Alternate & edge paths

- **A1** — A previously loaded page whose invitation is deactivated mid-session does **not** flip
  to this screen instantly on its own; the Convex query is reactive and will return `null` on the
  next update, at which point the screen renders. Any submit attempted meanwhile fails with the
  generic Spanish error toast of the relevant block (EP-07-F02, F06).
- **A2** — A route that does not match any public matcher on the **primary** domain (for example
  `/dashboard/...` while signed out) is redirected to `/` by middleware
  (`src/middleware.ts:47`) — that is EP-01-F04, not this screen.
- **A3** — `/_domain/...` requested directly on the primary domain returns a bare HTTP 404 with
  no body (`src/middleware.ts:41`).

## 6. States

| State             | Behavior                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Loading           | The spinner precedes it; the screen appears only once the query settles to `null`                            |
| Empty             | The screen **is** the empty state                                                                            |
| Error             | No distinct error screen exists — a thrown query error is not caught by a boundary in `PublicInvitationPage` |
| Success           | N/A                                                                                                          |
| Disabled / locked | No controls at all — no retry, no home link                                                                  |
| Mobile            | Full-screen centered stack on `bg-stone-50`                                                                  |

## 7. UI Specification

### Screens & components

| Element                               | Component                 | Path                                                             |
| ------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| Not-found screen                      | `InvitationNotFound`      | `src/components/public-invitation/invitation-not-found.tsx:1`    |
| Renderer (query `null`)               | `PublicInvitationPage`    | `src/components/public-invitation/public-invitation-page.tsx:40` |
| Renderer (unknown custom-domain path) | catch-all `Page`          | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:35`               |
| Renderer (landing failure)            | `EventLanding`            | `src/components/public-invitation/event-landing.tsx:30`          |
| Metadata fallback                     | `buildInvitationMetadata` | `src/lib/invitation-metadata.ts:16`                              |

The component takes no props and has no variants — every caller renders the identical markup.

### Fields & validation

None.

### Copy deck

**This screen is the product's only guest-facing English copy.** Everything else a guest reads
is Spanish (see EP-07 README §6).

| Key                                | Copy                                                         | Source                                                        |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| Heading                            | `"Invitation Not Found"`                                     | `src/components/public-invitation/invitation-not-found.tsx:6` |
| Body                               | `"This invitation link may be invalid or has been removed."` | `src/components/public-invitation/invitation-not-found.tsx:9` |
| Document title (all failure cases) | `"Invitation Not Found"`                                     | `src/lib/invitation-metadata.ts:17`                           |

## 8. Data Model

| Table         | Fields                           | Read / Write                | Index                        |
| ------------- | -------------------------------- | --------------------------- | ---------------------------- |
| `events`      | `slug`, `customDomain`, `status` | Read (to determine failure) | `by_slug`, `by_customDomain` |
| `invitations` | `slug`, `isActive`               | Read (to determine failure) | `by_eventId_and_slug`        |

Nothing is written. No failed-lookup telemetry is recorded anywhere.

## 9. Backend Contract

| Function                                    | Type         | Args                                  | Returns                              | Guard | Caps |
| ------------------------------------------- | ------------ | ------------------------------------- | ------------------------------------ | ----- | ---- |
| `api.invitations.getPublicInvitation`       | public query | `{eventSlug, invitationSlug}`         | `null` in every failure case         | none  | —    |
| `api.invitations.getPublicInvitationByHost` | public query | `{host, invitationSlug}`              | `null` in every failure case         | none  | —    |
| `api.events.getPublicEventByHost`           | public query | `{host}`                              | `null` when unresolvable or archived | none  | —    |
| `api.meta.getPublicInvitationMeta`          | public query | `{eventSlug?, host?, invitationSlug}` | `null` in every failure case         | none  | —    |

All four return `null` rather than throwing, so no error message reaches the client.

## 10. Business Rules

- **BR-07-08-01** `[AS-BUILT]` — A public query that cannot resolve its event or invitation
  returns `null`; it never throws and never returns a partial payload
  (`convex/lib/public.ts:20`, `:42`, `:61`; `convex/invitations.ts:126`).
- **BR-07-08-02** `[AS-BUILT]` — A `null` payload renders `InvitationNotFound`
  (`public-invitation-page.tsx:40`).
- **BR-07-08-03** `[AS-BUILT]` — An unknown path on a custom domain renders the same component,
  without running any query (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:35`).
- **BR-07-08-04** `[AS-BUILT]` — An unresolvable custom-domain host renders the same component
  from the landing (`event-landing.tsx:30`).
- **BR-07-08-05** `[AS-BUILT]` — **All failure causes are indistinguishable to the visitor.**
  Verified across three layers:
  1. _Body_ — `InvitationNotFound` is a propless component with a single fixed markup
     (`invitation-not-found.tsx:1`–`:13`); every caller renders it identically.
  2. _Metadata_ — `buildInvitationMetadata` returns exactly `{ title: "Invitation Not Found" }`
     for a `null` meta, whatever the cause (`src/lib/invitation-metadata.ts:16`). No description,
     no OG image, no favicon leaks.
  3. _Server_ — every resolver collapses its distinct causes into `null` before returning
     (`convex/lib/public.ts:20`, `:42`, `:61`), so no discriminating value crosses the wire.
     There is **no** case where a wrong invitation slug on a real event produces different output
     from a wrong event key.
- **BR-07-08-06** `[AS-BUILT]` — The screen offers no controls: no retry, no link home, no
  contact affordance (`invitation-not-found.tsx:1`–`:13`).
- **BR-07-08-07** `[AS-BUILT]` — The screen's copy is English while every other guest-facing
  string is Spanish (`invitation-not-found.tsx:6`, `:9`).
- **BR-07-08-08** `[AS-BUILT]` — The response carries HTTP **200**, not 404: the component is
  rendered inside a matched route and no `notFound()` is called on any of the three paths
  (`public-invitation-page.tsx:41`, `.../[[...rest]]/page.tsx:35`, `event-landing.tsx:30`).
- **BR-07-08-09** `[AS-BUILT]` — Direct requests to `/_domain*` on the primary domain are the one
  genuine 404: middleware returns an empty 404 response with no branded screen
  (`src/middleware.ts:41`).
- **BR-07-08-10** `[AS-BUILT]` — Failed lookups are not logged, counted or rate-limited anywhere.

### Scope of the indistinguishability claim

`BR-07-08-05` covers the rendered body, the document metadata and the query payload. It does
**not** claim resistance to timing analysis: a request for a real event with a wrong invitation
slug performs one more indexed lookup than a request for an unknown event key
(`convex/lib/public.ts:15` then `:54`). No mitigation for that exists, and none is claimed.

## 11. Acceptance Criteria

- **AC-07-08-01** — **Given** a URL with an unknown event key **When** it is opened **Then** the
  branded screen renders with the heading "Invitation Not Found".
- **AC-07-08-02** — **Given** a real event key and an unknown invitation slug **When** it is
  opened **Then** the rendered output is byte-identical to `AC-07-08-01`, including the document
  title.
- **AC-07-08-03** — **Given** the event is archived **When** a valid invitation URL is opened
  **Then** the same screen renders.
- **AC-07-08-04** — **Given** the invitation's `isActive` is false **When** its URL is opened
  **Then** the same screen renders.
- **AC-07-08-05** — **Given** an arbitrary path on a connected custom domain **When** it is opened
  **Then** the same screen renders and no Wedboard marketing content appears.
- **AC-07-08-06** — **Given** any of the above **When** the response is inspected **Then** the
  document title is `"Invitation Not Found"` and no OG image, description or favicon is emitted.
- **AC-07-08-07** — **Given** `/_domain/x` on the primary domain **When** it is requested **Then**
  the status is 404 with an empty body.
- **AC-07-08-08** — **Given** a valid invitation is deactivated while its page is open **When**
  the query updates **Then** the page replaces itself with the not-found screen.

## 12. Testing Criteria

| ID          | Level       | Scenario                                                                     |
| ----------- | ----------- | ---------------------------------------------------------------------------- |
| TC-07-08-01 | unit        | `buildInvitationMetadata(null)` returns only the fallback title              |
| TC-07-08-02 | integration | All four resolver failure causes return `null`                               |
| TC-07-08-03 | e2e         | Rendered HTML for a wrong event key and a wrong invitation slug is identical |
| TC-07-08-04 | e2e         | Archived event and deactivated invitation both render the screen             |
| TC-07-08-05 | e2e         | Unknown custom-domain path renders the screen, not the marketing site        |
| TC-07-08-06 | e2e         | `/_domain/x` on the primary domain returns 404                               |
| TC-07-08-07 | e2e         | Deactivating an invitation live swaps the open page to the screen            |

### Manual QA checklist

- [ ] Compare the page source of a wrong event key vs a wrong invitation slug — they must match
- [ ] Confirm the browser tab title in every failure case
- [ ] Archive an event and confirm its invitation link goes dark
- [ ] Deactivate an invitation and confirm the same
- [ ] Open `https://{customDomain}/whatever` and confirm the branded screen
- [ ] Confirm the response status code (currently 200 — see `TODO-07-10`)

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | None                                                                                                                                                                                                         |
| Performance      | At most two indexed lookups before failing                                                                                                                                                                   |
| Security & authz | Uniform failure output prevents confirming a valid event key or invitation slug through the body or metadata; timing is not equalized (see §10 scope note); failed lookups are neither counted nor throttled |
| Accessibility    | A single `<h1>` and a paragraph; no controls to operate                                                                                                                                                      |
| i18n             | **English**, unlike the rest of the guest surface (`TODO-07-06`)                                                                                                                                             |
| Analytics        | None — a host cannot learn that guests are hitting broken links                                                                                                                                              |

## 14. TODOs & Open Questions

- **TODO-07-06** `[P2]` `[CHANGE]` — The screen is English in an otherwise Spanish guest product
  (`invitation-not-found.tsx:6`, `:9`; document title at `src/lib/invitation-metadata.ts:17`).
  - **Rationale:** A Spanish-speaking guest hits an English error at the one moment they most
    need to understand what happened.
  - **Proposed rule:** The heading, body and document title are Spanish, matching `ELEGANT_COPY`.
- **TODO-07-10** `[P2]` `[CHANGE]` — Unresolvable invitations respond with HTTP 200
  (`BR-07-08-08`).
  - **Rationale:** Search engines and link previewers index a "not found" page as valid content,
    and monitoring cannot distinguish a broken link from a working one.
  - **Proposed rule:** The three not-found paths respond 404 while keeping the branded body.
- **TODO-07-28** `[P2]` `[ADD]` — The screen offers no next action: no link to the couple's
  landing page on a custom domain, and no guidance to request a new link.
  - **Rationale:** A guest reaching it has no recovery path.
  - **Proposed rule:** The screen suggests contacting the hosts and, on a custom domain, links to
    the domain root.
- **TODO-07-29** `[P2]` `[ADD]` — There is no error boundary around the public page: a thrown
  query error (as opposed to a `null` result) has no branded fallback
  (`public-invitation-page.tsx:32`–`:42` handles only `undefined` and `null`).
  - **Rationale:** A transient backend failure shows the guest an unstyled Next.js error.
  - **Proposed rule:** The public route wraps its content in an error boundary rendering the
    branded screen.
- **TODO-07-30** `[P2]` `[ADD]` — Failed invitation lookups are not counted, so neither the host
  nor the platform can detect a broken campaign or an enumeration attempt (relates to
  `TODO-07-02`).
  - **Rationale:** Enumeration against a soft-secret slug is currently invisible.
  - **Proposed rule:** Failed public resolutions are counted per event and per source.

### Open questions

- **Q1** — Should a deactivated invitation say something different from a nonexistent one, given
  the host presumably wants the guest to know the link was withdrawn rather than mistyped —
  and is that worth the information disclosure?
- **Q2** — Should the screen carry the event's branding (couple names, template theme) when the
  _event_ resolved but the _invitation_ did not? That would improve the guest's experience at the
  direct cost of `BR-07-08-05`.

## 15. Traceability

| Concern                               | Source                                                           |
| ------------------------------------- | ---------------------------------------------------------------- |
| Not-found component                   | `src/components/public-invitation/invitation-not-found.tsx:1`    |
| Heading copy                          | `src/components/public-invitation/invitation-not-found.tsx:6`    |
| Body copy                             | `src/components/public-invitation/invitation-not-found.tsx:9`    |
| Query-`null` render                   | `src/components/public-invitation/public-invitation-page.tsx:40` |
| Custom-domain unknown path            | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:35`               |
| Landing failure                       | `src/components/public-invitation/event-landing.tsx:30`          |
| Metadata fallback                     | `src/lib/invitation-metadata.ts:16`                              |
| Archived-event gate                   | `convex/lib/public.ts:20`                                        |
| Host resolution gate                  | `convex/lib/public.ts:42`                                        |
| Inactive-invitation gate              | `convex/lib/public.ts:61`                                        |
| Payload `null`                        | `convex/invitations.ts:126`                                      |
| Primary-domain `/_domain` 404         | `src/middleware.ts:41`                                           |
| Signed-out redirect (not this screen) | `src/middleware.ts:47`                                           |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
