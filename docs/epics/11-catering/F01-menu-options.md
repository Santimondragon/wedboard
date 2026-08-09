---
id: EP-11-F01
title: Menu (Food) Options
epic: EP-11 Catering
version: 1.1.0
status: defective
last_updated: 2026-08-09
depends_on: [EP-02-F01, EP-03-F01]
---

# EP-11-F01 — Menu (Food) Options

## 1. Summary

Menu options are the food choices an event offers. An editor authors a list of named dishes,
each with an optional description, and can retire a dish from the guest-facing list without
deleting it. The list is the vocabulary every other part of the product uses when it talks
about food: the guest editing dialog picks from it, the guest directory renders the chosen
name, and the tallies in [EP-11-F03](./F03-selection-reporting.md) count against it. This
spec is the canonical description of catering option CRUD — [EP-11-F02](./F02-drink-options.md)
reuses every rule here.

## 2. Actors & Permissions

| Actor                | Access                   | Notes                                                                                         |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Owner                | Full                     |                                                                                               |
| Co-owner (`planner`) | Full                     | No additional floor is applied                                                                |
| Editor               | Full                     | Catering is content, not settings                                                             |
| Viewer               | None                     | `listAdminOptions` uses the default `minRole: "editor"` (`convex/lib/options.ts:44`)          |
| Public guest         | Read active options only | `menu.listMenuOptionsByEvent` runs with **no auth check whatsoever** (`convex/menu.ts:12-18`) |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
`requireEventEditor(ctx, eventId)` at its default `minRole` of `"editor"`, called from
`listAdminOptions` (`convex/lib/options.ts:44`), `createOption` (`:63`), `updateOption` (`:86`)
and `deleteOption` (`:98`).

## 3. User Stories

- **US-11-F01-01** — As an editor, I want to add a named food option so that guests and the
  caterer share one vocabulary for each dish.
- **US-11-F01-02** — As an editor, I want to describe an option so that a guest understands
  what the dish is before choosing it.
- **US-11-F01-03** — As an editor, I want to retire an option without deleting it so that a
  dish that is no longer offered stops appearing publicly while past selections survive.
- **US-11-F01-04** — As an editor, I want to correct an option's name after creating it so
  that a typo does not reach the caterer.
- **US-11-F01-05** — As an editor, I want to delete an option I added by mistake so that the
  list stays honest.

## 4. Entry Points

| Entry point                            | Route / control                                                         | Actor   |
| -------------------------------------- | ----------------------------------------------------------------------- | ------- |
| Menu & Drinks page, "Food Options" tab | `/dashboard/[eventSlug]/menu`                                           | Editor+ |
| Sidebar "Menu" nav item                | `segment: "menu"` (`src/components/dashboard/dashboard-sidebar.tsx:52`) | Editor+ |
| "Add Option" button (food tab)         | `.../menu/page.tsx:89-92`                                               | Editor+ |
| Row pencil button                      | `src/components/menu/menu-option-list.tsx:71-77`                        | Editor+ |
| Row active Switch                      | `src/components/menu/menu-option-list.tsx:66-70`                        | Editor+ |
| Row trash button → confirm dialog      | `src/components/menu/menu-option-list.tsx:78-102`                       | Editor+ |

There is no deep link to a single option; the page has no per-option route.

## 5. UX Flow

### Happy path — create (WF-11-01)

1. Editor opens `/dashboard/[eventSlug]/menu`. The page issues three queries in parallel:
   `menu.listMenuOptionsByEventAdmin`, `drinks.listDrinkOptionsByEventAdmin` and
   `menu.getSelectionCounts` (`.../menu/page.tsx:24-26`).
2. Editor clicks **"Add Option"** on the Food Options tab → `openCreate("menu")` sets the form
   type to `menu`, mode to `create`, clears the editing option and opens the dialog
   (`.../menu/page.tsx:44-49`).
3. The dialog titles itself **"Add Menu Option"** (`menu-option-form.tsx:122`) and resets to
   `{ name: "", description: "", isActive: true }` (`:83`).
4. Editor types a name, optionally a description, and submits. `menuOptionSchema` validates
   (`:69`).
5. `createMenuOption.run({ eventId, name, description })` fires (`:91-95`) →
   `api.menu.createMenuOption` → `createOption(ctx, "menuOptions", args)` (`convex/menu.ts:77`).
6. The server guards on `requireEventEditor`, then inserts with `isActive: true` and
   `sortOrder = args.sortOrder ?? nextSortOrder(...)` (`convex/lib/options.ts:63-71`).
7. On success a sonner toast reads **"Menu option created"** and the dialog closes
   (`menu-option-form.tsx:44-47`, `:96`). The reactive query re-renders the list.

### Happy path — edit (WF-11-02)

1. Editor clicks the pencil on a row → `openEdit(option, "menu")` (`.../menu/page.tsx:51-56`).
2. The dialog titles itself **"Edit Menu Option"** and resets from the option's current values
   (`menu-option-form.tsx:76-81`, `:122`).
3. Submit calls `updateMenuOption.run({ id, name, description, isActive })`
   (`menu-option-form.tsx:101-106`) → `updateOption` patches every supplied field
   (`convex/lib/options.ts:88-89`).

### Happy path — toggle active (WF-11-03)

Flipping the row Switch calls `updateMenuOption({ id, isActive: !option.isActive })` directly —
no dialog, no confirmation (`menu-option-list.tsx:36-48`).

### Happy path — delete (WF-11-04)

The trash button opens an `AlertDialog`; confirming calls `handleDeleteMenu(id)` →
`api.menu.deleteMenuOption` → `deleteOption`, which deletes the row and nothing else
(`convex/lib/options.ts:92-100`).

### Alternate & edge paths

- **A1** — The event has no options → the tab renders an `EmptyState` instead of the list, and
  no tally panel (`.../menu/page.tsx:97-102`).
- **A2** — `getSelectionCounts` reports `totalGuests === 0` → the tally panel is suppressed even
  when options exist (`.../menu/page.tsx:111`).
- **A3** — Create mode hides the Active switch entirely; it renders only when
  `mode === "edit"` (`menu-option-form.tsx:140`). A new option is therefore always active.
- **A4** — An empty description string is normalised to `undefined` before the call
  (`menu-option-form.tsx:94`, `:104`), so blank descriptions are not stored as `""`.
- **E1** — The name field is empty → zod blocks submission with **"Name is required"**
  (`src/lib/validations/menu.ts:4`), rendered under the input (`menu-option-form.tsx:130-132`).
- **E2** — The option id no longer exists (concurrent delete) → the server throws
  `ConvexError("Option not found")` (`convex/lib/options.ts:85`, `:97`).
- **E3** — The caller lacks editor rights → `requireEventEditor` throws; the wrapping
  `useToastMutation` surfaces **"Failed to update option"** / **"Failed to delete menu option"**
  (`.../menu/page.tsx:30`, `menu-option-list.tsx:50`).
- **E4** — Toggling active fails → a bare `toast.error("Failed to update option")` from the
  component's own try/catch, since the toggle does **not** use `useToastMutation`
  (`menu-option-list.tsx:33-34`, `:49-51`).

## 6. States

| State             | Behavior                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `isLoading` is true while either admin list is `undefined`; a `Skeleton` of `h-32 w-full` replaces the list (`.../menu/page.tsx:66`, `:95-96`)                            |
| Empty             | `EmptyState` with icon `UtensilsCrossed`, title **"No menu options yet"**, description **"Add food options for your guests to select from"** (`.../menu/page.tsx:98-102`) |
| Error             | No error state. A failed query throws to the React error boundary; failed mutations toast only                                                                            |
| Success           | Reactive Convex query re-renders the list; the option count line reads `${menuOptions.length} options` (`.../menu/page.tsx:87`)                                           |
| Disabled / locked | The submit button is disabled while `isSubmitting` and reads **"Saving..."** (`menu-option-form.tsx:157-159`)                                                             |
| Mobile            | No dedicated mobile treatment. The row is a flex line with a `min-w-0 truncate` label block, so long names ellipsise rather than wrap (`menu-option-list.tsx:57-62`)      |

## 7. UI Specification

### Screens & components

| Element              | Component          | Path                                                         |
| -------------------- | ------------------ | ------------------------------------------------------------ |
| Page shell + tabs    | `MenuPage`         | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:21` |
| Option rows          | `MenuOptionList`   | `src/components/menu/menu-option-list.tsx:32`                |
| Create / edit dialog | `MenuOptionForm`   | `src/components/menu/menu-option-form.tsx:35`                |
| Tally panel          | `SelectionSummary` | `src/components/menu/selection-summary.tsx:15`               |
| Empty state          | `EmptyState`       | `src/components/app/empty-state.tsx`                         |

`MenuOptionList` and `MenuOptionForm` are **shared** with drinks via a `type: "menu" | "drink"`
prop; they branch on it to pick the mutation and the dialog label
(`menu-option-form.tsx:43`, `:89-90`).

### Fields & validation

| Field         | Type                   | Required      | Rule                                                                                           | Message            |
| ------------- | ---------------------- | ------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| `name`        | text input             | Yes           | `z.string().min(1)` (`src/lib/validations/menu.ts:4`)                                          | "Name is required" |
| `description` | textarea, `rows={2}`   | No            | `z.string().optional()` (`src/lib/validations/menu.ts:5`)                                      | —                  |
| `isActive`    | Switch, edit mode only | Yes in schema | `z.boolean()` (`src/lib/validations/menu.ts:6`) — set from `defaultValues`, never `.default()` | —                  |

The server applies **no** length limit, character restriction or uniqueness check to `name` or
`description`; `v.string()` is the only constraint (`convex/menu.ts:72-73`). See TODO-11-08.

### Copy deck

All catering UI is host-facing and written in English; this feature exposes **no** guest-facing
Spanish copy.

| Key                  | Copy                                                                      | Source                                                  |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Page title           | "Menu & Drinks"                                                           | `.../menu/page.tsx:70`                                  |
| Food tab             | "Food Options"                                                            | `.../menu/page.tsx:76`                                  |
| Add button           | "Add Option"                                                              | `.../menu/page.tsx:91`                                  |
| Count line           | "{n} options"                                                             | `.../menu/page.tsx:87`                                  |
| Empty title          | "No menu options yet"                                                     | `.../menu/page.tsx:100`                                 |
| Empty description    | "Add food options for your guests to select from"                         | `.../menu/page.tsx:101`                                 |
| Create dialog title  | "Add Menu Option"                                                         | `menu-option-form.tsx:122`                              |
| Edit dialog title    | "Edit Menu Option"                                                        | `menu-option-form.tsx:122`                              |
| Name label           | "Name \*"                                                                 | `menu-option-form.tsx:128`                              |
| Description label    | "Description"                                                             | `menu-option-form.tsx:136`                              |
| Active label         | "Active"                                                                  | `menu-option-form.tsx:148`                              |
| Submit (create)      | "Add Option"                                                              | `menu-option-form.tsx:158`                              |
| Submit (edit)        | "Save Changes"                                                            | `menu-option-form.tsx:158`                              |
| Submit (pending)     | "Saving..."                                                               | `menu-option-form.tsx:158`                              |
| Delete dialog title  | "Delete Option"                                                           | `menu-option-list.tsx:86`                               |
| Delete dialog body   | "Are you sure you want to delete “{name}”? This action cannot be undone." | `menu-option-list.tsx:88-90`                            |
| Toast — created      | "Menu option created"                                                     | `menu-option-form.tsx:45` (label interpolated at `:43`) |
| Toast — updated      | "Menu option updated"                                                     | `menu-option-form.tsx:49`                               |
| Toast — deleted      | "Menu option deleted"                                                     | `.../menu/page.tsx:29`                                  |
| Toast — create error | "Failed to create option"                                                 | `menu-option-form.tsx:46`                               |
| Toast — update error | "Failed to update option"                                                 | `menu-option-form.tsx:50`, `menu-option-list.tsx:50`    |
| Toast — delete error | "Failed to delete menu option"                                            | `.../menu/page.tsx:30`                                  |

## 8. Data Model

| Table         | Fields                                                     | Read / Write              | Index                                 |
| ------------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------- |
| `menuOptions` | `eventId`, `name`, `description?`, `isActive`, `sortOrder` | Read + Write              | `by_eventId` (`convex/schema.ts:201`) |
| `guests`      | `menuOptionId?`                                            | Read only in this feature | `by_eventId` (`convex/schema.ts:150`) |
| `events`      | `_id`                                                      | Read (guard)              | —                                     |

Every query is `withIndex("by_eventId")` bounded by `.take(100)`
(`convex/lib/options.ts:31-32`, `:47-49`), matching the project's no-`.collect()` /
no-`.filter()` conventions. The `isActive` filter on the public list is applied **in memory
after** the take (`convex/lib/options.ts:33-34`), as is the `sortOrder` sort (`:35`).

**Cascade behavior — there is none.** `deleteOption` removes the option document and returns
(`convex/lib/options.ts:99`). No guest row is scanned, so any `guests.menuOptionId` that
referenced the deleted option keeps pointing at a non-existent document. This is DEF-11-02.
Symmetrically, deleting an _event_ does clean these tables up: `events.deleteEvent` cascades
over `menuOptions` and `drinkOptions` among the event-scoped tables.

## 9. Backend Contract

| Function                               | Type     | Args                                               | Returns                                                     | Guard                                     | Caps         |
| -------------------------------------- | -------- | -------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | ------------ |
| `api.menu.listMenuOptionsByEvent`      | query    | `{eventId}`                                        | `Doc<"menuOptions">[]` — active only, sorted by `sortOrder` | **none**                                  | `.take(100)` |
| `api.menu.listMenuOptionsByEventAdmin` | query    | `{eventId}`                                        | `Doc<"menuOptions">[]` — all, sorted by `sortOrder`         | `requireEventEditor(ctx, eventId)`        | `.take(100)` |
| `api.menu.createMenuOption`            | mutation | `{eventId, name, description?, sortOrder?}`        | `Id<"menuOptions">`                                         | `requireEventEditor(ctx, args.eventId)`   | none         |
| `api.menu.updateMenuOption`            | mutation | `{id, name?, description?, isActive?, sortOrder?}` | `void`                                                      | `requireEventEditor(ctx, option.eventId)` | none         |
| `api.menu.deleteMenuOption`            | mutation | `{id}`                                             | `void`                                                      | `requireEventEditor(ctx, option.eventId)` | none         |

Shared implementations: `listPublicOptions` (`convex/lib/options.ts:24`), `listAdminOptions`
(`:39`), `createOption` (`:53`), `updateOption` (`:74`), `deleteOption` (`:92`),
`nextSortOrder` (`:11`).

`nextSortOrder` reads up to 200 rows of the target table and returns
`max(sortOrder) + 1`, floored at `1` because the reduce seeds at `0`
(`convex/lib/options.ts:16-20`). It is shared with `tables.createTable` via the
`OptionTable | "tables"` parameter type (`:13`).

## 10. Business Rules

- **BR-11-F01-01** `[AS-BUILT]` — Creating an option sets `isActive: true` unconditionally; the
  create call cannot specify otherwise (`convex/lib/options.ts:69`).
- **BR-11-F01-02** `[AS-BUILT]` — When `sortOrder` is omitted, the server assigns
  `max(sortOrder among the event's rows) + 1` (`convex/lib/options.ts:70`, `:11-21`).
- **BR-11-F01-03** `[AS-BUILT]` — When `sortOrder` **is** supplied it is used verbatim, with no
  uniqueness or collision check (`convex/lib/options.ts:70`).
- **BR-11-F01-04** `[AS-BUILT]` — The public list returns only options with `isActive === true`
  (`convex/lib/options.ts:34`).
- **BR-11-F01-05** `[AS-BUILT]` — The admin list returns every option regardless of `isActive`
  (`convex/lib/options.ts:46-50`).
- **BR-11-F01-06** `[AS-BUILT]` — Both lists are returned ascending by `sortOrder`
  (`convex/lib/options.ts:35`, `:50`).
- **BR-11-F01-07** `[AS-BUILT]` — The public list requires no authentication and no event
  membership (`convex/menu.ts:12-18`).
- **BR-11-F01-08** `[AS-BUILT]` — Every non-public catering function requires at least the
  `editor` role on the option's own event (`convex/lib/options.ts:44`, `:63`, `:86`, `:98`).
- **BR-11-F01-09** `[AS-BUILT]` — `updateOption` and `deleteOption` resolve the option first and
  derive the event from `option.eventId`, so the guard is always scoped to the option's real
  event (`convex/lib/options.ts:84-86`, `:96-98`).
- **BR-11-F01-10** `[AS-BUILT]` — Updating or deleting a non-existent id throws
  `ConvexError("Option not found")` (`convex/lib/options.ts:85`, `:97`).
- **BR-11-F01-11** `[AS-BUILT]` — `updateOption` patches only the keys present in the args; an
  omitted key is left untouched because `id` is destructured out and the rest is spread
  (`convex/lib/options.ts:88-89`).
- **BR-11-F01-12** `[AS-BUILT]` — Deleting an option deletes only the option document; no guest
  reference is cleared (`convex/lib/options.ts:99`). See DEF-11-02.
- **BR-11-F01-13** `[AS-BUILT]` — A name of at least one character is required client-side
  (`src/lib/validations/menu.ts:4`); description is optional (`:5`).
- **BR-11-F01-14** `[AS-BUILT]` — An empty description submitted from the form is sent as
  `undefined`, never as an empty string (`menu-option-form.tsx:94`, `:104`).
- **BR-11-F01-15** `[AS-BUILT]` — The Active switch is rendered only in edit mode
  (`menu-option-form.tsx:140`), so activity cannot be chosen at creation time.
- **BR-11-F01-16** `[AS-BUILT]` — Deleting requires an explicit confirmation in an
  `AlertDialog`; toggling active does not (`menu-option-list.tsx:66-70`, `:78-102`).
- **BR-11-F01-17** `[AS-BUILT]` — The row Switch treats a missing `isActive` as `true`
  (`option.isActive ?? true`, `menu-option-list.tsx:67`), as does the edit form's reset (`:81`).

## 11. Acceptance Criteria

- **AC-11-F01-01** — **Given** an editor on the Food Options tab **When** they create an option
  named "Salmon" **Then** it appears in the list and is active by default. _(BR-11-F01-01)_
- **AC-11-F01-02** — **Given** an event whose highest food `sortOrder` is 3 **When** an option
  is created without `sortOrder` **Then** the new option's `sortOrder` is 4 and it sorts last.
  _(BR-11-F01-02, BR-11-F01-06)_
- **AC-11-F01-03** — **Given** an event with no food options **When** the first option is
  created **Then** its `sortOrder` is 1. _(BR-11-F01-02)_
- **AC-11-F01-04** — **Given** an option with `isActive: false` **When**
  `listMenuOptionsByEvent` is called **Then** the option is absent from the result, **and When**
  `listMenuOptionsByEventAdmin` is called **Then** it is present. _(BR-11-F01-04, BR-11-F01-05)_
- **AC-11-F01-05** — **Given** an unauthenticated caller **When** they call
  `listMenuOptionsByEvent` with any valid `eventId` **Then** the active options are returned
  without error. _(BR-11-F01-07)_
- **AC-11-F01-06** — **Given** a user with the `viewer` role **When** they call
  `listMenuOptionsByEventAdmin` **Then** the call throws `Insufficient permissions`.
  _(BR-11-F01-08)_
- **AC-11-F01-07** — **Given** an editor of event A **When** they call `updateMenuOption` with
  an option id belonging to event B **Then** the call throws. _(BR-11-F01-09)_
- **AC-11-F01-08** — **Given** an option with a description **When** it is updated with only
  `{id, isActive}` **Then** its `name` and `description` are unchanged. _(BR-11-F01-11)_
- **AC-11-F01-09** — **Given** the create dialog **When** the name field is empty and submit is
  pressed **Then** "Name is required" is shown and no mutation is sent. _(BR-11-F01-13)_
- **AC-11-F01-10** — **Given** the create dialog **Then** no Active switch is rendered; **Given**
  the edit dialog **Then** it is. _(BR-11-F01-15)_
- **AC-11-F01-11** — **Given** the row trash button is pressed **Then** nothing is deleted until
  the "Delete" action in the confirmation dialog is pressed. _(BR-11-F01-16)_
- **AC-11-F01-12** — **Given** a deleted option id **When** `deleteMenuOption` is called again
  with it **Then** the call throws `Option not found`. _(BR-11-F01-10)_
- **AC-11-F01-13** — **Given** a guest whose `menuOptionId` points at an option **When** that
  option is deleted **Then** the guest row still carries the now-dangling id. _(BR-11-F01-12,
  documents DEF-11-02)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                       |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| TC-11-F01-01 | unit        | `nextSortOrder` returns 1 for an empty table and `max+1` otherwise                                             |
| TC-11-F01-02 | unit        | `menuOptionSchema` rejects an empty name and accepts a missing description                                     |
| TC-11-F01-03 | integration | `listPublicOptions` excludes inactive rows; `listAdminOptions` includes them                                   |
| TC-11-F01-04 | integration | `createOption` inserts with `isActive: true` and the derived `sortOrder`                                       |
| TC-11-F01-05 | integration | `updateOption` with a partial patch leaves untouched fields intact                                             |
| TC-11-F01-06 | integration | `updateOption` / `deleteOption` throw `Option not found` for a stale id                                        |
| TC-11-F01-07 | integration | A `viewer` is rejected by every admin catering function; an `editor` is accepted                               |
| TC-11-F01-08 | integration | `deleteOption` leaves a referencing `guests.menuOptionId` in place (pins DEF-11-02 until fixed)                |
| TC-11-F01-09 | e2e         | Create → edit → deactivate → delete an option from the Food Options tab, asserting the toast copy at each step |
| TC-11-F01-10 | e2e         | The empty state renders for an event with no options and disappears after the first create                     |

### Manual QA checklist

- [ ] Create an option with only a name; confirm it appears active.
- [ ] Create three options and confirm they list in creation order.
- [ ] Toggle an option inactive and confirm it disappears from `listMenuOptionsByEvent` output.
- [ ] Edit an option's description to blank and confirm the field clears rather than storing `""`.
- [ ] Cancel the delete confirmation and confirm the option survives.
- [ ] Delete an option that a guest has selected, then reload the guest directory and note the
      empty Menu cell (DEF-11-02).
- [ ] Confirm the drinks tab behaves identically (EP-11-F02).

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No cap on options per event (TODO-11-01). Reads are bounded at 100 rows (`convex/lib/options.ts:32`, `:49`) and `nextSortOrder` at 200 (`:19`); beyond those the extra rows are silently invisible (TODO-11-05)                                                  |
| Performance      | Every read is a single `by_eventId` index scan. Sorting and the `isActive` filter happen in memory over ≤100 rows                                                                                                                                                |
| Security & authz | Writes are editor-gated on the option's own event. The **public list query has no guard**, so any actor holding an `eventId` can enumerate an event's active dish names (BR-11-F01-07)                                                                           |
| Accessibility    | The row Switch carries `aria-label="Active"` (`menu-option-list.tsx:69`); the edit-dialog switch is associated by `htmlFor="isActive"` (`menu-option-form.tsx:147`). The pencil and trash buttons are icon-only with **no** accessible name — a gap (TODO-11-09) |
| i18n             | Host-facing copy is hard-coded English. No i18n layer exists                                                                                                                                                                                                     |
| Analytics        | None. Catering CRUD is not activity-logged (TODO-11-06)                                                                                                                                                                                                          |

## 14. TODOs & Open Questions

- **DEF-11-02** `[P1]` — Deleting a catering option orphans every guest reference to it.
  - **Evidence:** `convex/lib/options.ts:92-100` — `deleteOption` guards, deletes the row, and
    returns. No `guests` query, no patch. `guests.menuOptionId` / `drinkOptionId` are plain
    optional ids with no referential integrity (`convex/schema.ts:145-146`).
  - **Impact:** The guest row keeps an id pointing at a deleted document.
    `getSelectionCounts` counts it as _assigned_ (the `if (guest.menuOptionId)` branch is truthy,
    `convex/menu.ts:45`), so the guest is missing from every option tally **and** from the
    "No selection" tally — the columns no longer add up to `totalGuests`. The guest directory's
    Menu cell renders `—` because the name lookup fails, which reads as "never chose" rather
    than "their dish was removed". `dashboard.getOverviewStats`'s `menuCompletionCount`
    (`convex/dashboard.ts:40`) over-reports for the same reason.
  - **Proposed fix:** `deleteOption` scans the event's guests via `by_eventId` and patches
    `menuOptionId` / `drinkOptionId` to `undefined` on every row referencing the deleted option,
    inside the same mutation. The confirmation dialog should additionally state how many guests
    will lose their selection.
- **TODO-11-01** `[P2]` `[ADD]` — No cap on the number of options per event.
  - **Rationale:** `createOption` (`convex/lib/options.ts:53-72`) performs no count check, unlike
    `specialEvents.createSpecialEvent` (`MAX_SPECIAL_EVENTS = 2`) and `media.register`
    (50 per event). Because reads stop at `.take(100)`, an event that crosses 100 options enters
    a state where new options exist but are invisible to both the dashboard and the public list.
  - **Proposed rule:** `createOption` throws once the event already holds 50 options in the
    target table, keeping the cap well below the read bound.
- **TODO-11-02** `[P2]` `[CHANGE]` — `sortOrder` is auto-assigned and never user-editable.
  - **Rationale:** The field is accepted by `createMenuOption` and `updateMenuOption`
    (`convex/menu.ts:74`, `:87`) but **no** caller in `src/` ever supplies it — the form sends
    only `name`, `description`, `isActive` (`menu-option-form.tsx:91-112`), and
    `MenuOptionList` renders no reorder control. Options therefore appear in creation order
    permanently; a host who adds the starter last cannot move it first.
  - **Proposed rule:** The option list offers move-up / move-down controls that swap `sortOrder`
    between adjacent rows, mirroring the template editor's block reordering.
- **TODO-11-05** `[P2]` `[CHANGE]` — Option reads truncate silently at 100 rows.
  - **Rationale:** `listPublicOptions` and `listAdminOptions` both `.take(100)`
    (`convex/lib/options.ts:32`, `:49`) with no indication that more exist, and `nextSortOrder`
    reads only 200 (`:19`) — beyond that, new options would collide on `sortOrder`.
  - **Proposed rule:** With TODO-11-01's cap in place the truncation becomes unreachable;
    until then the admin list should signal truncation to the client.
- **TODO-11-06** `[P2]` `[ADD]` — Catering changes are not activity-logged.
  - **Rationale:** `activityLogs.entity` covers guest, invitation, specialEvent, template and
    meta, but not catering, and no function in `convex/lib/options.ts` calls `logActivity`. On a
    shared event, a co-owner deleting a dish leaves no trace on
    `/dashboard/[eventSlug]/activity`.
  - **Proposed rule:** Add a `menuOption` / `drinkOption` entity to the activity union and log
    create/update/delete with the option name, following the guest mutation pattern.
- **TODO-11-07** `[P2]` `[ADD]` — An option cannot be created inactive.
  - **Rationale:** `isActive` is forced to `true` in `createOption` (`convex/lib/options.ts:69`)
    and the switch is hidden in create mode (`menu-option-form.tsx:140`). A host drafting next
    year's menu cannot stage options out of guest view; they must create then immediately
    deactivate, briefly exposing the dish publicly.
  - **Proposed rule:** `createOption` accepts an optional `isActive` defaulting to `true`, and
    the create dialog renders the same switch as edit mode.
- **TODO-11-08** `[P2]` `[ADD]` — No server-side bounds on `name` / `description`.
  - **Rationale:** `v.string()` is the only server constraint (`convex/menu.ts:72-73`), and the
    client schema enforces only `min(1)` on the name. A direct mutation call can store an
    arbitrarily long dish name, which the list truncates visually but the caterer's tally does
    not.
  - **Proposed rule:** Trim both fields and reject `name` longer than 100 characters or
    `description` longer than 500, mirroring the bounds `submitPublicRsvp` applies to free text
    (`convex/guests.ts:551-556`).

### Open questions

- **Q1** — Should deactivating an option that guests have already selected warn the host, or
  clear those selections? Today it does neither: the option vanishes publicly while the stale
  selections keep counting.
- **Q2** — Is the unauthenticated public option list intended? It lets anyone holding an
  `eventId` read an event's menu without an invitation slug. If not, it should resolve through
  `convex/lib/public.ts` by event slug like every other public query.
- **Q3** — Should a dish name be unique within an event? Nothing prevents two options named
  "Salmon", which makes the tally panel ambiguous.

## 15. Traceability

| Concern                    | Source                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| Route                      | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:21`                 |
| Sidebar nav                | `src/components/dashboard/dashboard-sidebar.tsx:52`                          |
| UI — list & toggle         | `src/components/menu/menu-option-list.tsx:32`, `:36-52`, `:66-70`, `:78-102` |
| UI — create/edit dialog    | `src/components/menu/menu-option-form.tsx:35`, `:87-115`, `:140-151`         |
| UI — empty state           | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:97-102`             |
| Backend — wrappers         | `convex/menu.ts:12`, `:20`, `:69`, `:81`, `:94`                              |
| Backend — shared logic     | `convex/lib/options.ts:11`, `:24`, `:39`, `:53`, `:74`, `:92`                |
| Guard                      | `convex/lib/options.ts:44`, `:63`, `:86`, `:98`                              |
| Schema                     | `convex/schema.ts:195-201` (`menuOptions`), `:145` (`guests.menuOptionId`)   |
| Validation                 | `src/lib/validations/menu.ts:3-7`                                            |
| Downstream — guest dialog  | `src/components/guests/guest-details-sheet.tsx:328-349`                      |
| Downstream — guest table   | `src/components/guests/guest-table.tsx:116-125`                              |
| Downstream — overview stat | `convex/dashboard.ts:40`                                                     |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                     |
| ------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------ |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-11-09 closed.** Row edit/delete/toggle controls carry accessible names and tooltips |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                             |
