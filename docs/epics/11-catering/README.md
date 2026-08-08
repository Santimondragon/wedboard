---
id: EP-11
title: Catering
version: 1.0.0
status: defective
last_updated: 2026-07-28
---

# EP-11 — Catering

## Purpose

Catering lets the host define what will be served — the food options and the drink options a
guest may pick from — and read back how many people chose each one. It answers the question
the venue and the caterer ask a few weeks before the event: _how many of each dish, how many
of each drink package?_

The whole epic lives on a single dashboard page, `/dashboard/[eventSlug]/menu`, titled
"Menu & Drinks" (`src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:70`), split into two
tabs: "Food Options" and "Drink Options" (`:74-82`). Each tab is an option list plus, once the
event has guests, a tally panel.

**The epic is incomplete in a way that matters.** Options can be authored and the backend is
ready to record a guest's choice, but there is no guest-facing control anywhere on the public
invitation that writes one. See [Known defects](#known-defects) and
[F03 §14](./F03-selection-reporting.md#14-todos--open-questions).

## Primary actor

**Editor+** (see [roles-and-permissions.md](../../roles-and-permissions.md)). Every catering
read and write goes through `requireEventEditor(ctx, eventId)` at its default `minRole` of
`"editor"` — except the two public list queries, which have no guard at all.

| Actor                | Access                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full                                                                                                                                                                                                  |
| Co-owner (`planner`) | Full                                                                                                                                                                                                  |
| Editor               | Full                                                                                                                                                                                                  |
| Viewer               | None — `listAdminOptions` and `getSelectionCounts` both use the default editor floor                                                                                                                  |
| Public guest         | May **read** the active option list of any event (`menu.listMenuOptionsByEvent`, `drinks.listDrinkOptionsByEvent` are unguarded); cannot write an option. No template block renders these lists today |

## Data model choice — two identical tables and one id per guest

Catering is modelled with the smallest possible surface. Two structurally identical tables:

| Table          | Fields                                                     | Index                                     |
| -------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `menuOptions`  | `eventId`, `name`, `description?`, `isActive`, `sortOrder` | `by_eventId` (`convex/schema.ts:195-201`) |
| `drinkOptions` | `eventId`, `name`, `description?`, `isActive`, `sortOrder` | `by_eventId` (`convex/schema.ts:203-209`) |

The two shapes are byte-for-byte the same, so **all behavior lives once** in
`convex/lib/options.ts`, parameterised by an `OptionTable` union
(`convex/lib/options.ts:8`). `convex/menu.ts` and `convex/drinks.ts` are thin wrappers that do
nothing but pass the table name through — every `menu.*` handler body is a single delegating
call, and so is every `drinks.*` handler body. This is why
[EP-11-F02](./F02-drink-options.md) is a deliberately short spec: it has no rules of its own.

A guest's choice is **one optional id on the guest row**, not a join table:

| Field                  | Type                  | Meaning                                             |
| ---------------------- | --------------------- | --------------------------------------------------- |
| `guests.menuOptionId`  | `Id<"menuOptions">?`  | The food option chosen; `undefined` = no selection  |
| `guests.drinkOptionId` | `Id<"drinkOptions">?` | The drink option chosen; `undefined` = no selection |

`convex/schema.ts:145-146`. Consequences, all documented as behavior in the feature specs:

1. **A guest holds at most one food and one drink choice.** Single-select is structural — there
   is only one field to write. Multi-select catering is not expressible.
2. **There is no index from an option to its guests.** Counting selections means scanning the
   event's guests (`convex/menu.ts:34-37`), which is exactly what `getSelectionCounts` does.
3. **Deleting an option does not clear the guest ids that referenced it.** `deleteOption`
   (`convex/lib/options.ts:92-100`) deletes the row and nothing else, leaving dangling ids on
   guest records. Tracked as **DEF-11-02**.
4. **`isActive` is a public-visibility flag, not a soft delete.** `listPublicOptions` filters
   on it (`convex/lib/options.ts:34`); `listAdminOptions` does not
   (`convex/lib/options.ts:46-50`). Existing guest selections pointing at a deactivated option
   are untouched and still counted.
5. **Catering is not activity-logged.** The `activityLogs.entity` union has no catering member,
   and no catering mutation calls `logActivity`. Tracked as **TODO-11-06**.

## Features

| ID        | Feature             | Status    | File                                                       |
| --------- | ------------------- | --------- | ---------------------------------------------------------- |
| EP-11-F01 | Menu (food) options | defective | [F01-menu-options.md](./F01-menu-options.md)               |
| EP-11-F02 | Drink options       | defective | [F02-drink-options.md](./F02-drink-options.md)             |
| EP-11-F03 | Selection reporting | defective | [F03-selection-reporting.md](./F03-selection-reporting.md) |

## Workflows

| ID       | Workflow                                  | Feature   |
| -------- | ----------------------------------------- | --------- |
| WF-11-01 | Add a food option to the event            | EP-11-F01 |
| WF-11-02 | Edit an existing catering option          | EP-11-F01 |
| WF-11-03 | Toggle an option active or inactive       | EP-11-F01 |
| WF-11-04 | Delete a catering option permanently      | EP-11-F01 |
| WF-11-05 | Add a drink option to the event           | EP-11-F02 |
| WF-11-06 | Review per-option guest selection tallies | EP-11-F03 |

## Backend surface

Every catering function is a wrapper over `convex/lib/options.ts`, except `getSelectionCounts`
which is implemented inline in `convex/menu.ts`.

| Function                                  | Type     | Guard                | Feature   |
| ----------------------------------------- | -------- | -------------------- | --------- |
| `api.menu.listMenuOptionsByEvent`         | query    | **none (public)**    | EP-11-F01 |
| `api.menu.listMenuOptionsByEventAdmin`    | query    | `requireEventEditor` | EP-11-F01 |
| `api.menu.createMenuOption`               | mutation | `requireEventEditor` | EP-11-F01 |
| `api.menu.updateMenuOption`               | mutation | `requireEventEditor` | EP-11-F01 |
| `api.menu.deleteMenuOption`               | mutation | `requireEventEditor` | EP-11-F01 |
| `api.menu.getSelectionCounts`             | query    | `requireEventEditor` | EP-11-F03 |
| `api.drinks.listDrinkOptionsByEvent`      | query    | **none (public)**    | EP-11-F02 |
| `api.drinks.listDrinkOptionsByEventAdmin` | query    | `requireEventEditor` | EP-11-F02 |
| `api.drinks.createDrinkOption`            | mutation | `requireEventEditor` | EP-11-F02 |
| `api.drinks.updateDrinkOption`            | mutation | `requireEventEditor` | EP-11-F02 |
| `api.drinks.deleteDrinkOption`            | mutation | `requireEventEditor` | EP-11-F02 |

Note there is **no** `drinks.getSelectionCounts`. The single `menu.getSelectionCounts` returns
both tallies (`convex/menu.ts:59-65`), and the drinks tab of the page consumes the drink half of
that same result (`.../menu/page.tsx:149-155`).

## Dependencies

| Depends on               | Why                                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EP-02 (Event setup)      | Options are event-scoped; the page resolves its event through `useEvent()` (`.../menu/page.tsx:22`)                                                                                                                                                                        |
| EP-03-F01 (Role model)   | Every guard resolves through `convex/lib/permissions.ts`                                                                                                                                                                                                                   |
| EP-04 (Guest management) | The only path that actually writes `guests.menuOptionId` / `drinkOptionId` today is the host-side guest dialog (`src/components/guests/guest-details-sheet.tsx:328-372`); the guest directory renders Menu/Drink columns (`src/components/guests/guest-table.tsx:116-135`) |

Depended on by:

| Dependent                 | Why                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EP-04-F03 (Edit guest)    | Its Menu/Drink selects are populated from `getGuestsPageData`'s `menuOptions`/`drinkOptions` (`convex/guests.ts:80-87`, `:128-129`)                                            |
| EP-07-F02 (Public RSVP)   | `guests.submitPublicRsvp` accepts and ownership-validates `menuOptionId`/`drinkOptionId` (`convex/guests.ts:478-479`, `:558-569`) — the contract exists, the guest UI does not |
| EP-08-F05 (Block catalog) | `menuSelection` and `drinkSelection` are catalogued block types (`src/components/public-invitation/blocks.ts:17-18`, `:212-221`, `:254-255`) that no template implements       |
| EP-14-F01 (Insights)      | `dashboard.getOverviewStats` derives `menuCompletionCount` from `guests.menuOptionId` (`convex/dashboard.ts:40`)                                                               |

## Known defects

| ID        | Priority | Summary                                                                                                                                                                                                                                               | Documented in                                                          |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| DEF-11-01 | P1       | No guest-facing catering selection exists: `menuSelection`/`drinkSelection` have no template component, the elegant `rsvp` block never sends the ids, and the `allergies` block writes free text only — so every guest is reported unassigned forever | [EP-11-F03 §14](./F03-selection-reporting.md#14-todos--open-questions) |
| DEF-11-02 | P1       | `deleteOption` leaves `guests.menuOptionId` / `guests.drinkOptionId` pointing at a deleted row; the tally shows the guest as assigned to nothing, the guest table shows a blank cell                                                                  | [EP-11-F01 §14](./F01-menu-options.md#14-todos--open-questions)        |

## Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built epic overview |
