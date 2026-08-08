---
id: EP-11-F02
title: Drink Options
epic: EP-11 Catering
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-11-F01]
---

# EP-11-F02 — Drink Options

## 1. Summary

Drink options are the beverage choices an event offers. They are **structurally identical** to
menu options: the same table shape, the same shared handlers in `convex/lib/options.ts`, the
same React components, the same zod schema. This spec exists so the drinks half of the product
has an addressable id and a stated status — it is deliberately short, because there is
essentially nothing here that is not already specified in
[EP-11-F01](./F01-menu-options.md).

> **Every rule, acceptance criterion, test case, state, copy string and open question in
> [EP-11-F01](./F01-menu-options.md) applies verbatim to drink options**, substituting
> `drinkOptions` for `menuOptions`, `drinks.*` for `menu.*`, and the label "Drink" for "Menu".
> `BR-11-F01-NN` should be read as governing both tables.

## 2. Actors & Permissions

Identical to [EP-11-F01 §2](./F01-menu-options.md#2-actors--permissions). The gate is
`requireEventEditor(ctx, eventId)` at the default `minRole: "editor"`, applied inside the same
shared helpers (`convex/lib/options.ts:44`, `:63`, `:86`, `:98`).
`drinks.listDrinkOptionsByEvent` is likewise unguarded (`convex/drinks.ts:11-17`).

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-11-F02-01** — As an editor, I want to define the drink packages the bar will serve so
  that guests and the venue share one vocabulary.
- **US-11-F02-02** — As an editor, I want drinks managed exactly like food so that I only learn
  the interaction once.

## 4. Entry Points

| Entry point                      | Route / control                                           | Actor   |
| -------------------------------- | --------------------------------------------------------- | ------- |
| "Drink Options" tab              | `/dashboard/[eventSlug]/menu` (`.../menu/page.tsx:78-81`) | Editor+ |
| "Add Option" button (drinks tab) | `.../menu/page.tsx:127-130`                               | Editor+ |

## 5. UX Flow

Identical to [EP-11-F01 §5](./F01-menu-options.md#5-ux-flow). The page passes
`type="drink"` to the shared components, which switches the mutation and the dialog label
(`menu-option-form.tsx:43`, `:89-90`, `:107-112`; `menu-option-list.tsx:38-48`).

### Alternate & edge paths

- **A1** — The drinks tab renders its own `EmptyState` with the `Wine` icon
  (`.../menu/page.tsx:135-140`).
- **E1** — Errors and validation behave exactly as in F01; only the delete toast copy differs
  (`.../menu/page.tsx:32-35`).

## 6. States

Identical to [EP-11-F01 §6](./F01-menu-options.md#6-states), except that the empty state reads
**"No drink options yet"** / **"Add drink options for your guests to select from"** with the
`Wine` icon (`.../menu/page.tsx:136-140`), and the count line reads
`${drinkOptions.length} options` (`.../menu/page.tsx:125`).

## 7. UI Specification

### Screens & components

| Element              | Component                         | Path                                                          |
| -------------------- | --------------------------------- | ------------------------------------------------------------- |
| Drinks tab           | `MenuPage`                        | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:122` |
| Option rows          | `MenuOptionList` (`type="drink"`) | `src/components/menu/menu-option-list.tsx:32`                 |
| Create / edit dialog | `MenuOptionForm` (`type="drink"`) | `src/components/menu/menu-option-form.tsx:35`                 |
| Tally panel          | `SelectionSummary`                | `src/components/menu/selection-summary.tsx:15`                |

There is **no** `drinks/` component directory — drinks reuse `src/components/menu/*`.

### Fields & validation

Identical to [EP-11-F01 §7](./F01-menu-options.md#7-ui-specification): the same
`menuOptionSchema` validates drink options (`menu-option-form.tsx:69`,
`src/lib/validations/menu.ts:3-7`). There is no `drink.ts` validator.

### Copy deck

Host-facing English only. Only the strings that genuinely differ from F01 are listed.

| Key                  | Copy                                               | Source                            |
| -------------------- | -------------------------------------------------- | --------------------------------- |
| Drinks tab           | "Drink Options"                                    | `.../menu/page.tsx:80`            |
| Empty title          | "No drink options yet"                             | `.../menu/page.tsx:138`           |
| Empty description    | "Add drink options for your guests to select from" | `.../menu/page.tsx:139`           |
| Create dialog title  | "Add Drink Option"                                 | `menu-option-form.tsx:43`, `:122` |
| Edit dialog title    | "Edit Drink Option"                                | `menu-option-form.tsx:43`, `:122` |
| Toast — created      | "Drink option created"                             | `menu-option-form.tsx:53-54`      |
| Toast — updated      | "Drink option updated"                             | `menu-option-form.tsx:57-58`      |
| Toast — deleted      | "Drink option deleted"                             | `.../menu/page.tsx:33`            |
| Toast — delete error | "Failed to delete drink option"                    | `.../menu/page.tsx:34`            |

## 8. Data Model

| Table          | Fields                                                     | Read / Write              | Index                                 |
| -------------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------- |
| `drinkOptions` | `eventId`, `name`, `description?`, `isActive`, `sortOrder` | Read + Write              | `by_eventId` (`convex/schema.ts:209`) |
| `guests`       | `drinkOptionId?`                                           | Read only in this feature | `by_eventId`                          |

`drinkOptions` (`convex/schema.ts:203-209`) declares exactly the same five fields and the same
single index as `menuOptions` (`:195-201`). A guest's drink choice is one optional id,
`guests.drinkOptionId` (`convex/schema.ts:146`).

Cascade behavior is identical, which means it is identically absent: `deleteOption` leaves
`guests.drinkOptionId` dangling. This is the same **DEF-11-02** filed in
[EP-11-F01 §14](./F01-menu-options.md#14-todos--open-questions) and is why this spec's status is
`defective` rather than `implemented`.

## 9. Backend Contract

| Function                                  | Type     | Args                                               | Returns                                                      | Guard                | Caps         |
| ----------------------------------------- | -------- | -------------------------------------------------- | ------------------------------------------------------------ | -------------------- | ------------ |
| `api.drinks.listDrinkOptionsByEvent`      | query    | `{eventId}`                                        | `Doc<"drinkOptions">[]` — active only, `sortOrder` ascending | **none**             | `.take(100)` |
| `api.drinks.listDrinkOptionsByEventAdmin` | query    | `{eventId}`                                        | `Doc<"drinkOptions">[]` — all                                | `requireEventEditor` | `.take(100)` |
| `api.drinks.createDrinkOption`            | mutation | `{eventId, name, description?, sortOrder?}`        | `Id<"drinkOptions">`                                         | `requireEventEditor` | none         |
| `api.drinks.updateDrinkOption`            | mutation | `{id, name?, description?, isActive?, sortOrder?}` | `void`                                                       | `requireEventEditor` | none         |
| `api.drinks.deleteDrinkOption`            | mutation | `{id}`                                             | `void`                                                       | `requireEventEditor` | none         |

Every handler body is a single delegating call to the shared helper with
`"drinkOptions"` as the table argument (`convex/drinks.ts:15`, `:22`, `:34`, `:47`, `:54`).

**There is no `drinks.getSelectionCounts`.** Drink tallies come from `menu.getSelectionCounts`,
which returns `drinkCounts` and `drinkUnassigned` alongside the food figures — see
[EP-11-F03](./F03-selection-reporting.md).

## 10. Business Rules

The drink table is governed entirely by the shared rules **BR-11-F01-01 … BR-11-F01-17**
([EP-11-F01 §10](./F01-menu-options.md#10-business-rules)), which execute in
`convex/lib/options.ts` and are table-agnostic. Only these are specific to drinks:

- **BR-11-F02-01** `[AS-BUILT]` — Drink options are stored in the `drinkOptions` table and are
  never mixed with `menuOptions`; the table name is fixed per wrapper module and cannot be
  chosen by the caller (`convex/drinks.ts:15`, `:22`, `:34`).
- **BR-11-F02-02** `[AS-BUILT]` — `sortOrder` is computed within `drinkOptions` only, so food
  and drink numbering are independent sequences (`convex/lib/options.ts:16-20`, called with the
  wrapper's own table).
- **BR-11-F02-03** `[AS-BUILT]` — Drink options are validated by `menuOptionSchema`; no
  drink-specific validation exists (`menu-option-form.tsx:69`).

## 11. Acceptance Criteria

- **AC-11-F02-01** — **Given** an editor on the Drink Options tab **When** they create
  "Open bar" **Then** it appears in the drinks list and does not appear in the food list.
  _(BR-11-F02-01)_
- **AC-11-F02-02** — **Given** an event with three food options and no drink options **When** a
  drink option is created **Then** its `sortOrder` is 1, not 4. _(BR-11-F02-02)_
- **AC-11-F02-03** — **Given** every acceptance criterion AC-11-F01-01 … AC-11-F01-13 **When**
  each is re-run against `api.drinks.*` **Then** each holds unchanged.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                      |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-11-F02-01 | integration | The F01 shared-helper suite (TC-11-F01-03 … TC-11-F01-08) is parameterised over both `"menuOptions"` and `"drinkOptions"` and passes for both |
| TC-11-F02-02 | integration | Creating a drink option does not affect food `sortOrder` and vice versa                                                                       |
| TC-11-F02-03 | e2e         | Create → edit → deactivate → delete a drink option from the Drink Options tab                                                                 |

### Manual QA checklist

- [ ] Create a drink option and confirm the food tab is unchanged.
- [ ] Confirm the dialog title reads "Add Drink Option", not "Add Menu Option".
- [ ] Confirm the drinks empty state uses the wine-glass icon.

## 13. Non-Functional

Identical to [EP-11-F01 §13](./F01-menu-options.md#13-non-functional) in every row: the same
absent cap, the same 100-row read bound, the same unguarded public query, the same missing
icon-button labels, the same absence of activity logging.

## 14. TODOs & Open Questions

No drink-specific defects or gaps. Every item filed in
[EP-11-F01 §14](./F01-menu-options.md#14-todos--open-questions) — **DEF-11-02**, **TODO-11-01**,
**TODO-11-02**, **TODO-11-05** … **TODO-11-09** — is implemented in the shared helper and
therefore applies to `drinkOptions` identically. They are not restated here; fixing them once in
`convex/lib/options.ts` fixes both tables.

**DEF-11-01** ([EP-11-F03 §14](./F03-selection-reporting.md#14-todos--open-questions)) applies
symmetrically: `drinkSelection` is a catalogued block type with no implementation
(`src/components/public-invitation/blocks.ts:217-221`,
`src/components/public-invitation/templates/elegant/blocks/index.ts:15-27`), so no guest ever
sets `guests.drinkOptionId` from the public page.

### Open questions

- **Q4** — Should drinks ever diverge from food (for example, allowing multiple drink
  selections per guest)? Today the single shared helper makes divergence a refactor, not a
  configuration.

## 15. Traceability

| Concern                  | Source                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Route                    | `src/app/(dashboard)/dashboard/[eventSlug]/menu/page.tsx:122-158`                                              |
| UI                       | `src/components/menu/menu-option-list.tsx:32` (shared), `src/components/menu/menu-option-form.tsx:35` (shared) |
| Backend                  | `convex/drinks.ts:11`, `:19`, `:26`, `:38`, `:51`                                                              |
| Shared logic             | `convex/lib/options.ts:24`, `:39`, `:53`, `:74`, `:92`                                                         |
| Schema                   | `convex/schema.ts:203-209` (`drinkOptions`), `:146` (`guests.drinkOptionId`)                                   |
| Validation               | `src/lib/validations/menu.ts:3-7` (shared)                                                                     |
| Unimplemented block type | `src/components/public-invitation/blocks.ts:217-221`                                                           |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
