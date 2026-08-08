---
id: EP-16-F01
title: Marketing Site
epic: EP-16 Marketing & Monetization
version: 1.0.1
status: defective
last_updated: 2026-07-28
depends_on: [EP-01-F01]
---

# EP-16-F01 — Marketing Site

## 1. Summary

The marketing site is Wedboard's front door: a single public page at `/` that tells a visitor
what the product does and sends them to sign up or sign in. It is one static server component
— header with wordmark and two buttons, a centred hero with the value proposition and two more
buttons, three feature cards, and a copyright footer. It calls no backend, holds no state and
renders identically for every visitor. It is also the destination the middleware bounces
unauthenticated users to when they attempt a protected route. The status is `partial` because
two of the three feature cards describe capabilities the product does not have (see §14), and
because the site is one page with no about, contact, legal or pricing content.

## 2. Actors & Permissions

| Actor                              | Access          | Notes                                                                                                                           |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous visitor                  | Full            | The intended audience                                                                                                           |
| Signed-in user                     | Full            | The page does not change; it offers "Sign in" / "Get started" to a user who is already signed in, and no link into `/dashboard` |
| Public guest                       | Not routed here | Custom-domain hosts are rewritten to `/_domain/*` before Clerk or this route is considered (`src/middleware.ts:30-37`)          |
| Owner / Co-owner / Editor / Viewer | Not applicable  | Nothing on this page is event-scoped                                                                                            |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
the middleware's public matcher: `"/"` is listed in `isPublicRoute`
(`src/middleware.ts:5`), so no Clerk check runs.

## 3. User Stories

- **US-16-F01-01** — As an anonymous visitor, I want a one-sentence statement of what Wedboard
  does so that I can decide in seconds whether it is for me.
- **US-16-F01-02** — As an anonymous visitor, I want to see the product's main capabilities so
  that I can judge whether it covers my planning needs.
- **US-16-F01-03** — As an anonymous visitor, I want an obvious way to create an account so
  that I can start without hunting for it.
- **US-16-F01-04** — As a returning user, I want a sign-in link on the public page so that I
  can reach my dashboard from the root URL.
- **US-16-F01-05** — As a signed-out user who followed a bookmarked dashboard link, I want to
  land somewhere that explains the product rather than on an error.

## 4. Entry Points

| Entry point          | Route / control                                                                                      | Actor             |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| Root URL             | `/` (`src/app/page.tsx:7`)                                                                           | Anonymous visitor |
| Middleware bounce    | Any non-public route without a `userId` → `NextResponse.redirect` to `/` (`src/middleware.ts:44-49`) | Signed-out user   |
| Dashboard sign-out   | Clerk `UserButton` sign-out returns to the app root                                                  | Signed-in user    |
| Header "Sign in"     | `→ /sign-in` (`src/app/page.tsx:16`)                                                                 | Anonymous visitor |
| Header "Get started" | `→ /sign-up` (`src/app/page.tsx:19`)                                                                 | Anonymous visitor |
| Hero "Get started"   | `→ /sign-up` (`src/app/page.tsx:38`)                                                                 | Anonymous visitor |
| Hero "Sign in"       | `→ /sign-in` (`src/app/page.tsx:41`)                                                                 | Anonymous visitor |

Four links, two destinations. `/sign-in` and `/sign-up` are the Clerk hosted components in the
`(auth)` route group, both configured with `fallbackRedirectUrl="/dashboard"` (EP-01). There
is no link from this page to `/pricing`, to the dashboard, or to any legal or contact page.

## 5. UX Flow

### Happy path

1. Visitor loads `/` → Next.js renders `HomePage`, a server component with no data fetching
   (`src/app/page.tsx:7`).
2. The sticky header renders `<Logo />` on the left and two buttons on the right — a ghost
   "Sign in" and a solid "Get started" (`src/app/page.tsx:11-23`).
3. The hero renders the headline, in which the phrase "beautifully managed" is coloured
   `text-rose-500`, followed by the sub-headline and a large repeat of both buttons
   (`src/app/page.tsx:27-44`).
4. Three feature cards render in a `sm:grid-cols-3` grid, each with a rose-tinted icon tile, a
   title and a paragraph (`src/app/page.tsx:47-100`).
5. The footer renders a small wordmark and a copyright line whose year is computed at render
   time via `new Date().getFullYear()` (`src/app/page.tsx:104-111`).
6. Visitor clicks any call to action → Next.js client-side navigation to `/sign-up` or
   `/sign-in` → Clerk takes over; on success Clerk redirects to `/dashboard`.

### Alternate & edge paths

- **A1** — A signed-in user visits `/` → the identical page renders. No session-aware header,
  no "Go to dashboard" link, and clicking "Sign in" lands on Clerk's already-signed-in
  handling rather than the dashboard (TODO-16-02).
- **A2** — A signed-out user requests `/dashboard/anything` → the middleware redirects to `/`
  rather than to `/sign-in` (`src/middleware.ts:47`), so the landing page is also the
  authentication failure page, with no message explaining why the visitor arrived.
- **A3** — The request arrives on a **custom domain** → the middleware rewrites to
  `/_domain/{host}/` before any of this route is reached, and the visitor sees the event
  landing countdown, not the marketing page (`src/middleware.ts:30-37`).
- **A4** — The visitor navigates to `/pricing` directly → they get the placeholder page, which
  is public but shares no chrome with `/` and offers no route back (see EP-16-F02).
- **E1** — There is no error path. The page performs no I/O, so it cannot fail at runtime.

## 6. States

| State             | Behavior                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | None. A static server component with no client-side data; the HTML is complete on first paint                                                                                                                          |
| Empty             | Not applicable — all content is hard-coded                                                                                                                                                                             |
| Error             | Not applicable — no fetch, no mutation, no query                                                                                                                                                                       |
| Success           | The full page: header, hero, three feature cards, footer                                                                                                                                                               |
| Disabled / locked | None. No control is ever disabled, including for an already-signed-in visitor                                                                                                                                          |
| Mobile            | Single-column by default. The headline steps from `text-5xl` to `sm:text-6xl`, the hero buttons wrap (`flex-wrap`), and the feature grid collapses from `sm:grid-cols-3` to one column (`src/app/page.tsx:28, 36, 48`) |

## 7. UI Specification

### Screens & components

| Element         | Component                                                  | Path                            |
| --------------- | ---------------------------------------------------------- | ------------------------------- |
| Landing page    | `HomePage`                                                 | `src/app/page.tsx:7`            |
| Wordmark        | `Logo`                                                     | `src/components/app/logo.tsx:7` |
| Calls to action | `Button` with `asChild` + `next/link`                      | `src/components/ui/button.tsx`  |
| Feature cards   | `Card` / `CardHeader` / `CardTitle` / `CardContent`        | `src/components/ui/card.tsx`    |
| Feature icons   | `Users`, `ClipboardList`, `LayoutGrid` from `lucide-react` | `src/app/page.tsx:5`            |

`Logo` renders a plain `<span>` containing the text "Wedboard" with
`text-xl font-semibold tracking-tight text-zinc-900`, and accepts a `className` merged via
`cn` (`src/components/app/logo.tsx:7-17`). The footer reuses it with
`className="text-sm text-zinc-400"` (`src/app/page.tsx:106`). There is no logotype image, no
SVG mark and no favicon-specific asset in this component.

### Fields & validation

None. The marketing site collects no input: there is no newsletter capture, no contact form,
no demo request and no waitlist.

### Copy deck

All landing-page copy is English and hard-coded in `src/app/page.tsx`. Quoted verbatim:

| Key                    | Copy                                                                                                            | Source                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Wordmark               | `Wedboard`                                                                                                      | `src/components/app/logo.tsx:15` |
| Header CTA (secondary) | `Sign in`                                                                                                       | `src/app/page.tsx:16`            |
| Header CTA (primary)   | `Get started`                                                                                                   | `src/app/page.tsx:19`            |
| Hero headline          | `Your wedding, beautifully managed`                                                                             | `src/app/page.tsx:28-31`         |
| Hero sub-headline      | `Manage RSVPs, seating arrangements, menus, and more — all in one elegant platform built for your perfect day.` | `src/app/page.tsx:32-35`         |
| Hero CTA (primary)     | `Get started`                                                                                                   | `src/app/page.tsx:38`            |
| Hero CTA (secondary)   | `Sign in`                                                                                                       | `src/app/page.tsx:41`            |
| Feature 1 title        | `Guest Management`                                                                                              | `src/app/page.tsx:55`            |
| Feature 1 body         | `Easily manage your guest list, track dietary requirements, and keep all guest details organized in one place.` | `src/app/page.tsx:59-62`         |
| Feature 2 title        | `RSVP Tracking`                                                                                                 | `src/app/page.tsx:72`            |
| Feature 2 body         | `Send digital invitations and track responses in real time. Know exactly who is coming at a glance.`            | `src/app/page.tsx:76-79`         |
| Feature 3 title        | `Table Seating`                                                                                                 | `src/app/page.tsx:89`            |
| Feature 3 body         | `Drag-and-drop seating charts to arrange tables and seats. Ensure every guest is perfectly placed.`             | `src/app/page.tsx:93-96`         |
| Footer                 | `© {year} Wedboard. All rights reserved.`                                                                       | `src/app/page.tsx:107-109`       |

The headline is split across two elements so that "beautifully managed" renders in rose; the
rendered sentence is `Your wedding, beautifully managed`.

### Value proposition, as stated

The page makes one claim and supports it with three: Wedboard is _"one elegant platform"_ for
a wedding's operational work — guests, RSVPs, seating, menus. It positions on **consolidation**
("all in one") and **aesthetics** ("elegant", "beautifully"), not on price, scale or
collaboration. Notably absent from the pitch, though built in the product: the public
invitation page builder (EP-08), custom domains (EP-10), collaborator sharing (EP-03), the
media library (EP-09) and special invitations (EP-06). Tracked as TODO-16-05.

## 8. Data Model

None. No table is read or written. The page is a static server component and issues no Convex
query, so no index, cascade or lifecycle behavior applies.

The only dynamic value on the page is the footer year, derived at render time from
`new Date().getFullYear()` (`src/app/page.tsx:108`).

## 9. Backend Contract

| Function | Type | Args | Returns | Guard | Caps |
| -------- | ---- | ---- | ------- | ----- | ---- |
| —        | —    | —    | —       | —     | —    |

**None.** The marketing site calls no Convex function. Authentication is delegated entirely to
Clerk's hosted `/sign-in` and `/sign-up` components (EP-01); this page only links to them.

## 10. Business Rules

- **BR-16-F01-01** `[AS-BUILT]` — `/` is a public route and renders without an authenticated
  session (`src/middleware.ts:5`).
- **BR-16-F01-02** `[AS-BUILT]` — An unauthenticated request to any non-public route is
  redirected to `/`, not to `/sign-in` (`src/middleware.ts:44-49`).
- **BR-16-F01-03** `[AS-BUILT]` — The landing page renders identically regardless of session
  state; it reads no auth context (`src/app/page.tsx:7-113`).
- **BR-16-F01-04** `[AS-BUILT]` — Both "Get started" controls link to `/sign-up`
  (`src/app/page.tsx:19, 38`).
- **BR-16-F01-05** `[AS-BUILT]` — Both "Sign in" controls link to `/sign-in`
  (`src/app/page.tsx:16, 41`).
- **BR-16-F01-06** `[AS-BUILT]` — The page issues no network request of its own: it calls no
  Convex function and imports no data client (`src/app/page.tsx:1-5`).
- **BR-16-F01-07** `[AS-BUILT]` — The header is sticky and translucent, remaining visible
  while the page scrolls (`src/app/page.tsx:11`).
- **BR-16-F01-08** `[AS-BUILT]` — Exactly three feature cards are rendered: Guest Management,
  RSVP Tracking and Table Seating (`src/app/page.tsx:49-98`).
- **BR-16-F01-09** `[AS-BUILT]` — The footer copyright year is the current year at render time
  (`src/app/page.tsx:108`).
- **BR-16-F01-10** `[AS-BUILT]` — The wordmark is text, not an image: `Logo` renders a `<span>`
  containing "Wedboard" (`src/components/app/logo.tsx:9-16`).
- **BR-16-F01-11** `[AS-BUILT]` — The landing page contains no link to `/pricing`; the only
  occurrence of that path in `src/` is the middleware matcher (`src/middleware.ts:6`).
- **BR-16-F01-12** `[AS-BUILT]` — A request on a non-primary host never reaches this page: the
  middleware rewrites it to `/_domain/{host}{path}` before any route matching
  (`src/middleware.ts:30-37`).

## 11. Acceptance Criteria

- **AC-16-F01-01** — **Given** a browser with no session **When** `/` is requested **Then**
  the page renders with HTTP 200 and no redirect to Clerk. _(BR-16-F01-01)_
- **AC-16-F01-02** — **Given** a browser with no session **When** `/dashboard` is requested
  **Then** the browser is redirected to `/`. _(BR-16-F01-02)_
- **AC-16-F01-03** — **Given** an authenticated session **When** `/` is requested **Then** the
  rendered HTML is byte-identical to the anonymous render apart from the footer year.
  _(BR-16-F01-03)_
- **AC-16-F01-04** — **Given** the landing page **When** either "Get started" is clicked
  **Then** the browser navigates to `/sign-up`. _(BR-16-F01-04)_
- **AC-16-F01-05** — **Given** the landing page **When** either "Sign in" is clicked **Then**
  the browser navigates to `/sign-in`. _(BR-16-F01-05)_
- **AC-16-F01-06** — **Given** the landing page **When** network activity is recorded on load
  **Then** no request to the Convex deployment is made. _(BR-16-F01-06)_
- **AC-16-F01-07** — **Given** the landing page scrolled to the footer **When** the viewport is
  inspected **Then** the header with the wordmark and both buttons is still visible.
  _(BR-16-F01-07)_
- **AC-16-F01-08** — **Given** the landing page **When** feature cards are counted **Then**
  there are exactly three, titled "Guest Management", "RSVP Tracking" and "Table Seating".
  _(BR-16-F01-08)_
- **AC-16-F01-09** — **Given** the current year is 2026 **When** the footer renders **Then** it
  reads "© 2026 Wedboard. All rights reserved." _(BR-16-F01-09)_
- **AC-16-F01-10** — **Given** the rendered page **When** the wordmark node is inspected
  **Then** it is a text element containing "Wedboard" and not an `<img>` or `<svg>`.
  _(BR-16-F01-10)_
- **AC-16-F01-11** — **Given** the landing page **When** all anchors are enumerated **Then**
  none targets `/pricing`. _(BR-16-F01-11)_
- **AC-16-F01-12** — **Given** a request with `Host: someone-wedding.com` and a matching
  `events.customDomain` **When** `/` is requested **Then** the event landing page renders, not
  the marketing page. _(BR-16-F01-12)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                        |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------- |
| TC-16-F01-01 | unit        | `Logo` renders the text "Wedboard" and merges an incoming `className`                           |
| TC-16-F01-02 | unit        | `isPublicRoute` matches `/` and `/pricing` and does not match `/dashboard`                      |
| TC-16-F01-03 | integration | An unauthenticated request to `/dashboard/x` returns a redirect to `/`                          |
| TC-16-F01-04 | integration | A request with a non-primary `Host` is rewritten to `/_domain/...` and never renders `HomePage` |
| TC-16-F01-05 | e2e         | Anonymous visitor loads `/`, clicks "Get started", lands on the Clerk sign-up form              |
| TC-16-F01-06 | e2e         | Anonymous visitor loads `/`, clicks "Sign in", completes sign-in, lands on `/dashboard`         |
| TC-16-F01-07 | e2e         | The page renders single-column at 375px with no horizontal scroll                               |

### Manual QA checklist

- [ ] Headline reads "Your wedding, beautifully managed" with the second phrase in rose.
- [ ] All four calls to action are reachable by keyboard tab order and show a focus ring.
- [ ] The sticky header does not overlap the hero headline on a short viewport.
- [ ] Feature cards stack to one column below the `sm` breakpoint.
- [ ] Footer year matches the current year.
- [ ] Signing out from the dashboard returns to a working landing page.
- [ ] No console error or failed network request on load.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None — static content                                                                                                                                                                                                                                                                                                               |
| Performance      | Server-rendered with zero data fetching and zero client components; the only JavaScript is Next.js navigation. No image is loaded (the wordmark is text and the icons are inline SVG from `lucide-react`)                                                                                                                           |
| Security & authz | Public by design (`src/middleware.ts:5`). The page exposes no user data, accepts no input and calls no backend, so it carries no authz surface. It is also the redirect target for failed auth, meaning a signed-out user never sees an error page                                                                                  |
| Accessibility    | Semantic `header` / `main` / `section` / `footer` landmarks and a single `h1`. Feature-card icons are decorative with no `aria-hidden` or label. The wordmark is text, so it is readable by a screen reader without alt text. Colour contrast of `text-zinc-500` body copy on white should be verified against WCAG AA (TODO-16-06) |
| i18n             | English only, hard-coded in the component. This is notable because the product's guest-facing invitation templates are Spanish (`ELEGANT_COPY`), so the marketing site and the product's own output are in different languages (TODO-16-04)                                                                                         |
| Analytics        | None. No analytics script, tag manager, conversion pixel or event is present anywhere in `src/app/page.tsx` or the root layout — so sign-up conversion from this page is unmeasurable (TODO-16-01)                                                                                                                                  |
| SEO              | No `metadata` export on `src/app/page.tsx`: the page inherits whatever the root layout defines and has no page-specific title, description, canonical URL, OpenGraph card or structured data — despite the product implementing a full metadata pipeline for its _public invitations_ (EP-10). Tracked as TODO-16-03                |

## 14. TODOs & Open Questions

- **DEF-16-01** `[P1]` — The landing page advertises drag-and-drop seating that does not exist.
  - **Evidence:** `src/app/page.tsx:93-96` reads "Drag-and-drop seating charts to arrange
    tables and seats." The seating feature is a select-based grid explicitly described as
    drag-free (EP-12-F02; `src/components/tables/seat-select.tsx` is a dropdown, and no
    drag-and-drop library is imported anywhere in `src/`).
  - **Impact:** A visitor signs up expecting an interaction the product does not offer. This is
    a false capability claim on the acquisition page.
  - **Proposed fix:** Restate the card as the assignment grid the product actually ships, or
    build drag-and-drop seating.
- **DEF-16-02** `[P1]` — The landing page advertises sending invitations, which the product
  cannot do.
  - **Evidence:** `src/app/page.tsx:76-79` reads "Send digital invitations and track responses
    in real time." No send path exists: there is no email or SMS provider, no delivery
    function in `convex/`, and `invitations.setInvitationSent` only toggles an informational
    `isSent` boolean the host ticks by hand. Distribution is copy-the-link
    (`src/components/invitations/copy-invitation-link-button.tsx`).
  - **Impact:** The single most load-bearing verb in the pitch describes a capability the host
    must perform themselves via WhatsApp or email. Compounds with EP-13's finding that the
    product sends no email at all.
  - **Proposed fix:** Restate as "Share digital invitations" / "Create a link for every
    household", or implement sending.
- **TODO-16-01** `[P1]` `[ADD]` — No analytics or conversion tracking.
  - **Rationale:** The landing page is the only acquisition surface and its performance is
    entirely unmeasured — no page views, no click-through on the four CTAs, no sign-up
    attribution. Any decision about the copy in §7 would be made blind.
  - **Proposed rule:** Emit a page-view event on `/` and a click event per CTA, and attribute
    completed sign-ups back to the entry point.
- **TODO-16-02** `[P2]` `[CHANGE]` — The page is not session-aware.
  - **Rationale:** A signed-in user sees "Sign in" and "Get started" and no route into their
    dashboard (BR-16-F01-03), which is the most common return path for an existing customer.
  - **Proposed rule:** When a Clerk session exists, the header shows a single "Go to dashboard"
    control.
- **TODO-16-03** `[P1]` `[ADD]` — No page metadata or SEO.
  - **Rationale:** `src/app/page.tsx` exports no `metadata`, so the product's own front page
    has no controlled title, description, OpenGraph image or canonical URL — while the app
    implements exactly that pipeline for guest invitations (`convex/meta.ts`,
    `src/lib/invitation-metadata.ts`). Organic discovery and link previews both suffer.
  - **Proposed rule:** Export `metadata` from the landing page with a title, description,
    canonical URL and social card.
- **TODO-16-04** `[P2]` `[CHANGE]` — Language mismatch between marketing and product output.
  - **Rationale:** The marketing site and dashboard are English; the shipped invitation
    template's copy is Spanish (`.../elegant/default-copy.ts`). A Spanish-speaking couple —
    the apparent target market — is greeted in English.
  - **Proposed rule:** Decide the primary market and localize the landing page accordingly, or
    add language switching.
- **TODO-16-05** `[P2]` `[ADD]` — The pitch omits most of the product.
  - **Rationale:** Three cards cover guests, RSVPs and seating. Not mentioned: the invitation
    page builder (EP-08), custom domains (EP-10), collaborator sharing (EP-03), special
    invitations (EP-06), the media library (EP-09) and the host inbox (EP-13). The invitation
    builder in particular is the product's most differentiated capability and appears nowhere
    on the page.
  - **Proposed rule:** The feature section covers the differentiators, not only table stakes.
- **TODO-16-06** `[P2]` `[ADD]` — Accessibility has not been verified.
  - **Rationale:** Decorative icons carry no `aria-hidden`, and `text-zinc-500` body copy on
    white is close to the WCAG AA threshold at the sizes used (`src/app/page.tsx:32, 59`).
    No audit exists.
  - **Proposed rule:** The landing page passes an automated axe audit with no serious
    violations.
- **TODO-16-07** `[P2]` `[ADD]` — No legal, contact or about content.
  - **Rationale:** The footer carries only a wordmark and a copyright line
    (`src/app/page.tsx:104-111`). There is no terms of service, privacy policy, support address
    or company information — all of which become mandatory the moment EP-16-F02 takes payment.
  - **Proposed rule:** Ship terms, privacy and contact pages, linked from the footer, before
    billing goes live.
- **TODO-16-08** `[P2]` `[CHANGE]` — The landing page sits outside the `(marketing)` route
  group.
  - **Rationale:** `src/app/page.tsx` is at the app root while `(marketing)/` contains only
    `pricing/`, and the group has no `layout.tsx`. The two public pages consequently share no
    header, footer or navigation, so a visitor who reaches `/pricing` has no way back.
  - **Proposed rule:** Move the landing page into `(marketing)` and give the group a shared
    layout carrying the header and footer.
- **TODO-16-09** `[P2]` `[ADD]` — Nothing captures a visitor who is not ready to sign up.
  - **Rationale:** Every call to action leads to account creation; there is no demo, no
    screenshot, no sample invitation link and no email capture. The product _has_ a public
    demo asset it could show — a seeded demo event's invitation page — but never links one.
  - **Proposed rule:** Offer a live sample invitation and a product screenshot above the fold.

### Open questions

- **Q1** — Should the landing page be Spanish-first, English-first, or bilingual? The product's
  guest-facing output is Spanish while its marketing is English (TODO-16-04).
- **Q2** — Should `/` redirect a signed-in user straight to `/dashboard`, or keep serving the
  marketing page (TODO-16-02)?
- **Q3** — Should the middleware bounce unauthenticated users to `/sign-in` instead of `/`?
  Today the landing page doubles as the auth-failure page with no explanation (A2).
- **Q4** — Who is the buyer being addressed — the couple, or a professional wedding planner
  managing several events? The copy speaks only to the couple ("your perfect day"), while the
  role model, event switcher and sharing features are built for planners.

## 15. Traceability

| Concern                                    | Source                             |
| ------------------------------------------ | ---------------------------------- |
| Route                                      | `src/app/page.tsx:7`               |
| Header + CTAs                              | `src/app/page.tsx:11-23`           |
| Hero                                       | `src/app/page.tsx:27-44`           |
| Feature cards                              | `src/app/page.tsx:47-100`          |
| Footer                                     | `src/app/page.tsx:104-111`         |
| Wordmark                                   | `src/components/app/logo.tsx:7-17` |
| Public route matcher                       | `src/middleware.ts:4-12`           |
| Unauthenticated redirect to `/`            | `src/middleware.ts:44-49`          |
| Custom-domain rewrite (bypasses this page) | `src/middleware.ts:30-37`          |
| Middleware matcher config                  | `src/middleware.ts:52-57`          |

## 16. Changelog

| Version | Date       | Author        | Change                                                                                               |
| ------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| 1.0.1   | 2026-07-28 | Spec suite v1 | Status corrected to `defective` per authoring-guide §3 (spec carries a behaviour-breaking P1 defect) |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification                                                                       |
