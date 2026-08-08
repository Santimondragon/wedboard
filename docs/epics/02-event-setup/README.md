# EP-02 — Event Setup

The lifecycle of an **event board**: creating it, finding it again, describing it, addressing
it, retiring it, and destroying it. Everything else in Wedboard hangs off an event, so this
epic owns the record that all other epics scope themselves to.

Includes the sub-epic **[EP-02a — Custom Domain](./custom-domain/README.md)** (features
F08–F11), which lets an owner serve their invitations from their own hostname.

---

## 1. Purpose

An [Event](../../glossary.md#core-entities) is the top-level board for one wedding or
occasion. This epic covers the host-facing management of that record:

- **Bring it into existence** — create a board, or seed a fully populated demo board.
- **Reach it** — the event directory at `/dashboard`, and the sidebar switcher.
- **Describe it** — name, couple names, date, venue, map link. These fields are _derived
  data_ on the public invitation: the Design Studio (EP-08) cannot author them, it can only
  render them.
- **Address it** — the [Event Key](../../glossary.md#core-entities) (`events.slug`) that
  appears in every public URL on the primary domain, and (sub-epic) a custom domain that
  replaces it entirely.
- **Retire it** — the `draft` · `active` · `archived` status, and permanent deletion with a
  full cascade.

## 2. Actors

| Actor                            | Involvement                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| **User** (any signed-in account) | Creates events; becomes their Owner                                                |
| **Owner**                        | Everything, including archive and permanent delete                                 |
| **Co-owner** (`planner`)         | Profile, event key, status, custom domain — not delete                             |
| **Editor**                       | Reads the board; blocked from Settings with an in-page access notice               |
| **Viewer**                       | Reads the event record only (`getEventBySlug` uses `requireEventAccess`)           |
| **Public guest**                 | Never touches this epic except through the custom-domain landing page (F11)        |
| **Superadmin**                   | Bypasses every event guard; `/dashboard` client-redirects them to `/admin` (EP-15) |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. Features

| ID                                                 | Feature                    | Status      | Summary                                                                                   |
| -------------------------------------------------- | -------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| [EP-02-F01](./F01-create-event.md)                 | Create Event               | implemented | `createEvent` — name-derived unique slug, owner membership row, navigate to the new board |
| [EP-02-F02](./F02-event-directory-and-switcher.md) | Event Directory & Switcher | implemented | `/dashboard` list of owned + shared events; sidebar event switcher                        |
| [EP-02-F03](./F03-event-profile-settings.md)       | Event Profile Settings     | partial     | `updateEvent` — name, couple names, date, venue, map link; planner+ gate                  |
| [EP-02-F04](./F04-event-key.md)                    | Event Key                  | partial     | Editing `events.slug`: format, reserved words, global uniqueness, broken links            |
| [EP-02-F05](./F05-event-status-lifecycle.md)       | Event Status Lifecycle     | defective   | `draft` · `active` · `archived`; archived events stop resolving publicly                  |
| [EP-02-F06](./F06-delete-event.md)                 | Delete Event               | defective   | Owner-only permanent cascade delete, incl. media storage blobs                            |
| [EP-02-F07](./F07-demo-event-seeding.md)           | Demo Event Seeding         | defective   | `seedDemoEventForCurrentUser` — a full sample board, 3-event spam guard                   |

### Sub-epic — [EP-02a Custom Domain](./custom-domain/README.md)

| ID                                                    | Feature           | Status      | Summary                                                                                     |
| ----------------------------------------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------- |
| [EP-02-F08](./custom-domain/F08-connect-domain.md)    | Connect Domain    | defective   | `POST /api/domains` — Convex claim first, then Vercel attach, rollback on failure           |
| [EP-02-F09](./custom-domain/F09-dns-verification.md)  | DNS Verification  | implemented | `GET /api/domains/status` — verify attempt, DNS record table, cached `customDomainVerified` |
| [EP-02-F10](./custom-domain/F10-remove-domain.md)     | Remove Domain     | implemented | `DELETE /api/domains` — Vercel detach (404 tolerated), then clear Convex                    |
| [EP-02-F11](./custom-domain/F11-countdown-landing.md) | Countdown Landing | implemented | The custom domain's root page and its catch-all not-found                                   |

## 4. Workflows

| ID       | Workflow                         | Spec                                            |
| -------- | -------------------------------- | ----------------------------------------------- |
| WF-02-01 | Create a new event board         | [F01](./F01-create-event.md)                    |
| WF-02-02 | Switch between event boards      | [F02](./F02-event-directory-and-switcher.md)    |
| WF-02-03 | Edit event profile details       | [F03](./F03-event-profile-settings.md)          |
| WF-02-04 | Change the event key             | [F04](./F04-event-key.md)                       |
| WF-02-05 | Archive or reactivate an event   | [F05](./F05-event-status-lifecycle.md)          |
| WF-02-06 | Permanently delete an event      | [F06](./F06-delete-event.md)                    |
| WF-02-07 | Seed a demo event board          | [F07](./F07-demo-event-seeding.md)              |
| WF-02-08 | Connect a custom domain          | [F08](./custom-domain/F08-connect-domain.md)    |
| WF-02-09 | Verify custom domain DNS records | [F09](./custom-domain/F09-dns-verification.md)  |
| WF-02-10 | Remove a connected custom domain | [F10](./custom-domain/F10-remove-domain.md)     |
| WF-02-11 | Visit the custom domain landing  | [F11](./custom-domain/F11-countdown-landing.md) |

## 5. Why Custom Domain is a sub-epic

Custom Domain is scoped as EP-02a rather than as four ordinary EP-02 features because it
differs from the rest of Event Setup on three axes:

1. **Its own lifecycle.** Every other field on `events` is a single-write value. A custom
   domain moves through a state machine — _none → claimed (waiting for DNS) → live → removed_
   — whose transitions are driven partly by DNS propagation the product does not control.
   `events.customDomain` and `events.customDomainVerified` exist only to persist that machine.
2. **An external system of record.** Convex holds the _claim_; Vercel holds the _attachment_
   and the verification truth. The two must be kept consistent, which is why the writes are
   orchestrated by Next.js route handlers (`src/app/api/domains/*`) rather than by Convex
   mutations alone, and why `setCustomDomain` is documented as a Convex-only claim that
   `POST /api/domains` rolls back when the Vercel attach fails
   (`src/app/api/domains/route.ts:85`). It also introduces server env vars
   (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`) that no other feature needs.
3. **Its own public routing surface.** A connected domain adds a second, event-key-free way
   to address the public invitation. Middleware rewrites every non-primary host to
   `/_domain/{host}{path}` before any Clerk logic (`src/middleware.ts:30`), and the domain
   root gains a page — the countdown landing — that has no equivalent on the primary domain.

## 6. Dependencies

| Depends on                            | Why                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **EP-01 Account & Access**            | `requireUser` resolves the Clerk identity to a `users` row before any event write                                                             |
| **EP-03 Collaboration & Permissions** | The owner's `eventMembers` row created by `createEvent` is the seed of the membership model; every guard in this epic is `requireEventMember` |

| Depended on by                                                                                                                                                                                                              | Why                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **EP-04 Guests**, **EP-05 Invitations**, **EP-06 Special Invitations**, **EP-08 Design Studio**, **EP-09 Media**, **EP-10 Meta & Sharing**, **EP-11 Catering**, **EP-12 Seating**, **EP-13 Host Inbox**, **EP-14 Insights** | All are `eventId`-scoped and are removed by the F06 cascade                                                    |
| **EP-07 Guest Experience**                                                                                                                                                                                                  | Public resolution goes through the event key (F04), the event status gate (F05) or the custom domain (F08–F11) |
| **EP-15 Platform Administration**                                                                                                                                                                                           | `/admin` lists every event and its custom-domain flag                                                          |

## 7. Cross-cutting notes

- **Event-scoped routes.** `/dashboard/[eventSlug]/*` is wrapped by `EventProvider`
  (`src/app/(dashboard)/dashboard/[eventSlug]/layout.tsx:10`), which resolves the slug to
  `{...event, myRole}` and exposes it via `useEvent()` / `useEventRole()`. Pages never take an
  event id from the URL.
- **Toast convention.** Most of the epic's Settings mutations bypass `useToastMutation` and
  call `useMutation` directly so they can control their own error copy
  (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:44`); only the create dialog
  uses the hook, and it therefore loses the server's `ConvexError` message (see TODO-02-03).

## 8. Epic-level defects & gaps

Full detail lives in each feature's §14; the index is here.

| ID         | Priority | Where                                                                                                                                                                                                    |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-02-01  | P0       | [F07](./F07-demo-event-seeding.md) — demo seeding writes a hardcoded, non-unique event slug                                                                                                              |
| DEF-02-02  | P1       | [F06](./F06-delete-event.md) — deleting an event never detaches its custom domain from Vercel                                                                                                            |
| DEF-02-03  | P1       | [F05](./F05-event-status-lifecycle.md) — archiving is reachable by a co-owner through `updateEvent`, bypassing the owner-only `archiveEvent`                                                             |
| DEF-02-40  | P1       | [F08](./custom-domain/F08-connect-domain.md) — The Convex claim and the Vercel attach are not atomic, and the compensating rollback is itself fire-and-forget: …                                         |
| TODO-02-01 | P2       | [F01](./F01-create-event.md) — The create dialog collects only name/date/venue name/venue address, although `createEvent` accepts `brideName`, `groomName` and `venueMapUrl` and `eve …                  |
| TODO-02-02 | P1       | [F01](./F01-create-event.md) — The derived event key is never shown at creation time, and a silent `-2` suffix (BR-02-F01-03) or an empty derived slug (A3) is invisible to the …                        |
| TODO-02-03 | P2       | [F01](./F01-create-event.md) — `useToastMutation` reports a fixed "Failed to create event" string, discarding the `ConvexError` message the server returned …                                            |
| TODO-02-04 | P2       | [F02](./F02-event-directory-and-switcher.md) — `listMyEvents` caps at 100 memberships, returns events in membership-row order, and offers no search, sort or pagination (`convex/events.ts:30`).         |
| TODO-02-05 | P2       | [F02](./F02-event-directory-and-switcher.md) — A superadmin can never reach their own event directory: the redirect at `/dashboard` is unconditional (`src/app/(dashboard)/dashboard/page.tsx:28`).      |
| TODO-02-06 | P2       | [F02](./F02-event-directory-and-switcher.md) — Directory cards are clickable `Card` elements rather than links, so they cannot be keyboard-activated, middle-clicked or opened in a new tab …            |
| TODO-02-07 | P1       | [F03](./F03-event-profile-settings.md) — The Settings page does not use `eventSchema`; it hand-rolls a maps-link regex and skips the name minimum entirely, so an event name can be saved …              |
| TODO-02-08 | P2       | [F03](./F03-event-profile-settings.md) — `handleSave` catches every failure as "Failed to save settings", discarding the server's `ConvexError` message, even though the neighbouring …                  |
| TODO-02-09 | P2       | [F03](./F03-event-profile-settings.md) — Profile changes are not recorded in the activity log, while template and meta changes are (`convex/lib/activity.ts` is never called from …                      |
| TODO-02-10 | P1       | [F04](./F04-event-key.md) — Changing the event key breaks every previously shared public link and there is no redirect, alias or former-key history (`convex/lib/public.ts:15` …                         |
| TODO-02-11 | P2       | [F04](./F04-event-key.md) — The client regex rejects the exact inputs the server was built to normalize, so a user typing `Smith Wedding` is told off instead of being offered …                         |
| TODO-02-12 | P1       | [F05](./F05-event-status-lifecycle.md) — Nothing prevents editing an archived event. No query or mutation outside `convex/lib/public.ts` reads `status`, so guests, invitations, the template …          |
| TODO-02-13 | P2       | [F05](./F05-event-status-lifecycle.md) — `archiveEvent` is dead code. It is exported at `convex/events.ts:288` and referenced by nothing in `src/`.                                                      |
| TODO-02-14 | P2       | [F05](./F05-event-status-lifecycle.md) — Status transitions are not activity-logged, so the Activity page cannot answer "who took the invitations offline, and when".                                    |
| TODO-02-15 | P2       | [F05](./F05-event-status-lifecycle.md) — The Danger Zone promises that archiving hides the event "from active events", but `listMyEvents` (`convex/events.ts:22`) applies no filter and the …            |
| TODO-02-16 | P2       | [F05](./F05-event-status-lifecycle.md) — The Status select gives no indication that choosing "Archived" takes every public invitation link offline; the consequence is only described in the …           |
| TODO-02-17 | P2       | [F06](./F06-delete-event.md) — The cascade is unbounded in intent but capped in practice: each step reads `take(5000)` once, with no pagination and no loop …                                            |
| TODO-02-18 | P2       | [F06](./F06-delete-event.md) — The confirmation is a single click on a button labelled "Delete Event", with no typed confirmation of the event name (`settings/page.tsx:448`), for …                     |
| TODO-02-19 | P2       | [F06](./F06-delete-event.md) — A deleted event leaves no trace anywhere: its `activityLogs` rows are part of the cascade (`convex/lib/events.ts:11`) and no global log records the …                     |
| TODO-02-20 | P2       | [F06](./F06-delete-event.md) — The Danger Zone card body and the dialog body list different things: the card omits "drinks" (`settings/page.tsx:423`) while the dialog includes it …                     |
| TODO-02-21 | P1       | [F07](./F07-demo-event-seeding.md) — The seed control creates a different event from the one it is displayed on and then navigates away, without saying so. The card sits on event A's …                 |
| TODO-02-22 | P2       | [F07](./F07-demo-event-seeding.md) — The seed button has no pending or disabled state (`page.tsx:140`), so it can be pressed repeatedly while the mutation is in flight, each press …                    |
| TODO-02-23 | P2       | [F07](./F07-demo-event-seeding.md) — The spam-guard message is written to be shown to a user ("Demo event limit reached — you already have several events", `convex/seed.ts:448`) but is …               |
| TODO-02-24 | P2       | [F07](./F07-demo-event-seeding.md) — The spam guard counts all owned events rather than seeded ones (`convex/seed.ts:443`), so a genuine host managing three weddings can never generate a …             |
| TODO-02-25 | P2       | [F07](./F07-demo-event-seeding.md) — A seeded board cannot be told apart from a real one after the fact: nothing marks it, so a demo event competes for the 3-event guard, appears in the …              |
| TODO-02-40 | P2       | [F08](./custom-domain/F08-connect-domain.md) — With `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` unset — the normal local-development state — `requireEnv` throws `VercelApiError("VERCEL_TOKEN is not …        |
| TODO-02-41 | P2       | [F08](./custom-domain/F08-connect-domain.md) — Connecting, verifying and removing a custom domain write nothing to `activityLogs`; the `entity` union does not include a domain value …                  |
| TODO-02-42 | P1       | [F09](./custom-domain/F09-dns-verification.md) — There is no re-check or repair path once a domain has gone live. `customDomainVerified` is only ever recomputed by a manual "Check Status" click …      |
| TODO-02-43 | P2       | [F09](./custom-domain/F09-dns-verification.md) — While waiting for DNS the owner must poll by hand; the wizard never re-checks on its own, and the automatic re-fetch that does exist only repopulates … |
| TODO-02-44 | P2       | [F10](./custom-domain/F10-remove-domain.md) — A tolerated Vercel 404 is reported to the owner as an unqualified success. The handler swallows the error and returns `{ok: true}`, so the wizard …        |
| TODO-02-45 | P2       | [F11](./custom-domain/F11-countdown-landing.md) — The countdown and the date line disagree about time zones. `useRemaining` subtracts `Date.now()` from the stored timestamp, so it counts down in the … |
| TODO-02-46 | P2       | [F11](./custom-domain/F11-countdown-landing.md) — The custom-domain fallback screen is English — "Invitation Not Found" / "This invitation link may be invalid or has been removed." …                   |
