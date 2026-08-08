---
id: EP-02-F08
title: Connect Domain
epic: EP-02 Event Setup
version: 1.0.1
status: defective
last_updated: 2026-07-28
depends_on: [EP-02-F01, EP-02-F03]
---

# EP-02-F08 — Connect Domain

## 1. Summary

An event owner who already owns a domain can point it at their event so guests receive links
like `https://invites.mywedding.com/invitations/ana-y-luis` instead of the primary-domain form
carrying the event key. Connecting is a single click in Settings: the app normalizes and
validates the hostname, claims it exclusively for this event, attaches it to the hosting
project, and hands back the DNS records the owner must add at their registrar. The claim is
exclusive across all of Wedboard — one hostname, one event — and if the hosting side fails the
claim is released again so the domain is never stranded.

## 2. Actors & Permissions

| Actor                | Access  | Notes                                                    |
| -------------------- | ------- | -------------------------------------------------------- |
| Owner                | Full    |                                                          |
| Co-owner (`planner`) | Full    | Identical power; connecting a domain is not owner-gated  |
| Editor               | Blocked | Cannot reach the Settings page (`settings/page.tsx:164`) |
| Viewer               | Blocked | Same                                                     |
| Public guest         | None    | Consumes the result, never this flow                     |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "planner")` inside
`events.setCustomDomain` (`convex/events.ts:237`). The route handler itself performs no role
check — it verifies only that a Convex-audience token exists and forwards it, which is stated in
a comment at `src/app/api/domains/route.ts:16`. See
[roles-and-permissions.md](../../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F08-01** — As an owner, I want to serve my invitations from a domain I own so that the
  links I send guests carry my names, not a platform URL.
- **US-02-F08-02** — As an owner, I want to type the domain however I have it copied (with
  `https://`, a trailing slash, mixed case) and have it understood.
- **US-02-F08-03** — As an owner, I want an immediate, specific rejection when the domain cannot
  be used so that I do not spend hours on DNS for a hostname that was never going to work.
- **US-02-F08-04** — As an owner, I want the connect step to leave no half-finished state behind
  when something fails, so that I can simply try again.

## 4. Entry Points

| Entry point             | Route / control                                                     | Actor                                              |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| "Custom Domain" section | `/dashboard/[eventSlug]/settings` → Domain input + "Connect Domain" | Co-owner+                                          |
| API                     | `POST /api/domains` with `{eventId, domain}`                        | Any authenticated caller; Convex enforces the role |

The section renders inside the Settings page between the Subdomain placeholder and the
Invitation Template section (`settings/page.tsx:335`).

## 5. UX Flow

### Happy path — WF-02-08 Connect a custom domain

1. A co-owner opens Settings and scrolls to **Custom Domain**. With no domain connected the
   section shows the explanatory line "Serve your invitations from your own domain. Enter a
   domain you already own — we'll walk you through the rest."
   (`custom-domain-settings.tsx:176`), a monospace input placeholdered
   `invites.mywedding.com` (`:186`), and a "Connect Domain" button (`:195`).
2. On click, `handleConnect` rejects an all-whitespace input locally with the toast "Enter a
   domain, e.g. invites.mywedding.com" (`:112`), then `POST`s `{eventId, domain}` to
   `/api/domains` (`:117`).
3. The handler calls `getConvexToken()`. Absent a Clerk session it answers `401 Unauthorized`
   (`route.ts:34`). A body missing `eventId` or `domain` answers `400`
   (`route.ts:43`).
4. **Claim first.** `fetchMutation(api.events.setCustomDomain, {eventId, domain}, {token})`
   (`route.ts:53`). Inside Convex: `requireUser` → `requireEventMember(…, "planner")` →
   `normalizeCustomDomain` → `validateCustomDomain` → a `by_customDomain` uniqueness probe →
   `patch({customDomain, customDomainVerified: false})`, returning the **normalized** hostname
   (`convex/events.ts:236`–`:259`).
5. **Attach second.** `addProjectDomain(domain)` `POST`s the normalized host to
   `/v10/projects/{VERCEL_PROJECT_ID}/domains` (`src/lib/vercel-domains.ts:89`).
6. The handler re-reads the attachment with `getProjectDomain` (`route.ts:75`) and best-effort
   reads `getDomainConfig` (`route.ts:76`, failures swallowed to `null`), then responds
   `{domain, verified, dnsRecords}` where `verified = projectDomain.verified &&
config?.misconfigured === false` (`route.ts:79`) and `dnsRecords` comes from
   `buildDnsInstructions` (`route.ts:80`).
7. The wizard stores the records, clears the input and toasts "Domain connected — now add the
   DNS records below" (`custom-domain-settings.tsx:129`). Because the Convex event query is
   reactive, the section immediately re-renders in the **Waiting for DNS** state described in
   [F09](./F09-dns-verification.md).

### Alternate & edge paths

- **A1** — The domain is already attached to _this_ Vercel project (reconnecting after a partial
  failure): `addProjectDomain` throws `VercelApiError` with code `domain_already_in_use`, which
  is swallowed, and the flow continues to the re-read (`route.ts:65`–`:74`).
- **A2** — The same event re-submits the domain it already holds: the uniqueness probe finds
  _itself_, the `existing._id !== args.eventId` test passes, and the patch is a no-op rewrite
  that resets `customDomainVerified` to `false` (`convex/events.ts:249`, `:255`).
- **A3** — Input carries a scheme, path, query, port or trailing dot → normalized away before
  any check (`convex/lib/domains.ts:30`); the response and the stored value are the bare host.
- **E1** — No Clerk session → `401 {error: "Unauthorized"}` (`route.ts:36`).
- **E2** — Caller is an editor/viewer/non-member → `requireEventMember` throws; the handler maps
  it through `errorResponse` and the wizard toasts the raw message (`route.ts:20`).
- **E3** — Validation rejects the hostname → `ConvexError(message)` → `400 {error: message}` →
  the message appears verbatim in an error toast; **no** Convex write happened
  (`convex/events.ts:241`).
- **E4** — Another event already holds the hostname → `ConvexError('"{domain}" is already
connected to another event')` → `400` (`convex/events.ts:250`).
- **E5** — Any Vercel failure other than `domain_already_in_use` → the handler calls
  `removeCustomDomain` to **roll the Convex claim back**, then returns the Vercel error's own
  message and status (`route.ts:85`, `:90`).
- **E6** — `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` is unset (typical local dev) → `requireEnv`
  throws `VercelApiError("VERCEL_TOKEN is not configured on the server", 500, "missing_env")`
  (`src/lib/vercel-domains.ts:48`), which follows the E5 rollback path and surfaces as a 500
  toast with that literal sentence. See TODO-02-40.
- **E7** — `fetch` itself rejects (offline, handler crash before a JSON body) → the wizard's
  outer `catch` toasts the generic "Failed to connect domain" (`custom-domain-settings.tsx:131`).

## 6. States

| State             | Behavior                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Loading           | The section renders only once the Settings page has the event; there is no separate loading state     |
| Empty             | No `customDomain` → the pitch copy, the input and "Connect Domain" (`custom-domain-settings.tsx:174`) |
| Error             | sonner error toast carrying the server's message; the typed domain is retained in the input           |
| Success           | Input cleared, DNS records stored, success toast, section switches to the connected card (`:200`)     |
| Disabled / locked | The button reads "Connecting..." and is disabled while the request is in flight (`:193`)              |
| Mobile            | Single-column; the connected card truncates the hostname (`:204`)                                     |

## 7. UI Specification

### Screens & components

| Element               | Component                                                   | Path                                                     |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| Custom Domain section | `CustomDomainSettings`                                      | `src/components/dashboard/custom-domain-settings.tsx:46` |
| Domain input          | shadcn `Input` (`font-mono`)                                | `:182`                                                   |
| Connect button        | shadcn `Button` (`outline`)                                 | `:190`                                                   |
| Connect handler       | `handleConnect`                                             | `:110`                                                   |
| Error reader          | `readError`                                                 | `:36`                                                    |
| Route handler         | `POST`                                                      | `src/app/api/domains/route.ts:33`                        |
| Vercel client         | `addProjectDomain` / `getProjectDomain` / `getDomainConfig` | `src/lib/vercel-domains.ts:85`, `:95`, `:104`            |
| Token minting         | `getConvexToken`                                            | `src/lib/convex-token.ts:8`                              |

### Fields & validation

`normalizeCustomDomain` runs first and always (`convex/lib/domains.ts:30`); every rule below is
applied to its output.

| Step      | Rule                                                                                                                                    | Source                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Normalize | `trim()`                                                                                                                                | `convex/lib/domains.ts:32` |
| Normalize | lowercase                                                                                                                               | `:33`                      |
| Normalize | strip a leading `http://` or `https://`                                                                                                 | `:34`                      |
| Normalize | strip everything from the first `/`, `?` or `#`                                                                                         | `:35`                      |
| Normalize | strip a trailing `:port`                                                                                                                | `:36`                      |
| Normalize | strip trailing dots                                                                                                                     | `:37`                      |
| Validate  | non-empty                                                                                                                               | `:45`                      |
| Validate  | ASCII printable only (`/[^\x20-\x7e]/` rejects) — IDN must be supplied in punycode                                                      | `:48`                      |
| Validate  | length ≤ 253                                                                                                                            | `:51`                      |
| Validate  | matches `HOSTNAME_REGEX` — dot-separated labels of `[a-z0-9-]`, each ≤ 63 chars, no leading or trailing hyphen, **at least two labels** | `:14`, `:51`               |
| Validate  | not `vercel.app` and not `*.vercel.app`                                                                                                 | `:54`                      |
| Validate  | not the primary domain and not any of its subdomains                                                                                    | `:57`                      |

The primary-domain set is `[PRIMARY_DOMAIN (Convex env, port stripped, lowercased), "localhost",
"127.0.0.1"]`; when the env var is unset only the two fallbacks apply (`convex/lib/domains.ts:10`,
`:17`). The unit tests at `tests/domains.test.ts:23` pin all of the above, including that
`xn--bod-hoa.com` is accepted while `bodä.com` is not (`tests/domains.test.ts:38`).

| Field  | Type | Required | Rule                                    | Message                                                               |
| ------ | ---- | -------- | --------------------------------------- | --------------------------------------------------------------------- |
| Domain | text | Yes      | Client: non-blank after `trim()`        | "Enter a domain, e.g. invites.mywedding.com"                          |
| Domain | —    | —        | Server: non-empty after normalization   | "Enter a domain, e.g. invites.mywedding.com"                          |
| Domain | —    | —        | Server: ASCII only                      | "International domains must use their punycode (xn--) form"           |
| Domain | —    | —        | Server: hostname shape and length       | "That doesn't look like a valid domain, e.g. invites.mywedding.com"   |
| Domain | —    | —        | Server: not a `vercel.app` host         | "vercel.app domains cannot be connected"                              |
| Domain | —    | —        | Server: not the app's own domain        | `"{domain}" is part of this app's own domain and cannot be connected` |
| Domain | —    | —        | Server: globally unique across `events` | `"{domain}" is already connected to another event`                    |

### Copy deck

None — the connect wizard is English dashboard chrome. No Spanish guest-facing string is
rendered by this feature.

## 8. Data Model

| Table          | Fields                 | Read / Write                            | Index                                     |
| -------------- | ---------------------- | --------------------------------------- | ----------------------------------------- |
| `events`       | `customDomain`         | Read (uniqueness probe) + Write (patch) | `by_customDomain` (`convex/schema.ts:81`) |
| `events`       | `customDomainVerified` | Write — set to `false` on every claim   | —                                         |
| `eventMembers` | `role`                 | Read (guard)                            | `by_eventId_and_userId`                   |

`by_customDomain` is queried with `.unique()` (`convex/events.ts:248`), so the index must hold at
most one row per hostname; the `existing._id !== args.eventId` rejection is what maintains that
invariant. The same index backs public resolution (`convex/lib/public.ts:39`), which is why the
uniqueness rule is a correctness requirement and not merely a nicety — two events sharing a host
would make `resolvePublicEventByHost` throw.

Claiming writes exactly two fields on one document. Nothing cascades: invitations, media and the
event key are untouched, and both URL forms remain valid simultaneously.

## 9. Backend Contract

| Function                        | Type     | Args                                      | Returns                      | Guard                                              | Caps              |
| ------------------------------- | -------- | ----------------------------------------- | ---------------------------- | -------------------------------------------------- | ----------------- |
| `api.events.setCustomDomain`    | mutation | `{eventId: Id<"events">, domain: string}` | `string` (normalized domain) | `requireUser` + `requireEventMember(…, "planner")` | 253-char hostname |
| `api.events.removeCustomDomain` | mutation | `{eventId: Id<"events">}`                 | `void`                       | same                                               | —                 |

Source: `convex/events.ts:233`, `:263`. Helpers: `normalizeCustomDomain`
(`convex/lib/domains.ts:30`), `validateCustomDomain` (`convex/lib/domains.ts:44`).

HTTP surface:

| Route          | Method | Body                | Success                              | Failure                                                                                          |
| -------------- | ------ | ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `/api/domains` | `POST` | `{eventId, domain}` | `200 {domain, verified, dnsRecords}` | `401` no session · `400` bad body or `ConvexError` · Vercel status passthrough · `500` otherwise |

Source: `src/app/api/domains/route.ts:33`.

## 10. Business Rules

- **BR-02-F08-01** `[AS-BUILT]` — Connecting a domain requires an event role of at least
  `planner` (`convex/events.ts:237`).
- **BR-02-F08-02** `[AS-BUILT]` — The route handler authorizes nothing itself; it requires only
  the presence of a Convex-audience Clerk token and delegates ownership to Convex through the
  forwarded JWT (`src/app/api/domains/route.ts:34`, `:56`).
- **BR-02-F08-03** `[AS-BUILT]` — The submitted string is normalized before any validation,
  uniqueness check or write (`convex/events.ts:239`).
- **BR-02-F08-04** `[AS-BUILT]` — Normalization lowercases the input and strips protocol, path,
  query, fragment, port and trailing dots (`convex/lib/domains.ts:31`–`:37`).
- **BR-02-F08-05** `[AS-BUILT]` — A domain containing any non-printable-ASCII character is
  rejected, so internationalized domains must be supplied in punycode
  (`convex/lib/domains.ts:48`).
- **BR-02-F08-06** `[AS-BUILT]` — A domain longer than 253 characters, or failing the
  two-label-minimum hostname regex, is rejected (`convex/lib/domains.ts:51`).
- **BR-02-F08-07** `[AS-BUILT]` — `vercel.app` and any of its subdomains are rejected
  (`convex/lib/domains.ts:54`).
- **BR-02-F08-08** `[AS-BUILT]` — The app's own primary domain and any of its subdomains are
  rejected, where the primary set is the Convex `PRIMARY_DOMAIN` env var plus `localhost` and
  `127.0.0.1` (`convex/lib/domains.ts:10`, `:57`).
- **BR-02-F08-09** `[AS-BUILT]` — A hostname already held by a _different_ event is rejected
  (`convex/events.ts:249`).
- **BR-02-F08-10** `[AS-BUILT]` — Re-claiming the hostname the same event already holds succeeds
  and resets `customDomainVerified` to `false` (`convex/events.ts:249`, `:257`).
- **BR-02-F08-11** `[AS-BUILT]` — Every successful claim writes `customDomainVerified: false`,
  never `true` (`convex/events.ts:257`).
- **BR-02-F08-12** `[AS-BUILT]` — The Convex claim is performed _before_ the Vercel attach, so
  global uniqueness is decided transactionally in Convex (`src/app/api/domains/route.ts:53`
  precedes `:64`).
- **BR-02-F08-13** `[AS-BUILT]` — If the Vercel attach or the follow-up read fails, the Convex
  claim is rolled back with `removeCustomDomain` before the error is returned
  (`src/app/api/domains/route.ts:85`).
- **BR-02-F08-14** `[AS-BUILT]` — A Vercel `domain_already_in_use` error on attach is treated as
  success and does **not** trigger the rollback (`src/app/api/domains/route.ts:68`).
- **BR-02-F08-15** `[AS-BUILT]` — The `verified` value returned by the connect call requires both
  Vercel verification and a non-misconfigured DNS config; a missing config object yields
  `verified: false` (`src/app/api/domains/route.ts:79`).
- **BR-02-F08-16** `[AS-BUILT]` — `ConvexError` messages are returned as `400 {error}` and are
  displayed verbatim to the user (`src/app/api/domains/route.ts:21`,
  `custom-domain-settings.tsx:36`).
- **BR-02-F08-17** `[AS-BUILT]` — Vercel API errors are returned with the Vercel status code and
  message; anything else becomes `500 {error: "Something went wrong"}`
  (`src/app/api/domains/route.ts:24`, `:28`).
- **BR-02-F08-18** `[AS-BUILT]` — Requests to the Vercel API carry `?teamId=` only when
  `VERCEL_TEAM_ID` is set (`src/lib/vercel-domains.ts:61`).

## 11. Acceptance Criteria

- **AC-02-F08-01** — **Given** a co-owner with no domain connected **When** they submit
  `https://Invites.MyWedding.com/` **Then** `events.customDomain` becomes
  `invites.mywedding.com` and `customDomainVerified` becomes `false`.
- **AC-02-F08-02** — **Given** another event already holds `invites.mywedding.com` **When** a
  co-owner submits it **Then** the response is `400` with `"invites.mywedding.com" is already
connected to another event` and this event's `customDomain` is unchanged.
- **AC-02-F08-03** — **Given** the input `bodä.com` **When** it is submitted **Then** the toast
  reads "International domains must use their punycode (xn--) form" and no write occurs.
- **AC-02-F08-04** — **Given** the input `localhost` **When** it is submitted **Then** it is
  rejected (single label, and a primary-domain fallback).
- **AC-02-F08-05** — **Given** `PRIMARY_DOMAIN=wedboard.com` in the Convex env **When** a
  co-owner submits `boda.wedboard.com` **Then** the rejection reads `"boda.wedboard.com" is part
of this app's own domain and cannot be connected`.
- **AC-02-F08-06** — **Given** the Vercel attach fails with a 403 **When** the request completes
  **Then** the response carries status 403 and `events.customDomain` is `undefined` again.
- **AC-02-F08-07** — **Given** the domain is already attached to this Vercel project **When** a
  co-owner connects it **Then** the request succeeds and the claim is _not_ rolled back.
- **AC-02-F08-08** — **Given** an editor **When** they `POST /api/domains` for that event
  **Then** the mutation throws and no domain is written.
- **AC-02-F08-09** — **Given** no Clerk session **When** `POST /api/domains` is called **Then**
  the response is `401` and Convex is never contacted.
- **AC-02-F08-10** — **Given** a successful connect **When** the response returns **Then** the
  DNS record list is rendered and the section badge reads "Waiting for DNS".

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                          |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TC-02-F08-01 | unit        | `normalizeCustomDomain` strips protocol, path, query, port and trailing dot and lowercases (`tests/domains.test.ts:7`)            |
| TC-02-F08-02 | unit        | `validateCustomDomain` accepts apex and subdomain hosts, rejects empty/single-label/malformed (`tests/domains.test.ts:24`, `:30`) |
| TC-02-F08-03 | unit        | `validateCustomDomain` rejects non-ASCII and accepts the punycode form (`tests/domains.test.ts:38`)                               |
| TC-02-F08-04 | unit        | `validateCustomDomain` rejects `*.vercel.app` and the primary domain plus its subdomains (`tests/domains.test.ts:43`)             |
| TC-02-F08-05 | integration | `setCustomDomain` rejects a hostname held by another event and leaves both events untouched                                       |
| TC-02-F08-06 | integration | `setCustomDomain` as an `editor` throws before any patch                                                                          |
| TC-02-F08-07 | integration | `setCustomDomain` on a domain the same event already holds succeeds and resets `customDomainVerified`                             |
| TC-02-F08-08 | integration | `POST /api/domains` rolls the Convex claim back when the Vercel attach throws a non-`domain_already_in_use` error                 |
| TC-02-F08-09 | integration | `POST /api/domains` does _not_ roll back on `domain_already_in_use`                                                               |
| TC-02-F08-10 | integration | `POST /api/domains` returns `401` with no Clerk session and `400` with a body missing `domain`                                    |
| TC-02-F08-11 | e2e         | Connecting a domain from Settings renders the DNS table and the "Waiting for DNS" badge                                           |

### Manual QA checklist

- [ ] Paste a full URL with a path and confirm only the bare host is stored.
- [ ] Submit an uppercase host and confirm the stored value is lowercase.
- [ ] Submit the app's own domain and confirm the specific rejection copy.
- [ ] Submit a domain another event holds and confirm the rejection copy.
- [ ] With `VERCEL_TOKEN` unset, connect a domain and confirm the event ends with no
      `customDomain` (rollback ran) and the toast explains the server env problem.
- [ ] Reconnect a domain already attached to the project and confirm it succeeds.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | One custom domain per event (single scalar field); hostname ≤ 253 chars; no rate limit on connect attempts                                                                                                             |
| Performance      | One indexed `by_customDomain` read + one patch, then up to three sequential Vercel API calls                                                                                                                           |
| Security & authz | `planner` floor enforced in Convex; the route handler never trusts a client-supplied identity, only the forwarded Clerk JWT (`src/lib/convex-token.ts:8`). `VERCEL_TOKEN` is server-only and never reaches the browser |
| Accessibility    | The input has a bound `Label`; state changes are announced only through toasts                                                                                                                                         |
| i18n             | English chrome; validation messages are English and originate in Convex                                                                                                                                                |
| Analytics        | Not activity-logged — see TODO-02-41                                                                                                                                                                                   |

## 14. TODOs & Open Questions

- **DEF-02-40** `[P1]` — The Convex claim and the Vercel attach are not atomic, and the
  compensating rollback is itself fire-and-forget: `fetchMutation(api.events.removeCustomDomain,
…).catch(() => {})` swallows its own failure.
  - **Evidence:** `src/app/api/domains/route.ts:85`–`:89`
  - **Impact:** If the rollback call fails (Convex unreachable, token expired mid-request), the
    event keeps `customDomain` set while nothing is attached at Vercel. The Settings UI then
    shows "Waiting for DNS" for a domain that can never verify, and — because public routing
    does not gate on verification — the hostname is also globally locked against any other
    event that legitimately wants it. Nothing detects or repairs this.
  - **Proposed fix:** Surface a rollback failure to the caller as a distinct error ("the domain
    could not be released — try removing it") rather than swallowing it, and make `GET
/api/domains/status` self-heal by offering the owner a re-attach when Vercel returns 404
    for a domain Convex still claims.
- **TODO-02-40** `[P2]` `[CHANGE]` — With `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` unset — the
  normal local-development state — `requireEnv` throws
  `VercelApiError("VERCEL_TOKEN is not configured on the server", 500, "missing_env")`, which
  reaches the owner's toast verbatim (`src/lib/vercel-domains.ts:45`,
  `src/app/api/domains/route.ts:25`).
  - **Rationale:** The failure is at least legible rather than generic, but it names a server
    environment variable to an end user who cannot act on it — and it arrives _after_ the claim
    was written and rolled back, so the wizard looks like it did nothing at all.
  - **Proposed rule:** The route handler checks for the required env vars before touching
    Convex, and returns a distinct 503 with owner-appropriate copy ("Custom domains are not
    configured on this deployment"); the Settings section hides or disables the Connect button
    when the deployment cannot support domains.
- **TODO-02-41** `[P2]` `[ADD]` — Connecting, verifying and removing a custom domain write
  nothing to `activityLogs`; the `entity` union does not include a domain value
  (`convex/schema.ts` `activityLogs.entity`, and `convex/events.ts:255` performs a bare `patch`
  with no `logActivity` call).
  - **Rationale:** A co-owner can repoint or drop the hostname every guest link depends on, and
    the Activity page shows nothing. It is one of the highest-blast-radius actions a non-owner
    can take.
  - **Proposed rule:** `setCustomDomain` and `removeCustomDomain` log an activity entry naming
    the hostname.

### Open questions

- **Q1** — Should connecting a domain be owner-only rather than `planner`+, given that it
  changes the public address of every invitation and is not logged?
- **Q2** — Should an event be allowed to hold more than one custom domain (e.g. apex plus
  `www`)? Today the field is a single scalar, so `www.mywedding.com` and `mywedding.com` cannot
  both point at one event.

## 15. Traceability

| Concern                   | Source                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| UI section                | `src/components/dashboard/custom-domain-settings.tsx:46`          |
| UI connect handler        | `src/components/dashboard/custom-domain-settings.tsx:110`         |
| UI mount point            | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:335` |
| Route handler             | `src/app/api/domains/route.ts:33`                                 |
| Rollback                  | `src/app/api/domains/route.ts:85`                                 |
| Error mapping             | `src/app/api/domains/route.ts:20`                                 |
| Token minting             | `src/lib/convex-token.ts:8`                                       |
| Vercel attach             | `src/lib/vercel-domains.ts:85`                                    |
| Vercel env guard          | `src/lib/vercel-domains.ts:45`                                    |
| Backend claim             | `convex/events.ts:233`                                            |
| Backend rollback mutation | `convex/events.ts:263`                                            |
| Normalization             | `convex/lib/domains.ts:30`                                        |
| Validation                | `convex/lib/domains.ts:44`                                        |
| Hostname regex            | `convex/lib/domains.ts:14`                                        |
| Schema index              | `convex/schema.ts:81`                                             |
| Unit tests                | `tests/domains.test.ts:7`                                         |

## 16. Changelog

| Version | Date       | Author        | Change                                                                                               |
| ------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| 1.0.1   | 2026-07-28 | Spec suite v1 | Status corrected to `defective` per authoring-guide §3 (spec carries a behaviour-breaking P1 defect) |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification                                                                       |
