---
id: EP-16
title: Marketing & Monetization
version: 1.0.0
status: partial
last_updated: 2026-07-28
---

# EP-16 — Marketing & Monetization

## Purpose

This epic covers everything a visitor sees **before** they have an account, and everything the
business would need to charge them afterwards. It is two very different halves:

- **Marketing (EP-16-F01)** — the public landing page at `/`, the product's only acquisition
  surface. It states the value proposition, shows three feature cards, and routes visitors to
  Clerk sign-in or sign-up. Built and live.
- **Monetization (EP-16-F02)** — billing. Today this is a single placeholder route reading
  "Pricing coming soon". There is no plan model, no metering, no payment provider, no
  entitlement check and no upgrade path anywhere in `src/` or `convex/`. The spec for it is
  therefore **proposed**, not as-built.

## Primary actor

**Anonymous visitor** (see [roles-and-permissions.md](../../roles-and-permissions.md) §1).
Both routes are unauthenticated: `/` and `/pricing` are listed in the middleware's public
matcher (`src/middleware.ts:5-6`), so Clerk never gates them and no Convex query runs on
either page.

| Actor                              | Access                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor                  | Full read of `/` and `/pricing`; the sign-in and sign-up entry points                                                              |
| Signed-in user                     | Identical — neither page changes for an authenticated session, and neither offers a route back into the dashboard (**TODO-16-02**) |
| Public guest                       | Never routed here; a custom-domain host is rewritten to `/_domain/*` before any of this is reachable (`src/middleware.ts:30-37`)   |
| Owner / Co-owner / Editor / Viewer | No event-scoped role applies — nothing on these pages is event-scoped                                                              |

## What exists today

| Surface             | Route      | File                                   | Status                                            |
| ------------------- | ---------- | -------------------------------------- | ------------------------------------------------- |
| Landing page        | `/`        | `src/app/page.tsx`                     | Built — header, hero, three feature cards, footer |
| Pricing placeholder | `/pricing` | `src/app/(marketing)/pricing/page.tsx` | Placeholder — one heading, 6 lines total          |
| Wordmark            | —          | `src/components/app/logo.tsx`          | Built — a text `<span>` reading "Wedboard"        |

Two structural notes verified in source:

1. **The landing page is not in the `(marketing)` route group.** It lives at
   `src/app/page.tsx`, while the group contains only `pricing/`. The group has no `layout.tsx`
   of its own, so `/pricing` inherits the root layout and shares no chrome with `/` — no
   header, no wordmark, no navigation.
2. **`/pricing` is unreachable from the product.** A grep across `src/` finds the string
   `pricing` only in the middleware's public-route matcher (`src/middleware.ts:6`). No link in
   the landing page, the dashboard, the sidebar or the footer points at it.

## Features

| ID        | Feature           | Status       | File                                                       |
| --------- | ----------------- | ------------ | ---------------------------------------------------------- |
| EP-16-F01 | Marketing site    | defective    | [F01-marketing-site.md](./F01-marketing-site.md)           |
| EP-16-F02 | Pricing & billing | **proposed** | [F02-pricing-and-billing.md](./F02-pricing-and-billing.md) |

## Workflows

| ID       | Workflow                                          | Feature   |
| -------- | ------------------------------------------------- | --------- |
| WF-16-01 | Visitor discovers Wedboard and signs up           | EP-16-F01 |
| WF-16-02 | Returning user signs in from the landing page     | EP-16-F01 |
| WF-16-03 | Signed-out user is bounced to the landing page    | EP-16-F01 |
| WF-16-04 | Visitor compares plans and subscribes (proposed)  | EP-16-F02 |
| WF-16-05 | Owner upgrades on hitting a plan limit (proposed) | EP-16-F02 |

## Backend surface

**None.** Neither route calls a Convex function. `src/app/page.tsx` is a server component with
no data access, and the pricing page renders a static heading. There is no billing module,
webhook handler, subscription table or payment integration anywhere in the repository.

## Dependencies

| Depends on               | Why                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| EP-01 (Account & access) | Every call to action links to Clerk's `/sign-in` or `/sign-up`; the middleware redirects unauthenticated dashboard traffic back to `/` |

EP-16-F02, as a proposed feature, would additionally depend on the capacity limits already
enforced by EP-02 (event creation), EP-06 (special invitations), EP-09 (media library) and
EP-10 (custom domains) — those are the natural metering points and are enumerated in that
spec.

## Known defects

| ID        | Priority | Summary                                                                                                                             | Documented in |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| DEF-16-01 | P1       | The landing page promises "Drag-and-drop seating charts", but seating is explicitly drag-free (EP-12)                               | EP-16-F01 §14 |
| DEF-16-02 | P1       | The landing page promises "Send digital invitations", but the product has no send capability of any kind — no email provider exists | EP-16-F01 §14 |
| DEF-16-03 | P2       | `/pricing` is a public route with no inbound link and no content beyond "Pricing coming soon"                                       | EP-16-F02 §14 |

## Changelog

| Version | Date       | Author        | Change                                            |
| ------- | ---------- | ------------- | ------------------------------------------------- |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial epic overview: F01 as-built, F02 proposed |
