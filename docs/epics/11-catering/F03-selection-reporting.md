---
id: EP-11-F03
title: Selection Reporting
epic: EP-11 Catering
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-11-F01, EP-11-F02, EP-04-F03]
---

# EP-11-F03 — Selection Reporting

## 1. Summary

Selection reporting turns the catering options into a number the host can hand to the caterer:
how many guests chose each dish, how many chose each drink, and how many have chosen nothing.
It is a single tally panel rendered under each tab of the Menu & Drinks page, backed by one
query that deliberately returns **counts, not guests**.

The feature is `defective`. The tallies are computed correctly from the data, but with the
current product there is no way for a guest to produce that data: no template block writes
`guests.menuOptionId` or `guests.drinkOptionId`. Unless the host edits every guest by hand in
the dashboard, the panel reports every guest as "No selection", forever, with no indication of
why. That is **DEF-11-01**, documented in full in §14.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                           |
| -------------------- | ------ | ------------------------------------------------------------------------------- |
| Owner                | Read   |                                                                                 |
| Co-owner (`planner`) | Read   |                                                                                 |
| Editor               | Read   |                                                                                 |
| Viewer               | None   | `getSelectionCounts` uses the default `minRole: "editor"` (`convex/menu.ts:32`) |
| Public guest         | None   | Counts are never exposed publicly                                               |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
`requireEventEditor(ctx, args.eventId)` (`convex/menu.ts:32`).

## 3. User Stories

- **US-11-F03-01** — As an editor, I want to see how many guests picked each dish so that I can
  give the caterer a headcount per option.
- **US-11-F03-02** — As an editor, I want to see how many guests have not chosen anything so
  that I know how much of the list is still outstanding.
- **US-11-F03-03** — As an editor, I want the same breakdown for drinks so that the bar order
  is as reliable as the kitchen order.

## 4. Entry Points

| Entry point             | Route / control                                             | Actor   |
| ----------------------- | ----------------------------------------------------------- | ------- |
| Tally panel, Food tab   | `/dashboard/[eventSlug]/menu` (`.../menu/page.tsx:111-117`) | Editor+ |
| Tally panel, Drinks tab | `/dashboard/[eventSlug]/menu` (`.../menu/page.tsx:149-155`) | Editor+ |

The panel has no route, no control and no interactivity — it is read-only output rendered below
the option list of whichever tab is active. It appears only when both conditions hold: the tab
has at least one option, and `selectionCounts.totalGuests > 0`.

## 5. UX Flow

### Happy path (WF-11-06)

1. Editor opens `/dashboard/[eventSlug]/menu`. The page subscribes to
   `api.menu.getSelectionCounts` alongside the two option lists (`.../menu/page.tsx:26`).
2. The server guards on `requireEventEditor`, then reads the event's guests through
   `by_eventId` bounded at `.take(1000)` (`convex/menu.ts:34-37`).
3. It walks the guest list once, incrementing `menuCounts[guest.menuOptionId]` or
   `menuUnassigned`, and independently `drinkCounts[guest.drinkOptionId]` or `drinkUnassigned`
   (`convex/menu.ts:44-57`).
4. It returns `{menuCounts, drinkCounts, menuUnassigned, drinkUnassigned, totalGuests}`
   (`convex/menu.ts:59-65`). **No guest document leaves the server.**
5. `SelectionSummary` renders one row per option — the option name against
   `counts[option._id] ?? 0` — followed by a final "No selection" row carrying `unassigned`
   (`selection-summary.tsx:20-29`).

### Alternate & edge paths

- **A1** — The event has no guests (`totalGuests === 0`) → the panel is not rendered at all, on
  either tab (`.../menu/page.tsx:111`, `:149`).
- **A2** — The tab has no options → the `EmptyState` replaces both the list and the panel, so
  the "No selection" figure is not shown either (`.../menu/page.tsx:97-119`).
- **A3** — An option exists but no guest selected it → the row renders `0` via the `?? 0`
  fallback (`selection-summary.tsx:23`).
- **A4** — A guest holds an id for an option that has since been deleted → the count lands in
  `menuCounts` under an id with no matching row, so it is rendered nowhere and is **also** not
  counted as unassigned. The visible rows no longer sum to `totalGuests`. See DEF-11-02 in
  [EP-11-F01 §14](./F01-menu-options.md#14-todos--open-questions).
- **A5** — A guest is `pending` or `declined` → they are still counted in `menuUnassigned`,
  because the loop reads every guest regardless of `rsvpStatus` (`convex/menu.ts:44`). See
  TODO-11-03.
- **A6** — The event has more than 1000 guests → the surplus is silently excluded from every
  figure, including `totalGuests` (`convex/menu.ts:37`).
- **E1** — A viewer or non-member calls the query → `requireEventEditor` throws; the page has no
  error boundary of its own.

## 6. States

| State             | Behavior                                                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `selectionCounts` is `undefined` while in flight; the `&&` guard suppresses the panel with no skeleton of its own (`.../menu/page.tsx:111`). The page-level `Skeleton` covers only the option lists (`:95-96`) |
| Empty             | No guests → panel absent (A1). Options present but zero selections → panel renders with every row at `0` and `unassigned === totalGuests`                                                                      |
| Error             | None. A throw propagates to the React error boundary                                                                                                                                                           |
| Success           | Panel headed **"Guest Selections"**, one row per option plus the "No selection" row (`selection-summary.tsx:18-30`)                                                                                            |
| Disabled / locked | Not applicable — the panel is read-only                                                                                                                                                                        |
| Mobile            | Rows are `flex items-center justify-between` with no minimum width, so they compress rather than scroll (`selection-summary.tsx:21`)                                                                           |

## 7. UI Specification

### Screens & components

| Element     | Component          | Path                                                         |
| ----------- | ------------------ | ------------------------------------------------------------ |
| Tally panel | `SelectionSummary` | `src/components/menu/selection-summary.tsx:15`               |
| Host page   | `MenuPage`         | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:21` |

`SelectionSummary` takes `{options, counts, unassigned}` (`selection-summary.tsx:8-13`) and is
rendered twice — once per tab — from the two halves of the same query result. It is a pure
presentational component with no Convex hook of its own.

### Fields & validation

None. The feature is read-only and has no inputs.

### Copy deck

Host-facing English only; no guest-facing copy exists in this feature.

| Key                  | Copy               | Source                                         |
| -------------------- | ------------------ | ---------------------------------------------- |
| Panel heading        | "Guest Selections" | `src/components/menu/selection-summary.tsx:18` |
| Unassigned row label | "No selection"     | `src/components/menu/selection-summary.tsx:27` |

## 8. Data Model

| Table          | Fields                            | Read / Write                           | Index                                 |
| -------------- | --------------------------------- | -------------------------------------- | ------------------------------------- |
| `guests`       | `menuOptionId?`, `drinkOptionId?` | Read only                              | `by_eventId` (`convex/schema.ts:150`) |
| `menuOptions`  | `_id`, `name`                     | Read (client-side, via the admin list) | `by_eventId`                          |
| `drinkOptions` | `_id`, `name`                     | Read (client-side, via the admin list) | `by_eventId`                          |

This feature writes nothing and has no cascade behavior. The join between a count and an option
name happens **on the client**: the server returns a `Record<optionId, number>`
(`convex/menu.ts:39-40`), and `SelectionSummary` looks each id up against the option list it was
already given (`selection-summary.tsx:23`). The server never resolves an option document, which
is why a deleted option's count simply has nowhere to render (A4).

### The payload decision — counts, not guests

The query exists specifically so the menu page never ships the guest list. The source comment
is explicit: _"Per-option guest selection counts for the menu page, so the client doesn't need
the full guest list just to show tallies"_ (`convex/menu.ts:27-28`).

This is a deliberate payload and privacy choice, and it is worth stating as product behavior
rather than an implementation detail:

- **Payload.** The alternative — reusing `guests.getGuestsPageData`, which returns up to 1000
  full guest documents plus invitations, tables and special-event RSVP maps
  (`convex/guests.ts:64-96`) — would move kilobytes of data to a page that renders at most a few
  dozen integers, and would re-send all of it on every reactive update.
- **Privacy.** Guest names, emails, phone numbers, allergies and seat assignments never reach
  the Menu & Drinks page. An editor working purely on catering does not need them, and the
  browser never receives them.
- **The cost.** The host cannot answer "_who_ chose the fish?" from this page. Doing so requires
  the guest directory (EP-04-F02), whose Menu and Drink columns render the per-guest choice
  (`src/components/guests/guest-table.tsx:116-135`). The tally panel intentionally does not link
  there. See TODO-11-04.

## 9. Backend Contract

| Function                      | Type  | Args                      | Returns                                                                                                                                           | Guard                                   | Caps                 |
| ----------------------------- | ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------- |
| `api.menu.getSelectionCounts` | query | `{eventId: Id<"events">}` | `{menuCounts: Record<string, number>, drinkCounts: Record<string, number>, menuUnassigned: number, drinkUnassigned: number, totalGuests: number}` | `requireEventEditor(ctx, args.eventId)` | guests `.take(1000)` |

`convex/menu.ts:29-67`. This is the only function in the feature. There is no drinks equivalent:
both tallies come from this one query, and the drinks tab consumes `drinkCounts` /
`drinkUnassigned` from the same result (`.../menu/page.tsx:149-155`).

Related contracts that supply or consume the same fields, owned by other epics:

| Function                         | Relevance                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.guests.getGuestsPageData`   | Returns the option lists that let the guest directory resolve `menuOptionId` to a name (`convex/guests.ts:80-87`, `:128-129`)                                        |
| `api.guests.updateGuest`         | The host-side write path for `menuOptionId` / `drinkOptionId` (`convex/guests.ts:206-207`) — EP-04-F03                                                               |
| `api.guests.submitPublicRsvp`    | The **public** write path: accepts both ids and validates them (`convex/guests.ts:478-479`, `:558-575`) — EP-07-F02. No UI calls it with these fields; see DEF-11-01 |
| `api.dashboard.getOverviewStats` | Derives `menuCompletionCount` from attending guests holding a `menuOptionId` (`convex/dashboard.ts:40`) — EP-14-F01                                                  |

## 10. Business Rules

- **BR-11-F03-01** `[AS-BUILT]` — `getSelectionCounts` requires at least the `editor` role on the
  event (`convex/menu.ts:32`).
- **BR-11-F03-02** `[AS-BUILT]` — The query returns only aggregate numbers; no guest document or
  guest field is included in the response (`convex/menu.ts:59-65`).
- **BR-11-F03-03** `[AS-BUILT]` — A guest with a truthy `menuOptionId` increments that option's
  count; a guest without one increments `menuUnassigned` (`convex/menu.ts:45-50`).
- **BR-11-F03-04** `[AS-BUILT]` — Menu and drink tallies are computed independently in the same
  pass, so a guest may be counted as assigned for food and unassigned for drink
  (`convex/menu.ts:45-56`).
- **BR-11-F03-05** `[AS-BUILT]` — `totalGuests` is the number of guest rows read, not the number
  of attending guests (`convex/menu.ts:64`).
- **BR-11-F03-06** `[AS-BUILT]` — Every guest of the event is counted regardless of
  `rsvpStatus`, and regardless of whether they are a `+1` record (`convex/menu.ts:44`).
- **BR-11-F03-07** `[AS-BUILT]` — Counts are keyed by option id, and the option **name** is
  resolved on the client from the admin option list (`selection-summary.tsx:22-23`).
- **BR-11-F03-08** `[AS-BUILT]` — An option with no selections renders as `0` rather than being
  omitted (`selection-summary.tsx:23`).
- **BR-11-F03-09** `[AS-BUILT]` — The panel renders only when the tab has at least one option
  **and** `totalGuests > 0` (`.../menu/page.tsx:97`, `:111`).
- **BR-11-F03-10** `[AS-BUILT]` — The guest scan is bounded at 1000 rows; guests beyond that
  bound affect no figure, including `totalGuests` (`convex/menu.ts:37`).
- **BR-11-F03-11** `[AS-BUILT]` — The panel is read-only: it exposes no control to change,
  export or drill into a selection (`selection-summary.tsx:15-33`).

## 11. Acceptance Criteria

- **AC-11-F03-01** — **Given** an event with 10 guests, 4 of whom hold option X and 1 option Y
  **Then** `menuCounts` is `{X: 4, Y: 1}`, `menuUnassigned` is `5` and `totalGuests` is `10`.
  _(BR-11-F03-03, BR-11-F03-05)_
- **AC-11-F03-02** — **Given** the same event **When** the response is inspected **Then** it
  contains exactly the five documented keys and no guest name, email or id.
  _(BR-11-F03-02)_
- **AC-11-F03-03** — **Given** a guest with a food choice but no drink choice **Then** they
  appear in `menuCounts` and in `drinkUnassigned`. _(BR-11-F03-04)_
- **AC-11-F03-04** — **Given** an event with 6 declined guests and 0 selections **Then**
  `menuUnassigned` is `6`, not `0`. _(BR-11-F03-06 — documents TODO-11-03)_
- **AC-11-F03-05** — **Given** an option no guest selected **When** the panel renders **Then**
  its row shows `0`. _(BR-11-F03-08)_
- **AC-11-F03-06** — **Given** an event with options but zero guests **When** the page renders
  **Then** no "Guest Selections" panel appears. _(BR-11-F03-09)_
- **AC-11-F03-07** — **Given** a `viewer` **When** `getSelectionCounts` is called **Then** it
  throws. _(BR-11-F03-01)_
- **AC-11-F03-08** — **Given** an option is deleted while a guest still references it **When**
  the panel renders **Then** the visible rows plus "No selection" sum to less than
  `totalGuests`. _(BR-11-F03-07 — documents DEF-11-02)_
- **AC-11-F03-09** — **Given** a published invitation with menu options defined and a guest who
  completes every RSVP control offered to them on the public page **Then**
  `menuUnassigned` is unchanged. _(Documents DEF-11-01 — this AC asserts the broken behavior and
  must be inverted when the defect is fixed.)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                       |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TC-11-F03-01 | unit        | The counting loop produces the expected record for a fixture of assigned, half-assigned and unassigned guests                  |
| TC-11-F03-02 | integration | The response shape contains exactly the five keys and leaks no guest field                                                     |
| TC-11-F03-03 | integration | `requireEventEditor` rejects a viewer and a non-member, accepts an editor                                                      |
| TC-11-F03-04 | integration | Declined and `+1` guests are included in the totals (pins BR-11-F03-06 until TODO-11-03 is decided)                            |
| TC-11-F03-05 | integration | After deleting a selected option, the counts no longer sum to `totalGuests` (pins DEF-11-02)                                   |
| TC-11-F03-06 | e2e         | With options defined and guests present, assigning a choice in the guest dialog increments the matching tally on the menu page |
| TC-11-F03-07 | e2e         | A full public RSVP submission leaves every tally at "No selection" (pins DEF-11-01; invert on fix)                             |

### Manual QA checklist

- [ ] Seed a demo event, open the menu page, confirm the panel appears once guests exist.
- [ ] Assign a dish to one guest in the guest dialog; confirm the tally increments live.
- [ ] Confirm the network payload for `getSelectionCounts` contains no guest names.
- [ ] Add a guest with no choices; confirm "No selection" increments.
- [ ] Complete a public RSVP end to end and confirm the tallies do not move (DEF-11-01).
- [ ] Delete a selected option and confirm the rows stop summing to the guest total (DEF-11-02).

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Guest scan bounded at 1000 (`convex/menu.ts:37`); option lists bounded at 100 (`convex/lib/options.ts:32`, `:49`)                                                               |
| Performance      | One `by_eventId` index read plus a single O(n) pass. Response size is proportional to the number of distinct options, not to the guest count — the point of the design          |
| Security & authz | Editor-gated. The aggregate-only response is itself a security property: an editor working on catering never receives guest PII (BR-11-F03-02)                                  |
| Accessibility    | The panel is a plain `div` list, not a `table`, and has no caption or row semantics — assistive technology reads a stream of label/number pairs (`selection-summary.tsx:19-30`) |
| i18n             | Hard-coded English ("Guest Selections", "No selection")                                                                                                                         |
| Analytics        | None. Reads are not logged, and catering changes are not activity-logged (TODO-11-06)                                                                                           |

## 14. TODOs & Open Questions

- **DEF-11-01** `[P1]` — **Catering is structurally incomplete: no guest can ever record a
  choice from the public invitation.** Options can be authored and the backend is ready to store
  a selection, but every link in the guest-facing chain is missing.
  - **Evidence — link 1: the block types exist but no template implements them.**
    `menuSelection` and `drinkSelection` are members of the `BlockType` union
    (`src/components/public-invitation/blocks.ts:17-18`), carry `BLOCK_DEFS` entries labelled
    "Menu Selection (per guest)" and "Drink Selection (per guest)" with **empty `fields` arrays**
    (`:212-221`), and are offered in `BLOCK_PALETTE` (`:254-255`) — so the template editor lets a
    host add them to a layout. But `ELEGANT_BLOCKS` maps only eleven block types, and neither is
    among them (`src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`);
    there is no `menu-selection.tsx` or `drink-selection.tsx` in that directory. Per the template
    contract, a block type a template omits **renders nothing**. Since `elegant` is the only
    template, adding either block produces an invisible entry in the layout with no error and no
    warning. The palette half of this is shared with **EP-08-F05** (block catalog), which owns
    the catalog itself; this spec claims only the catering consequence.
  - **Evidence — link 2: the `rsvp` block never sends the ids.** `ElegantRsvp` builds
    `guestUpdates` as `{guestId, rsvpStatus}` only
    (`src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:104-107`) and submits
    `{eventSlug, invitationSlug, guestUpdates, plusOneUpdates}`
    (`:124-129`). `menuOptionId` and `drinkOptionId` appear nowhere in the file, and the block
    queries no option list.
  - **Evidence — link 3: the `allergies` block's food controls are not menu options.**
    `ElegantAllergies` renders its `CheckRow` controls from a **static authored string list** —
    the block's `options` config field (`blocks.ts:209`), falling back to
    `ELEGANT_COPY.foodOptions`
    (`.../elegant/blocks/allergies.tsx:146-149`, rendered at `:109-121`). Those strings are
    allergen labels typed by the host in the template editor; they are never read from
    `menuOptions` and carry no option id. On submit the block sends
    `{guestId, rsvpStatus: "attending", allergies: <joined free text>}`
    (`:165-169`) — dietary prose, never a catering selection. With respect to catering, these
    controls are decorative.
  - **Evidence — link 4: the backend is ready and waiting.** `submitPublicRsvp` accepts
    `menuOptionId` and `drinkOptionId` per guest update (`convex/guests.ts:478-479`), validates
    each against the event **and** its `isActive` flag —
    `if (!option || option.eventId !== event._id || !option.isActive) throw new
ConvexError("Menu option does not belong to this event")` (`convex/guests.ts:558-569`) — and
    patches them onto the guest only when the key is present (`:574-575`). The write path,
    ownership check and active check are all implemented. **The guest UI is the missing half.**
  - **Impact:** `getSelectionCounts` reports `menuUnassigned === totalGuests` and
    `drinkUnassigned === totalGuests` permanently. The guest directory's Menu and Drink columns
    render `—` for every row (`src/components/guests/guest-table.tsx:116-135`).
    `dashboard.getOverviewStats`'s `menuCompletionCount` stays at `0` (`convex/dashboard.ts:40`).
    A host configures a menu, publishes invitations, watches guests RSVP successfully, and
    receives zero selections — with no error, no empty-state explanation and nothing in the
    product indicating that the selection step was never presented to anyone. The only way to
    populate the data is for the host to open each guest's dialog and pick on their behalf
    (`src/components/guests/guest-details-sheet.tsx:328-372`), which defeats the purpose of
    asking guests.
  - **Proposed fix:** Implement `ElegantMenuSelection` and `ElegantDrinkSelection` in
    `src/components/public-invitation/templates/elegant/blocks/`, register them in
    `ELEGANT_BLOCKS`, and have each render one single-select group per named guest, populated
    from the event's active options and submitting via
    `submitPublicRsvp.guestUpdates[].menuOptionId` / `.drinkOptionId` — the contract that already
    exists. This requires the public invitation payload to carry the option lists: today
    `getPublicInvitation` returns no menu or drink data at all, so the block has nothing to
    render from and `menu.listMenuOptionsByEvent` would have to be called separately by
    `eventId`, which the public payload does expose. Until the blocks ship, the template editor
    should not offer palette entries that render nothing (EP-08-F05).
- **TODO-11-03** `[P1]` `[CHANGE]` — Tallies count every guest, including declined guests and
  `+1` records.
  - **Rationale:** The loop is unconditional on `rsvpStatus` (`convex/menu.ts:44`), so a guest
    who declined is reported as an outstanding "No selection". The caterer headcount the panel
    is meant to produce is therefore inflated by everyone who is not coming. Notably
    `dashboard.getOverviewStats` takes the opposite view for the same field, counting menu
    completion only for `rsvpStatus === "attending"` (`convex/dashboard.ts:40`) — the two
    surfaces disagree about the same data.
  - **Proposed rule:** `getSelectionCounts` counts only guests with
    `rsvpStatus === "attending"`, and `totalGuests` reports that same population; the panel
    labels the figure so the host knows which population it describes.
- **TODO-11-04** `[P2]` `[ADD]` — Dietary information is invisible on the catering page.
  - **Rationale:** `guests.allergies`, written by the EP-07-F04 allergies block
    (`.../elegant/blocks/allergies.tsx:165-169`), **is** surfaced to the host — as a truncated
    column in the guest directory (`src/components/guests/guest-table.tsx:136-145`), as an
    editable textarea in the guest dialog (`src/components/guests/guest-details-sheet.tsx:373-378`),
    and as the `allergyCount` overview metric (`convex/dashboard.ts:39`). It is **not** surfaced
    on `/dashboard/[eventSlug]/menu`, which is the page a host opens when preparing the caterer
    brief, and the guest-directory cell truncates at 30 characters, so the full text is only
    reachable via a `title` tooltip or by opening each guest.
  - **Proposed rule:** The Menu & Drinks page renders a dietary-restrictions panel listing every
    guest with a non-empty `allergies` value in full, sourced from a counts-plus-notes query that
    preserves the aggregate-only privacy posture of `getSelectionCounts` as far as possible.
- **TODO-11-10** `[P2]` `[ADD]` — The tally panel offers no export and no drill-down.
  - **Rationale:** The panel is terminal output (`selection-summary.tsx:15-33`) with no link to
    the guest directory filtered by option, and no CSV. A host handing figures to a caterer
    retypes them.
  - **Proposed rule:** Each option row links to the guest directory pre-filtered to that option,
    and the panel offers a copy-to-clipboard summary.
- **TODO-11-11** `[P2]` `[CHANGE]` — The panel has no loading state of its own.
  - **Rationale:** `selectionCounts && …` (`.../menu/page.tsx:111`, `:149`) hides the panel while
    the query is in flight, so it appears abruptly after the option list has already rendered.
  - **Proposed rule:** Render a skeleton row set while `selectionCounts === undefined`.

### Open questions

- **Q5** — Should `getSelectionCounts` count `+1` guest records? A materialized `+1` is a real
  attendee who eats, so counting them is arguably right — but the `+1` has no way to state a
  preference of their own, so they will always land in "No selection".
- **Q6** — Should the panel show a percentage or an outstanding count rather than a raw
  unassigned number? "No selection: 84" is less actionable than "84 of 120 still to choose".
- **Q7** — Once DEF-11-01 is fixed, should a guest be required to pick a dish before their RSVP
  is accepted, the way the `rsvp` block already requires every named guest to answer
  (`.../elegant/blocks/rsvp.tsx:95-103`)?

## 15. Traceability

| Concern                                  | Source                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Route                                    | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:26`, `:111-117`, `:149-155`                      |
| UI                                       | `src/components/menu/selection-summary.tsx:15-33`                                                         |
| Backend                                  | `convex/menu.ts:29-67`                                                                                    |
| Guard                                    | `convex/menu.ts:32`                                                                                       |
| Payload rationale (source comment)       | `convex/menu.ts:27-28`                                                                                    |
| Schema                                   | `convex/schema.ts:145-146` (`guests.menuOptionId`, `guests.drinkOptionId`)                                |
| DEF-11-01 link 1 — block types           | `src/components/public-invitation/blocks.ts:17-18`, `:212-221`, `:254-255`                                |
| DEF-11-01 link 1 — no template component | `src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`                                |
| DEF-11-01 link 2 — rsvp block payload    | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:104-107`, `:124-129`                  |
| DEF-11-01 link 3 — allergies block       | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:146-149`, `:109-121`, `:165-169` |
| DEF-11-01 link 4 — backend ready         | `convex/guests.ts:478-479`, `:558-569`, `:574-575`                                                        |
| Host-side write path                     | `src/components/guests/guest-details-sheet.tsx:328-372`, `convex/guests.ts:206-207`                       |
| Downstream — guest directory columns     | `src/components/guests/guest-table.tsx:116-135`                                                           |
| Downstream — overview metric             | `convex/dashboard.ts:40`                                                                                  |
| Dietary data (TODO-11-04)                | `src/components/guests/guest-table.tsx:136-145`, `convex/dashboard.ts:39`                                 |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
