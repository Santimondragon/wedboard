---
id: EP-01
title: Account & Access
version: 1.0.0
status: partial
last_updated: 2026-07-27
---

# EP-01 — Account & Access

Everything that happens **before** a user reaches an event board: creating an account,
signing in and out, mirroring the Clerk identity into Convex, and keeping unauthenticated
traffic out of the dashboard.

---

## 1. Purpose

Wedboard delegates all credential handling to **Clerk**. This epic owns the seam between
Clerk and the product: the hosted sign-in/sign-up screens, the post-authentication landing
rules, the `users` row that every Convex guard resolves against, and the middleware +
client gate that together decide who may load a dashboard route.

No password, session or email-verification logic is implemented in Wedboard itself. What
_is_ implemented, and what this epic specifies, is: **where a user lands**, **what identity
record is written**, **which routes are reachable**, and **how the global `superadmin` role
is granted**.

---

## 2. Actors

| Actor                 | Involvement                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous visitor** | Reaches `/`, `/pricing`, `/sign-in`, `/sign-up` and any public invitation URL. Redirected to `/` from every protected route |
| **User**              | A Clerk account mirrored into `users`. Lands on `/dashboard` after authenticating                                           |
| **Superadmin**        | A `User` whose email is listed in the `SUPERADMIN_EMAILS` Convex env var. Client-redirected from `/dashboard` to `/admin`   |
| **Public guest**      | Never authenticates; reaches invitation pages through routes this epic exempts from Clerk                                   |

Per-event roles (`owner` · `planner` · `editor` · `viewer`) are **out of scope** here — they
are granted per event in [EP-03](../03-collaboration-and-permissions/) and defined in
[roles-and-permissions.md](../../roles-and-permissions.md). This epic only establishes _that
a user exists_, not what they may do inside an event.

---

## 3. Features

| ID                                         | Feature            | Status        | Summary                                                                                                                                                                              |
| ------------------------------------------ | ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [EP-01-F01](./F01-sign-up.md)              | Sign Up            | `partial`     | Account creation via the Clerk hosted `<SignUp />` component; first-login `users` row creation; no onboarding after landing                                                          |
| [EP-01-F02](./F02-sign-in-and-sign-out.md) | Sign In & Sign Out | `implemented` | Returning-user sign in, `UserButton` sign-out, post-auth landing on `/dashboard` except superadmins who are client-redirected to `/admin`                                            |
| [EP-01-F03](./F03-identity-sync.md)        | Identity Sync      | `defective`   | Clerk ↔ Convex identity mirroring via `upsertCurrentUser`; `tokenIdentifier` as canonical key; promote-only superadmin grant. Carries a P0 data-exposure defect                      |
| [EP-01-F04](./F04-route-protection.md)     | Route Protection   | `implemented` | Middleware public-route matchers, custom-domain host rewrite ahead of Clerk, unauthenticated redirect to `/`, and the `AuthLoading`/`Authenticated`/`Unauthenticated` dashboard gate |

Epic status is `partial`: the authentication path works end to end, but there is no
onboarding, no in-product profile or account management, and no reconciliation when a Clerk
account is deleted.

---

## 4. Workflows

| ID           | Workflow                                | Feature   | Entry                                | Actor             |
| ------------ | --------------------------------------- | --------- | ------------------------------------ | ----------------- |
| **WF-01-01** | Create account and reach dashboard      | EP-01-F01 | `/sign-up`                           | Anonymous visitor |
| **WF-01-02** | Sign in as a returning user             | EP-01-F02 | `/sign-in`                           | User              |
| **WF-01-03** | Sign out from the dashboard             | EP-01-F02 | `UserButton` in any dashboard chrome | User              |
| **WF-01-04** | Reach a protected route unauthenticated | EP-01-F04 | Any `/dashboard/**` URL              | Anonymous visitor |

EP-01-F03 (Identity Sync) has **no user-facing workflow** — it runs invisibly on every
authenticated dashboard mount.

---

## 5. Routes owned

| Route                            | Kind          | Notes                                                                                                            |
| -------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/sign-in/[[...sign-in]]`        | public        | Clerk `<SignIn />`, `fallbackRedirectUrl="/dashboard"`                                                           |
| `/sign-up/[[...sign-up]]`        | public        | Clerk `<SignUp />`, `fallbackRedirectUrl="/dashboard"`                                                           |
| `/dashboard`                     | protected     | Landing target after auth; owned jointly with [EP-02](../02-event-setup/) which specifies the events list itself |
| `src/middleware.ts`              | cross-cutting | Public-route matcher, custom-domain rewrite, unauthenticated redirect                                            |
| `src/app/(dashboard)/layout.tsx` | cross-cutting | Convex auth gate wrapping every dashboard subtree                                                                |

---

## 6. Dependencies

### Depends on

| Dependency                            | Why                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Clerk** (`@clerk/nextjs` v7)        | The identity provider. Every credential, session and verification flow is Clerk's                       |
| **Clerk native Convex integration**   | The session token itself carries `aud: "convex"`; there is no `convex` JWT template. See `BR-01-F03-08` |
| `CLERK_FRONTEND_API_URL` (Convex env) | `convex/auth.config.ts` validates incoming JWTs against it                                              |
| `SUPERADMIN_EMAILS` (Convex env)      | Drives the promote-only superadmin grant                                                                |
| `NEXT_PUBLIC_PRIMARY_DOMAIN`          | Distinguishes the app host from customer custom domains in middleware                                   |

### Depended on by

| Consumer                                                          | Why                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [EP-02](../02-event-setup/) — Event Setup                         | `createEvent` needs a `users` row to own the event                                                        |
| [EP-03](../03-collaboration-and-permissions/) — Collaboration     | Every event guard starts at `requireUser(ctx)`; `members.addMember` resolves invitees by `users.by_email` |
| [EP-15](../15-platform-administration/) — Platform Administration | `/admin` and `requireSuperadmin` consume the `users.role` this epic writes                                |
| [EP-16](../16-marketing-and-monetization/) — Marketing            | The landing page links to `/sign-in` and `/sign-up`                                                       |
| [EP-07](../07-guest-experience/) — Guest Experience               | Depends on this epic _exempting_ public invitation routes from Clerk                                      |

---

## 7. Open items rolled up

| ID         | Pri | Kind   | Summary                                                                                                                               | Spec |
| ---------- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| DEF-01-01  | P0  | defect | `convex/_debug.ts` exposes every user's email and role through an unauthenticated public query                                        | F03  |
| DEF-01-02  | P2  | defect | `firstName` is stored as an empty string when the Clerk identity carries no name                                                      | F03  |
| DEF-01-03  | P2  | defect | `email` is stored as an empty string when the Clerk identity carries no email                                                         | F03  |
| TODO-01-01 | P1  | ADD    | No onboarding after first sign-up — the new user lands on an empty events list                                                        | F01  |
| TODO-01-02 | P2  | ADD    | No product-side handling of unverified emails                                                                                         | F01  |
| TODO-01-03 | P2  | ADD    | No session-revocation or active-session story inside Wedboard                                                                         | F02  |
| TODO-01-04 | P2  | CHANGE | Superadmin redirect is client-side; `/dashboard` still issues `listMyEvents` for superadmins                                          | F02  |
| TODO-01-05 | P1  | ADD    | Superadmin grant is promote-only — removing an email from `SUPERADMIN_EMAILS` never revokes the role                                  | F03  |
| TODO-01-06 | P1  | ADD    | No account deletion and no reconciliation when a Clerk account is deleted                                                             | F03  |
| TODO-01-07 | P2  | ADD    | No profile editing in Wedboard; names are derived by a naive space split of `identity.name`                                           | F03  |
| TODO-01-08 | P2  | CHANGE | Unauthenticated users are redirected to `/` with no return destination preserved                                                      | F04  |
| TODO-01-09 | P2  | CHANGE | `"/api/(.*)"` is wholesale public in the middleware matcher; each handler must self-guard                                             | F04  |
| TODO-01-10 | P2  | CHANGE | `/admin` has no middleware rule and no server-component guard; the only routing-layer protection is a client `useEffect` that calls … | F04  |
| TODO-01-11 | P1  | CHANGE | There is no per-event authorization at the routing layer, and the resulting failure is unstyled. A signed-in non-member who opens …   | F04  |

---

## 8. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built epic overview |
