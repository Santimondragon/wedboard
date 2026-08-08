---
id: EP-02-F03
title: Event Profile Settings
epic: EP-02 Event Setup
version: 1.0.0
status: partial
last_updated: 2026-07-27
depends_on: [EP-02-F01]
---

# EP-02-F03 — Event Profile Settings

## 1. Summary

The event profile is the small set of facts that describe the wedding itself: its name, the
couple's names, the date, and where it happens. These fields are **derived data** for the
public invitation — the Design Studio (EP-08) renders them but cannot author them, so Settings
is the only place they can change. Editing them is a privileged action: co-owners and owners
may, editors may not, and an editor who navigates to Settings directly sees an access notice
instead of the form.

## 2. Actors & Permissions

| Actor                | Access  | Notes                                                           |
| -------------------- | ------- | --------------------------------------------------------------- |
| Owner                | Full    | Sees the whole Settings page including the Delete card          |
| Co-owner (`planner`) | Full    | Same page minus the Delete card                                 |
| Editor               | Blocked | In-page access notice; the sidebar also hides the Settings link |
| Viewer               | Blocked | Same notice (and blocked from most content queries anyway)      |
| Public guest         | None    | Behind Clerk middleware                                         |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "planner")`
(`convex/events.ts:167`). Client gate: `hasMinRole(event.myRole, "planner")`
(`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:42`). See
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F03-01** — As an owner, I want to set the bride's and groom's names so that the
  public invitation hero shows the couple rather than a split event name.
- **US-02-F03-02** — As an owner, I want to set the event date so that the countdown block and
  the custom-domain landing page count down to the right day.
- **US-02-F03-03** — As an owner, I want to record the venue name, address and a maps link so
  that guests can find the wedding from the invitation's "Ver mapa" button.
- **US-02-F03-04** — As a co-owner, I want the same editing power as the owner over the event
  profile so that I can run the board on their behalf.
- **US-02-F03-05** — As an editor, I want a clear explanation when I cannot reach Settings so
  that I know who to ask.

## 4. Entry Points

| Entry point                    | Route / control                         | Actor                                                           |
| ------------------------------ | --------------------------------------- | --------------------------------------------------------------- |
| Settings page                  | `/dashboard/[eventSlug]/settings`       | Co-owner+                                                       |
| Sidebar "Settings" link        | `NAV_ITEMS` entry, `minRole: "planner"` | Co-owner+ (`src/components/dashboard/dashboard-sidebar.tsx:76`) |
| Direct navigation by an editor | Same URL                                | Editor — renders the access notice                              |

## 5. UX Flow

### Happy path — WF-02-03 Edit event profile details

1. A co-owner opens `/dashboard/[eventSlug]/settings`. `EventProvider` has already resolved the
   event and `myRole`.
2. Form state is seeded from the resolved event during render, guarded by a
   previous-value check rather than an effect
   (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:66`). The date is rendered as
   `YYYY-MM-DD` via `toISOString().split("T")[0]` (`:75`).
3. The user edits any of Event Name, Bride's Name, Groom's Name, Date, Venue Name, Venue
   Address, Location Link, Status.
4. "Save Changes" runs a local check that a non-empty Location Link starts with `http://` or
   `https://` (`:110`).
5. `api.events.updateEvent` is called with the whole General section, converting the date via
   `new Date(date).getTime()` and coercing empty strings to `undefined` (`:116`).
6. The server re-checks the caller is at least a `planner`, then patches the event
   (`convex/events.ts:167`, `:192`).
7. A "Settings saved" toast fires; the Convex subscription re-renders the page and the header
   badge with the new values.

### Alternate & edge paths

- **A1** — An editor or viewer opens the route → the page returns early with the heading
  "Event Settings", the notice "You don't have permission to manage this event's settings. Ask
  an owner or co-owner for access." and a "Back to overview" button
  (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:164`).
- **A2** — A field is cleared → the empty string is sent as `undefined`, unsetting the field
  (`:119`). The event **name** is the exception: it is sent verbatim, so clearing it saves an
  empty name.
- **A3** — The Status select is part of the General section, so "Save Changes" also writes
  `status` — including un-archiving. See [F05](./F05-event-status-lifecycle.md).
- **A4** — The Event Key section is a separate form with its own button; it never travels with
  "Save Changes". See [F04](./F04-event-key.md).
- **E1** — Location Link without a scheme → local toast "Location link must start with
  http:// or https://" and no mutation (`:111`).
- **E2** — The mutation rejects (insufficient permission, network) → toast "Failed to save
  settings". The server's `ConvexError` message is discarded (`:128`).

## 6. States

| State             | Behavior                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Four `Skeleton` rows in place of the form while `event === undefined` (`:183`) — in practice `EventProvider` has already blocked on loading |
| Empty             | Not applicable — an event always exists on this route                                                                                       |
| Error             | sonner error toast; the form keeps the user's edits                                                                                         |
| Success           | "Settings saved" toast; fields re-sync from the refreshed event document                                                                    |
| Disabled / locked | The Save button is disabled while `saving` and reads "Saving..."; the whole form is replaced by the access notice for editors               |
| Mobile            | `p-6 max-w-2xl` single column; the bride/groom pair collapses from `sm:grid-cols-2` to one column                                           |

## 7. UI Specification

### Screens & components

| Element             | Component                          | Path                                                             |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Settings page       | `SettingsPage`                     | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:38` |
| General section     | inline `<section>`                 | `:191`                                                           |
| Status select       | shadcn `Select`                    | `:269`                                                           |
| Access notice       | inline early return                | `:164`                                                           |
| Header status badge | `EventStatusBadge` → `StatusBadge` | `src/components/dashboard/event-status-badge.tsx:12`             |
| Event context       | `useEvent()`                       | `src/components/dashboard/event-provider.tsx:60`                 |

### Fields & validation

| Field         | Type                  | Required         | Rule                                                                                 | Message                                             |
| ------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Event Name    | text                  | No (in practice) | `eventSchema.name` is `min(2)` but the Settings page does **not** use the zod schema | —                                                   |
| Bride's Name  | text                  | No               | Empty → `undefined`                                                                  | —                                                   |
| Groom's Name  | text                  | No               | Empty → `undefined`                                                                  | —                                                   |
| Date          | `<input type="date">` | No               | Converted with `new Date(str).getTime()` → Unix ms                                   | —                                                   |
| Venue Name    | text                  | No               | Empty → `undefined`                                                                  | —                                                   |
| Venue Address | text                  | No               | Empty → `undefined`                                                                  | —                                                   |
| Location Link | `<input type="url">`  | No               | Must start with `http://` or `https://` when non-empty (hand-rolled regex, `:110`)   | "Location link must start with http:// or https://" |
| Status        | select                | Yes              | One of `draft` · `active` · `archived`                                               | —                                                   |

`src/lib/validations/event.ts:3` defines the canonical `eventSchema` — `name` min 2 chars,
`slug` `/^[a-z0-9-]+$/` min 2, optional bride/groom/date/venue fields, and `venueMapUrl` as a
valid URL or the empty string. **The Settings page does not use it**; only the create dialog
does (see TODO-02-07).

### Copy deck

The profile fields are the source of derived data rendered in Spanish on the public
invitation; the Settings form itself is English. Guest-facing strings that consume these
fields are specified in [F11](./custom-domain/F11-countdown-landing.md) and EP-08.

| Key                  | Copy       | Source                                                  |
| -------------------- | ---------- | ------------------------------------------------------- |
| Map button (landing) | `Ver mapa` | `src/components/public-invitation/event-landing.tsx:76` |

## 8. Data Model

| Table          | Fields                                                                                         | Read / Write         | Index                                              |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| `events`       | `name`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl`, `status` | Read + Write (patch) | resolved by `by_slug` upstream in `getEventBySlug` |
| `eventMembers` | `role`                                                                                         | Read                 | `by_eventId_and_userId` (via `requireEventMember`) |

No cascade. The patch is a partial update: only the keys present in the args object are
written, so `updateEvent` can be called with a single field (as `handleArchive` and
`handleSaveSlug` do). `date` is stored as a Unix ms timestamp per the project date convention.
`venueMapUrl` is consumed as a fallback chain by the public template — when unset, the
invitation builds a Google Maps search from `venueAddress`.

## 9. Backend Contract

| Function                    | Type     | Args                                                                                                       | Returns                      | Guard                                              | Caps |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------- | ---- |
| `api.events.updateEvent`    | mutation | `{eventId, name?, slug?, brideName?, groomName?, date?, venueName?, venueAddress?, venueMapUrl?, status?}` | `void`                       | `requireUser` + `requireEventMember(…, "planner")` | —    |
| `api.events.getEventBySlug` | query    | `{slug}`                                                                                                   | `{...event, myRole} \| null` | `requireUser` + `requireEventAccess`               | —    |

Sources: `convex/events.ts:150`, `convex/events.ts:48`. `updateEvent` deliberately does
**not** accept `customDomain` or `subdomain` — domains go through the dedicated mutations
specified in the [custom-domain sub-epic](./custom-domain/README.md).

## 10. Business Rules

- **BR-02-F03-01** `[AS-BUILT]` — Updating the event profile requires an event role of at least
  `planner` (`convex/events.ts:167`).
- **BR-02-F03-02** `[AS-BUILT]` — An actor below `planner` who reaches the Settings route sees
  an access notice and a link back to the overview; no form is rendered
  (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:164`).
- **BR-02-F03-03** `[AS-BUILT]` — `updateEvent` patches only the fields supplied; omitted
  fields are left untouched (`convex/events.ts:192`).
- **BR-02-F03-04** `[AS-BUILT]` — The event date is stored as a Unix ms timestamp, converted
  from the `<input type="date">` string on the client
  (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:121`).
- **BR-02-F03-05** `[AS-BUILT]` — Optional text fields saved empty are written as `undefined`
  rather than as an empty string (`:119`).
- **BR-02-F03-06** `[AS-BUILT]` — A non-empty Location Link must start with `http://` or
  `https://`; otherwise the save is aborted client-side (`:110`).
- **BR-02-F03-07** `[AS-BUILT]` — The server performs no validation on any profile field
  beyond the role check — no length, format or URL check exists in `updateEvent`
  (`convex/events.ts:165`).
- **BR-02-F03-08** `[AS-BUILT]` — The Settings form seeds itself from the resolved event
  whenever the event document identity changes, so a concurrent edit by a co-owner overwrites
  unsaved local edits (`:67`).
- **BR-02-F03-09** `[AS-BUILT]` — `updateEvent` cannot set `customDomain` or `subdomain`; the
  arg list excludes them (`convex/events.ts:150`).

## 11. Acceptance Criteria

- **AC-02-F03-01** — **Given** a co-owner on the Settings page **When** they set the bride and
  groom names and save **Then** the values persist and the public invitation hero renders both.
- **AC-02-F03-02** — **Given** a date of 2027-05-14 is saved **When** the Settings page
  reloads **Then** the date input shows `2027-05-14` and `events.date` is that day's Unix ms
  timestamp.
- **AC-02-F03-03** — **Given** a Location Link of `maps.google.com/?q=x` (no scheme) **When**
  the user saves **Then** the error toast appears and `events.venueMapUrl` is unchanged.
- **AC-02-F03-04** — **Given** a venue name is cleared and saved **When** the event document is
  read **Then** `venueName` is absent, not an empty string.
- **AC-02-F03-05** — **Given** an editor **When** they navigate to
  `/dashboard/{slug}/settings` **Then** the access notice renders and no `updateEvent` call is
  possible from the page.
- **AC-02-F03-06** — **Given** an editor calls `updateEvent` directly **When** the mutation
  runs **Then** it throws an insufficient-permissions error and nothing is written.
- **AC-02-F03-07** — **Given** only the venue address is edited **When** the user saves
  **Then** the event name, couple names and date are unchanged.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                         |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| TC-02-F03-01 | integration | `updateEvent` as `planner` patches the supplied fields and leaves the rest intact                                |
| TC-02-F03-02 | integration | `updateEvent` as `editor` throws; as `viewer` throws                                                             |
| TC-02-F03-03 | integration | `updateEvent` with only `{eventId, venueName}` does not clear `date`                                             |
| TC-02-F03-04 | unit        | The date round-trip (`getTime()` → `toISOString().split("T")[0]`) preserves the calendar day for the QA timezone |
| TC-02-F03-05 | unit        | `eventSchema` rejects a 1-character name and a scheme-less `venueMapUrl`                                         |
| TC-02-F03-06 | e2e         | An editor navigating to Settings sees the access notice, not the form                                            |
| TC-02-F03-07 | e2e         | Saving couple names updates the public invitation hero                                                           |

### Manual QA checklist

- [ ] Edit each field individually and confirm the others survive.
- [ ] Save a date and confirm the countdown on the custom-domain landing targets the same day.
- [ ] Save a maps link and confirm the invitation's "Ver mapa" button opens it.
- [ ] Clear the maps link and confirm the button falls back to an address search.
- [ ] Sign in as an editor and confirm both the hidden sidebar link and the access notice.
- [ ] Clear the event name, save, and observe the empty name in the header (known gap).

## 13. Non-Functional

| Concern          | Specification                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Limits & caps    | None — no length limits on any profile field                                                           |
| Performance      | One patch per save; the page re-renders from the live Convex subscription                              |
| Security & authz | `planner` floor enforced server-side; the client gate is convenience only                              |
| Accessibility    | All inputs have bound `Label`s; the maps-link hint is plain text, not `aria-describedby`               |
| i18n             | Form copy is English; the values feed Spanish guest-facing templates                                   |
| Analytics        | Profile edits are **not** written to the activity log — only template and meta updates are (see EP-03) |

## 14. TODOs & Open Questions

- **TODO-02-07** `[P1]` `[CHANGE]` — The Settings page does not use `eventSchema`; it
  hand-rolls a maps-link regex and skips the name minimum entirely, so an event name can be
  saved empty or one character long
  (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:108` vs
  `src/lib/validations/event.ts:3`).
  - **Rationale:** The event name is displayed in the dashboard header, the directory, the
    admin console and — as a fallback for the couple names — on the public invitation. An empty
    name degrades all of them.
  - **Proposed rule:** The Settings General form validates against `eventSchema` with
    react-hook-form, and `updateEvent` re-checks `name.trim().length >= 2` server-side.
- **TODO-02-08** `[P2]` `[CHANGE]` — `handleSave` catches every failure as "Failed to save
  settings", discarding the server's `ConvexError` message, even though the neighbouring
  `handleSaveSlug` unwraps `err.data` correctly (`:128` vs `:99`).
  - **Rationale:** A permission failure and a network failure are indistinguishable to the
    user.
  - **Proposed rule:** Every Settings mutation surfaces `ConvexError.data` when present.
- **TODO-02-09** `[P2]` `[ADD]` — Profile changes are not recorded in the activity log, while
  template and meta changes are (`convex/lib/activity.ts` is never called from `updateEvent`,
  `convex/events.ts:150`).
  - **Rationale:** On a shared board, a co-owner silently changing the date or venue leaves no
    trace for the owner.
  - **Proposed rule:** `updateEvent` logs an `event`/`update` activity entry.

### Open questions

- **Q1** — Should the event date carry a time and timezone? Today it is a date-only input
  stored as a timestamp and formatted in the viewer's locale, so a guest in another timezone
  can see the previous day.
- **Q2** — Should a co-owner be able to rename the event, or should the name be owner-only
  like archive and delete?

## 15. Traceability

| Concern            | Source                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Route              | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:38`  |
| UI (role gate)     | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:42`  |
| UI (access notice) | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:164` |
| UI (form seeding)  | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:66`  |
| UI (save handler)  | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:108` |
| UI (sidebar gate)  | `src/components/dashboard/dashboard-sidebar.tsx:73`               |
| Backend            | `convex/events.ts:150`                                            |
| Guard              | `convex/events.ts:167`                                            |
| Schema             | `convex/schema.ts:28`                                             |
| Validation         | `src/lib/validations/event.ts:3`                                  |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
