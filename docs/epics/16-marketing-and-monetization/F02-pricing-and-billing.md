---
id: EP-16-F02
title: Pricing & Billing
epic: EP-16 Marketing & Monetization
version: 0.1.0
status: proposed
last_updated: 2026-07-28
depends_on: [EP-01-F01, EP-02-F01, EP-16-F01]
---

# EP-16-F02 — Pricing & Billing

> **This is a PROPOSED feature.** Nothing in this document except §"What exists today"
> describes shipped behavior. Every rule in §10 is tagged `[PROPOSED]`, not `[AS-BUILT]`,
> because no plan model, entitlement check, payment integration or subscription record exists
> anywhere in `src/` or `convex/`. The spec describes the **mechanism** a billing capability
> would need; it deliberately states **no prices** — amounts are an open question in §14.

## 1. Summary

Wedboard has no way to charge anyone. The `/pricing` route renders a single line —
"Pricing coming soon" — and the product enforces several hard technical caps (media library
size, file size, special invitations, demo-event seeding) that are today applied uniformly to
every account with no commercial meaning. This spec proposes the monetization layer: a small
set of plan tiers, a subscription record attached to the paying user, a set of entitlement
checks placed at the capacity limits the code already enforces, and the upgrade, downgrade and
cancellation flows around them. Its purpose is to convert the existing arbitrary constants
into deliberate plan boundaries, and to give the marketing site something to sell.

### What exists today

| Surface            | Reality                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pricing` route   | `src/app/(marketing)/pricing/page.tsx` — 7 lines. A centred `<h1>` reading "Pricing coming soon". No plans, no table, no CTA, no metadata               |
| Route group        | The page is the only member of `(marketing)/`, which has no `layout.tsx`; it therefore inherits the root layout and shares no header or footer with `/` |
| Middleware         | `/pricing` is listed in the public matcher (`src/middleware.ts:6`), so it renders without a session                                                     |
| Inbound links      | **None.** The only occurrence of the string `pricing` in `src/` is that matcher line — no navigation, footer link or in-app upsell points at it         |
| Payment provider   | None. No Stripe, Paddle, Lemon Squeezy or equivalent dependency, key, webhook route or client anywhere in the repository                                |
| Subscription data  | None. `convex/schema.ts` defines no plan, subscription, entitlement, invoice or usage table; `users` carries only Clerk identity fields plus `role`     |
| Entitlement checks | None. Every guard in `convex/lib/permissions.ts` is about _event role_, never about a plan                                                              |

The existing hard caps — the raw material for metering — are all unconditional constants:

| Cap                           | Value                                                                                                                                  | Enforced at                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Media items per event         | 50                                                                                                                                     | `convex/media.ts:17, 69-73`         |
| Media file size               | 5 MB                                                                                                                                   | `convex/media.ts:16, 42, 54`        |
| Special invitations per event | 2                                                                                                                                      | `convex/specialEvents.ts:72, 85-93` |
| Demo events per user          | refuses at 3 owned events                                                                                                              | `convex/seed.ts:434-449`            |
| Events per user               | **unlimited** — `events.createEvent` applies no count check (`convex/events.ts:111-122`)                                               |
| Guests per event              | **unlimited** in schema; the overview dashboard silently truncates above 1000 (`convex/dashboard.ts:17, 21` — see EP-14-F01 DEF-14-01) |
| Custom domains                | one per event, uniqueness-enforced only (`events.setCustomDomain`)                                                                     |
| Collaborators per event       | **unlimited** — `members.addMember` applies no count check                                                                             |

## 2. Actors & Permissions

| Actor                | Access                                                       | Notes                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor    | Read the pricing page                                        | Proposed: compare plans, start checkout by signing up first                                                                                                |
| Owner                | Full billing control                                         | Proposed: the **subscriber is the event owner**, since ownership is the only role that survives every other role change and is required to delete an event |
| Co-owner (`planner`) | See the plan and its limits; cannot change it                | Proposed — a co-owner can already reach settings, but must not be able to spend the owner's money                                                          |
| Editor               | See a limit message when blocked; no billing visibility      | Proposed                                                                                                                                                   |
| Viewer               | None                                                         |                                                                                                                                                            |
| Public guest         | None                                                         | Billing state must never affect or be visible on a public invitation page                                                                                  |
| Superadmin           | Read every account's plan from `/admin`; may override a plan | Proposed — EP-15 owns the console                                                                                                                          |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The proposed gate for every
billing mutation is `requireEventMember(ctx, eventId, userId, "owner")` for event-scoped
actions, and a plain `requireUser(ctx)` plus a self-check for account-scoped actions.

## 3. User Stories

- **US-16-F02-01** — As an anonymous visitor, I want to compare plans and their limits so that
  I can tell whether the free tier covers my wedding before signing up.
- **US-16-F02-02** — As an owner, I want to see which plan I am on and what it includes so that
  I know where my limits are.
- **US-16-F02-03** — As an owner who has hit a limit, I want the blocking message to offer an
  upgrade so that I can continue without hunting through settings.
- **US-16-F02-04** — As an owner, I want to upgrade and have the new limits apply immediately
  so that the work I was blocked on can continue.
- **US-16-F02-05** — As an owner, I want to downgrade or cancel and understand exactly what
  happens to data that exceeds the lower plan's limits.
- **US-16-F02-06** — As an owner, I want my invoices and payment method in one place so that I
  can manage the subscription without contacting support.
- **US-16-F02-07** — As a co-owner, I want to see the plan's limits so that I understand why an
  action is blocked, without being able to change billing.
- **US-16-F02-08** — As a superadmin, I want to see and override any account's plan so that I
  can support customers and run trials.

## 4. Entry Points

| Entry point                        | Route / control                                                                 | Actor                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Public pricing page                | `/pricing`                                                                      | Anonymous visitor — **exists today as a placeholder** |
| Footer / header link to pricing    | `src/app/page.tsx` header nav                                                   | Anonymous visitor — **proposed**; no such link exists |
| Billing settings                   | proposed `/dashboard/billing` (account-scoped, alongside `/dashboard`)          | Owner — **proposed**                                  |
| Plan card in event settings        | `/dashboard/[eventSlug]/settings`                                               | Owner / Co-owner — **proposed**                       |
| Upgrade prompt on a blocked action | inline in the failing dialog (media upload, special-event create, event create) | Owner — **proposed**                                  |
| Superadmin plan view               | `/admin`                                                                        | Superadmin — **proposed**, EP-15                      |

Billing is proposed as **account-scoped, not event-scoped**: a user's plan governs all events
they own. Attaching a subscription to an individual event would make a planner with six
weddings pay six times, which contradicts the multi-event design of the event switcher.

## 5. UX Flow

### Happy path (proposed)

1. Visitor opens `/pricing` → a plan comparison renders: tier name, price, and the metered
   limits per tier.
2. Visitor picks a paid tier → if signed out, they are routed to `/sign-up` and returned to
   checkout afterwards.
3. Checkout is delegated to the payment provider's hosted page; Wedboard never handles card
   details.
4. The provider's webhook calls a Convex HTTP action, which upserts the subscription record
   keyed by the Clerk user.
5. The user returns to `/dashboard/billing`, which reads the subscription and shows the active
   plan, renewal date, and current usage against each limit.
6. Entitlement checks in the guarded mutations read the owner's plan and permit the previously
   blocked action.

### Alternate & edge paths (proposed)

- **A1** — Owner hits a limit (for example the 51st media upload) → the mutation throws a
  typed limit error naming the limit and the plan that lifts it; the client renders an upgrade
  call to action rather than a bare toast.
- **A2** — Owner downgrades while over the new plan's limits → the account enters a
  **read-only-over-limit** state for the affected resource: existing data is preserved and
  still served publicly, but no new item of that kind can be created until usage is back under
  the cap. Data is never deleted by a billing action.
- **A3** — Payment fails at renewal → a grace period begins; public invitation pages keep
  serving throughout, because a guest's access must never depend on the host's payment state.
- **A4** — Subscription is cancelled → the account falls back to the free tier at period end,
  subject to A2.
- **A5** — Webhook arrives out of order or is replayed → the handler is idempotent, keyed on
  the provider's subscription id and event id.
- **E1** — The provider is unreachable during checkout → the user sees a retry; no local state
  is mutated, since the webhook is the only writer of subscription records.
- **E2** — A user with no subscription record → treated as the free tier. Absence of a record
  is a valid state, never an error.

## 6. States

| State             | Behavior (proposed)                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Billing page shows skeletons while the subscription query resolves                                                             |
| Empty             | No subscription record → the free tier is displayed as the active plan                                                         |
| Error             | Webhook or provider failure surfaces on the billing page as a support-contact message; product functionality is unaffected     |
| Success           | Active plan, renewal date, usage meters, and a link to the provider's customer portal                                          |
| Disabled / locked | Non-owners see the plan and its limits read-only, with billing controls absent rather than disabled                            |
| Over limit        | The specific create action is blocked with an upgrade prompt; all existing data remains readable, editable and publicly served |
| Mobile            | Plan comparison stacks to one column; usage meters remain full-width                                                           |

## 7. UI Specification

### Screens & components (proposed)

| Element               | Component        | Path                                                               |
| --------------------- | ---------------- | ------------------------------------------------------------------ |
| Pricing page (today)  | `PricingPage`    | `src/app/(marketing)/pricing/page.tsx:1` — **exists, placeholder** |
| Plan comparison table | `PlanComparison` | proposed `src/components/billing/plan-comparison.tsx`              |
| Billing settings page | `BillingPage`    | proposed `src/app/(dashboard)/dashboard/billing/page.tsx`          |
| Usage meter           | `UsageMeter`     | proposed `src/components/billing/usage-meter.tsx`                  |
| Upgrade prompt        | `UpgradePrompt`  | proposed `src/components/billing/upgrade-prompt.tsx`               |

No component in the table other than the placeholder page exists today.

### Fields & validation (proposed)

| Field            | Type                  | Required | Rule                 | Message        |
| ---------------- | --------------------- | -------- | -------------------- | -------------- |
| Plan selection   | enum of tier ids      | Yes      | Must be a known tier | "Unknown plan" |
| Billing interval | `monthly` \| `yearly` | Yes      | —                    | —              |

Card details, billing address and tax identifiers are **never** collected by Wedboard; they
belong to the provider's hosted checkout. This is a hard requirement, not a preference.

### Copy deck

The only copy that exists today:

| Key                 | Copy                  | Source                                   |
| ------------------- | --------------------- | ---------------------------------------- |
| Placeholder heading | `Pricing coming soon` | `src/app/(marketing)/pricing/page.tsx:4` |

All other copy is unwritten. The product's marketing surface is English (EP-16-F01) while its
guest-facing templates are Spanish — the pricing page's language is part of the open question
in EP-16-F01 TODO-16-04.

## 8. Data Model

**Today: none.** `convex/schema.ts` contains no billing table, and `users` carries no plan
field.

**Proposed**, one new table plus one field:

| Table                 | Fields                                                                                                                                                                                                                 | Read / Write                                                     | Index                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| `subscriptions` (new) | `userId: Id<"users">`, `planId: string`, `status: "active" \| "past_due" \| "canceled"`, `interval: "monthly" \| "yearly"`, `currentPeriodEnd: number`, `providerCustomerId: string`, `providerSubscriptionId: string` | Read by entitlement checks; written only by the provider webhook | `by_userId`, `by_providerSubscriptionId` |
| `users`               | `planOverride: string?` (new, optional)                                                                                                                                                                                | Written by a superadmin only                                     | —                                        |

Plan definitions themselves live in **code**, not the database — a `PLANS` record in a shared
module (proposed `convex/lib/plans.ts`, mirrored to the client the way `src/lib/roles.ts`
mirrors the role hierarchy today) mapping each tier id to its limits. Prices live with the
payment provider so that Wedboard never becomes the source of truth for an amount.

**Lifecycle (proposed).** A subscription row is created and updated exclusively by the webhook
handler; no user-facing mutation writes it. Deleting a user's account cancels the subscription
with the provider but does not delete events — event deletion remains the owner-driven cascade
already specified in EP-02. No billing action ever deletes customer data.

**Entitlement resolution (proposed).** For an event-scoped check, the plan is the plan of
`events.ownerUserId`, not of the acting user — so an editor working inside an owner's event
consumes the owner's allowance.

## 9. Backend Contract

**Today: none.** There is no billing function in `convex/`.

Proposed surface (none of these exist — do not treat these names as real):

| Function                                   | Type       | Args                   | Returns                                                                  | Guard                                    | Caps                                  |
| ------------------------------------------ | ---------- | ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------- |
| `billing.getMyPlan` (proposed)             | query      | `{}`                   | `{ planId, status, currentPeriodEnd?, limits }`                          | `requireUser`                            | —                                     |
| `billing.getEventUsage` (proposed)         | query      | `{ eventId }`          | `{ guests, media, mediaBytes, specialEvents, members, hasCustomDomain }` | `requireEventEditor(…, "planner")`       | Reuses the existing `.take(n)` bounds |
| `billing.createCheckoutSession` (proposed) | action     | `{ planId, interval }` | `{ url }`                                                                | `requireUser`                            | —                                     |
| `billing.createPortalSession` (proposed)   | action     | `{}`                   | `{ url }`                                                                | `requireUser` + must have a subscription | —                                     |
| `billing.handleProviderWebhook` (proposed) | httpAction | provider payload       | `200`                                                                    | Signature verification, not user auth    | Idempotent per provider event id      |
| `admin.setPlanOverride` (proposed)         | mutation   | `{ userId, planId }`   | `void`                                                                   | `requireSuperadmin`                      | —                                     |

## 10. Business Rules

All rules below are **`[PROPOSED]`**. None is enforced in code today; none may be cited as
as-built behavior.

- **BR-16-F02-01** `[PROPOSED]` — A subscription belongs to a **user**, not an event; one
  subscription governs every event that user owns.
- **BR-16-F02-02** `[PROPOSED]` — An event's entitlements resolve from the plan of
  `events.ownerUserId`, regardless of which member performs the action.
- **BR-16-F02-03** `[PROPOSED]` — A user with no subscription record is on the free tier;
  absence of a record is a valid state and never an error.
- **BR-16-F02-04** `[PROPOSED]` — Only the event owner may start, change or cancel a
  subscription; a co-owner may read the plan and its usage but not modify it.
- **BR-16-F02-05** `[PROPOSED]` — Wedboard never stores card, bank or tax-identifier data;
  checkout and payment-method management are delegated entirely to the provider's hosted
  surfaces.
- **BR-16-F02-06** `[PROPOSED]` — Subscription records are written **only** by the verified
  provider webhook; no client-callable mutation writes plan state.
- **BR-16-F02-07** `[PROPOSED]` — Webhook processing is idempotent, keyed on the provider's
  event id, so replays and out-of-order delivery cannot corrupt plan state.
- **BR-16-F02-08** `[PROPOSED]` — **Public invitation pages never gate on billing state.** A
  guest's ability to view an invitation and submit an RSVP is unaffected by the host's payment
  status, including past-due and cancelled. Payment is a dispute between Wedboard and the
  host; a wedding guest must never be caught in it.
- **BR-16-F02-09** `[PROPOSED]` — No billing action deletes customer data. Exceeding a limit
  after a downgrade blocks _creation_ of new items of that kind and nothing else.
- **BR-16-F02-10** `[PROPOSED]` — Every entitlement check is enforced server-side in the same
  mutation that already enforces the technical cap; client-side plan gating is convenience
  only, mirroring the existing role convention.
- **BR-16-F02-11** `[PROPOSED]` — An entitlement failure throws a typed limit error carrying
  the limit name, the current usage and the lowest tier that lifts it, so the UI can render a
  targeted upgrade prompt rather than a generic message.
- **BR-16-F02-12** `[PROPOSED]` — Upgrading applies the new limits immediately on webhook
  confirmation; downgrading applies at the end of the paid period.
- **BR-16-F02-13** `[PROPOSED]` — A superadmin's `planOverride` takes precedence over the
  subscription record, and its use is recorded.
- **BR-16-F02-14** `[PROPOSED]` — Plan limits are defined in one shared module and are the
  single source of truth for both the enforcement points and the pricing page, so a published
  limit and an enforced limit cannot diverge.

### Proposed metering points

Each row maps a plan limit to the mutation that must carry its entitlement check. The
"today" column is the unconditional constant already in the code — these are the natural
seams, which is why the mechanism is cheap to add.

| Metered resource              | Today                                                                                                      | Enforcement point (proposed)                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events owned per user         | unlimited (`convex/events.ts:111`); the demo seeder alone refuses at 3 owned events (`convex/seed.ts:446`) | `events.createEvent` — count `events.by_ownerUserId` and compare against the plan                                                                                                                 |
| Guests per event              | unlimited in schema; overview truncates at 1000 (`convex/dashboard.ts:21`)                                 | `guests.createGuest` and `guests.bulkCreateGuestsForInvitation`; note the 1000-row dashboard ceiling is a _technical_ bug (EP-14 DEF-14-01), not a plan boundary, and must be fixed independently |
| Invitations per event         | unlimited                                                                                                  | `invitations.createInvitation`                                                                                                                                                                    |
| Media items per event         | 50 (`convex/media.ts:17`)                                                                                  | `media.register` — already counts existing rows at `convex/media.ts:69-73`; swap the constant for the plan's value                                                                                |
| Media file size               | 5 MB (`convex/media.ts:16`)                                                                                | `media.register` — already validated twice, against the argument and the stored blob (`convex/media.ts:42, 54`)                                                                                   |
| Special invitations per event | 2 (`convex/specialEvents.ts:72`)                                                                           | `specialEvents.createSpecialEvent` — already counts at `convex/specialEvents.ts:85-93`                                                                                                            |
| Custom domain                 | allowed for every event                                                                                    | `events.setCustomDomain` — a natural paid-tier boundary, since it consumes a Vercel domain slot and real support cost                                                                             |
| Collaborators per event       | unlimited                                                                                                  | `members.addMember`                                                                                                                                                                               |
| Template variety              | one template ships (`elegant`)                                                                             | `events.setInvitationTemplate` — reserve future templates by tier                                                                                                                                 |

Two limits deserve care rather than a plan boundary:

- **Guests per event** is the most natural value metric for a wedding product, but the current
  1000-row read bound means the app cannot correctly _display_ an event above it. Metering
  guests before fixing DEF-14-01 would sell a limit the product cannot honour.
- **The 3-event demo-seed guard** (`convex/seed.ts:446`) is anti-spam, not commercial. It
  should not be repurposed as the free-tier event allowance without a deliberate decision.

### Proposed tier shape

Three tiers, described by **structure only** — no amounts are specified here (see Q1):

| Tier     | Intended buyer                           | Differentiators                                                                                                                              |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Free     | A couple trying the product              | One event; small guest allowance; media library and special invitations capped; no custom domain; Wedboard branding on the public invitation |
| Standard | A couple running their own wedding       | One event; full guest allowance for a typical wedding; full media allowance; custom domain; no Wedboard branding                             |
| Planner  | A professional managing several weddings | Many events; every Standard entitlement per event; unlimited collaborators; priority support                                                 |

The tier axis is deliberately **events owned** (single wedding vs. professional), with capacity
limits as the secondary axis. This matches the product's existing shape: the event switcher,
per-event roles and sharing model already anticipate a user with many events.

## 11. Acceptance Criteria

All criteria describe **proposed** behavior and are not satisfiable today.

- **AC-16-F02-01** — **Given** a user with no subscription record **When** their plan is
  resolved **Then** the free tier is returned and no error is thrown. _(BR-16-F02-03)_
- **AC-16-F02-02** — **Given** an event owned by a user on the free tier **When** an _editor_
  of that event attempts an action beyond the free limits **Then** it is blocked by the
  owner's plan, not the editor's. _(BR-16-F02-02)_
- **AC-16-F02-03** — **Given** a co-owner **When** they open billing settings **Then** the
  plan and usage are visible and no control can change the subscription. _(BR-16-F02-04)_
- **AC-16-F02-04** — **Given** any Wedboard-hosted page **When** payment details are entered
  **Then** they are entered on the provider's domain, and no card field exists in the
  Wedboard codebase. _(BR-16-F02-05)_
- **AC-16-F02-05** — **Given** a webhook event delivered twice **When** both are processed
  **Then** the subscription record is identical to the single-delivery outcome.
  _(BR-16-F02-07)_
- **AC-16-F02-06** — **Given** an owner whose subscription is `past_due` **When** a guest
  opens their public invitation **Then** the invitation renders and the RSVP submits normally.
  _(BR-16-F02-08)_
- **AC-16-F02-07** — **Given** an owner with 40 media items who downgrades to a 10-item plan
  **When** the downgrade takes effect **Then** all 40 items remain readable and served, and the
  41st upload is blocked. _(BR-16-F02-09)_
- **AC-16-F02-08** — **Given** a client that bypasses the UI **When** it calls a metered
  mutation beyond the plan's limit **Then** the server rejects it. _(BR-16-F02-10)_
- **AC-16-F02-09** — **Given** an upload blocked by the media limit **When** the error is
  inspected **Then** it names the limit, the current usage and the tier that lifts it.
  _(BR-16-F02-11)_
- **AC-16-F02-10** — **Given** an owner upgrading mid-period **When** the webhook confirms
  **Then** the previously blocked action succeeds without a sign-out or reload.
  _(BR-16-F02-12)_
- **AC-16-F02-11** — **Given** a superadmin sets `planOverride` on a user **When** that user's
  entitlements resolve **Then** the override wins over the subscription record.
  _(BR-16-F02-13)_
- **AC-16-F02-12** — **Given** the pricing page and the enforcement code **When** a plan's
  media limit is changed in the shared module **Then** both the published number and the
  enforced number change together. _(BR-16-F02-14)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                 |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------- |
| TC-16-F02-01 | unit        | Plan resolution returns the free tier for a user with no subscription row                                |
| TC-16-F02-02 | unit        | The shared plan module's limits are the values used by both the pricing page and the enforcement helpers |
| TC-16-F02-03 | integration | A metered mutation rejects at the plan limit and permits at limit − 1                                    |
| TC-16-F02-04 | integration | Entitlements resolve from the event owner, not the acting member                                         |
| TC-16-F02-05 | integration | Replayed webhook events produce a single, stable subscription row                                        |
| TC-16-F02-06 | integration | A `past_due` owner's public invitation query still resolves                                              |
| TC-16-F02-07 | integration | Downgrading below current usage deletes nothing                                                          |
| TC-16-F02-08 | e2e         | Visitor compares plans, signs up, completes hosted checkout, and sees the new plan on the billing page   |
| TC-16-F02-09 | e2e         | An owner blocked at the media limit follows the inline upgrade prompt and completes the upload           |

### Manual QA checklist

- [ ] Pricing page renders the same limits the server enforces.
- [ ] Every metered mutation fails closed when the plan cannot be resolved.
- [ ] Cancelling a subscription never affects a public invitation page.
- [ ] Provider webhook signature verification rejects an unsigned request.
- [ ] Billing controls are absent — not merely disabled — for non-owners.

## 13. Non-Functional

| Concern          | Specification (proposed)                                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Defined per tier in one shared module; the existing constants (50 media, 5 MB, 2 special invitations) become the free tier's values or are raised deliberately                                                                                      |
| Performance      | Plan resolution must be a single indexed read on `subscriptions.by_userId`, cached per request; entitlement checks reuse the counting reads the metered mutations already perform, adding no round trip                                             |
| Security & authz | Webhook endpoints verify the provider signature and are the sole writer of plan state. No client input determines a plan. Checkout and portal sessions are created server-side and are single-use. Card data never enters the system (BR-16-F02-05) |
| Accessibility    | The plan comparison must be a real table with headers, navigable by keyboard, not a purely visual grid                                                                                                                                              |
| i18n             | Prices carry an explicit currency; tax treatment differs by market. The language decision inherits EP-16-F01 TODO-16-04                                                                                                                             |
| Analytics        | Plan-page views, checkout starts, completions and churn must be instrumented from day one — EP-16-F01 TODO-16-01 notes that nothing is instrumented today                                                                                           |
| Compliance       | Taking payment requires terms of service, a privacy policy, a refund policy and a contact address — none of which exist (EP-16-F01 TODO-16-07)                                                                                                      |
| Data retention   | What happens to a cancelled account's events, media blobs and public invitations after the period ends is undecided (Q4)                                                                                                                            |

## 14. TODOs & Open Questions

- **DEF-16-03** `[P2]` — `/pricing` is a dead public route.
  - **Evidence:** `src/app/(marketing)/pricing/page.tsx:1-7` renders only "Pricing coming
    soon"; the string `pricing` appears nowhere else in `src/` except the middleware matcher
    (`src/middleware.ts:6`).
  - **Impact:** A publicly reachable, indexable page that says the product is unfinished, with
    no navigation back to `/` because the `(marketing)` group has no shared layout.
  - **Proposed fix:** Either build the page (this spec) or remove the route and its matcher
    entry until it is ready.
- **TODO-16-10** `[P1]` `[ADD]` — There is no monetization capability at all.
  - **Rationale:** No plan model, provider integration, subscription table or entitlement
    check exists. Every technical cap in the product is currently a uniform constant with no
    commercial meaning, so the product cannot generate revenue.
  - **Proposed rule:** The whole of §10.
- **TODO-16-11** `[P1]` `[ADD]` — Existing caps are undocumented to the user.
  - **Rationale:** A host discovers the 50-item media limit and the 2-special-invitation limit
    only by hitting them (`convex/media.ts:72`, `convex/specialEvents.ts:92`). Nothing in the
    UI states a limit in advance, and the pricing page that would is a placeholder.
  - **Proposed rule:** Every metered limit is stated in the UI before it is reached, with a
    usage meter.
- **TODO-16-12** `[P1]` `[CHANGE]` — Guest count cannot be metered until the 1000-row ceiling
  is fixed.
  - **Rationale:** `getOverviewStats` truncates silently at 1000 guests (`convex/dashboard.ts:21`,
    EP-14-F01 DEF-14-01). Selling a plan with a higher guest allowance would sell a limit the
    dashboard cannot display correctly.
  - **Proposed rule:** DEF-14-01 is fixed before guests become a metered resource.
- **TODO-16-13** `[P2]` `[CHANGE]` — The demo-seed guard is being used as a de-facto event
  limit.
  - **Rationale:** `convex/seed.ts:446` refuses at 3 owned events, but `events.createEvent`
    imposes no limit at all (`convex/events.ts:111`). The only "event allowance" in the product
    applies to demo data, which is the opposite of a commercial boundary.
  - **Proposed rule:** Make events-per-user an explicit plan limit enforced in `createEvent`,
    and keep the seed guard as an independent anti-spam measure.
- **TODO-16-14** `[P2]` `[ADD]` — There is no way to identify a paying account operationally.
  - **Rationale:** `/admin` lists events and users with no plan, revenue or usage column
    (`convex/admin.ts`). Support and dunning would be blind.
  - **Proposed rule:** `/admin` surfaces each user's plan, status and usage. Owned by EP-15.
- **TODO-16-15** `[P2]` `[ADD]` — No free-tier product branding.
  - **Rationale:** A free tier normally carries a "Made with Wedboard" mark on the public
    invitation as an acquisition channel; the elegant template's footer today shows only
    authored copy.
  - **Proposed rule:** Free-tier public invitations render an attribution link; paid tiers do
    not.
- **TODO-16-16** `[P2]` `[ADD]` — Weddings are a one-off purchase, but the model assumed here
  is a subscription.
  - **Rationale:** A couple needs the product for months, not years, and will cancel
    immediately after the wedding. A recurring subscription may be the wrong instrument for
    the Free/Standard tiers even if it is right for Planner.
  - **Proposed rule:** Evaluate a one-time per-event unlock alongside subscriptions.

### Open questions

- **Q1** — **What are the prices?** No amount, currency or billing interval has been decided.
  This spec deliberately specifies the mechanism only; the tier table in §10 carries no
  numbers and none should be inferred from it.
- **Q2** — Should the free tier exist at all, or should the product be trial-then-pay? A
  wedding is a single high-intent purchase, which argues against an indefinite free tier.
- **Q3** — Which single limit is the value metric — events owned, guests per event, or the
  custom domain? §10 proposes events-owned as the tier axis, but that is a hypothesis.
- **Q4** — What happens to a cancelled account's data? Do public invitations keep serving
  indefinitely (BR-16-F02-08 says billing never gates them), and if so for how long, given
  media blobs carry ongoing storage cost?
- **Q5** — Is the buyer the couple or the professional planner? EP-16-F01 raises the same
  question about the marketing copy; the tier structure cannot be settled before it is
  answered.

## 15. Traceability

Only the first block is as-built; the rest are the existing enforcement points this proposal
would attach to.

| Concern                                                    | Source                                     |
| ---------------------------------------------------------- | ------------------------------------------ |
| Pricing placeholder route                                  | `src/app/(marketing)/pricing/page.tsx:1-7` |
| Placeholder copy                                           | `src/app/(marketing)/pricing/page.tsx:4`   |
| `/pricing` public matcher (only occurrence in `src/`)      | `src/middleware.ts:6`                      |
| Media count cap (proposed metering point)                  | `convex/media.ts:17, 69-73`                |
| Media file-size cap (proposed metering point)              | `convex/media.ts:16, 42, 54`               |
| Special-invitation cap (proposed metering point)           | `convex/specialEvents.ts:72, 85-93`        |
| Demo-event spam guard (not a commercial limit)             | `convex/seed.ts:434-449`                   |
| Event creation — no limit today                            | `convex/events.ts:111-122`                 |
| Guest read ceiling blocking guest metering                 | `convex/dashboard.ts:17, 21`               |
| Role guards the entitlement checks would sit beside        | `convex/lib/permissions.ts`                |
| Client role mirror, the pattern a plan mirror would follow | `src/lib/roles.ts`                         |

## 16. Changelog

| Version | Date       | Author        | Change                                                              |
| ------- | ---------- | ------------- | ------------------------------------------------------------------- |
| 0.1.0   | 2026-07-28 | Spec suite v1 | Initial proposed specification — no billing capability exists today |
