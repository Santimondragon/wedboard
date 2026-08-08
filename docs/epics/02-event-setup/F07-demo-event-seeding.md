---
id: EP-02-F07
title: Demo Event Seeding
epic: EP-02 Event Setup
version: 1.0.0
status: defective
last_updated: 2026-07-27
depends_on: [EP-02-F01, EP-02-F04]
---

# EP-02-F07 — Demo Event Seeding

## 1. Summary

A one-click way to conjure a fully populated sample event board — a Spanish-language wedding
with invitations, guests at every RSVP stage, menu and drink options, seating tables and two
special invitations — so that a new user can explore every feature of Wedboard without first
entering a hundred rows of data by hand. It is offered on an event's Overview page while that
event has no invitations, and it creates a **separate, new** event rather than filling in the
one being viewed. A spam guard refuses once the user already owns three events.

The feature is **defective**: the seeded event's key is hardcoded, so seeding twice on the
same deployment inserts two events with the same `events.slug` and breaks every public page
that resolves by key — for both events. See DEF-02-01.

## 2. Actors & Permissions

| Actor                | Access              | Notes                                                                     |
| -------------------- | ------------------- | ------------------------------------------------------------------------- |
| Owner                | Full                | Any signed-in user may seed; they become the owner of the new board       |
| Co-owner (`planner`) | Full                | The control is on Overview, which every member reaching the board can see |
| Editor               | Full                | Same — the mutation applies no event-scoped role check at all             |
| Viewer               | Blocked in practice | Cannot load Overview, whose `getOverviewStats` requires `editor`          |
| Public guest         | None                | Not reachable without a Clerk session                                     |

`seedDemoEventForCurrentUser` is exported as a **public** Convex `mutation`
(`convex/seed.ts:426`) — public in the Convex sense of being on the client-callable API
surface, not in the sense of being unauthenticated. It calls `ctx.auth.getUserIdentity()`
itself and throws `ConvexError("Unauthorized")` when there is no session
(`convex/seed.ts:429`–`:431`). It applies **no** `requireEventEditor`/`requireEventMember`
guard, because it creates a brand-new event rather than writing to the current one. See
[roles-and-permissions.md](../../roles-and-permissions.md).

`seedDemoEvent` — the mutation that does the actual inserting — is an `internalMutation`
(`convex/seed.ts:6`) and is therefore not callable from any client; it is invoked through
`ctx.runMutation(internal.seed.seedDemoEvent, …)` (`convex/seed.ts:453`).

## 3. User Stories

- **US-02-F07-01** — As a new user staring at an empty board, I want to generate realistic
  sample data so that I can see what the product does before committing my own guest list.
- **US-02-F07-02** — As an evaluator, I want the sample data to cover every RSVP state, menu
  and drink selections, seating and special invitations so that no feature looks empty.
- **US-02-F07-03** — As the platform, I want to refuse repeated seeding so that a single
  account cannot fill the database with demo boards.
- **US-02-F07-04** — As a user, I want the sample board kept separate from my real event so
  that I never have to disentangle demo guests from real ones.

## 4. Entry Points

| Entry point             | Route / control                                                                            | Actor                                  |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| "Seed Demo Data" button | `/dashboard/[eventSlug]` → dashed card, rendered only while `stats.totalInvitations === 0` | Editor+ (anyone who can load Overview) |

This is the **only** exposure of the feature. It is absent from the event directory
(`/dashboard`), the create-event dialog, Settings and `/admin`. A user whose only event
already has an invitation has no way to reach it in the UI at all
(`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:134`).

## 5. UX Flow

### Happy path — WF-02-07 Seed a demo event board

1. A user opens an event's Overview page. Because the event has no invitations, a dashed card
   appears below Quick Actions reading "No invitations yet. Seed demo data to explore all
   features." with a "Seed Demo Data" button
   (`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:138`, `:140`).
2. Pressing it calls `api.seed.seedDemoEventForCurrentUser` with no arguments
   (`:34`). There is no confirmation dialog.
3. The mutation resolves the Clerk identity (`convex/seed.ts:429`), then looks the caller up
   in `users` by `tokenIdentifier` and counts the events they own with
   `by_ownerUserId … .take(3)` (`convex/seed.ts:442`). Three or more → it throws.
4. Otherwise it delegates to the internal `seedDemoEvent` (`convex/seed.ts:453`), which
   inserts the whole board in one transaction and returns the new event id.
5. The wrapper reads the new event back and returns `{eventId, slug}`
   (`convex/seed.ts:458`, `:459`).
6. The client toasts "Demo data seeded! Redirecting…" and pushes
   `/dashboard/{returned slug}` (`page.tsx:35`, `:36`) — **a different board from the one the
   button was pressed on**.

### Alternate & edge paths

- **A1** — The button appears on event A but creates event B. Event A is left exactly as
  empty as it was; nothing about the current event is seeded (`convex/seed.ts:21` inserts a
  new `events` row). The card's copy does not say this.
- **A2** — The caller has no `users` row yet. The spam guard is skipped entirely — it only
  runs `if (user)` (`convex/seed.ts:441`) — and the internal mutation then throws
  `ConvexError("Owner user not found")` (`convex/seed.ts:17`). In practice `UserSync`
  guarantees the row exists before any dashboard page renders.
- **A3** — The user already owns three or more events → `ConvexError("Demo event limit
reached — you already have several events")` (`convex/seed.ts:447`). The guard counts
  **all** owned events, not demo ones, so an active host with three real weddings can never
  seed.
- **A4** — The user owns one or two events → seeding is allowed. This is the path that
  produces the duplicate key of DEF-02-01: a user with zero events may seed, and then seed
  again while owning one.
- **A5** — The seeded event is created with `status: "active"` (`convex/seed.ts:28`), unlike
  `createEvent`, which starts events as `draft` ([F05](./F05-event-status-lifecycle.md)). Its
  five invitations are immediately live and publicly resolvable.
- **A6** — Seeding writes no activity-log entries; nothing in `convex/seed.ts` calls
  `logActivity`, so a freshly seeded board's Activity page is empty despite 15 guests
  appearing.
- **A7** — The seeded event has no `brideName`, `groomName`, `venueMapUrl`, `templateId`,
  `layoutVariants` or `meta`. The public invitation therefore falls back to the elegant
  template's default layouts, and the hero derives the couple by splitting the event name.
- **E1** — Any failure produces the generic toast "Failed to seed demo data"
  (`page.tsx:38`); the `ConvexError` message — including the spam-guard message the product
  wrote deliberately — never reaches the user.

## 6. States

| State             | Behavior                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Loading           | Overview renders eight `Skeleton` cards while `getOverviewStats` resolves (`page.tsx:42`)               |
| Empty             | The seed card is the empty state: it renders only while `stats.totalInvitations === 0` (`page.tsx:134`) |
| Error             | "Failed to seed demo data" toast; the button stays enabled                                              |
| Success           | "Demo data seeded! Redirecting…" toast, then a push to the new board                                    |
| Disabled / locked | None — the button has no pending state and is not disabled while the mutation runs (see TODO-02-22)     |
| Mobile            | The card stacks its copy above the button                                                               |

## 7. UI Specification

### Screens & components

| Element     | Component                 | Path                                                     |
| ----------- | ------------------------- | -------------------------------------------------------- |
| Seed card   | shadcn `Card` (dashed)    | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:135` |
| Seed button | shadcn `Button` (outline) | `:140`                                                   |
| Handler     | `handleSeedDemo`          | `:32`                                                    |

### Fields & validation

| Field | Type | Required | Rule                                                                                       | Message |
| ----- | ---- | -------- | ------------------------------------------------------------------------------------------ | ------- |
| —     | —    | —        | The mutation takes no arguments (`convex/seed.ts:427`); nothing is collected from the user | —       |

### Copy deck

The card copy is English dashboard chrome. The **seeded data itself** is Spanish and is what a
demo viewer sees on the public invitation, so the guest-visible strings are recorded here:

| Key                  | Copy                                                                                                       | Source                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Card prompt          | "No invitations yet. Seed demo data to explore all features."                                              | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:138` |
| Card button          | "Seed Demo Data"                                                                                           | `:141`                                                   |
| Success toast        | "Demo data seeded! Redirecting…"                                                                           | `:35`                                                    |
| Error toast          | "Failed to seed demo data"                                                                                 | `:38`                                                    |
| Event name           | "Maria & Daniel Wedding"                                                                                   | `convex/seed.ts:22`                                      |
| Venue                | "Jardín de los Sueños"                                                                                     | `convex/seed.ts:26`                                      |
| Venue address        | "Calle de la Novia 42, Madrid"                                                                             | `convex/seed.ts:27`                                      |
| Menu 1               | "Menú de carne" — "Solomillo de ternera con salsa de trufa"                                                | `convex/seed.ts:41`                                      |
| Menu 2               | "Menú de pescado" — "Lubina al horno con verduras de temporada"                                            | `convex/seed.ts:48`                                      |
| Menu 3               | "Menú vegetariano" — "Risotto de setas y espárragos"                                                       | `convex/seed.ts:55`                                      |
| Drink 1              | "Paquete bebidas sin alcohol" — "Refrescos, agua y zumos naturales"                                        | `convex/seed.ts:64`                                      |
| Drink 2              | "Paquete vinos y cava" — "Vinos seleccionados y cava para el brindis"                                      | `convex/seed.ts:71`                                      |
| Drink 3              | "Open bar premium" — "Barra libre con cócteles y bebidas premium"                                          | `convex/seed.ts:78`                                      |
| Special invitation 1 | "Cena de ensayo" — "Cena íntima el día antes de la boda"                                                   | `convex/seed.ts:125`                                     |
| Special invitation 2 | "Brunch post-boda" — "Brunch relajado al día siguiente de la celebración"                                  | `convex/seed.ts:133`                                     |
| Invitation titles    | "Familia García", "Familia López", "The Johnson Family", "Amigos del trabajo", "Compañeros de universidad" | `convex/seed.ts:143`, `:150`, `:157`, `:164`, `:171`     |
| Spam-guard error     | "Demo event limit reached — you already have several events"                                               | `convex/seed.ts:448`                                     |
| Missing-user error   | "Owner user not found"                                                                                     | `convex/seed.ts:17`                                      |

## 8. Data Model

One `seedDemoEvent` call inserts the following, in this order, all within a single mutation:

| #   | Table                          | Rows | Notes                                                                                                                | Source                            |
| --- | ------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | `events`                       | 1    | `status: "active"`, date = now + 90 days, **hardcoded** `slug: "maria-daniel-wedding"`                               | `convex/seed.ts:21`               |
| 2   | `eventMembers`                 | 1    | The caller, `role: "owner"`                                                                                          | `convex/seed.ts:32`               |
| 3   | `menuOptions`                  | 3    | All `isActive`, `sortOrder` 1–3                                                                                      | `convex/seed.ts:39`, `:46`, `:53` |
| 4   | `drinkOptions`                 | 3    | All `isActive`, `sortOrder` 1–3                                                                                      | `convex/seed.ts:62`, `:69`, `:76` |
| 5   | `tables`                       | 6    | "Mesa 1".."Mesa 6", 10/8/8/6/6/6 seats                                                                               | `convex/seed.ts:85`–`:120`        |
| 6   | `specialEvents`                | 2    | Day before and day after the wedding; exactly the `MAX_SPECIAL_EVENTS` cap                                           | `convex/seed.ts:123`, `:131`      |
| 7   | `invitations`                  | 5    | All `isActive`; no `isSent` flag set                                                                                 | `convex/seed.ts:141`–`:174`       |
| 8   | `invitationSpecialEventAccess` | 4    | Invitations 1+2 → "Cena de ensayo"; invitations 1+3 → "Brunch post-boda"                                             | `convex/seed.ts:177`–`:196`       |
| 9   | `guests`                       | 15   | Mixed `attending` / `declined` / `pending`; two allergy notes; menu, drink and seat assignments; one materialized +1 | `convex/seed.ts:199`–`:376`       |
| 10  | `guestSpecialEventRsvps`       | 7    | Attending, declined and pending responses across both special invitations                                            | `convex/seed.ts:379`–`:420`       |

No `media` rows, no `activityLogs` rows and no `guestMessages` rows are created; those
sections of a seeded board are genuinely empty.

**Slug generation is the defect.** The event slug is a string literal
(`convex/seed.ts:23`), whereas `createEvent` derives it and passes it through
`generateUniqueSlug` (`convex/events.ts:124`–`:125`), which probes `by_slug` and appends
`-2`, `-3`… until free (`convex/lib/slug.ts:32`–`:53`). The seed path performs no such probe.
Since `events.slug` has an index but Convex indexes do not enforce uniqueness, a second seed
simply inserts a second row with the same key — and every read of that index uses `.unique()`,
which throws when it matches more than one document. See DEF-02-01.

**The seeded invitation slugs are fine.** `familia-garcia`, `familia-lopez`,
`the-johnson-family`, `amigos-del-trabajo` and `companeros-de-universidad`
(`convex/seed.ts:144`, `:151`, `:158`, `:165`, `:172`) are also hardcoded, but invitation slugs are unique **per
event**, resolved through `by_eventId_and_slug` (`convex/lib/public.ts:56`) and generated
per event by `generateUniqueInvitationSlug` (`convex/lib/slug.ts:61`). Two seeded events each
holding an invitation called `familia-garcia` is correct and harmless — the pair
`(eventId, slug)` still differs. **They must not be "fixed" alongside DEF-02-01**; only the
event slug is global.

## 9. Backend Contract

| Function                               | Type                          | Args                     | Returns           | Guard                                                                                 | Caps                                    |
| -------------------------------------- | ----------------------------- | ------------------------ | ----------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| `api.seed.seedDemoEventForCurrentUser` | mutation (public API surface) | `{}`                     | `{eventId, slug}` | `ctx.auth.getUserIdentity()` — throws `Unauthorized` when absent; no event-role guard | Refuses when the caller owns ≥ 3 events |
| `internal.seed.seedDemoEvent`          | internalMutation              | `{ownerTokenIdentifier}` | `Id<"events">`    | None — internal only; throws if the token maps to no `users` row                      | —                                       |

Source: `convex/seed.ts:426` and `convex/seed.ts:6`.

## 10. Business Rules

- **BR-02-F07-01** `[AS-BUILT]` — Seeding requires an authenticated Clerk identity; without
  one the mutation throws `Unauthorized` (`convex/seed.ts:429`–`:431`).
- **BR-02-F07-02** `[AS-BUILT]` — Seeding is refused when the caller already owns three or
  more events, counted with `by_ownerUserId … take(3)` (`convex/seed.ts:442`–`:450`).
- **BR-02-F07-03** `[AS-BUILT]` — The spam guard counts every event the user owns, not only
  demo ones (`convex/seed.ts:443`).
- **BR-02-F07-04** `[AS-BUILT]` — The spam guard is skipped when the caller has no `users`
  row, in which case the internal mutation throws `Owner user not found`
  (`convex/seed.ts:441`, `:16`).
- **BR-02-F07-05** `[AS-BUILT]` — Seeding creates a **new** event; it never writes into the
  event the user is currently viewing (`convex/seed.ts:21`).
- **BR-02-F07-06** `[AS-BUILT]` — The caller becomes the new event's `ownerUserId` and gets an
  `eventMembers` row with `role: "owner"` (`convex/seed.ts:24`, `:32`).
- **BR-02-F07-07** `[AS-BUILT]` — The seeded event's status is `active`, not `draft`
  (`convex/seed.ts:28`).
- **BR-02-F07-08** `[AS-BUILT]` — The seeded event's date is 90 days from the moment of
  seeding (`convex/seed.ts:25`).
- **BR-02-F07-09** `[AS-BUILT]` — One seed inserts exactly 5 invitations, 15 guests, 2 special
  invitations, 3 menu options, 3 drink options and 6 tables
  (`convex/seed.ts:141`–`:376`).
- **BR-02-F07-10** `[AS-BUILT]` — The seeded guest set covers all three RSVP states and
  includes one `isPlusOne` record linked to its host via `plusOneOfGuestId`
  (`convex/seed.ts:289`–`:297`).
- **BR-02-F07-11** `[AS-BUILT]` — The seeded event's slug is the literal
  `"maria-daniel-wedding"`; no uniqueness check runs on it (`convex/seed.ts:23`) — the cause
  of DEF-02-01.
- **BR-02-F07-12** `[AS-BUILT]` — Seeded invitation slugs are per-event and therefore may
  legitimately repeat across seeded events (`convex/seed.ts:144`,
  `convex/lib/public.ts:56`).
- **BR-02-F07-13** `[AS-BUILT]` — The whole seed runs in one Convex mutation, so a failure
  leaves no partial demo board (`convex/seed.ts:6`).
- **BR-02-F07-14** `[AS-BUILT]` — Seeding writes no `activityLogs` entries
  (`convex/seed.ts` contains no `logActivity` call).
- **BR-02-F07-15** `[AS-BUILT]` — The seed control renders only while the current event has
  zero invitations (`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:134`).
- **BR-02-F07-16** `[AS-BUILT]` — On success the client navigates to the newly seeded event's
  board using the returned slug (`page.tsx:36`).

## 11. Acceptance Criteria

- **AC-02-F07-01** — **Given** a signed-in user with no events **When** they press "Seed Demo
  Data" **Then** a new event named "Maria & Daniel Wedding" exists with 5 invitations, 15
  guests, 2 special invitations, 3 menu options, 3 drink options and 6 tables, and the browser
  lands on its board.
- **AC-02-F07-02** — **Given** the seeded board **When** the Guests page is opened **Then**
  guests appear in all three RSVP states and one row is marked as a +1 of another guest.
- **AC-02-F07-03** — **Given** the seeded board **When** its Overview is opened **Then** the
  metric cards are non-zero.
- **AC-02-F07-04** — **Given** the seeded board **When** the Activity page is opened **Then**
  it is empty.
- **AC-02-F07-05** — **Given** a user who already owns three events **When** they invoke the
  mutation **Then** it throws and no event is created.
- **AC-02-F07-06** — **Given** an unauthenticated caller **When** the mutation is invoked
  **Then** it throws `Unauthorized`.
- **AC-02-F07-07** — **Given** an event with one or more invitations **When** its Overview is
  opened **Then** no seed card is shown.
- **AC-02-F07-08** — **Given** event A with no invitations **When** the user seeds from it
  **Then** event A still has no invitations and the new data lives on a different event.
- **AC-02-F07-09** — **Given** any deployment already containing an event whose slug is
  `maria-daniel-wedding` **When** a user seeds **Then** a second event with the same slug is
  inserted and `/maria-daniel-wedding/invitations/{slug}` stops resolving for both
  (DEF-02-01 — this AC records current broken behavior and must be inverted when the defect is
  fixed).

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                                      |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-02-F07-01 | integration | A single seed inserts exactly the row counts in §8 for the new `eventId`                                                                                      |
| TC-02-F07-02 | integration | Seeding as a user owning 3 events throws the spam-guard error and inserts nothing                                                                             |
| TC-02-F07-03 | integration | Seeding as a user owning 2 events succeeds                                                                                                                    |
| TC-02-F07-04 | integration | **Regression for DEF-02-01** — two consecutive seeds by the same user produce two distinct `events.slug` values, and `resolvePublicEvent` still resolves each |
| TC-02-F07-05 | integration | After two seeds, `getEventBySlug` resolves each seeded board without throwing                                                                                 |
| TC-02-F07-06 | integration | Two seeded events may each hold an invitation slugged `familia-garcia`, and each resolves within its own event                                                |
| TC-02-F07-07 | integration | The seeded event's `status` is `active` and its `date` is ~90 days out                                                                                        |
| TC-02-F07-08 | e2e         | The seed card appears on an empty board, disappears once the board has an invitation                                                                          |
| TC-02-F07-09 | e2e         | Pressing the button lands the browser on a different board that is fully populated                                                                            |
| TC-02-F07-10 | e2e         | A seeded invitation's public URL renders the elegant template with the Spanish menu options                                                                   |

### Manual QA checklist

- [ ] Seed from a brand-new account and confirm every dashboard page has data.
- [ ] Confirm the board you seeded _from_ is still empty.
- [ ] Open a seeded invitation's public URL and confirm it renders.
- [ ] Seed a second time and confirm whether the public invitation URLs of **both** seeded
      events still resolve (they do not today — DEF-02-01).
- [ ] Confirm the Activity page of a seeded board is empty.
- [ ] With three owned events, confirm seeding is refused.

## 13. Non-Functional

| Concern          | Specification                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Max 3 owned events before seeding is refused; one seed writes 43 rows across 9 tables in a single transaction                          |
| Performance      | All inserts are sequential `await`s inside one mutation; no reads beyond the owner lookup                                              |
| Security & authz | Authentication only — any signed-in user may create a demo board. No event-role guard applies, correctly, since a new event is created |
| Accessibility    | The card is plain text plus a button; no dialog or focus management involved                                                           |
| i18n             | The dashboard chrome is English; the seeded content is Spanish, matching the elegant template's default copy                           |
| Analytics        | Not logged — the seeded board's activity trail is empty                                                                                |

## 14. TODOs & Open Questions

- **DEF-02-01** `[P0]` — Demo seeding writes a hardcoded, non-unique event slug, so the second
  seed on any deployment corrupts public routing for two events at once.
  - **Evidence:** `convex/seed.ts:23` inserts `slug: "maria-daniel-wedding"` as a literal and
    never calls `generateUniqueSlug`. Contrast `convex/events.ts:124`–`:125`, where
    `createEvent` derives the slug and runs it through `generateUniqueSlug`
    (`convex/lib/slug.ts:32`), which probes `by_slug` and appends `-2`, `-3`… until the key is
    free. Convex indexes do not enforce uniqueness, so the duplicate insert succeeds silently.
    Every read of that index then breaks, because they all call `.unique()`, which throws when
    more than one document matches: `convex/lib/public.ts:18` (public resolution by event key,
    used by every public invitation page and every public mutation),
    `convex/events.ts:55` (`getEventBySlug` — the dashboard route resolver behind
    `EventProvider`), `convex/lib/slug.ts:45` (`generateUniqueSlug`, i.e. `createEvent`'s own
    probe) and `convex/events.ts:185` (the `updateEvent` event-key uniqueness check).
    The path is trivially reachable: the spam guard only refuses at three owned events
    (`convex/seed.ts:446`), so the same user may seed, then seed again, and any two different
    users may each seed once.
  - **Impact:** Both seeded events become unreachable, not just the newer one. Every public
    invitation URL under `/maria-daniel-wedding/invitations/{slug}` throws instead of
    rendering, so guests of a _previously working_ board lose their invitation. The owners of
    both boards also lose the dashboard, since `getEventBySlug` throws on the same index.
    Beyond the two events, `createEvent` fails for any user whose event name normalizes to
    `maria-daniel-wedding`, and `updateEvent` fails for anyone trying to claim that key.
    Nothing surfaces the cause: the user sees a failed page, not a collision. The damage is
    persistent and cannot be repaired from the UI, because the Settings page that would let an
    owner rename the key is itself behind the throwing resolver.
  - **Proposed fix:** `seedDemoEvent` derives its slug the same way `createEvent` does —
    `const slug = await generateUniqueSlug(ctx, "events", generateSlug("Maria & Daniel
Wedding"))` — and inserts that, yielding `maria-daniel-wedding`,
    `maria-daniel-wedding-2`, … Better still, the seed calls the same code path as
    `createEvent` so the two can never drift again. Existing duplicates must be repaired by a
    migration that renames all but the oldest row holding a given key, since no product
    surface can reach them.
- **TODO-02-21** `[P1]` `[CHANGE]` — The seed control creates a different event from the one
  it is displayed on and then navigates away, without saying so. The card sits on event A's
  Overview, reads "No invitations yet. Seed demo data to explore all features.", and produces
  event B (`src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:134`–`:142`,
  `convex/seed.ts:21`).
  - **Rationale:** The copy reads as an offer to populate the board being looked at. A user who
    has just created "Our Wedding" and presses it is silently moved to a Spanish demo wedding
    and may reasonably think their own event was overwritten.
  - **Proposed rule:** The control states that it creates a separate example board, and it is
    moved out of the per-event empty state to the event directory (`/dashboard`), where
    creating a new board is the expected outcome.
- **TODO-02-22** `[P2]` `[ADD]` — The seed button has no pending or disabled state
  (`page.tsx:140`), so it can be pressed repeatedly while the mutation is in flight,
  each press creating another demo board up to the spam-guard ceiling.
  - **Rationale:** Every other destructive or creating control in Settings tracks a `saving`
    flag and re-labels itself; this one does not, and it is precisely the control that
    multiplies rows.
  - **Proposed rule:** `handleSeedDemo` tracks a pending flag; the button is disabled and
    reads "Seeding..." while the mutation runs.
- **TODO-02-23** `[P2]` `[CHANGE]` — The spam-guard message is written to be shown to a user
  ("Demo event limit reached — you already have several events",
  `convex/seed.ts:448`) but is discarded by the client's `catch`, which toasts the generic
  "Failed to seed demo data" (`page.tsx:38`).
  - **Rationale:** The user is told the action failed but not that they hit a deliberate,
    understandable limit. The same pattern is handled correctly by `handleSaveSlug`
    ([F04](./F04-event-key.md)), which unwraps `ConvexError.data`.
  - **Proposed rule:** `handleSeedDemo` unwraps `ConvexError.data` and surfaces the server
    message verbatim, as the event-key handler does.
- **TODO-02-24** `[P2]` `[CHANGE]` — The spam guard counts all owned events rather than seeded
  ones (`convex/seed.ts:443`), so a genuine host managing three weddings can never generate a
  sample board, while a user with two demo boards still can.
  - **Rationale:** The guard's stated purpose is "Guard against demo-event spam"
    (`convex/seed.ts:434`), but it measures the wrong quantity.
  - **Proposed rule:** The event record carries an `isDemo` flag and the guard refuses on the
    count of demo events (one per user), leaving real boards uncounted.
- **TODO-02-25** `[P2]` `[ADD]` — A seeded board cannot be told apart from a real one after the
  fact: nothing marks it, so a demo event competes for the 3-event guard, appears in the
  directory, and — being `active` with five live invitations — is publicly resolvable from the
  moment it is created (`convex/seed.ts:28`).
  - **Rationale:** A publicly reachable Spanish demo wedding under a predictable event key is
    at best confusing and at worst an enumeration target.
  - **Proposed rule:** Seeded events are flagged (`isDemo`), badged in the directory, created
    as `draft`, and offered a one-click delete.

### Open questions

- **Q1** — Should demo seeding exist in production at all, or be limited to development
  deployments and a sales-demo account?
- **Q2** — Should the seeded content be localized to the viewer's language, given that the
  dashboard chrome is English and the sample data is Spanish?
- **Q3** — Should a seeded board offer a "delete this demo" shortcut, given that
  [F06](./F06-delete-event.md) deletion is otherwise buried in Settings and the board counts
  against the seeding limit?

## 15. Traceability

| Concern                                     | Source                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| UI (seed card)                              | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:134` |
| UI (handler)                                | `src/app/(dashboard)/dashboard/[eventSlug]/page.tsx:32`  |
| Backend (public wrapper)                    | `convex/seed.ts:426`                                     |
| Backend (auth check)                        | `convex/seed.ts:429`                                     |
| Backend (spam guard)                        | `convex/seed.ts:442`                                     |
| Backend (internal seeder)                   | `convex/seed.ts:6`                                       |
| Backend (hardcoded slug — DEF-02-01)        | `convex/seed.ts:23`                                      |
| Backend (seeded status)                     | `convex/seed.ts:28`                                      |
| Backend (seeded invitations)                | `convex/seed.ts:141`                                     |
| Contrast: unique slug at creation           | `convex/events.ts:124`                                   |
| Slug helper (global uniqueness)             | `convex/lib/slug.ts:32`                                  |
| Slug helper (per-event uniqueness)          | `convex/lib/slug.ts:61`                                  |
| Public resolution by key (`.unique()`)      | `convex/lib/public.ts:18`                                |
| Public resolution of invitation (per-event) | `convex/lib/public.ts:56`                                |
| Dashboard resolution by key (`.unique()`)   | `convex/events.ts:55`                                    |
| Schema index                                | `convex/schema.ts:79`                                    |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |

</content>
</invoke>
