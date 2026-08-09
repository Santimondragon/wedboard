---
id: EP-02-F01
title: Create Event
epic: EP-02 Event Setup
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: []
---

# EP-02-F01 — Create Event

## 1. Summary

Any signed-in user can create an event board. The user supplies a name and, optionally, a
date and venue; the system derives a globally unique [Event Key](../../glossary.md#core-entities)
from the name, records the creator as the event's Owner, and takes them straight to the new
board. This is the entry point to the whole product: every guest, invitation, menu, table and
design in Wedboard belongs to an event created here.

## 2. Actors & Permissions

| Actor                | Access | Notes                                          |
| -------------------- | ------ | ---------------------------------------------- |
| Owner                | Full   | Becomes the Owner of the event it creates      |
| Co-owner (`planner`) | n/a    | Roles only exist relative to an existing event |
| Editor               | n/a    | Same                                           |
| Viewer               | n/a    | Same                                           |
| Public guest         | None   | Route is behind Clerk middleware               |

The only gate is authentication: `createEvent` calls `requireUser(ctx)`
(`convex/events.ts:122`). There is no per-event role to check — the event does not exist yet.
Role semantics are defined in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F01-01** — As a signed-in user, I want to create an event board from a name so that
  I can start managing my wedding.
- **US-02-F01-02** — As a new user with no events, I want an obvious call to action so that I
  am not stuck on an empty dashboard.
- **US-02-F01-03** — As a user who already has events, I want to create another one from the
  sidebar without leaving the board I am on.
- **US-02-F01-04** — As the creator, I want to land on the new board immediately so that I can
  keep working.

## 4. Entry Points

| Entry point                            | Route / control                                        | Actor          |
| -------------------------------------- | ------------------------------------------------------ | -------------- |
| Empty-state "Create Event" button      | `/dashboard` → `EmptyState.action`                     | Signed-in user |
| "New Event" button                     | `/dashboard` header                                    | Signed-in user |
| "New event" item in the event switcher | Sidebar dropdown, any `/dashboard/[eventSlug]/*` route | Signed-in user |

All three open the same `CreateEventDialog`
(`src/app/(dashboard)/dashboard/page.tsx:120`, `src/components/dashboard/event-switcher.tsx:70`).

## 5. UX Flow

### Happy path — WF-02-01 Create a new event board

1. The user opens the Create Event dialog from any of the three entry points.
2. They fill **Event Name** (required) and optionally **Date**, **Venue Name**,
   **Venue Address** (`src/components/dashboard/create-event-dialog.tsx:59`).
3. Submit runs the zod resolver over `eventSchema` (`src/lib/validations/event.ts:3`); the
   date string is converted to a Unix ms timestamp before the call
   (`src/components/dashboard/create-event-dialog.tsx:44`).
4. `api.events.createEvent` derives `generateSlug(name)` then
   `generateUniqueSlug(ctx, "events", baseSlug)` (`convex/events.ts:124`).
5. The event row is inserted with `status: "draft"` and `ownerUserId` = the caller
   (`convex/events.ts:127`).
6. An `eventMembers` row with `role: "owner"` is inserted for the same user
   (`convex/events.ts:140`).
7. The mutation returns `{ eventId, slug }` (`convex/events.ts:146`).
8. A "Event created" toast fires, the form resets, the dialog closes, and the router pushes
   `/dashboard/{slug}` (`src/components/dashboard/create-event-dialog.tsx:46`).

### Alternate & edge paths

- **A1** — Name collides with an existing event's derived slug → `generateUniqueSlug` appends
  `-2`, `-3`, … until free (`convex/lib/slug.ts:51`). The user is not told the key differs from
  what the name implies.
- **A2** — Name contains accents, punctuation or uppercase → `generateSlug` strips diacritics,
  drops non `[a-z0-9\s-]` characters, collapses whitespace to hyphens
  (`convex/lib/slug.ts:21`).
- **A3** — Name reduces to an empty slug (e.g. `"!!"` — blocked earlier by the 2-character
  zod minimum for most inputs, but reachable with names like `"日本"`) → the event is inserted
  with `slug: ""`. Not guarded at create time; see TODO-02-02.
- **E1** — Name shorter than 2 characters → client-side zod error
  "Event name must be at least 2 characters"; the mutation is never called.
- **E2** — The mutation throws (e.g. `Unauthorized`) → `useToastMutation` shows
  "Failed to create event", `run()` returns `{ok: false}`, the dialog stays open and no
  navigation occurs (`src/components/dashboard/create-event-dialog.tsx:27`).

## 6. States

| State             | Behavior                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `/dashboard` shows `LoadingState` until `listMyEvents` resolves; the dialog itself has no loading state                                                         |
| Empty             | With zero events, `/dashboard` renders the `EmptyState` "Welcome to Wedboard" card whose action opens this dialog (`src/app/(dashboard)/dashboard/page.tsx:52`) |
| Error             | Field errors render in red under the input; mutation failures surface as a sonner error toast                                                                   |
| Success           | Toast "Event created", dialog closes, navigation to `/dashboard/{slug}`                                                                                         |
| Disabled / locked | The submit button is disabled while `isSubmitting` and reads "Creating..." (`src/components/dashboard/create-event-dialog.tsx:83`)                              |
| Mobile            | `DialogContent` is `sm:max-w-md`, full-width below the `sm` breakpoint                                                                                          |

## 7. UI Specification

### Screens & components

| Element               | Component           | Path                                                  |
| --------------------- | ------------------- | ----------------------------------------------------- |
| Create dialog         | `CreateEventDialog` | `src/components/dashboard/create-event-dialog.tsx:25` |
| Directory empty state | `EmptyState`        | `src/components/app/empty-state.tsx`                  |
| "New Event" button    | shadcn `Button`     | `src/app/(dashboard)/dashboard/page.tsx:75`           |
| Switcher entry        | `EventSwitcher`     | `src/components/dashboard/event-switcher.tsx:63`      |

### Fields & validation

| Field          | Type                  | Required | Rule                                                  | Message                                    |
| -------------- | --------------------- | -------- | ----------------------------------------------------- | ------------------------------------------ |
| `name`         | text                  | Yes      | `z.string().min(2)`                                   | "Event name must be at least 2 characters" |
| `date`         | `<input type="date">` | No       | Free string; converted with `new Date(str).getTime()` | —                                          |
| `venueName`    | text                  | No       | `z.string().optional()`                               | —                                          |
| `venueAddress` | text                  | No       | `z.string().optional()`                               | —                                          |

`eventSchema` also declares `slug`, `brideName`, `groomName` and `venueMapUrl`
(`src/lib/validations/event.ts:5`), but the create dialog renders no inputs for them — see
TODO-02-01.

### Copy deck

None. All create-flow copy is English chrome, not guest-facing Spanish.

## 8. Data Model

| Table          | Fields                                                                                                                | Read / Write   | Index                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------- |
| `events`       | `name`, `slug`, `ownerUserId`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl`, `status` | Write (insert) | `by_slug` (read, during uniqueness loop) |
| `eventMembers` | `eventId`, `userId`, `role`                                                                                           | Write (insert) | —                                        |
| `users`        | `tokenIdentifier`                                                                                                     | Read           | `by_tokenIdentifier` (via `requireUser`) |

Two rows are written per creation and they are not independent: the `eventMembers` owner row
is what every later permission check reads. Both inserts happen in one Convex mutation, so
they commit atomically — an event can never exist without its owner membership row.
`customDomain`, `subdomain`, `templateId`, `layoutBlocks`, `layoutVariants` and `meta` are
left unset; downstream features treat "unset" as "use the default".

## 9. Backend Contract

| Function                 | Type     | Args                                                                             | Returns           | Guard         | Caps                                      |
| ------------------------ | -------- | -------------------------------------------------------------------------------- | ----------------- | ------------- | ----------------------------------------- |
| `api.events.createEvent` | mutation | `{name, brideName?, groomName?, date?, venueName?, venueAddress?, venueMapUrl?}` | `{eventId, slug}` | `requireUser` | None — a user may create unlimited events |

Source: `convex/events.ts:111`. The uniqueness loop calls
`generateUniqueSlug` (`convex/lib/slug.ts:32`), which is unbounded and reads `events.by_slug`
once per attempt.

## 10. Business Rules

- **BR-02-F01-01** `[AS-BUILT]` — Only an authenticated user whose Clerk identity resolves to a
  `users` row may create an event (`convex/events.ts:122`).
- **BR-02-F01-02** `[AS-BUILT]` — The event key is derived from the event name by
  `generateSlug`: lowercased, diacritics stripped, non-alphanumerics removed, whitespace
  collapsed to single hyphens, leading/trailing hyphens trimmed (`convex/lib/slug.ts:21`).
- **BR-02-F01-03** `[AS-BUILT]` — The event key is globally unique across all events; a
  collision appends the smallest integer suffix ≥ 2 that frees it (`convex/lib/slug.ts:41`).
- **BR-02-F01-04** `[AS-BUILT]` — A newly created event has `status: "draft"`
  (`convex/events.ts:137`).
- **BR-02-F01-05** `[AS-BUILT]` — The creator is recorded twice: as `events.ownerUserId` and as
  an `eventMembers` row with `role: "owner"` (`convex/events.ts:130`, `:140`).
- **BR-02-F01-06** `[AS-BUILT]` — `createEvent` returns the resolved slug, and the client
  navigates to `/dashboard/{slug}` — never to an id-based URL
  (`convex/events.ts:146`, `src/components/dashboard/create-event-dialog.tsx:49`).
- **BR-02-F01-07** `[AS-BUILT]` — Creation does not validate the derived key against
  `RESERVED_EVENT_SLUGS`; that check exists only on the update path
  (`convex/events.ts:124` vs `:177`).
- **BR-02-F01-08** `[AS-BUILT]` — The event name must be at least 2 characters, enforced
  client-side only (`src/lib/validations/event.ts:4`). The mutation accepts any string.

## 11. Acceptance Criteria

- **AC-02-F01-01** — **Given** a signed-in user with no events **When** they open `/dashboard`
  **Then** the "Welcome to Wedboard" empty state offers a "Create Event" action.
- **AC-02-F01-02** — **Given** the dialog is open **When** the user submits the name
  `"Ana & Luis Wedding"` **Then** an event is created with slug `ana-luis-wedding` and the
  browser navigates to `/dashboard/ana-luis-wedding`.
- **AC-02-F01-03** — **Given** an event with slug `ana-luis-wedding` already exists **When**
  another user creates an event with the same name **Then** the new event's slug is
  `ana-luis-wedding-2` and both events remain reachable.
- **AC-02-F01-04** — **Given** a freshly created event **When** the Overview page loads
  **Then** the header status badge reads "Draft".
- **AC-02-F01-05** — **Given** a freshly created event **When** the creator opens
  `/dashboard/{slug}/members` **Then** they appear as the Owner.
- **AC-02-F01-06** — **Given** the name field contains one character **When** the user submits
  **Then** the message "Event name must be at least 2 characters" renders and no mutation
  fires.
- **AC-02-F01-07** — **Given** the mutation rejects **When** the toast appears **Then** the
  dialog remains open with the entered values intact and no navigation occurs.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                       |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------- |
| TC-02-F01-01 | unit        | `generateSlug` strips accents, punctuation and case for a representative set of names          |
| TC-02-F01-02 | unit        | `generateUniqueSlug` returns `base-2` when `base` is taken and `base-3` when both are          |
| TC-02-F01-03 | integration | `createEvent` inserts exactly one `events` row and one `eventMembers` row with `role: "owner"` |
| TC-02-F01-04 | integration | `createEvent` called without an authenticated identity throws `Unauthorized`                   |
| TC-02-F01-05 | integration | Two `createEvent` calls with identical names produce distinct slugs                            |
| TC-02-F01-06 | e2e         | Create from the empty state and assert the URL becomes `/dashboard/{slug}`                     |
| TC-02-F01-07 | e2e         | Create from the sidebar switcher while inside another event and assert the switch              |

### Manual QA checklist

- [ ] Create with only a name; confirm the board opens and Overview renders zeroed metrics.
- [ ] Create with a date and confirm the Settings date field shows the same day (no off-by-one).
- [ ] Create a second event with an identical name; confirm the suffixed key in Settings.
- [ ] Create with an emoji/accented name and confirm the derived key is ASCII.
- [ ] Cancel the dialog and confirm no event is created.

## 13. Non-Functional

| Concern          | Specification                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No cap on events per user in `createEvent`. The demo seeder (F07) refuses at 3 owned events, but manual creation does not |
| Performance      | One indexed `by_slug` read per uniqueness attempt; two inserts. Worst case grows with the number of same-named events     |
| Security & authz | `requireUser` only. The creator is unconditionally the Owner; no way to create an event on another user's behalf          |
| Accessibility    | Labels are bound via `htmlFor`/`id`; errors render as adjacent text, not `aria-describedby`                               |
| i18n             | Dialog copy is English only                                                                                               |
| Analytics        | None                                                                                                                      |

## 14. TODOs & Open Questions

- **TODO-02-01** `[P2]` `[ADD]` — The create dialog collects only name/date/venue name/venue
  address, although `createEvent` accepts `brideName`, `groomName` and `venueMapUrl` and
  `eventSchema` validates them.
  - **Rationale:** The couple names drive the public invitation hero and the custom-domain
    landing page (EP-02-F11, EP-08); leaving them unset at creation means every host must go
    to Settings before their invitation reads correctly.
  - **Proposed rule:** The create dialog exposes bride and groom name fields, passed through
    to `createEvent`.
- **TODO-02-02** `[P1]` `[ADD]` — The derived event key is never shown at creation time, and a
  silent `-2` suffix (BR-02-F01-03) or an empty derived slug (A3) is invisible to the user.
  Creation also skips the `RESERVED_EVENT_SLUGS` check that `updateEvent` applies.
  - **Rationale:** The key is the public URL. A host who shares `/{name}/invitations/...`
    assuming it matches their event name will share a dead link.
  - **Proposed rule:** `createEvent` rejects an empty derived slug and a reserved key, and the
    dialog previews the resulting key before submit.

### Open questions

- **Q1** — Should a free-tier user be capped on the number of events they may own? Today only
  the demo seeder enforces a limit (EP-02-F07), and it is not a product rule.
- **Q2** — Should creating an event immediately set `status: "active"` instead of `draft`,
  given that draft events are already publicly resolvable (EP-02-F05)?

## 15. Traceability

| Concern                  | Source                                                |
| ------------------------ | ----------------------------------------------------- |
| Route (directory)        | `src/app/(dashboard)/dashboard/page.tsx:18`           |
| UI (dialog)              | `src/components/dashboard/create-event-dialog.tsx:25` |
| UI (submit + navigation) | `src/components/dashboard/create-event-dialog.tsx:41` |
| UI (switcher entry)      | `src/components/dashboard/event-switcher.tsx:63`      |
| Backend                  | `convex/events.ts:111`                                |
| Slug derivation          | `convex/lib/slug.ts:21`                               |
| Slug uniqueness          | `convex/lib/slug.ts:32`                               |
| Schema                   | `convex/schema.ts:28`                                 |
| Validation               | `src/lib/validations/event.ts:3`                      |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                         |
| ------- | ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-02-03 closed.** The create dialog surfaces the server's `ConvexError` message instead of a fixed string |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                                 |
