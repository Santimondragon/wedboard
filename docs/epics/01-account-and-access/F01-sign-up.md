---
id: EP-01-F01
title: Sign Up
epic: EP-01 Account & Access
version: 1.0.0
status: partial
last_updated: 2026-07-27
depends_on: [EP-01-F03, EP-01-F04]
---

# EP-01-F01 — Sign Up

## 1. Summary

An anonymous visitor creates a Wedboard account. Wedboard does not implement account
creation itself — it renders Clerk's hosted `<SignUp />` component on a catch-all route and
lets Clerk own every credential, verification and social-provider concern. Wedboard's own
contribution is narrow and entirely about what happens _after_ Clerk succeeds: the visitor
is returned to `/dashboard`, the dashboard layout mounts `UserSync`, and the first
`upsertCurrentUser` call materializes the `users` row that every later permission check
resolves against. The new user arrives at an empty events list with a single call to
action.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                       |
| -------------------- | ------ | --------------------------------------------------------------------------- |
| Anonymous visitor    | Full   | The only actor who performs this workflow. `/sign-up(.*)` is a public route |
| Owner                | n/a    | Event roles do not exist yet at sign-up time                                |
| Co-owner (`planner`) | n/a    | —                                                                           |
| Editor               | n/a    | —                                                                           |
| Viewer               | n/a    | —                                                                           |
| Public guest         | —      | Never signs up; reaches invitations without an account                      |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). This feature applies no event
gate at all: the only Convex function it reaches is `users.upsertCurrentUser`, which
requires nothing beyond a valid Clerk identity (`convex/users.ts:37`).

## 3. User Stories

- **US-01-F01-01** — As an anonymous visitor, I want to create an account from the marketing
  page so that I can start managing an event.
- **US-01-F01-02** — As a new user, I want to be taken straight into the product after
  signing up so that I do not have to find my way back.
- **US-01-F01-03** — As a new user, I want my identity to exist in Wedboard the moment I
  arrive so that I can immediately create an event that I own.
- **US-01-F01-04** — As a new user with no events, I want a clear first action so that I know
  what to do next.

## 4. Entry Points

| Entry point                                      | Route / control                                                                  | Actor             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------- |
| Marketing header "Get started" button            | `/sign-up`                                                                       | Anonymous visitor |
| Marketing hero "Get started" button              | `/sign-up`                                                                       | Anonymous visitor |
| Direct URL                                       | `/sign-up` (catch-all `[[...sign-up]]`, so Clerk's multi-step sub-paths resolve) | Anonymous visitor |
| Clerk's own "Sign up" link on the sign-in screen | `/sign-up` via `signUpUrl` on `ClerkProvider`                                    | Anonymous visitor |

The catch-all segment matters: Clerk drives its own sub-routes (verification steps, SSO
callbacks) beneath `/sign-up`, and the middleware matcher `"/sign-up(.*)"` keeps all of them
public.

## 5. UX Flow

### Happy path

1. Anonymous visitor clicks "Get started" on `/` → navigates to `/sign-up`
   (`src/app/page.tsx:19`).
2. `SignUpPage` renders Clerk's `<SignUp fallbackRedirectUrl="/dashboard" />` centered on a
   `bg-zinc-50` full-height screen (`src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:6`).
3. The visitor completes Clerk's flow. Every step — email/password, email-code verification,
   social provider, bot protection — is rendered and handled by Clerk.
4. On success Clerk redirects to `/dashboard` (the component-level `fallbackRedirectUrl`;
   `ClerkProvider` sets the same value globally via `signUpFallbackRedirectUrl`,
   `src/components/providers/root-providers.tsx:13`).
5. Middleware sees a `userId` and lets `/dashboard` through (`src/middleware.ts:44`).
6. `DashboardLayout` renders `<AuthLoading>` until the Convex client holds a token, then
   `<Authenticated>` (`src/app/(dashboard)/layout.tsx:17`).
7. `UserSync` fires `api.users.upsertCurrentUser` once on mount
   (`src/components/dashboard/user-sync.tsx:10`), which inserts the `users` row —
   see [EP-01-F03](./F03-identity-sync.md).
8. `DashboardPage` queries `api.users.getCurrentUser` and `api.events.listMyEvents`
   (`src/app/(dashboard)/dashboard/page.tsx:20`). With no events, it renders the
   `EmptyState` "Welcome to Wedboard" and a "Create Event" action.
9. The new user clicks "Create Event" → `CreateEventDialog` opens
   (`src/app/(dashboard)/dashboard/page.tsx:120`), handing off to
   [EP-02](../02-event-setup/).

### Alternate & edge paths

- **A1** — The visitor's email is already a Clerk account → Clerk's own component reports it
  and offers sign-in. Wedboard renders nothing extra.
- **A2** — The new account's email appears in `SUPERADMIN_EMAILS` → the very first
  `upsertCurrentUser` inserts the row with `role: "superadmin"` (`convex/users.ts:74`), and
  `/dashboard` client-redirects to `/admin` ([EP-15](../15-platform-administration/)) instead
  of showing the empty state.
- **A3** — Clerk redirects to `/dashboard` before the Convex client has a token → the layout
  shows `LoadingState` "Loading…" rather than firing queries that would throw `Unauthorized`
  (`src/app/(dashboard)/layout.tsx:17`). See [EP-01-F04](./F04-route-protection.md).
- **E1** — The visitor abandons the flow and navigates to `/dashboard` directly → middleware
  finds no `userId` and redirects to `/` (`src/middleware.ts:47`).
- **E2** — `upsertCurrentUser` rejects because no identity is attached → it throws
  `ConvexError("Unauthorized")` (`convex/users.ts:39`). `UserSync` does not catch it; the
  promise rejects unhandled and nothing is rendered differently. The user sees an events
  list that will fail on `listMyEvents` with the same error.
- **E3** — Clerk is misconfigured (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` absent) → `ClerkProvider`
  throws at the root and no page renders (`src/components/providers/root-providers.tsx:11`).

## 6. States

| State             | Behavior                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | Clerk's component owns its own pending states. After redirect, `AuthLoading` shows `LoadingState` "Loading…"; then `LoadingState` "Loading your events…" while `listMyEvents` resolves (`src/app/(dashboard)/dashboard/page.tsx:51`) |
| Empty             | The first-run state: `EmptyState` with `PlusCircle` icon, title "Welcome to Wedboard", description "Create your first event to start managing invitations, RSVPs, menus, and seating.", action "Create Event"                        |
| Error             | No Wedboard-side error surface. Clerk renders validation and verification errors inside its own component; post-redirect Convex errors are unhandled                                                                                 |
| Success           | `/dashboard` renders the minimal top bar (`Logo` + `UserButton`) over the empty state                                                                                                                                                |
| Disabled / locked | None. Sign-up is never gated, throttled or invite-only                                                                                                                                                                               |
| Mobile            | Clerk's component is responsive; the wrapper is a full-height centered flex container. The dashboard empty state centers in a `min-h-[60vh]` block                                                                                   |

## 7. UI Specification

### Screens & components

| Element                            | Component           | Path                                               |
| ---------------------------------- | ------------------- | -------------------------------------------------- |
| Sign-up screen                     | `SignUpPage`        | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:3` |
| Sign-up form                       | Clerk `<SignUp />`  | `@clerk/nextjs` — not authored in this repo        |
| Provider configuring redirect URLs | `RootProviders`     | `src/components/providers/root-providers.tsx:8`    |
| Post-auth gate                     | `DashboardLayout`   | `src/app/(dashboard)/layout.tsx:8`                 |
| Identity write on mount            | `UserSync`          | `src/components/dashboard/user-sync.tsx:7`         |
| First-run empty state              | `EmptyState`        | `src/components/app/empty-state.tsx`               |
| First event creation               | `CreateEventDialog` | `src/components/dashboard/create-event-dialog.tsx` |
| Marketing entry buttons            | `HomePage`          | `src/app/page.tsx:19`, `src/app/page.tsx:38`       |

There is **no** `(auth)` route-group layout — the sign-up screen inherits the root layout
directly (`src/app/layout.tsx:43`), so it gets the fonts and `RootProviders` but none of the
dashboard chrome.

### Fields & validation

| Field | Type | Required | Rule                                                                                                                     | Message |
| ----- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| —     | —    | —        | Every field on this screen belongs to Clerk's hosted component; Wedboard defines no fields and no Zod schema for sign-up | —       |

No entry exists in `src/lib/validations/` for account creation.

### Copy deck

This feature has **no guest-facing Spanish strings** — the account surfaces are English.

| Key                    | Copy                                                                                | Source                                      |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| Marketing CTA (header) | `Get started`                                                                       | `src/app/page.tsx:19`                       |
| Marketing CTA (hero)   | `Get started`                                                                       | `src/app/page.tsx:38`                       |
| Auth gate loading      | `Loading…`                                                                          | `src/app/(dashboard)/layout.tsx:19`         |
| Events loading         | `Loading your events…`                                                              | `src/app/(dashboard)/dashboard/page.tsx:51` |
| First-run title        | `Welcome to Wedboard`                                                               | `src/app/(dashboard)/dashboard/page.tsx:55` |
| First-run description  | `Create your first event to start managing invitations, RSVPs, menus, and seating.` | `src/app/(dashboard)/dashboard/page.tsx:56` |
| First-run action       | `Create Event`                                                                      | `src/app/(dashboard)/dashboard/page.tsx:59` |
| Root document title    | `Wedboard`                                                                          | `src/app/layout.tsx:39`                     |

## 8. Data Model

| Table   | Fields                                                                 | Read / Write                    | Index                                        |
| ------- | ---------------------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| `users` | `clerkId`, `tokenIdentifier`, `email`, `firstName`, `lastName`, `role` | Write (insert on first sign-up) | `by_tokenIdentifier` for the existence check |

The only row this feature creates is the `users` row, and it is created **lazily** — not by
Clerk, not by a webhook, but by the first `upsertCurrentUser` call from `UserSync` after the
new account first loads a dashboard route. The insert sets `role` to `"superadmin"` when the
email matches `SUPERADMIN_EMAILS`, otherwise `"user"` (`convex/users.ts:74`). No event,
membership or any other row is created at sign-up: a brand-new account owns nothing until it
completes [EP-02](../02-event-setup/) event creation.

There is no cascade and no cleanup path. Deleting the Clerk account leaves the `users` row
behind — see TODO-01-06 in [EP-01-F03](./F03-identity-sync.md).

## 9. Backend Contract

| Function                      | Type     | Args | Returns                                      | Guard                                                                                                 | Caps               |
| ----------------------------- | -------- | ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ |
| `api.users.upsertCurrentUser` | mutation | `{}` | `Id<"users">`                                | `ctx.auth.getUserIdentity()`; throws `ConvexError("Unauthorized")` when absent (`convex/users.ts:37`) | None               |
| `api.users.getCurrentUser`    | query    | `{}` | `Doc<"users"> \| null`                       | None — returns `null` for an unauthenticated caller (`convex/users.ts:21`)                            | None               |
| `api.events.listMyEvents`     | query    | `{}` | Event docs the caller owns or is a member of | `requireUser` (see [EP-02](../02-event-setup/))                                                       | Specified in EP-02 |

`upsertCurrentUser` takes **no arguments** — every field is read off the verified Clerk
identity server-side, so a client can never assert an email or a role.

## 10. Business Rules

- **BR-01-F01-01** `[AS-BUILT]` — `/sign-up` and every path beneath it are public and never
  require a session (`src/middleware.ts:8`).
- **BR-01-F01-02** `[AS-BUILT]` — The sign-up screen renders Clerk's hosted `<SignUp />`
  component; Wedboard implements no credential, verification or password logic of its own
  (`src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:6`).
- **BR-01-F01-03** `[AS-BUILT]` — On successful sign-up the user is redirected to
  `/dashboard` (`src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:6`, reinforced by
  `signUpFallbackRedirectUrl` at `src/components/providers/root-providers.tsx:13`).
- **BR-01-F01-04** `[AS-BUILT]` — The `users` row is created on the first authenticated
  dashboard mount, not during the Clerk flow (`src/components/dashboard/user-sync.tsx:10` →
  `convex/users.ts:68`).
- **BR-01-F01-05** `[AS-BUILT]` — A newly inserted user receives `role: "user"` unless their
  email is listed in `SUPERADMIN_EMAILS`, in which case `role: "superadmin"`
  (`convex/users.ts:74`).
- **BR-01-F01-06** `[AS-BUILT]` — A new account owns no events; `/dashboard` renders the
  first-run empty state until an event exists
  (`src/app/(dashboard)/dashboard/page.tsx:52`).
- **BR-01-F01-07** `[AS-BUILT]` — Sign-up is open: there is no invite code, allowlist, quota
  or approval step anywhere in the flow (`src/middleware.ts:4`,
  `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:1`).
- **BR-01-F01-08** `[AS-BUILT]` — The client never supplies profile data to Convex;
  `upsertCurrentUser` accepts `args: {}` and reads name and email from the verified identity
  (`convex/users.ts:35`).

## 11. Acceptance Criteria

- **AC-01-F01-01** — **Given** a signed-out visitor **When** they open `/sign-up` **Then**
  the Clerk sign-up form renders and no redirect to `/` occurs. _(BR-01-F01-01)_
- **AC-01-F01-02** — **Given** a visitor completing sign-up **When** Clerk reports success
  **Then** the browser lands on `/dashboard`. _(BR-01-F01-03)_
- **AC-01-F01-03** — **Given** a brand-new account **When** `/dashboard` first renders
  **Then** a `users` row exists with the Clerk identity's `tokenIdentifier`, `clerkId` and
  `email`. _(BR-01-F01-04)_
- **AC-01-F01-04** — **Given** a brand-new account whose email is not in `SUPERADMIN_EMAILS`
  **When** the `users` row is inserted **Then** `role` equals `"user"`. _(BR-01-F01-05)_
- **AC-01-F01-05** — **Given** a brand-new account whose email **is** in `SUPERADMIN_EMAILS`
  **When** the `users` row is inserted **Then** `role` equals `"superadmin"`.
  _(BR-01-F01-05)_
- **AC-01-F01-06** — **Given** a new user with zero events **When** `/dashboard` finishes
  loading **Then** the page shows "Welcome to Wedboard" and a "Create Event" button.
  _(BR-01-F01-06)_
- **AC-01-F01-07** — **Given** a client that calls `users.upsertCurrentUser` with extra
  arguments **When** the mutation runs **Then** Convex rejects the call for argument
  validation, and no client-supplied email or role can ever be persisted. _(BR-01-F01-08)_
- **AC-01-F01-08** — **Given** an unauthenticated caller **When** `users.upsertCurrentUser`
  is invoked **Then** it throws `ConvexError("Unauthorized")` and inserts nothing.
  _(BR-01-F01-04)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                    |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-01-F01-01 | unit        | `isSuperadminEmail` returns `true` for a listed email regardless of case and surrounding whitespace, `false` for `""` (`convex/users.ts:9`) |
| TC-01-F01-02 | integration | `upsertCurrentUser` with a fresh identity inserts exactly one `users` row with `role: "user"`                                               |
| TC-01-F01-03 | integration | `upsertCurrentUser` with an identity whose email is in `SUPERADMIN_EMAILS` inserts with `role: "superadmin"`                                |
| TC-01-F01-04 | integration | `upsertCurrentUser` called twice for the same identity yields exactly one row                                                               |
| TC-01-F01-05 | integration | `upsertCurrentUser` without an identity throws `ConvexError("Unauthorized")`                                                                |
| TC-01-F01-06 | e2e         | Sign up with a new email → land on `/dashboard` → see "Welcome to Wedboard"                                                                 |
| TC-01-F01-07 | e2e         | `/sign-up` loads while signed out without redirecting to `/`                                                                                |
| TC-01-F01-08 | e2e         | Sign up, then create the first event from the empty state and reach `/dashboard/{slug}`                                                     |

### Manual QA checklist

- [ ] "Get started" in both the marketing header and hero navigate to `/sign-up`
- [ ] Clerk's multi-step verification sub-paths under `/sign-up/...` are reachable while signed out
- [ ] After sign-up the dashboard shows the loading state before the events list, never an `Unauthorized` error
- [ ] The `users` row's `email` matches the Clerk primary email
- [ ] A second browser session for the same account does not create a second `users` row
- [ ] The empty state's "Create Event" button opens the create-event dialog

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. No sign-up rate limit is implemented in Wedboard; any throttling is Clerk's. `convex/seed.ts` refuses to seed once a user owns 3+ events, which is the only account-scoped quota in the product       |
| Performance      | One extra round trip after landing (`upsertCurrentUser`), fired once per mount from a `useEffect` with an empty dependency array (`src/components/dashboard/user-sync.tsx:12`)                              |
| Security & authz | All credential handling is delegated to Clerk. The mutation takes no arguments, so identity fields cannot be spoofed. Convex validates the JWT against `CLERK_FRONTEND_API_URL` (`convex/auth.config.ts:4`) |
| Accessibility    | Inherited from Clerk's component; the Wedboard wrapper adds only layout classes                                                                                                                             |
| i18n             | English only. The account surfaces carry no Spanish copy — unlike the public invitation ([EP-07](../07-guest-experience/))                                                                                  |
| Analytics        | None. No sign-up event is recorded, and `activityLogs` is event-scoped so account creation is never logged                                                                                                  |

## 14. TODOs & Open Questions

- **TODO-01-01** `[P1]` `[ADD]` — There is no onboarding after first sign-up. The new user
  lands on a bare events list with a single button and no guidance about what an event,
  invitation or event key is.
  - **Rationale:** the product's core concepts (event key, invitation vs. guest, RSVP
    variants) are non-obvious, and the first-run screen explains none of them. `seedDemoEventForCurrentUser`
    (`convex/seed.ts`) already exists and is never surfaced in the UI.
  - **Proposed rule:** a first-time user with zero events is offered a guided first-event
    flow, or a one-click demo event via `seed.seedDemoEventForCurrentUser`.
- **TODO-01-02** `[P2]` `[ADD]` — Wedboard has no product-side handling of unverified emails.
  Whatever Clerk's instance settings allow through becomes a full `users` row with unrestricted
  access.
  - **Rationale:** an unverified email can be added as an event member by another user via
    `members.addMember`'s `by_email` lookup, so email trust matters beyond sign-in.
  - **Proposed rule:** the identity sync records the verification state and privileged
    operations require a verified email.

### Open questions

- **Q1** — Should sign-up remain fully open, or is Wedboard headed for invite-only /
  waitlisted onboarding? This determines whether BR-01-F01-07 is permanent.
- **Q2** — Should the demo seed (`convex/seed.ts`) be the official first-run experience, or a
  support-only tool? It is currently a public mutation with no UI.
- **Q3** — Should the first-run empty state differ for a user who was invited to someone
  else's event (they have events but own none)?

## 15. Traceability

| Concern                       | Source                                             |
| ----------------------------- | -------------------------------------------------- |
| Route (sign-up)               | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:3` |
| Redirect target (component)   | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:6` |
| Redirect target (provider)    | `src/components/providers/root-providers.tsx:13`   |
| Clerk sign-up URL config      | `src/components/providers/root-providers.tsx:15`   |
| Public route matcher          | `src/middleware.ts:8`                              |
| Post-auth gate                | `src/app/(dashboard)/layout.tsx:17`                |
| Identity write trigger        | `src/components/dashboard/user-sync.tsx:10`        |
| Backend (insert)              | `convex/users.ts:68`                               |
| Backend (superadmin decision) | `convex/users.ts:53`, `convex/users.ts:74`         |
| Backend (auth requirement)    | `convex/users.ts:37`                               |
| Schema (`users`)              | `convex/schema.ts:16`                              |
| First-run empty state         | `src/app/(dashboard)/dashboard/page.tsx:52`        |
| First event handoff           | `src/app/(dashboard)/dashboard/page.tsx:120`       |
| Marketing entry               | `src/app/page.tsx:19`                              |
| Root layout / providers       | `src/app/layout.tsx:63`                            |
| Validation                    | None — no Zod schema exists for sign-up            |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
