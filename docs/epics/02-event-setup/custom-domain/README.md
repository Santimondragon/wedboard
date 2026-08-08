# EP-02a — Custom Domain

A sub-epic of [EP-02 Event Setup](../README.md). It lets an event owner serve that event's
public invitations from a hostname they own — `https://invites.mywedding.com/invitations/{slug}`
— instead of the primary-domain form `/{event-key}/invitations/{slug}`.

---

## 1. Purpose

A [Custom Domain](../../../glossary.md#domains--routing) is a bare hostname stored on
`events.customDomain`, globally unique across all events. Once claimed, middleware routes every
request arriving on that host to the event's public pages and nothing else — no dashboard, no
marketing site, no Clerk (`src/middleware.ts:30`).

The sub-epic covers four things: claiming the domain, guiding the owner through DNS until it
resolves, disconnecting it, and the extra page a domain root gains that the primary domain has
no equivalent for — the [Countdown Landing](../../../glossary.md#domains--routing).

## 2. Why this is a sub-epic and not four ordinary features

Every other feature in EP-02 writes one field on `events` and is done. Custom Domain is
different on three axes, and all four of its features inherit all three.

1. **It owns a lifecycle state machine.** `customDomain` and `customDomainVerified` exist only
   to persist that machine. Transitions are driven partly by DNS propagation — a process
   Wedboard neither performs nor observes directly — so the product has to model "claimed but
   not yet reachable" as a first-class state, which nothing else in the epic does.
2. **It has an external system of record.** Convex holds the _claim_; Vercel holds the
   _attachment_ and the verification truth. Because a Convex mutation cannot call an external
   API, the writes are orchestrated by Next.js route handlers (`src/app/api/domains/route.ts`,
   `src/app/api/domains/status/route.ts`) that authenticate with Clerk, forward the Clerk JWT
   to Convex, and reconcile the two systems by hand — including a rollback path
   (`src/app/api/domains/route.ts:85`).
3. **It adds a public routing surface.** A connected domain is a second, event-key-free way to
   address the same invitation. Middleware rewrites every non-primary host to
   `/_domain/{host}{path}` _before any Clerk logic_ (`src/middleware.ts:34`), and the domain
   root renders a page that does not exist on the primary domain (F11).

## 3. Lifecycle state machine

The two persisted fields and what each state means. `—` means the field is `undefined`.

| #   | State                 | `customDomain`  | `customDomainVerified` | Vercel                                                  | How it is reached                                                                                  | Settings UI                                                                                              |
| --- | --------------------- | --------------- | ---------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **none**              | —               | —                      | not attached                                            | Initial state of every event                                                                       | Domain input + "Connect Domain"                                                                          |
| 2   | **claimed (Convex)**  | normalized host | `false`                | not attached yet                                        | `events.setCustomDomain` succeeded (`convex/events.ts:255`)                                        | Transient — inside one `POST /api/domains`                                                               |
| 3   | **attached (Vercel)** | normalized host | `false`                | attached, unverified                                    | `addProjectDomain` succeeded (`src/lib/vercel-domains.ts:85`)                                      | Transient — same request                                                                                 |
| 4   | **pending DNS**       | normalized host | `false`                | attached, `verified` and/or `misconfigured` still wrong | `POST` returned; owner has not finished DNS                                                        | Amber badge "Waiting for DNS" + record table (`src/components/dashboard/custom-domain-settings.tsx:168`) |
| 5   | **live**              | normalized host | `true`                 | attached, verified, configured                          | `GET /api/domains/status` computed `live` and cached it (`src/app/api/domains/status/route.ts:55`) | Green badge "Live" + "Visit" link (`custom-domain-settings.tsx:163`)                                     |
| 6   | **removed**           | —               | —                      | detached                                                | `DELETE /api/domains` → `events.removeCustomDomain` (`convex/events.ts:268`)                       | Back to state 1                                                                                          |

```
        setCustomDomain            addProjectDomain
 none ────────────────► claimed ────────────────────► attached
   ▲                       │                             │
   │  removeCustomDomain   │ Vercel attach failed        │ (owner adds DNS records)
   │  (rollback)           ▼                             ▼
   └──────────────────── none                       pending DNS
                                                         │  GET /api/domains/status
                                                         │  live = verified && !misconfigured
                                                         ▼
   none ◄──── DELETE /api/domains ──────────────────── live
```

Two properties of this machine are load-bearing and easy to get wrong:

- **State 2 → 3 is not atomic.** The claim lands in Convex before the Vercel call is made, on
  purpose: Convex is where global uniqueness is enforced transactionally, so claiming first
  prevents two events racing for the same host. The cost is a compensating rollback (see
  DEF-02-40 in [F08](./F08-connect-domain.md)).
- **Public routing never reads `customDomainVerified`.** `resolvePublicEventByHost` matches on
  `customDomain` alone (`convex/lib/public.ts:39`). States 4 and 5 are therefore identical to a
  guest; the flag is a Settings-UI affordance. See [F09](./F09-dns-verification.md).

## 4. Features

| ID                                      | Feature           | Status      | Summary                                                                                                        |
| --------------------------------------- | ----------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| [EP-02-F08](./F08-connect-domain.md)    | Connect Domain    | defective   | `POST /api/domains` — normalize, validate, claim in Convex, attach at Vercel, roll back on failure             |
| [EP-02-F09](./F09-dns-verification.md)  | DNS Verification  | implemented | `GET /api/domains/status` — verify attempt, `live = verified && !misconfigured`, DNS record table, cached flag |
| [EP-02-F10](./F10-remove-domain.md)     | Remove Domain     | implemented | `DELETE /api/domains` — Vercel detach (404 tolerated), then clear Convex                                       |
| [EP-02-F11](./F11-countdown-landing.md) | Countdown Landing | implemented | The custom domain's root page and the catch-all not-found                                                      |

## 5. Workflows

| ID       | Workflow                         | Actor        | Spec                              |
| -------- | -------------------------------- | ------------ | --------------------------------- |
| WF-02-08 | Connect a custom domain          | Co-owner+    | [F08](./F08-connect-domain.md)    |
| WF-02-09 | Verify custom domain DNS records | Co-owner+    | [F09](./F09-dns-verification.md)  |
| WF-02-10 | Remove a connected custom domain | Co-owner+    | [F10](./F10-remove-domain.md)     |
| WF-02-11 | Visit the custom domain landing  | Public guest | [F11](./F11-countdown-landing.md) |

## 6. Actors

All three management features apply the same gate: `requireEventMember(ctx, eventId, user._id,
"planner")` inside the Convex mutations (`convex/events.ts:237`, `:267`, `:281`), reinforced by
the Settings page hiding itself from anyone below `planner`
(`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:42`). Role semantics are defined
once in [roles-and-permissions.md](../../../roles-and-permissions.md).

| Actor                | Involvement                                                           |
| -------------------- | --------------------------------------------------------------------- |
| Owner                | Connect, check status, remove                                         |
| Co-owner (`planner`) | Identical — the domain is not owner-gated                             |
| Editor / Viewer      | Blocked; the Settings page renders an access notice                   |
| Public guest         | Consumes the domain (F11 and the by-host invitation route)            |
| Superadmin           | Bypasses the guard via `requireEventMember`'s superadmin early-return |

## 7. Required environment

| Var                          | Where              | Required          | Purpose                                                                                  |
| ---------------------------- | ------------------ | ----------------- | ---------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN`               | Next.js server env | Yes               | Bearer token for every Vercel Domains API call (`src/lib/vercel-domains.ts:58`)          |
| `VERCEL_PROJECT_ID`          | Next.js server env | Yes               | The project domains are attached to (`src/lib/vercel-domains.ts:88`)                     |
| `VERCEL_TEAM_ID`             | Next.js server env | Optional          | Appended as `?teamId=` when the project lives in a team (`src/lib/vercel-domains.ts:59`) |
| `NEXT_PUBLIC_PRIMARY_DOMAIN` | Next.js env        | Yes in production | Middleware's primary-host test (`src/middleware.ts:21`)                                  |
| `PRIMARY_DOMAIN`             | **Convex** env     | Yes in production | Validation's self-domain rejection (`convex/lib/domains.ts:18`)                          |

`PRIMARY_DOMAIN` is deliberately duplicated. Convex functions run outside the Next.js process
and **cannot read `NEXT_PUBLIC_*` variables**, so the same value has to be set separately with
`npx convex env set PRIMARY_DOMAIN yourdomain.com` — the reason is documented at
`convex/lib/domains.ts:5`. When it is unset, validation falls back to rejecting only `localhost`
and `127.0.0.1` (`convex/lib/domains.ts:10`), which means a production deployment that forgot to
set it would let an owner claim the app's own hostname.

## 8. Dependencies

| Depends on                 | Why                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **EP-01 Account & Access** | The route handlers authenticate through Clerk and mint a Convex-audience JWT with `getConvexToken()` (`src/lib/convex-token.ts:8`)     |
| **EP-02-F03 / F05**        | The domain lives on the same `events` record; an `archived` event stops resolving on its custom domain too (`convex/lib/public.ts:42`) |
| **EP-03 Collaboration**    | `requireEventMember(…, "planner")` is the gate                                                                                         |

| Depended on by                    | Why                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| **EP-07 Guest Experience**        | `invitations.getPublicInvitationByHost` is the by-host twin of the by-key public invitation query |
| **EP-05 Invitations**             | `CopyInvitationLinkButton` emits the custom-domain URL when the event has a verified domain       |
| **EP-10 Meta & Sharing**          | `meta.getPublicInvitationMeta` accepts `host` as an alternative to `eventSlug`                    |
| **EP-15 Platform Administration** | `/admin` lists each event's `hasCustomDomain` / `customDomain`                                    |

## 9. Cross-cutting notes

- **The route handlers do no authorization of their own.** They check only that a Convex token
  exists, then let Convex enforce ownership through the forwarded JWT — stated in a comment at
  `src/app/api/domains/route.ts:16`.
- **Convex error messages reach the user verbatim.** `errorResponse` unwraps `ConvexError.data`
  into `{error}` (`src/app/api/domains/route.ts:21`), and the wizard's `readError` renders it in
  a sonner toast (`custom-domain-settings.tsx:36`). Validation copy authored in
  `convex/lib/domains.ts` is therefore user-facing copy.
- **Media is domain-independent.** Uploaded images resolve to absolute Convex storage URLs, so
  nothing has to be rewritten when a domain is connected or removed.

## 10. Sub-epic defects & gaps

| ID         | Priority | Where                                                                                                               |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| DEF-02-40  | P1       | [F08](./F08-connect-domain.md) — a failed rollback leaves a domain claimed in Convex but unattached at Vercel       |
| TODO-02-40 | P2       | [F08](./F08-connect-domain.md) — missing `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` surfaces as a raw server-env message  |
| TODO-02-41 | P2       | [F08](./F08-connect-domain.md) — domain changes are not activity-logged                                             |
| TODO-02-42 | P1       | [F09](./F09-dns-verification.md) — no automatic re-check or repair path once a live domain breaks                   |
| TODO-02-43 | P2       | [F09](./F09-dns-verification.md) — status is only ever refreshed by a manual click                                  |
| TODO-02-44 | P2       | [F10](./F10-remove-domain.md) — a tolerated Vercel 404 is reported to the owner as a clean success                  |
| TODO-02-45 | P2       | [F11](./F11-countdown-landing.md) — the countdown is computed against the viewer's clock, the date against UTC      |
| TODO-02-46 | P2       | [F11](./F11-countdown-landing.md) — the custom-domain not-found screen is English inside a Spanish guest experience |

DEF-02-02 (deleting an event never detaches its custom domain) is owned by
[EP-02-F06](../F06-delete-event.md) and is referenced, not restated, in
[F10](./F10-remove-domain.md).
