---
id: EP-02-F09
title: DNS Verification
epic: EP-02 Event Setup
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F08]
---

# EP-02-F09 — DNS Verification

## 1. Summary

Between claiming a domain and that domain actually serving invitations sits a step Wedboard does
not control: the owner must add DNS records at their registrar. This feature is the guidance and
feedback loop around that step. It tells the owner exactly which records to add, lets them copy
each value with one click, and gives them a "Check Status" button that asks the hosting provider
whether the domain is verified and correctly configured — caching the answer as a badge in
Settings. The cached answer is presentational only: a claimed domain begins serving the moment
DNS resolves, whether or not anyone has pressed the button.

## 2. Actors & Permissions

| Actor                | Access  | Notes                                                          |
| -------------------- | ------- | -------------------------------------------------------------- |
| Owner                | Full    |                                                                |
| Co-owner (`planner`) | Full    | `setCustomDomainVerified` applies the same floor               |
| Editor               | Blocked | Cannot reach Settings (`settings/page.tsx:164`)                |
| Viewer               | Blocked | Same                                                           |
| Public guest         | None    | Guests are unaffected by, and invisible to, verification state |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "planner")` in
`events.setCustomDomainVerified` (`convex/events.ts:281`); the status route additionally reads
the event through `events.getEventById`, which uses `requireEventAccess`
(`convex/events.ts:43`). See [roles-and-permissions.md](../../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F09-01** — As an owner, I want to be told exactly which DNS records to create so that
  I can complete the setup at a registrar I may never have used before.
- **US-02-F09-02** — As an owner, I want to copy record names and values without transcribing
  them so that I do not typo a verification token.
- **US-02-F09-03** — As an owner, I want to check whether my domain is working yet, and be told
  plainly when it is not.
- **US-02-F09-04** — As an owner, I want the instructions to still be there after I reload the
  page while waiting for propagation.
- **US-02-F09-05** — As an owner, I want to understand why a TXT record is being asked of me.

## 4. Entry Points

| Entry point        | Route / control                                                                       | Actor                |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------- |
| "Check Status"     | `/dashboard/[eventSlug]/settings` → Custom Domain card                                | Co-owner+            |
| Automatic re-fetch | Mounting the section while in the pending state                                       | Co-owner+            |
| Connect response   | `POST /api/domains` returns the first record set (see [F08](./F08-connect-domain.md)) | Co-owner+            |
| API                | `GET /api/domains/status?eventId=…`                                                   | Authenticated caller |

## 5. UX Flow

### Happy path — WF-02-09 Verify custom domain DNS records

1. The event is in the **pending DNS** state (`customDomain` set, `customDomainVerified` falsy),
   so the section renders an amber "Waiting for DNS" badge
   (`custom-domain-settings.tsx:167`) above the instructional paragraph "One more step: sign in
   to the website where you bought your domain (GoDaddy, Namecheap, Cloudflare, ...), find its
   **DNS settings**, and add the record(s) below. Then come back and check the status — changes
   can take a few minutes to a few hours to take effect." (`:226`).
2. Each record renders as a Type / Name / Value grid with a `CopyButton` beside the name and the
   value (`:243`–`:262`). A `TXT` row additionally carries the amber note "This TXT record proves
   you own the domain — it's required because the domain is registered elsewhere." (`:265`).
3. The owner adds the records at their registrar, returns and clicks **Check Status** (`:278`).
4. `fetchStatus` issues `GET /api/domains/status?eventId=…` (`:64`).
5. The handler reads the event (`getEventById`), 404s if it has no `customDomain`
   (`status/route.ts:37`), then reads the attachment with `getProjectDomain`
   (`status/route.ts:44`).
6. If the attachment is not yet `verified`, the handler attempts
   `verifyProjectDomain` — failures fall back to the previously read object
   (`status/route.ts:48`).
7. `getDomainConfig` is read best-effort (`status/route.ts:52`); `configured = config ?
!config.misconfigured : false` (`:54`) and `live = projectDomain.verified && configured`
   (`:55`).
8. If `live` differs from the cached `customDomainVerified ?? false`, the handler calls
   `events.setCustomDomainVerified` to sync it (`status/route.ts:57`).
9. The response is `{domain, live, verified, configured, dnsRecords}` (`:65`). The wizard stores
   the records and toasts either "Your domain is live!" or "Not verified yet — DNS changes can
   take up to a few hours to propagate" (`custom-domain-settings.tsx:79`, `:82`).
10. When `live` is true the Convex event query re-renders the section with the green "Live" badge
    (`:163`) and a "Visit" button linking to `https://{customDomain}` (`:213`).

### Alternate & edge paths

- **A1** — The owner reloads the Settings page while pending: the DNS records live at Vercel, not
  in Convex, so they are gone from component state. An effect re-fetches them once and silently
  ignores failures (`custom-domain-settings.tsx:96`–`:108`).
- **A2** — The record list is still loading → the placeholder "Loading DNS records..." (`:235`).
- **A3** — The domain is an apex (`name === apexName`) → a single `A` record at `@` with the
  value Vercel recommends, defaulting to `76.76.21.21` (`src/lib/vercel-domains.ts:141`).
- **A4** — The domain is a subdomain → a `CNAME` whose name is the label(s) below the apex and
  whose value defaults to `cname.vercel-dns.com` (`src/lib/vercel-domains.ts:148`).
- **A5** — Vercel returns ownership challenges (the apex is registered to a different Vercel
  account) → each challenge is appended as an extra record, with its fully-qualified name
  rewritten to the registrar-relative form (`src/lib/vercel-domains.ts:155`–`:165`).
- **A6** — `getDomainConfig` fails → `config` is `null`, `configured` is `false`, and the record
  table falls back to the hardcoded A/CNAME values (`status/route.ts:52`,
  `src/lib/vercel-domains.ts:145`).
- **A7** — Verification succeeds but DNS is still misconfigured → `live` stays `false`, the badge
  stays amber, and the info toast is shown even though `verified` is `true`.
- **E1** — The event has no `customDomain` → `404 {error: "This event has no custom domain"}`
  (`status/route.ts:38`).
- **E2** — Vercel returns 404 for the domain (it was detached outside the app) → the handler
  returns `409` with "This domain is no longer attached to the hosting project. Remove it and
  connect it again." (`status/route.ts:77`).
- **E3** — Any other Vercel error → its own status and message (`status/route.ts:86`).
- **E4** — No Clerk session → `401` (`status/route.ts:21`).
- **E5** — The fetch fails or returns non-OK during a manual check → the wizard toasts the
  server's message, or "Failed to check domain status" if none can be read
  (`custom-domain-settings.tsx:86`).

## 6. States

| State             | Behavior                                                                           |
| ----------------- | ---------------------------------------------------------------------------------- |
| Loading           | "Loading DNS records..." while `dnsRecords === null` in the pending state (`:234`) |
| Empty             | Not applicable — the section only renders when a domain is claimed                 |
| Error             | sonner error toast; the card stays in its current state                            |
| Success (pending) | Amber "Waiting for DNS" badge, instructions and record table                       |
| Success (live)    | Green "Live" badge, no record table, "Visit" button                                |
| Disabled / locked | "Check Status" reads "Checking..." and is disabled in flight (`:284`)              |
| Mobile            | Records use `break-all` on name and value so long TXT tokens wrap (`:252`, `:259`) |

## 7. UI Specification

### Screens & components

| Element             | Component              | Path                                                                                   |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| Status badges       | shadcn `Badge`         | `src/components/dashboard/custom-domain-settings.tsx:162`, `:167`                      |
| DNS record card     | inline grid            | `:238`                                                                                 |
| Copy buttons        | `CopyButton`           | `src/components/app/copy-button.tsx`, used at `custom-domain-settings.tsx:255`, `:262` |
| Check Status button | shadcn `Button`        | `:278`                                                                                 |
| Status fetcher      | `fetchStatus`          | `:60`                                                                                  |
| Reload re-fetch     | `useEffect`            | `:96`                                                                                  |
| Route handler       | `GET`                  | `src/app/api/domains/status/route.ts:18`                                               |
| Record builder      | `buildDnsInstructions` | `src/lib/vercel-domains.ts:134`                                                        |
| Verify call         | `verifyProjectDomain`  | `src/lib/vercel-domains.ts:112`                                                        |

### Fields & validation

No user input. The only request parameter is `eventId`, required (`status/route.ts:27`).

| DNS row             | Type                                        | Name                                | Value                                                  |
| ------------------- | ------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Apex                | `A`                                         | `@`                                 | `config.recommendedIPs[0]` ?? `76.76.21.21`            |
| Subdomain           | `CNAME`                                     | labels below the apex               | `config.recommendedCNAME[0]` ?? `cname.vercel-dns.com` |
| Ownership challenge | Vercel's `challenge.type` (typically `TXT`) | challenge name relative to the apex | `challenge.value`                                      |

### Copy deck

None — the wizard is English dashboard chrome. No Spanish guest-facing string is rendered by
this feature.

## 8. Data Model

| Table          | Fields                 | Read / Write                     | Index                   |
| -------------- | ---------------------- | -------------------------------- | ----------------------- |
| `events`       | `customDomain`         | Read (via `getEventById`)        | — (document read by id) |
| `events`       | `customDomainVerified` | Read (comparison) + Write (sync) | —                       |
| `eventMembers` | `role`                 | Read (guard)                     | `by_eventId_and_userId` |

`customDomainVerified` is a **cache of an external system's answer**, not a source of truth. It
is written in exactly three places: `false` on every claim (`convex/events.ts:257`), the live
value on a status check (`convex/events.ts:283`), and `undefined` on removal
(`convex/events.ts:270`). Nothing else reads it except the Settings UI
(`custom-domain-settings.tsx:57`) and, for display, the admin dashboard and the invitation
link-copy helper.

The DNS records themselves are never persisted. They exist only in Vercel's responses, which is
why the wizard has to re-fetch them after a page reload (`custom-domain-settings.tsx:94`).

## 9. Backend Contract

| Function                             | Type     | Args                                         | Returns             | Guard                                              | Caps |
| ------------------------------------ | -------- | -------------------------------------------- | ------------------- | -------------------------------------------------- | ---- |
| `api.events.getEventById`            | query    | `{eventId: Id<"events">}`                    | event doc or `null` | `requireUser` + `requireEventAccess`               | —    |
| `api.events.setCustomDomainVerified` | mutation | `{eventId: Id<"events">, verified: boolean}` | `void`              | `requireUser` + `requireEventMember(…, "planner")` | —    |

Source: `convex/events.ts:39`, `:277`.

HTTP surface:

| Route                 | Method | Params      | Success                                                | Failure                                                                                                                                                                    |
| --------------------- | ------ | ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/domains/status` | `GET`  | `?eventId=` | `200 {domain, live, verified, configured, dnsRecords}` | `401` no session · `400` missing `eventId` or `ConvexError` · `404` no domain on the event · `409` domain detached at Vercel · Vercel status passthrough · `500` otherwise |

Source: `src/app/api/domains/status/route.ts:18`.

## 10. Business Rules

- **BR-02-F09-01** `[AS-BUILT]` — **Public routing never gates on `customDomainVerified`.**
  `resolvePublicEventByHost` matches an event solely on the normalized `customDomain` value and
  the non-archived status check; the verification flag is not read
  (`convex/lib/public.ts:30`–`:45`). A claimed domain therefore serves invitations the instant
  DNS resolves, whether the flag says `true`, `false` or is unset. The flag is a Settings-UI
  affordance only.
- **BR-02-F09-02** `[AS-BUILT]` — A domain is reported live only when Vercel reports it both
  verified _and_ not misconfigured: `live = projectDomain.verified && configured`
  (`src/app/api/domains/status/route.ts:55`).
- **BR-02-F09-03** `[AS-BUILT]` — When the domain config cannot be read, `configured` is `false`,
  so the domain is never reported live on incomplete information
  (`src/app/api/domains/status/route.ts:54`).
- **BR-02-F09-04** `[AS-BUILT]` — A verification attempt is made on every status check for a
  not-yet-verified domain, and a failed attempt does not fail the request — the previously read
  state is used instead (`src/app/api/domains/status/route.ts:45`–`:50`).
- **BR-02-F09-05** `[AS-BUILT]` — The cached flag is written only when the computed `live` value
  differs from the currently stored one (`src/app/api/domains/status/route.ts:57`).
- **BR-02-F09-06** `[AS-BUILT]` — Requesting status for an event with no `customDomain` returns
  `404` and performs no Vercel call (`src/app/api/domains/status/route.ts:37`).
- **BR-02-F09-07** `[AS-BUILT]` — A Vercel 404 for the domain is reported as `409` with
  remediation copy telling the owner to remove and reconnect
  (`src/app/api/domains/status/route.ts:77`).
- **BR-02-F09-08** `[AS-BUILT]` — An apex domain is instructed with a single `A` record at `@`;
  a subdomain with a `CNAME` at its sub-label (`src/lib/vercel-domains.ts:141`, `:148`).
- **BR-02-F09-09** `[AS-BUILT]` — Vercel's recommended values take precedence, with
  `76.76.21.21` and `cname.vercel-dns.com` as fallbacks
  (`src/lib/vercel-domains.ts:145`, `:151`).
- **BR-02-F09-10** `[AS-BUILT]` — Every ownership-verification challenge Vercel returns is
  appended to the record list, with its name rewritten relative to the apex
  (`src/lib/vercel-domains.ts:155`–`:165`).
- **BR-02-F09-11** `[AS-BUILT]` — DNS records are not persisted; entering the pending state on a
  fresh page load triggers exactly one background re-fetch, whose failures are silent
  (`src/components/dashboard/custom-domain-settings.tsx:96`–`:108`).
- **BR-02-F09-12** `[AS-BUILT]` — The Settings badge is derived purely from the two persisted
  fields: `Live` when both are truthy, `Waiting for DNS` when a domain is set and the flag is
  not (`src/components/dashboard/custom-domain-settings.tsx:57`).
- **BR-02-F09-13** `[AS-BUILT]` — The "Visit" link is rendered only in the live state
  (`src/components/dashboard/custom-domain-settings.tsx:211`).

## 11. Acceptance Criteria

- **AC-02-F09-01** — **Given** an event whose `customDomain` is set and whose
  `customDomainVerified` is `false` **When** a guest requests
  `https://{customDomain}/invitations/{slug}` and DNS resolves **Then** the invitation is served
  normally.
- **AC-02-F09-02** — **Given** Vercel reports `verified: true` and `misconfigured: true` **When**
  the owner checks status **Then** `live` is `false`, the badge stays amber and the info toast is
  shown.
- **AC-02-F09-03** — **Given** Vercel reports verified and configured **When** the owner checks
  status **Then** `customDomainVerified` becomes `true` and the toast reads "Your domain is
  live!".
- **AC-02-F09-04** — **Given** the cached flag already equals the computed value **When** the
  owner checks status **Then** no `setCustomDomainVerified` mutation is issued.
- **AC-02-F09-05** — **Given** an apex domain `mywedding.com` **When** the records are built
  **Then** the list contains an `A` record named `@`.
- **AC-02-F09-06** — **Given** the domain `invites.mywedding.com` **When** the records are built
  **Then** the list contains a `CNAME` record named `invites`.
- **AC-02-F09-07** — **Given** Vercel returns a TXT ownership challenge **When** the section
  renders **Then** the TXT row appears with the explanatory amber note.
- **AC-02-F09-08** — **Given** the owner reloads Settings while pending **When** the section
  mounts **Then** the DNS record table is populated again without any click.
- **AC-02-F09-09** — **Given** the domain was deleted from the Vercel project **When** the owner
  checks status **Then** the toast reads "This domain is no longer attached to the hosting
  project. Remove it and connect it again."
- **AC-02-F09-10** — **Given** an event with no custom domain **When** `GET
/api/domains/status` is called for it **Then** the response is `404` and no Vercel request is
  made.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                    |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| TC-02-F09-01 | unit        | `buildDnsInstructions` emits an `A`/`@` row for an apex and a `CNAME` row named for the sub-label otherwise |
| TC-02-F09-02 | unit        | `buildDnsInstructions` prefers `recommendedIPs[0]` / `recommendedCNAME[0]` over the hardcoded fallbacks     |
| TC-02-F09-03 | unit        | `buildDnsInstructions` appends every verification challenge and strips the apex suffix from its name        |
| TC-02-F09-04 | integration | `GET /api/domains/status` computes `live` as `verified && !misconfigured` across the four combinations      |
| TC-02-F09-05 | integration | `GET /api/domains/status` syncs `customDomainVerified` only when it changes                                 |
| TC-02-F09-06 | integration | `GET /api/domains/status` maps a Vercel 404 to a `409` with the remediation message                         |
| TC-02-F09-07 | integration | `resolvePublicEventByHost` resolves an event with `customDomainVerified: false`                             |
| TC-02-F09-08 | integration | `setCustomDomainVerified` as an `editor` throws                                                             |
| TC-02-F09-09 | e2e         | Pressing "Check Status" on a live domain flips the badge to green and reveals "Visit"                       |
| TC-02-F09-10 | e2e         | Reloading Settings in the pending state re-renders the DNS table                                            |

### Manual QA checklist

- [ ] With a claimed but unverified domain, confirm the public invitation URL still serves.
- [ ] Confirm the copy buttons place the exact record name and value on the clipboard.
- [ ] Confirm a TXT challenge row shows the amber ownership note.
- [ ] Reload the page mid-wait and confirm the records reappear without a click.
- [ ] Detach the domain in the Vercel dashboard and confirm "Check Status" gives the 409 copy.

## 13. Non-Functional

| Concern          | Specification                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | No rate limit on status checks; each check issues up to three Vercel API calls                                           |
| Performance      | One Convex read, up to three sequential Vercel calls, at most one Convex write                                           |
| Security & authz | Reading status requires event access; writing the cached flag requires `planner`. `VERCEL_TOKEN` never leaves the server |
| Accessibility    | Badges are text; the record grid uses uppercase labels rather than a semantic table header                               |
| i18n             | English chrome                                                                                                           |
| Analytics        | Verification checks are not logged                                                                                       |

## 14. TODOs & Open Questions

- **TODO-02-42** `[P1]` `[ADD]` — There is no re-check or repair path once a domain has gone
  live. `customDomainVerified` is only ever recomputed by a manual "Check Status" click
  (`src/components/dashboard/custom-domain-settings.tsx:73`), so an owner who later changes their
  registrar's records, lets the domain expire, or has it detached at Vercel keeps a green "Live"
  badge indefinitely while guest links fail.
  - **Rationale:** The failure is invisible exactly when it matters most — after invitations have
    been sent. The product knows how to detect the condition (the same status call already
    returns a 409 for a detached domain) but never runs it unprompted.
  - **Proposed rule:** The status check runs on a schedule (or at least whenever the Settings
    page mounts for a live domain), and a domain that stops being live surfaces as a warning on
    the event overview, not only in Settings.
- **TODO-02-43** `[P2]` `[ADD]` — While waiting for DNS the owner must poll by hand; the wizard
  never re-checks on its own, and the automatic re-fetch that does exist only repopulates the
  record table without updating `live`
  (`src/components/dashboard/custom-domain-settings.tsx:96`).
  - **Rationale:** Propagation is measured in minutes to hours; the guidance copy says so. Asking
    the owner to keep clicking is the weakest part of an otherwise guided wizard.
  - **Proposed rule:** While the section is mounted in the pending state, status is polled on a
    backoff until it goes live or the component unmounts.

### Open questions

- **Q1** — Should the invitation link-copy helper fall back to the primary-domain URL while
  `customDomainVerified` is false, given that the custom domain in fact already serves?
- **Q2** — Should `configured: false` with `verified: true` get its own message ("ownership
  confirmed, DNS still wrong") instead of the generic not-verified-yet toast?

## 15. Traceability

| Concern                                  | Source                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| Route handler                            | `src/app/api/domains/status/route.ts:18`                  |
| Live computation                         | `src/app/api/domains/status/route.ts:54`                  |
| Cached-flag sync                         | `src/app/api/domains/status/route.ts:57`                  |
| Vercel 404 mapping                       | `src/app/api/domains/status/route.ts:77`                  |
| Verify call                              | `src/lib/vercel-domains.ts:112`                           |
| Record builder                           | `src/lib/vercel-domains.ts:134`                           |
| UI status fetch                          | `src/components/dashboard/custom-domain-settings.tsx:60`  |
| UI check handler                         | `src/components/dashboard/custom-domain-settings.tsx:73`  |
| UI reload re-fetch                       | `src/components/dashboard/custom-domain-settings.tsx:96`  |
| UI badges                                | `src/components/dashboard/custom-domain-settings.tsx:162` |
| UI record table                          | `src/components/dashboard/custom-domain-settings.tsx:238` |
| Backend cache write                      | `convex/events.ts:277`                                    |
| Public resolution (no verification gate) | `convex/lib/public.ts:30`                                 |
| Schema index                             | `convex/schema.ts:81`                                     |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
