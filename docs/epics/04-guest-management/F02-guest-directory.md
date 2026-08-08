---
id: EP-04-F02
title: Guest Directory
epic: EP-04 Guest Management
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-04-F01, EP-06-F01, EP-11-F01, EP-12-F01]
---

# EP-04-F02 — Guest Directory

## 1. Summary

The guest list itself: one table at `/dashboard/[eventSlug]/guests` showing every guest on the
event with their invitation, RSVP status, +1 relationship, per-special-invitation status,
menu and drink choices, allergies and table/seat. It is the host's operational view of "who is
coming" and the launch point for editing any single guest. The whole page is fed by a single
Convex query so that the table, the details dialog and the add form all share one subscription.

## 2. Actors & Permissions

| Actor                | Access    | Notes                                                                                                |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| Owner                | Full read |                                                                                                      |
| Co-owner (`planner`) | Full read |                                                                                                      |
| Editor               | Full read |                                                                                                      |
| Viewer               | None      | `getGuestsPageData` uses the default `minRole: "editor"` — a viewer cannot read the directory at all |
| Public guest         | None      |                                                                                                      |

Gate: `requireEventEditor(ctx, args.eventId)` (`convex/guests.ts:62`).
See [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F02-01** — As an Editor, I want every guest in one table so that I can see the state of
  the whole list at a glance.
- **US-04-F02-02** — As an Editor, I want to search by name so that I can find one guest in a
  list of hundreds.
- **US-04-F02-03** — As an Editor, I want to filter by RSVP status so that I can work through
  the people who have not answered.
- **US-04-F02-04** — As an Editor, I want to see who is bringing a +1 and who that +1 is so that
  the head count is correct.
- **US-04-F02-05** — As an Editor, I want a column per special invitation so that I can see who
  is coming to the after-party without opening each guest.
- **US-04-F02-06** — As an Editor, I want the table to hide catering columns when the event has
  no menu so that the view is not full of empty cells.
- **US-04-F02-07** — As an Editor, I want to click a row to edit that guest.

## 4. Entry Points

| Entry point        | Route / control                                                                        | Actor   |
| ------------------ | -------------------------------------------------------------------------------------- | ------- |
| Sidebar → "Guests" | `/dashboard/[eventSlug]/guests`                                                        | Editor+ |
| Row click          | any table row → opens the details dialog (`src/components/guests/guest-table.tsx:220`) | Editor+ |

## 5. UX Flow

### Happy path

1. The Editor navigates to `/dashboard/[eventSlug]/guests`.
2. `useQuery(api.guests.getGuestsPageData, { eventId })` issues **one** subscription
   (`src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:25`) returning guests,
   invitations, menu options, drink options, tables, special events, the
   special-invitation access map and every per-guest special RSVP.
3. The page derives display data client-side: an id→title map per lookup table, a host→+1 map
   (`…/guests/page.tsx:61`), a guest-name map (`:70`), then `enrichedGuests` (`:77`) which adds
   `invitationTitle`, `menuOptionName`, `drinkOptionName`, `tableName`, `plusOneLabel` and
   `specialStatuses`.
4. The heading shows "Guests" with the total count in parentheses (`…/guests/page.tsx:156`).
5. `GuestTable` renders a TanStack Table (`src/components/guests/guest-table.tsx:169`) with
   search and an RSVP `Select` above it.
6. Clicking a row calls `onEditGuest(row.original._id)`, which selects the guest and opens the
   details dialog ([F03](./F03-edit-guest-and-rsvp-override.md)).

### Alternate & edge paths

- **A1** — The event has no menu options → the Menu column is not rendered
  (`…/guests/page.tsx:187`, `guest-table.tsx:116`). Same for drinks (`:188`, `:126`).
- **A2** — The event has no special invitations → no special columns are rendered
  (`guest-table.tsx:103` maps an empty array).
- **A3** — Search and filter combine with AND (`guest-table.tsx:67`).
- **A4** — Filtering leaves no rows → a single full-width cell reads "No guests found"
  (`guest-table.tsx:213`).
- **E1** — The query throws (unauthorized) → the page has no error state of its own; it remains
  in the skeleton state.

## 6. States

| State             | Behavior                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | 8 `Skeleton` rows of `h-12` while `guests === undefined` (`…/guests/page.tsx:169`)                                                                                          |
| Empty             | No guests on the event → `EmptyState`, "No guests yet" (`…/guests/page.tsx:176`)                                                                                            |
| Error             | None implemented — an erroring query leaves the skeleton in place                                                                                                           |
| Success           | Table with search box, RSVP filter and the derived columns                                                                                                                  |
| Disabled / locked | None; the directory is read-only, all writes happen in the dialog                                                                                                           |
| Mobile            | The table is not responsive — it renders inside `rounded-md border` with no horizontal scroll container (`guest-table.tsx:198`), so wide column sets overflow. `TODO-04-11` |

## 7. UI Specification

### Screens & components

| Element        | Component           | Path                                                           |
| -------------- | ------------------- | -------------------------------------------------------------- |
| Page           | `GuestsPage`        | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:22` |
| Table          | `GuestTable`        | `src/components/guests/guest-table.tsx:57`                     |
| RSVP badge     | `RsvpStatusBadge`   | `src/components/guests/rsvp-status-badge.tsx:11`               |
| Details dialog | `GuestDetailsSheet` | `src/components/guests/guest-details-sheet.tsx:59`             |
| Empty state    | `EmptyState`        | `src/components/app/empty-state.tsx`                           |

### Columns

Rendered left to right. Conditional columns are marked.

| #    | Header                                           | Value                                                      | Fallback      | Source                |
| ---- | ------------------------------------------------ | ---------------------------------------------------------- | ------------- | --------------------- |
| 1    | "Name"                                           | `firstName lastName`, bold                                 | —             | `guest-table.tsx:79`  |
| 2    | "Invitation"                                     | the linked invitation's `title`                            | "—"           | `guest-table.tsx:86`  |
| 3    | "RSVP"                                           | `RsvpStatusBadge`                                          | Pending badge | `guest-table.tsx:92`  |
| 4    | "+1"                                             | `plusOneLabel`                                             | "—"           | `guest-table.tsx:96`  |
| 5..n | one per special invitation, headed by its `name` | `RsvpStatusBadge`                                          | "Not invited" | `guest-table.tsx:103` |
| —    | "Menu" _(only when menu options exist)_          | option name                                                | "—"           | `guest-table.tsx:116` |
| —    | "Drink" _(only when drink options exist)_        | option name                                                | "—"           | `guest-table.tsx:126` |
| n+1  | "Allergies"                                      | text, truncated at 30 chars with "…" and a `title` tooltip | "—"           | `guest-table.tsx:136` |
| n+2  | "Table/Seat"                                     | `"{tableName} · Seat {seatNumber}"`                        | "Unassigned"  | `guest-table.tsx:148` |

The `+1` column label is computed in the page, not the table:

| Row is                                            | Label                        | Source                 |
| ------------------------------------------------- | ---------------------------- | ---------------------- |
| a +1 record                                       | `"↳ +1 de {host full name}"` | `…/guests/page.tsx:83` |
| a host with `allowsPlusOne` and a materialized +1 | the +1's full name           | `…/guests/page.tsx:86` |
| a host with `allowsPlusOne` and no +1             | "Allowed"                    | `…/guests/page.tsx:86` |
| anything else                                     | "—"                          | `guest-table.tsx:100`  |

### Fields & validation

| Field       | Type   | Required | Rule                                                                            | Message |
| ----------- | ------ | -------- | ------------------------------------------------------------------------------- | ------- |
| Search      | text   | no       | case-insensitive substring of `"{firstName} {lastName}"` (`guest-table.tsx:69`) | —       |
| RSVP filter | select | no       | one of `all` · `attending` · `declined` · `pending` (`guest-table.tsx:190`)     | —       |

### Copy deck

| Key                | Copy                                                  | Source                                                         |
| ------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| Page heading       | "Guests"                                              | `…/guests/page.tsx:157`                                        |
| Search placeholder | "Search guests..."                                    | `guest-table.tsx:180`                                          |
| Filter options     | "All statuses" · "Attending" · "Declined" · "Pending" | `guest-table.tsx:190`–`:193`                                   |
| No results         | "No guests found"                                     | `guest-table.tsx:214`                                          |
| Not invited cell   | "Not invited"                                         | `guest-table.tsx:110`                                          |
| Unassigned seat    | "Unassigned"                                          | `guest-table.tsx:153`                                          |
| +1 allowed         | "Allowed"                                             | `…/guests/page.tsx:86`                                         |
| +1 of host         | "↳ +1 de {name}"                                      | `…/guests/page.tsx:83`                                         |
| Badges             | "Attending" · "Declined" · "Pending"                  | `src/components/guests/rsvp-status-badge.tsx:16`, `:22`, `:28` |

## 8. Data Model

| Table                          | Fields                                | Read / Write                        | Index               |
| ------------------------------ | ------------------------------------- | ----------------------------------- | ------------------- |
| `guests`                       | whole doc                             | Read `.take(1000)`                  | `by_eventId`        |
| `invitations`                  | `_id`, `title`                        | Read `.take(500)`                   | `by_eventId`        |
| `menuOptions`                  | `_id`, `name`, `sortOrder`            | Read `.take(100)`                   | `by_eventId`        |
| `drinkOptions`                 | `_id`, `name`, `sortOrder`            | Read `.take(100)`                   | `by_eventId`        |
| `tables`                       | `_id`, `name`, `sortOrder`            | Read `.take(200)`                   | `by_eventId`        |
| `specialEvents`                | `_id`, `name`                         | Read `.take(10)`                    | `by_eventId`        |
| `invitationSpecialEventAccess` | `invitationId`                        | Read `.take(500)` per special event | `by_specialEventId` |
| `guestSpecialEventRsvps`       | `guestId`, `specialEventId`, `status` | Read `.take(5000)`                  | `by_eventId`        |

`convex/guests.ts:59`–`:135`. Nothing is written by this feature.

The +1 relationship is **not** resolved server-side: the page rebuilds it client-side by
scanning the guest list for rows with `isPlusOne && plusOneOfGuestId`
(`…/guests/page.tsx:61`), which is correct only because the whole list is already loaded.

## 9. Backend Contract

| Function                       | Type  | Args        | Returns                                                                                                      | Guard                                                      | Caps   |
| ------------------------------ | ----- | ----------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
| `api.guests.getGuestsPageData` | query | `{eventId}` | `{guests, invitations, menuOptions, drinkOptions, tables, specialEvents, accessByEvent, specialRsvpByGuest}` | `requireEventEditor(ctx, eventId)` (`convex/guests.ts:62`) | see §8 |

`menuOptions`, `drinkOptions` and `tables` are returned sorted by `sortOrder`
(`convex/guests.ts:128`–`:130`); `guests`, `invitations` and `specialEvents` are returned in
index order and are never re-sorted client-side.

`accessByEvent` is `specialEventId → Id<"invitations">[]` (`convex/guests.ts:101`);
`specialRsvpByGuest` is `guestId → specialEventId → status` (`convex/guests.ts:117`).

## 10. Business Rules

- **BR-04-F02-01** `[AS-BUILT]` — Reading the directory requires at least the `editor` role;
  a viewer is refused (`convex/guests.ts:62`).
- **BR-04-F02-02** `[AS-BUILT]` — The whole page is served by a single query, `getGuestsPageData`
  (`…/guests/page.tsx:25`).
- **BR-04-F02-03** `[AS-BUILT]` — The directory lists **every** guest of the event, including +1
  records and un-invited guests; there is no filter that hides them (`convex/guests.ts:73`).
- **BR-04-F02-04** `[AS-BUILT]` — Search matches a case-insensitive substring of the guest's
  concatenated first and last name only; email, phone and invitation title are not searched
  (`guest-table.tsx:69`).
- **BR-04-F02-05** `[AS-BUILT]` — Search and the RSVP filter are combined with AND
  (`guest-table.tsx:73`).
- **BR-04-F02-06** `[AS-BUILT]` — The Menu column renders only when the event has at least one
  menu option; the Drink column only when it has at least one drink option
  (`…/guests/page.tsx:187`, `guest-table.tsx:116`, `:126`).
- **BR-04-F02-07** `[AS-BUILT]` — One column is rendered per special invitation of the event, in
  the order returned by the query, headed by the special invitation's name
  (`guest-table.tsx:103`).
- **BR-04-F02-08** `[AS-BUILT]` — A guest counts as invited to a special invitation when either
  their invitation has been granted access **or** an explicit `guestSpecialEventRsvps` row exists
  for them (`…/guests/page.tsx:98`–`:106`).
- **BR-04-F02-09** `[AS-BUILT]` — A guest invited only via their invitation's access, with no
  stored row, displays as `pending` (`…/guests/page.tsx:104`).
- **BR-04-F02-10** `[AS-BUILT]` — A guest whose main-event `rsvpStatus` is `declined` is not
  treated as invited via access, so their special columns fall back to "Not invited" unless an
  explicit row survives (`…/guests/page.tsx:101`).
- **BR-04-F02-11** `[AS-BUILT]` — The `+1` column shows the +1's name for a host that has one,
  "Allowed" for a host permitted but without one, and "↳ +1 de {host}" on the +1's own row
  (`…/guests/page.tsx:81`–`:87`).
- **BR-04-F02-12** `[AS-BUILT]` — Allergies longer than 30 characters are truncated with "…"
  and the full text is exposed as the element's `title` (`guest-table.tsx:143`).
- **BR-04-F02-13** `[AS-BUILT]` — The seat number is rendered exactly as stored, with no 1-based
  conversion in this table (`guest-table.tsx:157`).
- **BR-04-F02-14** `[AS-BUILT]` — Clicking anywhere on a row opens that guest's details dialog
  (`guest-table.tsx:223`).
- **BR-04-F02-15** `[AS-BUILT]` — The heading count is the unfiltered total of guests on the
  event, not the number of visible rows (`…/guests/page.tsx:161`).

## 11. Acceptance Criteria

- **AC-04-F02-01** — **Given** an event with guests **When** an Editor opens the Guests page
  **Then** exactly one Convex query is subscribed and all columns populate without further
  loading.
- **AC-04-F02-02** — **Given** a Viewer **When** the page loads **Then** the guest query is
  refused and no guest data renders.
- **AC-04-F02-03** — **Given** guests named "Ana López" and "Bruno Ruiz" **When** "ana" is typed
  in the search box **Then** only "Ana López" remains.
- **AC-04-F02-04** — **Given** a mixed list **When** the filter is set to "Attending" **Then**
  only guests with `rsvpStatus === "attending"` remain.
- **AC-04-F02-05** — **Given** search "ana" and filter "Declined" **When** Ana is attending
  **Then** the table shows "No guests found".
- **AC-04-F02-06** — **Given** an event with zero menu options **When** the page renders **Then**
  no "Menu" header exists; **When** one option is added **Then** the column appears.
- **AC-04-F02-07** — **Given** an event with two special invitations **When** the page renders
  **Then** two extra columns appear, headed by their names.
- **AC-04-F02-08** — **Given** a guest whose invitation has access to a special invitation but
  who has no stored row **When** the table renders **Then** that cell shows a Pending badge.
- **AC-04-F02-09** — **Given** a guest with no access and no row **When** the table renders
  **Then** that cell reads "Not invited".
- **AC-04-F02-10** — **Given** a host with `allowsPlusOne` and no materialized +1 **When** the
  table renders **Then** their "+1" cell reads "Allowed".
- **AC-04-F02-11** — **Given** a materialized +1 **When** the table renders **Then** the host's
  cell shows the +1's name and the +1's own row shows "↳ +1 de {host name}".
- **AC-04-F02-12** — **Given** a guest with 200 characters of allergies **When** the table
  renders **Then** the cell shows 30 characters followed by "…" and the full text as a tooltip.
- **AC-04-F02-13** — **Given** an unseated guest **When** the table renders **Then** the
  Table/Seat cell reads "Unassigned".
- **AC-04-F02-14** — **Given** any row **When** it is clicked **Then** the Guest Details dialog
  opens showing that guest's data.
- **AC-04-F02-15** — **Given** 40 guests with a filter showing 3 **When** the heading is read
  **Then** it reads "Guests (40)".

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                          |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| TC-04-F02-01 | unit        | The search + filter predicate ANDs correctly across the four filter values                                        |
| TC-04-F02-02 | unit        | The `+1` label derivation returns the three shapes for +1 row / host with +1 / host without                       |
| TC-04-F02-03 | unit        | The `specialStatuses` derivation returns `notInvited`, `pending` (access, no row) and the stored status           |
| TC-04-F02-04 | integration | `getGuestsPageData` returns menu/drink/tables sorted by `sortOrder` and an `accessByEvent` keyed by special event |
| TC-04-F02-05 | integration | `getGuestsPageData` throws for a `viewer`                                                                         |
| TC-04-F02-06 | e2e         | Adding a menu option makes the Menu column appear without a reload                                                |
| TC-04-F02-07 | e2e         | Row click opens the details dialog for the correct guest                                                          |

### Manual QA checklist

- [ ] Skeletons show on first load, then the table
- [ ] The RSVP filter resets correctly to "All statuses"
- [ ] Special-invitation columns match the Special Events page
- [ ] A declined guest's special columns read "Not invited"
- [ ] The table is usable at 1280px with two special invitations plus menu and drink columns

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 1000 guests, 500 invitations, 10 special events, 5000 special RSVP rows per read (`convex/guests.ts:75`–`:116`); beyond these the page silently under-reports — `TODO-04-07`     |
| Performance      | One subscription; access rows are fetched with one query per special event in parallel (`convex/guests.ts:102`). All enrichment is memoized client-side (`…/guests/page.tsx:77`) |
| Security & authz | Server-side `requireEventEditor`; no client-side role gate on this page beyond the sidebar link's `minRole`                                                                      |
| Accessibility    | Semantic `<table>` markup; **rows are clickable `<tr>` elements with no keyboard affordance or `role="button"`** — `TODO-04-12`                                                  |
| i18n             | English headers mixed with the Spanish "+1 de" label (`…/guests/page.tsx:83`)                                                                                                    |
| Analytics        | None                                                                                                                                                                             |

## 14. TODOs & Open Questions

- **TODO-04-11** `[P2]` `[CHANGE]` — The directory table has no horizontal scroll container.
  - **Rationale:** With two special invitations plus menu and drink columns the table renders 10
    columns inside a plain bordered `div` (`src/components/guests/guest-table.tsx:198`), so it
    overflows on narrow viewports.
  - **Proposed rule:** The table scrolls horizontally within its container at every viewport.
- **TODO-04-12** `[P2]` `[ADD]` — Rows are mouse-only.
  - **Rationale:** `onClick` lives on the `<TableRow>` with no `tabIndex`, key handler or role
    (`guest-table.tsx:220`), so the details dialog cannot be reached by keyboard.
  - **Proposed rule:** Each row exposes a focusable, Enter-activatable control that opens the
    dialog.
- **TODO-04-13** `[P2]` `[ADD]` — No sorting or pagination.
  - **Rationale:** `useReactTable` is configured with only core and filtered row models
    (`guest-table.tsx:169`); a 300-guest event renders 300 unsorted rows.
  - **Proposed rule:** Column sorting on name, invitation and RSVP, plus pagination above a
    threshold.
- **TODO-04-14** `[P2]` `[ADD]` — Search is name-only.
  - **Rationale:** `guest-table.tsx:69` matches the full name only, so an Editor cannot find a
    guest by invitation title or email.
  - **Proposed rule:** Search also matches invitation title and email.
- **TODO-04-02** `[P2]` `[ADD]` — No export of the guest list.
  - **Rationale:** Nothing in `src/` or `convex/` produces a CSV, XLSX or printable list; a host
    who needs a list for the caterer or venue has to copy the table by hand.
  - **Proposed rule:** The directory offers a download of the current (filtered) view.
- **TODO-04-15** `[P2]` `[ADD]` — The page has no error state.
  - **Rationale:** `…/guests/page.tsx:151` treats `undefined` as loading only, so a failed query
    renders skeletons forever. `ErrorState` already exists (`src/components/app/error-state.tsx`).
  - **Proposed rule:** A failed page query renders `ErrorState` with a retry.

### Open questions

- **Q1** — Should +1 records be collapsible under their host rather than occupying their own top-level rows?
- **Q2** — Should the heading count exclude +1 records, given they are not separately invited?

## 15. Traceability

| Concern                   | Source                                                                |
| ------------------------- | --------------------------------------------------------------------- |
| Route                     | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:22`        |
| Page query                | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:25`        |
| +1 derivation             | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:61`, `:81` |
| Special-status derivation | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:94`        |
| Conditional columns       | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:187`       |
| Table                     | `src/components/guests/guest-table.tsx:57`                            |
| Filtering                 | `src/components/guests/guest-table.tsx:67`                            |
| Column defs               | `src/components/guests/guest-table.tsx:77`                            |
| TanStack setup            | `src/components/guests/guest-table.tsx:169`                           |
| Badge                     | `src/components/guests/rsvp-status-badge.tsx:11`                      |
| Backend                   | `convex/guests.ts:59`                                                 |
| Guard                     | `convex/guests.ts:62`                                                 |
| Schema                    | `convex/schema.ts:122`, `convex/schema.ts:167`                        |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
