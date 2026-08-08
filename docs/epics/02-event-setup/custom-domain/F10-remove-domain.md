---
id: EP-02-F10
title: Remove Domain
epic: EP-02 Event Setup
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F08]
---

# EP-02-F10 — Remove Domain

## 1. Summary

Disconnecting a custom domain returns the event to the primary-domain-only addressing it started
with. It is reversible — the same domain can be reconnected at any time — but it is immediate and
it breaks every link already shared on that hostname, so it sits behind a confirmation dialog
that says exactly that. Removal reverses the connect order: the domain is detached from the
hosting project first, then the claim is cleared in Convex, so a hostname is never released for
another event while still attached elsewhere.

## 2. Actors & Permissions

| Actor                | Access  | Notes                                                                 |
| -------------------- | ------- | --------------------------------------------------------------------- |
| Owner                | Full    |                                                                       |
| Co-owner (`planner`) | Full    | Removal is _not_ owner-gated, unlike archive and delete               |
| Editor               | Blocked | Cannot reach Settings (`settings/page.tsx:164`)                       |
| Viewer               | Blocked | Same                                                                  |
| Public guest         | None    | Experiences the consequence: the hostname stops resolving to an event |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "planner")` in
`events.removeCustomDomain` (`convex/events.ts:267`). The route handler first reads the event
through `events.getEventById` (`requireEventAccess`) to learn which hostname to detach
(`src/app/api/domains/route.ts:110`). See
[roles-and-permissions.md](../../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F10-01** — As an owner, I want to disconnect a domain I no longer want to use so that
  it is free for another purpose.
- **US-02-F10-02** — As an owner, I want to be warned about the consequence before it happens, so
  that I do not break guest links by accident.
- **US-02-F10-03** — As an owner, I want removal to still work when the hosting side has already
  lost the domain, so that I am never stuck in a broken state.
- **US-02-F10-04** — As an owner, I want to know that standard invitation links keep working
  after removal.

## 4. Entry Points

| Entry point     | Route / control                                                      | Actor                |
| --------------- | -------------------------------------------------------------------- | -------------------- |
| "Remove Domain" | `/dashboard/[eventSlug]/settings` → Custom Domain card → AlertDialog | Co-owner+            |
| API             | `DELETE /api/domains` with `{eventId}`                               | Authenticated caller |

The button renders next to "Check Status" whenever a domain is connected, in both the pending and
live states (`custom-domain-settings.tsx:286`).

## 5. UX Flow

### Happy path — WF-02-10 Remove a connected custom domain

1. A co-owner opens Settings and clicks the rose-styled **Remove Domain** button
   (`custom-domain-settings.tsx:288`), which is an `AlertDialogTrigger` — nothing is sent yet.
2. The dialog opens with the title "Remove Custom Domain" (`:299`) and the description
   "Invitation links on {customDomain} will stop working. Guests can still use the standard
   links. You can reconnect the domain at any time." (`:301`), with "Cancel" and a destructive
   "Remove Domain" action (`:307`, `:308`).
3. Confirming runs `handleRemove`, which `DELETE`s `{eventId}` to `/api/domains` (`:140`).
4. The handler requires a Convex token (`route.ts:96`) and an `eventId` in the body
   (`route.ts:104`), then reads the event (`route.ts:110`).
5. **Detach first.** If the event has a `customDomain`, `removeProjectDomain` issues
   `DELETE /v9/projects/{VERCEL_PROJECT_ID}/domains/{domain}` (`src/lib/vercel-domains.ts:122`).
6. **Clear second.** `events.removeCustomDomain` patches both `customDomain` and
   `customDomainVerified` to `undefined` (`convex/events.ts:268`).
7. The handler answers `200 {ok: true}` (`route.ts:126`). The wizard clears its local record
   state and toasts "Domain removed" (`custom-domain-settings.tsx:149`, `:150`). The reactive
   event query re-renders the section back to its empty "connect a domain" form.

### Alternate & edge paths

- **A1** — Vercel answers **404** for the detach (the domain was already removed there, by hand or
  by a previous partial failure) → the error is swallowed and the flow proceeds to clear Convex
  (`route.ts:120`). This is the deliberate tolerance described in BR-02-F10-04.
- **A2** — The event has no `customDomain` (e.g. a double-submit) → the Vercel call is skipped
  entirely and `removeCustomDomain` runs as a harmless no-op patch (`route.ts:115`).
- **A3** — The domain was in the pending state, never live → removal behaves identically; the
  DNS records the owner may have added at their registrar are _not_ cleaned up, because Wedboard
  has no registrar access.
- **E1** — No Clerk session → `401` (`route.ts:98`).
- **E2** — Missing `eventId` → `400 {error: "eventId is required"}` (`route.ts:105`).
- **E3** — The caller is below `planner` → `removeCustomDomain` throws; `errorResponse` returns
  the message and the wizard toasts it (`route.ts:20`).
- **E4** — Vercel fails with any non-404 status → the error propagates and **Convex is left
  untouched**, so the domain remains claimed and the owner can retry (`route.ts:121`).
- **E5** — The `fetch` itself rejects → the generic toast "Failed to remove domain"
  (`custom-domain-settings.tsx:152`).

## 6. States

| State             | Behavior                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Loading           | None — the button is available as soon as the section renders                            |
| Empty             | The button does not exist when no domain is connected (`custom-domain-settings.tsx:200`) |
| Error             | sonner error toast; the domain stays connected                                           |
| Success           | "Domain removed" toast; the section returns to the connect form                          |
| Disabled / locked | The trigger is disabled and reads "Removing..." while in flight (`:292`, `:294`)         |
| Mobile            | The dialog is the standard shadcn `AlertDialog`, full-width on small screens             |

## 7. UI Specification

### Screens & components

| Element             | Component                                   | Path                                                      |
| ------------------- | ------------------------------------------- | --------------------------------------------------------- |
| Remove trigger      | shadcn `Button` inside `AlertDialogTrigger` | `src/components/dashboard/custom-domain-settings.tsx:286` |
| Confirmation dialog | shadcn `AlertDialog`                        | `:297`                                                    |
| Confirm action      | `AlertDialogAction` → `handleRemove`        | `:308`                                                    |
| Remove handler      | `handleRemove`                              | `:137`                                                    |
| Route handler       | `DELETE`                                    | `src/app/api/domains/route.ts:95`                         |
| Vercel detach       | `removeProjectDomain`                       | `src/lib/vercel-domains.ts:122`                           |

### Fields & validation

No user input. The dialog requires an explicit confirmation click; there is no typed-name
confirmation as used elsewhere in the Danger Zone.

### Copy deck

None — the removal dialog is English dashboard chrome. No Spanish guest-facing string is
rendered by this feature.

## 8. Data Model

| Table          | Fields                 | Read / Write                                       | Index                   |
| -------------- | ---------------------- | -------------------------------------------------- | ----------------------- |
| `events`       | `customDomain`         | Read (to learn the hostname) + Write (`undefined`) | — (document read by id) |
| `events`       | `customDomainVerified` | Write (`undefined`)                                | —                       |
| `eventMembers` | `role`                 | Read (guard)                                       | `by_eventId_and_userId` |

Both fields are cleared in one patch (`convex/events.ts:268`). Note the asymmetry with
[F08](./F08-connect-domain.md): a claim writes `customDomainVerified: false`, a removal writes
`undefined` — the state machine treats both as "not live", and the Settings badge tests only for
truthiness (`custom-domain-settings.tsx:57`).

Nothing cascades. Invitations, guests, media and the event key are untouched, and every
primary-domain URL of the form `/{event-key}/invitations/{slug}` continues to work — which is
what the dialog copy promises. Once the fields are cleared, `resolvePublicEventByHost` finds no
row for that hostname and every request on it resolves to `null`
(`convex/lib/public.ts:39`–`:44`), which the custom-domain routes render as the branded
Invitation Not Found (see [F11](./F11-countdown-landing.md)).

### Relationship to deleting the whole event

Deleting an event does **not** run this flow. `events.deleteEvent` cascades through the
event-scoped tables and the media blobs and then removes the event document
(`convex/events.ts:299`), but it makes no Vercel call, so the hostname stays attached to the
hosting project with no event behind it. That gap is filed as **DEF-02-02** and is owned by
[EP-02-F06 Delete Event](../F06-delete-event.md) — it is referenced here, not re-filed.

## 9. Backend Contract

| Function                        | Type     | Args                      | Returns             | Guard                                              | Caps |
| ------------------------------- | -------- | ------------------------- | ------------------- | -------------------------------------------------- | ---- |
| `api.events.getEventById`       | query    | `{eventId: Id<"events">}` | event doc or `null` | `requireUser` + `requireEventAccess`               | —    |
| `api.events.removeCustomDomain` | mutation | `{eventId: Id<"events">}` | `void`              | `requireUser` + `requireEventMember(…, "planner")` | —    |

Source: `convex/events.ts:39`, `:263`.

HTTP surface:

| Route          | Method   | Body        | Success          | Failure                                                                                                                                |
| -------------- | -------- | ----------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/domains` | `DELETE` | `{eventId}` | `200 {ok: true}` | `401` no session · `400` missing `eventId` or `ConvexError` · Vercel status passthrough (except 404, which succeeds) · `500` otherwise |

Source: `src/app/api/domains/route.ts:95`.

## 10. Business Rules

- **BR-02-F10-01** `[AS-BUILT]` — Removing a domain requires an event role of at least `planner`
  (`convex/events.ts:267`).
- **BR-02-F10-02** `[AS-BUILT]` — Removal detaches at Vercel _before_ clearing Convex — the
  reverse of the connect order (`src/app/api/domains/route.ts:117` precedes `:125`).
- **BR-02-F10-03** `[AS-BUILT]` — The Vercel call is skipped when the event has no
  `customDomain`, and the Convex clear still runs (`src/app/api/domains/route.ts:115`, `:125`).
- **BR-02-F10-04** `[AS-BUILT]` — A `404` from the Vercel detach is tolerated and treated as
  success; any other Vercel error aborts before Convex is touched
  (`src/app/api/domains/route.ts:120`).
- **BR-02-F10-05** `[AS-BUILT]` — Removal clears both `customDomain` and `customDomainVerified`
  to `undefined` in a single patch (`convex/events.ts:268`).
- **BR-02-F10-06** `[AS-BUILT]` — Removal is confirmed through an `AlertDialog`; the trigger
  alone sends nothing (`src/components/dashboard/custom-domain-settings.tsx:286`).
- **BR-02-F10-07** `[AS-BUILT]` — Removal is reversible: nothing records the former hostname, and
  the same domain can be claimed again through the ordinary connect flow
  (`convex/events.ts:233`).
- **BR-02-F10-08** `[AS-BUILT]` — Removal has no cascade; primary-domain invitation URLs are
  unaffected because they resolve by event key, not by host (`convex/lib/public.ts:11`).
- **BR-02-F10-09** `[AS-BUILT]` — After removal the hostname resolves to no event, so every
  request on it renders the branded not-found screen rather than the Wedboard marketing site —
  middleware still rewrites the host to `/_domain/{host}{path}` (`src/middleware.ts:34`).

Why the 404 tolerance is correct rather than sloppy: Vercel is the _secondary_ record here.
Convex holds the claim that both public routing and global uniqueness depend on, so leaving
`customDomain` set because the detach found nothing to detach would strand the event in the worst
possible state — a hostname that serves nothing, cannot be reclaimed by anyone, and cannot be
removed on retry (the retry would 404 again). Treating "already absent" as the desired end state
makes the operation idempotent and lets it converge.

## 11. Acceptance Criteria

- **AC-02-F10-01** — **Given** an event with a live custom domain **When** a co-owner confirms
  removal **Then** `customDomain` and `customDomainVerified` are both `undefined` and the domain
  is detached from the Vercel project.
- **AC-02-F10-02** — **Given** the domain is already absent at Vercel (404 on detach) **When**
  removal runs **Then** the response is `200 {ok: true}` and Convex is cleared anyway.
- **AC-02-F10-03** — **Given** Vercel returns a 500 on detach **When** removal runs **Then** the
  event still has its `customDomain` and the owner sees the Vercel error message.
- **AC-02-F10-04** — **Given** a co-owner clicks "Remove Domain" **When** the dialog opens and
  they click "Cancel" **Then** no request is sent and the domain is unchanged.
- **AC-02-F10-05** — **Given** removal has completed **When** a guest opens
  `https://{formerDomain}/invitations/{slug}` **Then** the branded Invitation Not Found screen is
  shown.
- **AC-02-F10-06** — **Given** removal has completed **When** a guest opens
  `/{event-key}/invitations/{slug}` on the primary domain **Then** the invitation still renders.
- **AC-02-F10-07** — **Given** an editor **When** they `DELETE /api/domains` for that event
  **Then** the mutation throws and the domain remains connected.
- **AC-02-F10-08** — **Given** a removed domain **When** the same co-owner connects it again
  **Then** the claim succeeds, because no former-domain record blocks it.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                         |
| ------------ | ----------- | -------------------------------------------------------------------------------- |
| TC-02-F10-01 | unit        | `removeProjectDomain` targets `/v9/projects/{id}/domains/{domain}` with `DELETE` |
| TC-02-F10-02 | integration | `DELETE /api/domains` clears both Convex fields after a successful detach        |
| TC-02-F10-03 | integration | `DELETE /api/domains` treats a Vercel 404 as success                             |
| TC-02-F10-04 | integration | `DELETE /api/domains` leaves Convex untouched on a non-404 Vercel error          |
| TC-02-F10-05 | integration | `DELETE /api/domains` succeeds for an event that has no `customDomain`           |
| TC-02-F10-06 | integration | `removeCustomDomain` as an `editor` throws                                       |
| TC-02-F10-07 | integration | `resolvePublicEventByHost` returns `null` for a removed hostname                 |
| TC-02-F10-08 | e2e         | The AlertDialog's Cancel path sends no request                                   |
| TC-02-F10-09 | e2e         | After removal the Settings section shows the connect form again                  |

### Manual QA checklist

- [ ] Confirm the dialog names the actual hostname in its description.
- [ ] Cancel the dialog and confirm nothing changed.
- [ ] Remove a live domain and confirm the section returns to the connect form.
- [ ] Confirm the domain disappears from the Vercel project's domain list.
- [ ] Reconnect the same domain immediately and confirm it is accepted.
- [ ] Confirm a primary-domain invitation link still works after removal.

## 13. Non-Functional

| Concern          | Specification                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None; removal is idempotent                                                                                                           |
| Performance      | One Convex read, one Vercel call, one Convex patch                                                                                    |
| Security & authz | `planner` floor in Convex; the route handler forwards the Clerk JWT and authorizes nothing itself (`src/app/api/domains/route.ts:16`) |
| Accessibility    | Standard shadcn `AlertDialog` focus trap and labelled title/description                                                               |
| i18n             | English chrome                                                                                                                        |
| Analytics        | Not activity-logged — see TODO-02-41 in [F08](./F08-connect-domain.md)                                                                |

## 14. TODOs & Open Questions

- **TODO-02-44** `[P2]` `[CHANGE]` — A tolerated Vercel 404 is reported to the owner as an
  unqualified success. The handler swallows the error and returns `{ok: true}`, so the wizard
  toasts "Domain removed" identically whether the detach really happened or the domain had
  already vanished from the hosting project (`src/app/api/domains/route.ts:120`,
  `src/components/dashboard/custom-domain-settings.tsx:150`).
  - **Rationale:** Tolerating the 404 is right (see BR-02-F10-04), but it hides a signal that
    something went wrong earlier — most likely the DEF-02-40 rollback gap or a manual change in
    the Vercel dashboard. Nothing in the product ever reports that divergence.
  - **Proposed rule:** The response distinguishes `detached` from `alreadyAbsent`, and the wizard
    notes the latter ("Domain removed — it was already detached from the hosting project") so the
    condition is at least visible.

### Open questions

- **Q1** — Should removing a domain be owner-only, given that a co-owner can silently break every
  link that has already been sent on that hostname?
- **Q2** — Should the confirmation dialog warn more strongly when the event has invitations
  marked `isSent`, as proposed for the event key in TODO-02-10?

## 15. Traceability

| Concern                                    | Source                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| UI trigger + dialog                        | `src/components/dashboard/custom-domain-settings.tsx:286` |
| UI remove handler                          | `src/components/dashboard/custom-domain-settings.tsx:137` |
| Route handler                              | `src/app/api/domains/route.ts:95`                         |
| Vercel 404 tolerance                       | `src/app/api/domains/route.ts:120`                        |
| Convex clear call                          | `src/app/api/domains/route.ts:125`                        |
| Vercel detach                              | `src/lib/vercel-domains.ts:122`                           |
| Backend mutation                           | `convex/events.ts:263`                                    |
| Event read (hostname lookup)               | `convex/events.ts:39`                                     |
| Public resolution after removal            | `convex/lib/public.ts:30`                                 |
| Middleware rewrite (post-removal requests) | `src/middleware.ts:34`                                    |
| Event delete cascade (DEF-02-02)           | `convex/events.ts:299`                                    |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
