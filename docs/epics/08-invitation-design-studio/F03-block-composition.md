---
id: EP-08-F03
title: Block Composition
epic: EP-08 Invitation Design Studio
version: 1.1.0
status: defective
last_updated: 2026-08-09
depends_on: [EP-08-F01, EP-08-F02]
---

# EP-08-F03 — Block Composition

## 1. Summary

A [Layout](../../glossary.md) is an ordered list of [Blocks](../../glossary.md), and this
feature is how the host builds that list: pick a block type from a palette to append it, move a
block up or down, duplicate it, or remove it. Composition is deliberately unconstrained — the
same block type may appear any number of times in one layout, which is what lets a host write
three separate paragraphs or place two special-invitation cards on the same page. Everything the
host does here is **local state until "Save layout" is pressed**: there is no autosave, no undo,
no draft/publish separation and no unsaved-changes guard, which is the source of this feature's
defects.

## 2. Actors & Permissions

| Actor                | Access   | Notes                                                |
| -------------------- | -------- | ---------------------------------------------------- |
| Owner                | Full     | Composes and saves                                   |
| Co-owner (`planner`) | Full     | Same as owner                                        |
| Editor               | Full     | Composition is content                               |
| Viewer               | None     | Read-blocked by the `editor` floor                   |
| Public guest         | Indirect | Sees the composed order on the rendered page (EP-07) |

The gate is `requireEventEditor(ctx, args.eventId, "editor")` (`convex/events.ts:216`). Role
semantics live in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-08-F03-01** — As an Editor, I want to add a section to my invitation from a list of
  available section types, so that I can build the page my wedding actually needs.
- **US-08-F03-02** — As an Editor, I want a newly added block to arrive pre-filled with sensible
  copy, so that I am editing rather than starting from a blank field.
- **US-08-F03-03** — As an Editor, I want to move a block up or down, so that I control the
  order guests read the page in.
- **US-08-F03-04** — As an Editor, I want to duplicate a block with its content, so that I can
  create a similar section without re-typing it.
- **US-08-F03-05** — As an Editor, I want to remove a block I do not need.
- **US-08-F03-06** — As an Editor, I want to use the same block type more than once, so that I
  can have several paragraphs of text in different places on the page.
- **US-08-F03-07** — As an Editor, I want the block list to stay manageable when it grows long,
  so that I can find the block I am looking for.

## 4. Entry Points

| Entry point               | Route / control                                                                                   | Actor   |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| "Add block" select        | `Select` under the Blocks heading (`src/components/template-selection/template-settings.tsx:266`) | Editor+ |
| Move up / Move down       | Per-block icon buttons (`src/components/template-selection/template-settings.tsx:308`, `:315`)    | Editor+ |
| Duplicate                 | Per-block icon button (`src/components/template-selection/template-settings.tsx:322`)             | Editor+ |
| Remove                    | Per-block icon button (`src/components/template-selection/template-settings.tsx:328`)             | Editor+ |
| Expand / collapse a block | Per-block disclosure button (`src/components/template-selection/template-settings.tsx:293`)       | Editor+ |
| Save                      | "Save layout" (`src/components/template-selection/template-settings.tsx:385`)                     | Editor+ |

All controls act on the currently active RSVP variant tab (EP-08-F02).

## 5. UX Flow

### Happy path — add a block

1. The Editor opens the "Add block" `Select`; its options are `BLOCK_PALETTE` in declared order,
   each labeled from `BLOCK_DEFS[type].label`
   (`src/components/template-selection/template-settings.tsx:274`–`:277`).
2. Choosing an option calls `addBlock(type)` (`:266`).
3. `addBlock` reads the seed config from
   `resolveTemplate(templateId).defaultBlockConfig?.[type]` (`:117`) and the event-derived config
   from `deriveEventConfig(event, type)` (`:118`).
4. `createBlock(type)` mints a `LayoutBlock` with a fresh id and an empty config
   (`src/components/public-invitation/blocks.ts:292`).
5. The new block's config is overwritten with `{...seed, ...eventDerived}`
   (`template-settings.tsx:121`) and the block is **appended to the end** of the active variant's
   list (`:122`).
6. The `Select` itself is controlled with `value=""` (`:266`), so it never displays a selection
   and always shows the "Add block" placeholder — it behaves as a menu, not a field.
7. The live preview updates immediately.
8. Nothing is persisted until "Save layout" is pressed.

### Happy path — reorder, duplicate, remove

1. **Move up / down** — `moveBlock(index, -1 | 1)` swaps the block with its neighbour, returning
   the list unchanged when the target index is out of range (`:146`–`:154`). Move up is disabled
   on the first block, move down on the last (`:311`, `:318`).
2. **Duplicate** — `duplicateBlock(id)` copies the source block, mints a new id via
   `createBlock(source.type).id`, shallow-copies its config, and inserts the copy **immediately
   after** the source (`:130`–`:144`).
3. **Remove** — `removeBlock(id)` filters the block out (`:126`–`:128`). There is no confirmation
   and no undo.
4. Each list row shows only the block type's label plus its four action buttons; the block's
   config fields are hidden until the row is expanded (`:286`, `:337`).

### Alternate & edge paths

- **A1** — A block type already in the layout is added again → a second instance is appended;
  nothing dedupes or warns (`template-settings.tsx:119`–`:123`).
- **A2** — A block type is added whose `BLOCK_DEFS` entry has no fields (`countdown`,
  `menuSelection`, `drinkSelection`) → the row expands to nothing: `visibleFields.length === 0`
  returns `null` (`:345`).
- **A3** — `menuSelection` or `drinkSelection` is added → the block appears in the list, saves
  successfully, and renders nothing at all, because `ELEGANT_BLOCKS` has no component for either
  type (`src/components/public-invitation/templates/elegant/blocks/index.ts:15`–`:27`;
  `src/components/public-invitation/templates/invitation-template.tsx:42`). The editor gives no
  warning — see DEF-08-03; the catalog half of this belongs to
  [EP-08-F05](./F05-block-catalog.md).
- **A4** — Duplicating a block that holds a `list` config (e.g. `itinerary.items`) → the config
  is copied **shallowly** (`:138`), so the copy and the original share the same array reference
  until one of them is reassigned by an edit.
- **A5** — The Editor navigates away (sidebar link, browser back, tab close) with unsaved
  composition → every change is lost silently; no dialog, no `beforeunload` handler (DEF-08-02).
- **A6** — The Editor switches RSVP variant tabs mid-edit → the other variant's in-memory edits
  are preserved; only Save or a page unload ends them (`template-settings.tsx:110`–`:114`).
- **A7** — A saved layout contains a block whose `type` is not in `BLOCK_DEFS` → it is dropped
  when the studio loads, with no notice (`template-settings.tsx:81`, TODO-08-11).
- **E1** — The save fails → toast "Failed to save layout"; the composed list survives in memory
  and can be retried.

## 6. States

| State             | Behavior                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The block list is seeded synchronously; there is no spinner. The `media` and `specialEvents` queries feeding the expanded config fields load separately and are passed as possibly-`undefined` (`template-settings.tsx:354`–`:355`).                     |
| Empty             | If every block is removed, the list renders as an empty `<ul>` with no empty-state message and no guidance; the preview shows the bare template frame. On save, the empty array is treated as "unset" and the default returns (EP-08-F02, BR-08-F02-07). |
| Error             | Save failure toasts "Failed to save layout"; composition is untouched.                                                                                                                                                                                   |
| Success           | Toast "Invitation layout saved". The list, the expanded/collapsed set and the active tab are all unchanged.                                                                                                                                              |
| Disabled / locked | "Move up" is disabled at index 0 and "Move down" at the last index (`:311`, `:318`). No other control is ever disabled — including for block types the template cannot render.                                                                           |
| Mobile            | Blocks list is `overflow-y-auto` inside a `min-h-0 flex-1` column (`:283`); below `lg` the list and preview stack. The four action buttons are 28×28 px (`h-7 w-7`, `:439`), below the 44 px touch-target guideline.                                     |

## 7. UI Specification

### Screens & components

| Element                  | Component                                                   | Path                                                                                |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Studio shell             | `TemplateSettings`                                          | `src/components/template-selection/template-settings.tsx:45`                        |
| "Add block" menu         | `Select` / `SelectItem` per `BLOCK_PALETTE`                 | `src/components/template-selection/template-settings.tsx:266`                       |
| Block list               | `<ul>` over the active variant                              | `src/components/template-selection/template-settings.tsx:283`                       |
| Block row disclosure     | inline `<button aria-expanded>` + `ChevronRight`            | `src/components/template-selection/template-settings.tsx:293`                       |
| Action buttons           | `IconButton` (ghost `Button`, `aria-label` + `title`)       | `src/components/template-selection/template-settings.tsx:423`                       |
| Config fields (expanded) | `ConfigFieldInput`                                          | `src/components/template-selection/config-field-input.tsx` (specified in EP-08-F04) |
| Block model              | `LayoutBlock`, `BLOCK_DEFS`, `BLOCK_PALETTE`, `createBlock` | `src/components/public-invitation/blocks.ts:33`, `:90`, `:244`, `:292`              |

### Fields & validation

| Field                | Type                      | Required | Rule                                                                                                                                                                                                 | Message |
| -------------------- | ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Add-block selection  | `BlockType`               | No       | Must be one of `BLOCK_PALETTE`; the control is write-only (`value=""`)                                                                                                                               | None    |
| `LayoutBlock.id`     | string                    | Yes      | `${type}-${crypto.randomUUID()}`, falling back to `${type}-${Math.random().toString(36).slice(2)}` when `crypto.randomUUID` is unavailable (`src/components/public-invitation/blocks.ts:284`–`:290`) | None    |
| `LayoutBlock.type`   | string                    | Yes      | Server accepts any string (`convex/schema.ts:11`); the editor only ever produces a `BlockType`                                                                                                       | None    |
| `LayoutBlock.config` | `Record<string, unknown>` | No       | `v.optional(v.any())` — completely unvalidated server-side (`convex/schema.ts:10`)                                                                                                                   | None    |

There is no zod schema and no client-side validation of composition: no minimum block count, no
maximum, no required-block rule, no duplicate-type rule.

### Copy deck

All composition chrome is English dashboard copy.

| Key                   | Copy                      | Source                                                        |
| --------------------- | ------------------------- | ------------------------------------------------------------- |
| Blocks heading        | `Blocks`                  | `src/components/template-selection/template-settings.tsx:249` |
| Add-block placeholder | `Add block`               | `src/components/template-selection/template-settings.tsx:270` |
| Move-up label         | `Move up`                 | `src/components/template-selection/template-settings.tsx:309` |
| Move-down label       | `Move down`               | `src/components/template-selection/template-settings.tsx:316` |
| Duplicate label       | `Duplicate`               | `src/components/template-selection/template-settings.tsx:323` |
| Remove label          | `Remove`                  | `src/components/template-selection/template-settings.tsx:329` |
| Save button           | `Save layout` / `Saving…` | `src/components/template-selection/template-settings.tsx:391` |

Block row labels come from `BLOCK_DEFS[type].label` (`src/components/public-invitation/blocks.ts:90`):
`Hero`, `Text`, `Location & Address`, `Countdown`, `Itinerary`, `Dress Code`,
`Special Invitation`, `RSVP (per guest)`, `Allergies (per guest)`,
`Menu Selection (per guest)`, `Drink Selection (per guest)`, `Message to the host`, `Footer`.
The per-type `description` strings exist in `BLOCK_DEFS` but are **not rendered anywhere in the
block list or the add menu**.

## 8. Data Model

| Table           | Fields                                       | Read / Write                                                      | Index        |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| `events`        | `layoutVariants.{pending,accepted,declined}` | Read at editor init / Write on save                               | —            |
| `events`        | `templateId`                                 | Read — selects the `defaultBlockConfig` used to seed added blocks | —            |
| `media`         | via `media.listByEvent`                      | Read — feeds `image` config fields of expanded blocks             | `by_eventId` |
| `specialEvents` | via `specialEvents.listByEvent`              | Read — feeds the `specialEventId` select                          | `by_eventId` |
| `activityLogs`  | `entity: "template"`, `action: "update"`     | Write on save                                                     | `by_eventId` |

A `LayoutBlock` is not a row — it is an element of a JSON array on the event document, validated
only as `{id: string, type: string, config?: any}` (`convex/schema.ts:7`).

### Cascades and lifecycle

Removing a block has **no cascade**: a block that references a `media` id or a `specialEventId`
in its config is deleted along with that reference, and neither the media item nor the special
invitation is affected. The inverse also holds — deleting a media item or a special invitation
leaves any block still pointing at its id, which then resolves to nothing at render time (media
ids that no longer belong to the event are skipped by the public query's resolver,
`convex/invitations.ts:195`–`:205`).

Because layouts live on the event, composition changes take effect for **every invitation of the
event at once**, as soon as the save lands — there is no staging.

## 9. Backend Contract

| Function                           | Type     | Args                                                     | Returns            | Guard                                                                 | Caps                                                    |
| ---------------------------------- | -------- | -------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------- |
| `api.events.setInvitationTemplate` | mutation | `{eventId, templateId?, layoutBlocks?, layoutVariants?}` | `void`             | `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) | None — no block count, id-uniqueness or type validation |
| `api.media.listByEvent`            | query    | `{eventId}`                                              | media rows + `url` | `requireEventEditor`                                                  | Feeds image config fields                               |
| `api.specialEvents.listByEvent`    | query    | `{eventId}`                                              | special events     | `requireEventEditor`                                                  | Feeds the `specialEventId` select                       |

There is no dedicated add/reorder/remove mutation — composition is entirely client-side until the
whole layout is written.

## 10. Business Rules

- **BR-08-F03-01** `[AS-BUILT]` — The add menu offers exactly the thirteen types of
  `BLOCK_PALETTE`, in its declared order: `text`, `hero`, `location`, `countdown`, `itinerary`,
  `dressCode`, `specialInvitation`, `rsvp`, `allergies`, `menuSelection`, `drinkSelection`,
  `guestMessage`, `footer` (`src/components/public-invitation/blocks.ts:244`).
- **BR-08-F03-02** `[AS-BUILT]` — Adding a block appends it to the end of the active variant's
  list (`template-settings.tsx:122`).
- **BR-08-F03-03** `[AS-BUILT]` — A newly added block's config is seeded from the resolved
  template's `defaultBlockConfig[type]`, then overlaid with event-derived values
  (`template-settings.tsx:117`–`:121`).
- **BR-08-F03-04** `[AS-BUILT]` — The only event-derived seed is for `location`, which pre-fills
  `address` from `venueName` + `venueAddress` and `buttonUrl` from `venueMapUrl` (or a Google
  Maps search URL built from the address) (`template-settings.tsx:410`–`:421`).
- **BR-08-F03-05** `[AS-BUILT]` — `createBlock(type)` returns `{id, type, config: {}}` where the
  id is `${type}-${uuid}`, using `crypto.randomUUID()` when available and a
  `Math.random().toString(36).slice(2)` suffix otherwise
  (`src/components/public-invitation/blocks.ts:284`–`:294`).
- **BR-08-F03-06** `[AS-BUILT]` — A block's `id` is its React key and its reorder/duplicate/
  remove identity (`src/components/public-invitation/blocks.ts:34`;
  `template-settings.tsx:289`).
- **BR-08-F03-07** `[AS-BUILT]` — The same block type may appear any number of times in one
  layout; nothing dedupes or limits repetition (`template-settings.tsx:119`; the elegant
  `accepted` preset itself ships two `text` blocks,
  `src/components/public-invitation/templates/elegant/default-layout.ts:12`, `:15`).
- **BR-08-F03-08** `[AS-BUILT]` — "Move up" swaps a block with its predecessor and "Move down"
  with its successor; an out-of-range target leaves the list unchanged
  (`template-settings.tsx:146`–`:154`).
- **BR-08-F03-09** `[AS-BUILT]` — "Move up" is disabled on the first block and "Move down" on the
  last (`template-settings.tsx:311`, `:318`).
- **BR-08-F03-10** `[AS-BUILT]` — Duplicating a block inserts the copy immediately after the
  source (`template-settings.tsx:141`).
- **BR-08-F03-11** `[AS-BUILT]` — A duplicated block receives a new id, so the original and the
  copy are independently addressable (`template-settings.tsx:137`).
- **BR-08-F03-12** `[AS-BUILT]` — A duplicated block's config is a **shallow** copy, so nested
  values such as a `list` array are shared with the source until reassigned
  (`template-settings.tsx:138`).
- **BR-08-F03-13** `[AS-BUILT]` — Removing a block takes effect immediately with no confirmation
  dialog (`template-settings.tsx:126`–`:128`, `:328`).
- **BR-08-F03-14** `[AS-BUILT]` — All four composition actions apply only to the active RSVP
  variant (`template-settings.tsx:110`–`:114`).
- **BR-08-F03-15** `[AS-BUILT]` — Every composition action mutates local React state only;
  nothing reaches Convex until "Save layout" is pressed
  (`template-settings.tsx:194`).
- **BR-08-F03-16** `[AS-BUILT]` — Blocks are collapsed on mount; the expanded set starts empty
  and is tracked by block id (`template-settings.tsx:97`–`:106`).
- **BR-08-F03-17** `[AS-BUILT]` — An expanded block whose visible-field list is empty renders no
  config panel at all (`template-settings.tsx:345`).
- **BR-08-F03-18** `[AS-BUILT]` — The block row shows the type's `label` only; the type's
  `description` from `BLOCK_DEFS` is never displayed (`template-settings.tsx:305`).
- **BR-08-F03-19** `[AS-BUILT]` — Reordering is available only through the up/down buttons; there
  is no drag-and-drop affordance anywhere in the list (`template-settings.tsx:308`–`:321`).
- **BR-08-F03-20** `[AS-BUILT]` — The add control is a `Select` bound to `value=""`, so it
  always shows the "Add block" placeholder and never reflects the last-added type
  (`template-settings.tsx:266`).

## 11. Acceptance Criteria

- **AC-08-F03-01** — **Given** the studio is open **When** the "Add block" menu is opened
  **Then** thirteen options appear in `BLOCK_PALETTE` order with their `BLOCK_DEFS` labels.
  _(BR-08-F03-01)_
- **AC-08-F03-02** — **Given** a layout of N blocks **When** a block type is chosen from the menu
  **Then** the list has N+1 blocks and the new one is last. _(BR-08-F03-02)_
- **AC-08-F03-03** — **Given** an event with `venueName` and `venueAddress` set **When** a
  `location` block is added and expanded **Then** its Address field is pre-filled with
  `"{venueName}, {venueAddress}"`. _(BR-08-F03-04)_
- **AC-08-F03-04** — **Given** an event with no `venueMapUrl` but an address **When** a
  `location` block is added **Then** its Button URL is a Google Maps search URL for that address.
  _(BR-08-F03-04)_
- **AC-08-F03-05** — **Given** a layout already containing a `text` block **When** another `text`
  block is added **Then** both are present, independently editable, and neither is flagged.
  _(BR-08-F03-07)_
- **AC-08-F03-06** — **Given** a block at index 0 **When** the row is inspected **Then** its
  "Move up" button is disabled and its "Move down" button is enabled. _(BR-08-F03-09)_
- **AC-08-F03-07** — **Given** three blocks A, B, C **When** "Move down" is pressed on A **Then**
  the order is B, A, C and the preview reflects it. _(BR-08-F03-08)_
- **AC-08-F03-08** — **Given** a configured block **When** "Duplicate" is pressed **Then** a copy
  with identical config and a **different** id appears directly beneath it.
  _(BR-08-F03-10, BR-08-F03-11)_
- **AC-08-F03-09** — **Given** a block **When** "Remove" is pressed **Then** it disappears
  immediately with no confirmation prompt. _(BR-08-F03-13)_
- **AC-08-F03-10** — **Given** composition changes on the Pending tab **When** the Accepted tab
  is selected **Then** Accepted's list is unaffected by those changes. _(BR-08-F03-14)_
- **AC-08-F03-11** — **Given** any composition change **When** the network is observed **Then**
  no Convex mutation fires until "Save layout" is pressed. _(BR-08-F03-15)_
- **AC-08-F03-12** — **Given** the studio has just loaded **When** the list is inspected **Then**
  every block row is collapsed. _(BR-08-F03-16)_
- **AC-08-F03-13** — **Given** a `countdown` block **When** its row is expanded **Then** no
  config panel is rendered. _(BR-08-F03-17)_
- **AC-08-F03-14** — **Given** unsaved composition changes **When** the Editor navigates to
  another dashboard page **Then** the changes are lost with no warning. _(DEF-08-02)_
- **AC-08-F03-15** — **Given** a `menuSelection` block is added and saved **When** the public
  page is opened **Then** nothing renders for it, and the editor never warned that this would
  happen. _(DEF-08-03)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                            |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TC-08-F03-01 | unit        | `createBlock("hero")` returns `{type: "hero", config: {}}` with an id prefixed `hero-`; two calls return different ids              |
| TC-08-F03-02 | unit        | `createBlock` falls back to the `Math.random` suffix when `crypto.randomUUID` is absent                                             |
| TC-08-F03-03 | unit        | `BLOCK_PALETTE` contains every `BlockType` exactly once                                                                             |
| TC-08-F03-04 | unit        | `deriveEventConfig` returns `{}` for every block type except `location`, and builds the Maps search URL when `venueMapUrl` is empty |
| TC-08-F03-05 | integration | Adding a block appends it with the template's `defaultBlockConfig` seed applied                                                     |
| TC-08-F03-06 | integration | Move up/down swap adjacent blocks and no-op at the boundaries                                                                       |
| TC-08-F03-07 | integration | Duplicate inserts at `index + 1` with a distinct id and equal config values                                                         |
| TC-08-F03-08 | integration | Remove deletes only the targeted id, leaving repeated blocks of the same type intact                                                |
| TC-08-F03-09 | integration | Composition changes on one variant do not alter the other two in the saved payload                                                  |
| TC-08-F03-10 | e2e         | Add, reorder, duplicate and remove, then save; reloading the studio shows the saved order                                           |
| TC-08-F03-11 | e2e         | Compose changes, navigate away without saving, return — the changes are gone (locks DEF-08-02 until fixed)                          |
| TC-08-F03-12 | e2e         | Add `menuSelection`, save, open the public page — no output for that block (locks DEF-08-03)                                        |

### Manual QA checklist

- [ ] Open the add menu and confirm all thirteen block types with their labels.
- [ ] Add two `text` blocks and give them different content; confirm both render in the preview.
- [ ] Reorder the first block down and confirm the preview order changes to match.
- [ ] Duplicate an `itinerary` block, edit one copy's schedule, and confirm the other copy is unaffected after saving and reloading.
- [ ] Remove a block and confirm no confirmation dialog appears.
- [ ] Make changes, click a different sidebar link, come back — confirm the changes are gone.
- [ ] Add `Menu Selection (per guest)`, expand it (nothing appears), save, and open a real invitation — confirm nothing renders.
- [ ] Exercise the four action buttons on a phone-sized viewport and note the touch-target size.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. No maximum block count per variant, no cap on repeats of a type, no server-side size check beyond the Convex document limit.                                                                                                                                                                                                            |
| Performance      | Every composition action re-renders the full block list and the live preview. The list is virtualization-free; a very long layout re-renders in full on each keystroke in an expanded field.                                                                                                                                                  |
| Security & authz | Single `editor` floor on the save. Block `type` and `config` are stored unvalidated (`convex/schema.ts:10`–`:11`); config values are rendered as text by the elegant blocks, and `image` values are resolved only when they normalize to a `media` id owned by the event (`convex/invitations.ts:201`–`:203`).                                |
| Accessibility    | The disclosure button sets `aria-expanded` (`template-settings.tsx:296`) and the action buttons carry `aria-label` + `title` (`template-settings.tsx:437`–`:438`). Reordering is button-only, so it is keyboard operable — but the list is not announced as reorderable and no live region reports the new position. Touch targets are 28 px. |
| i18n             | All composition chrome and every `BLOCK_DEFS` label is hardcoded English; seeded block copy is Spanish.                                                                                                                                                                                                                                       |
| Analytics        | None. A save produces one `template`/`update` activity entry that does not record what was composed.                                                                                                                                                                                                                                          |

## 14. TODOs & Open Questions

- **DEF-08-02** `[P1]` — There is no unsaved-changes guard, no autosave and no draft state:
  navigating away from the Design Studio discards every composition and configuration edit
  silently.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:61` (all edits live in
    component state), `:110`–`:162` (every action is a `setState`), `:194` (the only write path
    is the explicit Save). There is no `beforeunload` listener, no router-navigation interception,
    no `useEffect` autosave and no dirty flag anywhere in the file.
  - **Impact:** Authoring an invitation layout is long, detailed work across three tabs. Any
    sidebar click, browser back, accidental tab close or session timeout destroys all of it with
    no prompt and no recovery. This is the single highest-cost failure mode in the epic.
  - **Proposed fix:** Track a dirty flag and warn on both in-app navigation and `beforeunload`;
    ideally persist a local draft so an accidental exit is recoverable.
- **DEF-08-03** `[P2]` — The editor never warns that the selected template does not implement a
  block type it offers in the palette.
  - **Evidence:** `src/components/public-invitation/blocks.ts:244` (`BLOCK_PALETTE` lists all
    thirteen types unconditionally) versus
    `src/components/public-invitation/templates/elegant/blocks/index.ts:15`–`:27`
    (`ELEGANT_BLOCKS` supplies eleven — no `menuSelection`, no `drinkSelection`); the add menu is
    built straight from the palette with no template cross-check
    (`src/components/template-selection/template-settings.tsx:274`), and the renderer silently
    emits `null` for the missing component
    (`src/components/public-invitation/templates/invitation-template.tsx:42`).
  - **Impact:** A host can add "Menu Selection (per guest)", see it listed as a real block, save
    it, and publish a page that simply does not contain it. The preview shows the same nothing,
    so it reads as a rendering bug rather than an unsupported block.
  - **Scope note:** this entry covers the **editor-feedback** half only. The catalog half — which
    block types exist, and which the elegant template implements — is specified in
    [EP-08-F05](./F05-block-catalog.md), where the same gap is tracked from the block-inventory
    side.
  - **Proposed fix:** Filter the palette by the selected template's `blocks` map, or keep the
    entry and render it disabled with an explanatory note; badge any already-composed block whose
    type the template cannot render.
- **TODO-08-02** `[P2]` `[ADD]` — No undo, no autosave and no draft/publish separation: pressing
  Save publishes instantly to every live invitation of the event.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:194`;
    `convex/events.ts:218` (a direct patch, with no draft field); the page's own subheading says
    "Changes apply to every public invitation page for this event"
    (`src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:11`).
  - **Rationale:** Guests may be opening the invitation at the moment the host saves. There is no
    way to prepare a redesign, review it, and publish deliberately — and no way to roll back a
    save.
  - **Proposed rule:** Keep a draft layout distinct from the published one, with an explicit
    Publish action and the ability to revert to the previously published version.
- **TODO-08-07** `[P2]` `[ADD]` — Reordering is up/down buttons only; there is no drag-and-drop.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:308`–`:321`
  - **Rationale:** Moving a block from the bottom of a ten-block layout to the top takes nine
    clicks, each re-rendering the preview.
  - **Proposed rule:** Support drag-and-drop reordering while keeping the buttons as the
    keyboard-accessible path.
- **TODO-08-11** `[P2]` `[ADD]` — Saved blocks whose type is unknown are silently dropped on
  load, with no notice.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:81`
  - **Rationale:** The drop is invisible until the host saves, at which point the removal becomes
    permanent — a retired block type silently deletes part of a published page.
  - **Proposed rule:** Surface dropped blocks to the host before the next save overwrites them.
- **TODO-08-17** `[P2]` `[ADD]` — Removing a block has no confirmation and no undo, even for a
  block carrying substantial authored copy.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:126`, `:328`
  - **Rationale:** A mis-click on a 28 px icon destroys an entire authored section, and the only
    recovery is to abandon the whole editing session unsaved.
  - **Proposed rule:** Confirm removal of a block whose config differs from its template defaults,
    or offer an undo affordance after removal.
- **TODO-08-19** `[P2]` `[ADD]` — `BLOCK_DEFS[type].description` is authored but never shown.
  - **Evidence:** `src/components/public-invitation/blocks.ts:92` etc. (a `description` on every
    block def) versus `src/components/template-selection/template-settings.tsx:305` (only `label`
    is rendered) and `:276` (the add menu shows only `label`).
  - **Rationale:** A host choosing between "Allergies (per guest)" and "Menu Selection (per
    guest)" has no explanation available, though the text already exists.
  - **Proposed rule:** Render the description in the add menu and/or the expanded block row.

### Open questions

- **Q1** — Should unsaved work be protected by a warning, an autosave, or a local draft? (Each
  gives a materially different recovery story for DEF-08-02.)
- **Q2** — Should unsupported block types be hidden from the palette, or shown disabled so the
  host learns the capability exists but this template lacks it?
- **Q3** — Should any block be mandatory (for example, should a variant be allowed to have no
  `footer`, or the `pending` variant no `rsvp`)?
- **Q4** — Is there a practical ceiling on blocks per variant that should be enforced before the
  document size limit is reached?

## 15. Traceability

| Concern                                                 | Source                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Route                                                   | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:3`           |
| Studio shell                                            | `src/components/template-selection/template-settings.tsx:45`              |
| Per-variant block list + setter                         | `src/components/template-selection/template-settings.tsx:109`             |
| `addBlock`                                              | `src/components/template-selection/template-settings.tsx:116`             |
| `removeBlock`                                           | `src/components/template-selection/template-settings.tsx:126`             |
| `duplicateBlock`                                        | `src/components/template-selection/template-settings.tsx:130`             |
| `moveBlock`                                             | `src/components/template-selection/template-settings.tsx:146`             |
| `updateConfig`                                          | `src/components/template-selection/template-settings.tsx:156`             |
| Expanded-block tracking                                 | `src/components/template-selection/template-settings.tsx:97`              |
| Save handler (only write path)                          | `src/components/template-selection/template-settings.tsx:194`             |
| Add-block `Select`                                      | `src/components/template-selection/template-settings.tsx:266`             |
| Block list rendering                                    | `src/components/template-selection/template-settings.tsx:283`             |
| Disclosure button                                       | `src/components/template-selection/template-settings.tsx:293`             |
| Move-up / move-down buttons                             | `src/components/template-selection/template-settings.tsx:308`             |
| Duplicate / remove buttons                              | `src/components/template-selection/template-settings.tsx:322`             |
| Empty-field-set guard                                   | `src/components/template-selection/template-settings.tsx:345`             |
| `deriveEventConfig`                                     | `src/components/template-selection/template-settings.tsx:410`             |
| `IconButton`                                            | `src/components/template-selection/template-settings.tsx:423`             |
| `LayoutBlock` shape                                     | `src/components/public-invitation/blocks.ts:33`                           |
| `BLOCK_DEFS`                                            | `src/components/public-invitation/blocks.ts:90`                           |
| `BLOCK_PALETTE`                                         | `src/components/public-invitation/blocks.ts:244`                          |
| Id generation (`newId`)                                 | `src/components/public-invitation/blocks.ts:284`                          |
| `createBlock`                                           | `src/components/public-invitation/blocks.ts:292`                          |
| Repeated blocks in a shipped preset                     | `src/components/public-invitation/templates/elegant/default-layout.ts:12` |
| Missing-component → `null`                              | `src/components/public-invitation/templates/invitation-template.tsx:42`   |
| Elegant block map (eleven of thirteen)                  | `src/components/public-invitation/templates/elegant/blocks/index.ts:15`   |
| Backend mutation                                        | `convex/events.ts:199`                                                    |
| Authorization gate                                      | `convex/events.ts:216`                                                    |
| Block validator (`type: v.string()`, `config: v.any()`) | `convex/schema.ts:7`                                                      |
| Validation                                              | None — composition has no zod schema and no server-side checks            |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                 |
| ------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-08-18 closed.** The block list renders a `StateBlock kind="empty"` when a variant has no blocks |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                                         |
