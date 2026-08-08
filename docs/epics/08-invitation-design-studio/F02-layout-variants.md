---
id: EP-08-F02
title: Layout Variants
epic: EP-08 Invitation Design Studio
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-08-F01, EP-08-F03]
---

# EP-08-F02 — Layout Variants

## 1. Summary

A public invitation should not say the same thing to a guest who has not answered yet, a guest
who has confirmed, and a guest who cannot come. The Design Studio therefore has the host author
**three independent layouts** — one per [RSVP Variant](../../glossary.md) (`pending`,
`accepted`, `declined`) — selected in the editor by a three-tab control and stored together in
`events.layoutVariants`. The public page never asks the guest which page they want: the server
derives the variant from the invitation's guests and serves the matching layout. This feature
covers the tabs, the "Reset to default" action, the three-level fallback chain that decides
which blocks render when a variant has never been saved, the legacy single-layout migration
path, and the single save that publishes all three at once.

## 2. Actors & Permissions

| Actor                | Access   | Notes                                                    |
| -------------------- | -------- | -------------------------------------------------------- |
| Owner                | Full     | Authors and saves all three variants                     |
| Co-owner (`planner`) | Full     | Same as owner                                            |
| Editor               | Full     | Layout is content-adjacent                               |
| Viewer               | None     | Read-blocked by the `editor` floor                       |
| Public guest         | Indirect | Receives exactly one variant; cannot choose or switch it |

The gate is `requireEventEditor(ctx, args.eventId, "editor")` (`convex/events.ts:216`). Role
semantics live in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-08-F02-01** — As an Editor, I want three separate tabs for Pending, Accepted and Declined,
  so that I can give each audience a page that makes sense for them.
- **US-08-F02-02** — As an Editor, I want each tab to tell me when its layout is shown, so that
  I do not have to reason about RSVP aggregation rules.
- **US-08-F02-03** — As an Editor, I want a variant I have never touched to already contain a
  sensible page, so that I can publish without authoring three layouts from scratch.
- **US-08-F02-04** — As an Editor, I want to reset one variant to the template's default without
  losing my work on the other two.
- **US-08-F02-05** — As an Editor, I want one Save action to publish everything I edited across
  all three tabs, so that I never publish a half-finished set.
- **US-08-F02-06** — As an Owner of an event created before variants existed, I want my old
  single layout to still be the page confirmed guests see, so that nothing I published silently
  disappeared.

## 4. Entry Points

| Entry point        | Route / control                                                                                         | Actor        |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------ |
| Variant tabs       | `Tabs` control above the block list (`src/components/template-selection/template-settings.tsx:234`)     | Editor+      |
| Reset to default   | Text button beside the "Blocks" heading (`src/components/template-selection/template-settings.tsx:250`) | Editor+      |
| Save all variants  | "Save layout" button (`src/components/template-selection/template-settings.tsx:385`)                    | Editor+      |
| Public consumption | `/{event-key}/invitations/{invitation-slug}` and the custom-domain equivalent                           | Public guest |

The tab is local UI state only — it is not reflected in the URL, so a variant cannot be deep
linked or shared.

## 5. UX Flow

### Happy path

1. `TemplateSettings` mounts and builds all three variants in a single `useState` initializer
   (`src/components/template-selection/template-settings.tsx:61`).
2. For each variant, `build(variant)` resolves the saved layout as
   `event.layoutVariants?.[variant] ?? (variant === "accepted" ? event.layoutBlocks : undefined)`
   (`:75`–`:78`) — this is the legacy migration path.
3. Blocks whose `type` is not a key of `BLOCK_DEFS` are filtered out (`:81`).
4. If any known blocks survive, they are used; otherwise the fallback chain runs:
   `preset.defaultLayouts?.[variant]?.() ?? defaultLayout(variant)` (`:83`).
5. Every resulting block's config is merged as
   `{...templateDefaults, ...eventDerived, ...savedConfig}` (`:70`) — saved values win.
6. The tab control defaults to `pending` (`:95`) and renders the three `RSVP_VARIANTS` in order
   (`:239`), each labeled from `VARIANT_LABELS` (`:398`).
7. Below the tabs, a hint line explains when that variant is shown, from `VARIANT_HINTS`
   (`:404`).
8. Editing operations (add/reorder/duplicate/remove/configure) apply only to
   `variants[activeVariant]`, via a setter that replaces just that key (`:110`–`:114`).
9. The preview renders the active variant's blocks with `rsvpState={activeVariant}` (`:381`).
10. "Save layout" sends the whole `variants` record as `layoutVariants` in one mutation
    (`:194`–`:199`); the server patches the event (`convex/events.ts:218`).
11. On the public page, `getPublicInvitation` derives `rsvpState` from the invitation's guests
    (`convex/invitations.ts:138`), selects `layoutVariants[rsvpState]` with the legacy
    `layoutBlocks` accepted-fallback (`convex/invitations.ts:188`), and returns it as
    `event.layoutBlocks` (`:223`). `InvitationTemplate` applies the same fallback chain
    client-side when that value is empty
    (`src/components/public-invitation/templates/invitation-template.tsx:33`).

### Alternate & edge paths

- **A1** — A variant has never been saved and the selected template defines `defaultLayouts` →
  the template's preset for that variant is used
  (`src/components/public-invitation/templates/elegant/default-layout.ts:44`).
- **A2** — A variant has never been saved and the template defines no `defaultLayouts` → the
  global `defaultLayout(variant)` built from `DEFAULT_ORDER`
  (`src/components/public-invitation/blocks.ts:268`, `:300`).
- **A3** — Legacy event with `layoutBlocks` set and `layoutVariants` unset → the legacy list
  becomes the `accepted` layout in both the editor (`template-settings.tsx:76`) and the public
  query (`convex/invitations.ts:190`). `pending` and `declined` fall through to the template
  preset.
- **A4** — A saved variant is an empty array → treated as "not saved": the editor's
  `known.length > 0` check (`template-settings.tsx:82`) and the renderer's
  `blocks.length > 0` check (`invitation-template.tsx:34`) both fall back to the default. A host
  therefore **cannot publish an intentionally empty variant**.
- **A5** — "Reset to default" is pressed → the active variant only is replaced with
  `resolveTemplate(templateId).defaultLayouts?.[activeVariant]?.() ?? defaultLayout(activeVariant)`
  (`template-settings.tsx:253`–`:260`). There is no confirmation dialog and no undo; the other
  two variants are untouched. The reset is local until Save.
- **A6** — The invitation has no guests at all → `rsvpState` is `pending`
  (`convex/invitations.ts:142`).
- **A7** — A previously attending guest is switched to declined and no guest remains attending
  or pending → the invitation flips to the `declined` layout on the next page load, replacing
  the page the guest had been seeing.
- **E1** — The save fails → the toast reads "Failed to save layout" and all three variants
  remain only in local state; a reload discards them (see DEF-08-02, specified in EP-08-F03).

## 6. States

| State             | Behavior                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | State is seeded synchronously from the already-resolved `event` doc; there is no per-variant loading state.                                                                                               |
| Empty             | A variant with no saved blocks is never shown empty — the fallback chain always yields a non-empty layout. An emptied-then-saved variant reverts to the default rather than publishing a blank page (A4). |
| Error             | Save failure toasts "Failed to save layout"; the tab state and all edits are retained in memory.                                                                                                          |
| Success           | Toast "Invitation layout saved". The active tab does not change and the editor state is not re-read from the server.                                                                                      |
| Disabled / locked | The Save button is disabled while pending. Tabs are never disabled — switching tabs mid-edit is always allowed and never loses in-memory work.                                                            |
| Mobile            | Tabs use `w-full` (`template-settings.tsx:238`) and the two-column studio grid collapses below `lg`.                                                                                                      |

## 7. UI Specification

### Screens & components

| Element                | Component                             | Path                                                                      |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| Variant tab strip      | `Tabs` / `TabsList` / `TabsTrigger`   | `src/components/template-selection/template-settings.tsx:234`             |
| Variant hint line      | inline `<p>` fed by `VARIANT_HINTS`   | `src/components/template-selection/template-settings.tsx:246`             |
| Reset control          | inline `<button type="button">`       | `src/components/template-selection/template-settings.tsx:250`             |
| Per-variant block list | `<ul>` over `variants[activeVariant]` | `src/components/template-selection/template-settings.tsx:283`             |
| Variant-aware preview  | `InvitationTemplate` with `rsvpState` | `src/components/template-selection/template-settings.tsx:377`             |
| Variant model          | `RsvpVariant`, `RSVP_VARIANTS`        | `src/components/public-invitation/blocks.ts:29`, `:31`                    |
| Global default order   | `DEFAULT_ORDER`, `defaultLayout`      | `src/components/public-invitation/blocks.ts:268`, `:300`                  |
| Elegant presets        | `elegantDefaultLayouts`               | `src/components/public-invitation/templates/elegant/default-layout.ts:44` |

### Fields & validation

| Field                     | Type            | Required | Rule                                                                             | Message |
| ------------------------- | --------------- | -------- | -------------------------------------------------------------------------------- | ------- |
| `activeVariant`           | `RsvpVariant`   | Yes      | One of `RSVP_VARIANTS`; initial value `pending`                                  | None    |
| `layoutVariants.pending`  | `LayoutBlock[]` | No       | `LAYOUT_BLOCKS_VALIDATOR` — each item `{id: string, type: string, config?: any}` | None    |
| `layoutVariants.accepted` | `LayoutBlock[]` | No       | Same                                                                             | None    |
| `layoutVariants.declined` | `LayoutBlock[]` | No       | Same                                                                             | None    |

No length cap, no uniqueness check on block `id`, and no check that `type` names a real
`BlockType` (`convex/schema.ts:7`).

### Copy deck

| Key                  | Copy                                                                    | Source                                                        |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| Tab label — pending  | `Pending`                                                               | `src/components/template-selection/template-settings.tsx:399` |
| Tab label — accepted | `Accepted`                                                              | `src/components/template-selection/template-settings.tsx:400` |
| Tab label — declined | `Declined`                                                              | `src/components/template-selection/template-settings.tsx:401` |
| Hint — pending       | `Shown while the invitation is unanswered (guests still need to RSVP).` | `src/components/template-selection/template-settings.tsx:405` |
| Hint — accepted      | `Shown once at least one guest confirms they're attending.`             | `src/components/template-selection/template-settings.tsx:406` |
| Hint — declined      | `Shown when every guest has declined.`                                  | `src/components/template-selection/template-settings.tsx:407` |
| Blocks heading       | `Blocks`                                                                | `src/components/template-selection/template-settings.tsx:249` |
| Reset control        | `Reset to default`                                                      | `src/components/template-selection/template-settings.tsx:262` |

Guest-facing Spanish copy carried by the elegant presets, quoted verbatim:

| Key                                   | Copy                                                                                             | Source                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `accepted` first text block           | `Gracias por confirmar tu asistencia y por acompañarnos en este día tan especial para nosotros.` | `src/components/public-invitation/templates/elegant/default-layout.ts:12` |
| `accepted` second text block headline | `Lluvia de sobres`                                                                               | `src/components/public-invitation/templates/elegant/default-layout.ts:15` |
| `location` seed title                 | `Ubicación`                                                                                      | `src/components/public-invitation/templates/elegant/default-copy.ts:69`   |
| `location` seed button label          | `Ver mapa`                                                                                       | `src/components/public-invitation/templates/elegant/default-copy.ts:69`   |

The remaining preset copy is sourced from `ELEGANT_COPY` and specified in EP-08-F05.

## 8. Data Model

| Table          | Fields                                                | Read / Write                                                       | Index             |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------------ | ----------------- |
| `events`       | `layoutVariants` (`{pending?, accepted?, declined?}`) | Read (editor init, public query) / Write (`setInvitationTemplate`) | —                 |
| `events`       | `layoutBlocks` (legacy single layout)                 | Read only — as the `accepted` fallback                             | —                 |
| `events`       | `templateId`                                          | Read — selects which preset the fallback chain uses                | —                 |
| `guests`       | `rsvpStatus`                                          | Read — derives the variant for the public page                     | `by_invitationId` |
| `activityLogs` | `entity: "template"`, `action: "update"`              | Write                                                              | `by_eventId`      |

### Cascades and lifecycle

Layouts have no cascade of their own; they are fields on the event document and are removed with
it. The one lifecycle interaction that matters is **indirect**: a guest's `rsvpStatus` change
(dashboard override or public RSVP) can change which variant an invitation resolves to, so the
public page a guest sees can change without anyone touching the Design Studio. That derivation
reads at most 100 guests of the invitation (`convex/invitations.ts:133`).

`layoutBlocks` is never written by the current editor — `handleSave` sends only `templateId` and
`layoutVariants` (`template-settings.tsx:195`–`:199`) — so a legacy value persists indefinitely
and continues to act as the `accepted` fallback until an `accepted` variant is saved. The first
save from the studio always writes an `accepted` variant, which permanently shadows it.

## 9. Backend Contract

| Function                                    | Type         | Args                                                                                       | Returns                                                                                           | Guard                                                                 | Caps                                            |
| ------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `api.events.setInvitationTemplate`          | mutation     | `{eventId, templateId?, layoutBlocks?, layoutVariants?: {pending?, accepted?, declined?}}` | `void`                                                                                            | `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) | None                                            |
| `api.invitations.getPublicInvitation`       | public query | `{eventSlug, invitationSlug}`                                                              | `{event: {…, templateId, layoutBlocks}, rsvpState, invitation, guests, specialEvents, mediaUrls}` | none — data-level gating via `convex/lib/public.ts`                   | Reads ≤100 guests (`convex/invitations.ts:133`) |
| `api.invitations.getPublicInvitationByHost` | public query | `{host, invitationSlug}`                                                                   | identical payload                                                                                 | none                                                                  | Custom-domain variant                           |

The public query returns the **state-resolved** layout under the name `event.layoutBlocks`; the
client never receives the other two variants.

## 10. Business Rules

- **BR-08-F02-01** `[AS-BUILT]` — There are exactly three RSVP variants, in the order `pending`,
  `accepted`, `declined` (`src/components/public-invitation/blocks.ts:29`, `:31`).
- **BR-08-F02-02** `[AS-BUILT]` — The editor shows one tab per variant, in `RSVP_VARIANTS` order
  (`template-settings.tsx:239`).
- **BR-08-F02-03** `[AS-BUILT]` — The editor opens on the `pending` tab
  (`template-settings.tsx:95`).
- **BR-08-F02-04** `[AS-BUILT]` — Each variant holds an independent block list; edits to one
  variant never modify another (`template-settings.tsx:110`–`:114`).
- **BR-08-F02-05** `[AS-BUILT]` — The layout for a variant resolves in this order: saved
  `layoutVariants[variant]` → the selected template's `defaultLayouts[variant]()` → the global
  `defaultLayout(variant)` (`template-settings.tsx:75`–`:85`;
  `invitation-template.tsx:33`–`:36`).
- **BR-08-F02-06** `[AS-BUILT]` — For the `accepted` variant only, a legacy `events.layoutBlocks`
  value is read as the saved layout when `layoutVariants.accepted` is unset — in the editor
  (`template-settings.tsx:76`) and in the public query (`convex/invitations.ts:190`).
- **BR-08-F02-07** `[AS-BUILT]` — An empty saved array is treated as "no saved layout" and falls
  back to the default (`template-settings.tsx:82`; `invitation-template.tsx:34`).
- **BR-08-F02-08** `[AS-BUILT]` — Saved blocks whose `type` is not a key of `BLOCK_DEFS` are
  dropped when the editor loads the layout (`template-settings.tsx:81`).
- **BR-08-F02-09** `[AS-BUILT]` — "Reset to default" replaces the **active** variant only, with
  the template preset or the global default, and takes effect immediately without confirmation
  (`template-settings.tsx:253`–`:260`).
- **BR-08-F02-10** `[AS-BUILT]` — A single "Save layout" writes all three variants together;
  there is no per-variant save (`template-settings.tsx:195`–`:199`).
- **BR-08-F02-11** `[AS-BUILT]` — The live preview renders the active variant with
  `rsvpState={activeVariant}`, so the preview matches the tab (`template-settings.tsx:381`).
- **BR-08-F02-12** `[AS-BUILT]` — The public page's variant is derived server-side from the
  invitation's guests: any guest attending → `accepted`; else no guests or any pending →
  `pending`; else → `declined` (`convex/invitations.ts:138`–`:144`).
- **BR-08-F02-13** `[AS-BUILT]` — The elegant `accepted` preset contains ten blocks in this
  order: `hero`, `location`, `text`, `countdown`, `itinerary`, `text`, `allergies`, `dressCode`,
  `specialInvitation`, `footer`
  (`src/components/public-invitation/templates/elegant/default-layout.ts:8`–`:21`).
- **BR-08-F02-14** `[AS-BUILT]` — The elegant `pending` preset contains four blocks: `hero`,
  `location`, `rsvp`, `footer`
  (`src/components/public-invitation/templates/elegant/default-layout.ts:25`–`:32`).
- **BR-08-F02-15** `[AS-BUILT]` — The elegant `declined` preset contains three blocks: `hero`,
  `guestMessage`, `footer`
  (`src/components/public-invitation/templates/elegant/default-layout.ts:36`–`:42`).
- **BR-08-F02-16** `[AS-BUILT]` — The global `DEFAULT_ORDER` fallback differs from the elegant
  presets: `accepted` is nine blocks (`hero`, `location`, `rsvp`, `countdown`, `itinerary`,
  `allergies`, `dressCode`, `specialInvitation`, `footer`), `pending` is `hero`, `location`,
  `rsvp`, `footer`, and `declined` is `hero`, `location`, `guestMessage`, `footer`
  (`src/components/public-invitation/blocks.ts:268`–`:282`).
- **BR-08-F02-17** `[AS-BUILT]` — Global default blocks receive deterministic ids of the shape
  `${variant}-${type}-default-${index}` so server and client render identically
  (`src/components/public-invitation/blocks.ts:301`–`:305`).
- **BR-08-F02-18** `[AS-BUILT]` — Every elegant preset block carries its own seeded config copy,
  so two blocks of the same type in one layout hold distinct content
  (`src/components/public-invitation/templates/elegant/default-layout.ts:12`, `:15`).
- **BR-08-F02-19** `[AS-BUILT]` — Saved config values override the template defaults and the
  event-derived values when the editor rehydrates a layout (`template-settings.tsx:70`).
- **BR-08-F02-20** `[AS-BUILT]` — The active tab is component state only; it is absent from the
  URL and resets to `pending` on every reload (`template-settings.tsx:95`).

## 11. Acceptance Criteria

- **AC-08-F02-01** — **Given** an event that has never saved a layout **When** an Editor opens
  the studio **Then** the Pending tab is active and its block list is `hero`, `location`,
  `rsvp`, `footer`. _(BR-08-F02-03, BR-08-F02-14)_
- **AC-08-F02-02** — **Given** the same event **When** the Accepted tab is selected **Then** the
  block list is the ten-block elegant accepted preset in order. _(BR-08-F02-13)_
- **AC-08-F02-03** — **Given** the same event **When** the Declined tab is selected **Then** the
  block list is `hero`, `guestMessage`, `footer` — with **no** `location` block.
  _(BR-08-F02-15, DEF-08-04)_
- **AC-08-F02-04** — **Given** a legacy event with `layoutBlocks` set and `layoutVariants` unset
  **When** an invitation with an attending guest is opened publicly **Then** the legacy layout is
  rendered. _(BR-08-F02-06)_
- **AC-08-F02-05** — **Given** the same legacy event **When** an invitation with only pending
  guests is opened **Then** the elegant `pending` preset is rendered, not the legacy layout.
  _(BR-08-F02-06)_
- **AC-08-F02-06** — **Given** an Editor removes every block from the Declined tab and saves
  **When** a fully-declined invitation is opened **Then** the elegant `declined` preset renders
  rather than a blank page. _(BR-08-F02-07)_
- **AC-08-F02-07** — **Given** a saved layout containing a block with `type: "obsolete"` **When**
  the studio loads **Then** that block is absent from the list and no error is shown.
  _(BR-08-F02-08, TODO-08-11)_
- **AC-08-F02-08** — **Given** an Editor has added a block to Pending **When** they switch to
  Accepted and back **Then** the added block is still present in Pending.
  _(BR-08-F02-04)_
- **AC-08-F02-09** — **Given** an Editor presses "Reset to default" on Accepted **When** they
  switch to Pending **Then** Pending's edits are intact. _(BR-08-F02-09)_
- **AC-08-F02-10** — **Given** edits across all three tabs **When** Save is pressed **Then** a
  single `setInvitationTemplate` call carries `layoutVariants` with all three keys populated.
  _(BR-08-F02-10)_
- **AC-08-F02-11** — **Given** an invitation whose guests are all `pending` **When** one guest is
  set to `attending` **Then** the next public page load renders the `accepted` layout.
  _(BR-08-F02-12)_
- **AC-08-F02-12** — **Given** an invitation with zero linked guests **When** its public page is
  opened **Then** the `pending` layout renders. _(BR-08-F02-12)_
- **AC-08-F02-13** — **Given** the Declined tab is active **When** the preview renders **Then**
  it uses `rsvpState="declined"`, matching what a fully-declined invitation would see.
  _(BR-08-F02-11)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                       |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-08-F02-01 | unit        | `defaultLayout("pending")`, `("accepted")` and `("declined")` return the exact `DEFAULT_ORDER` type sequences with deterministic ids           |
| TC-08-F02-02 | unit        | `elegantDefaultLayouts.accepted()` returns ten blocks in the specified order; `.pending()` four; `.declined()` three                           |
| TC-08-F02-03 | unit        | `elegantDefaultLayouts.declined()` contains no `location` block (locks DEF-08-04)                                                              |
| TC-08-F02-04 | unit        | Neither `elegantDefaultLayouts.accepted()` nor `.declined()` contains an `rsvp` block (locks TODO-08-05)                                       |
| TC-08-F02-05 | unit        | `InvitationTemplate` with `blocks={[]}` and `rsvpState="declined"` renders the template's declined preset                                      |
| TC-08-F02-06 | unit        | `InvitationTemplate` with a non-empty `blocks` array ignores `rsvpState` for layout selection                                                  |
| TC-08-F02-07 | integration | `getPublicInvitation` returns `rsvpState: "accepted"` and `layoutVariants.accepted` when one guest attends                                     |
| TC-08-F02-08 | integration | With `layoutVariants` unset and `layoutBlocks` set, `getPublicInvitation` returns the legacy list for `accepted` and `undefined` for `pending` |
| TC-08-F02-09 | integration | An invitation with no guests resolves to `rsvpState: "pending"`                                                                                |
| TC-08-F02-10 | integration | `setInvitationTemplate` with all three variants patches all three and leaves `layoutBlocks` untouched                                          |
| TC-08-F02-11 | e2e         | Editing Pending, then Accepted, then saving persists both; reloading the studio shows both                                                     |
| TC-08-F02-12 | e2e         | "Reset to default" on one tab leaves the other two tabs' unsaved edits intact                                                                  |

### Manual QA checklist

- [ ] Open the studio and step through all three tabs; confirm each hint line matches its tab.
- [ ] Confirm the preview visibly changes between Pending and Accepted (RSVP form vs. full details page).
- [ ] Set one guest of an invitation to attending and reload its public page — the accepted layout appears.
- [ ] Decline every guest of an invitation and reload — the declined layout appears, with a message form and **no venue section**.
- [ ] Confirm a declined guest has no way to change their answer from the page they now see.
- [ ] Press "Reset to default" and confirm it applies only to the visible tab and asks for no confirmation.
- [ ] Save, reload the studio, and confirm all three tabs come back as saved.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No cap on blocks per variant or variants' combined size; the ceiling is the Convex document size limit. Variant derivation reads at most 100 guests per invitation (`convex/invitations.ts:133`).                                                     |
| Performance      | All three variants are held in memory and sent on every save, even when only one changed. Tab switching and reset are pure client-side state changes. The public query returns only the resolved variant, so the guest never downloads the other two. |
| Security & authz | Single `editor` floor on the write. The public query exposes only the resolved layout — the other variants are not leaked to guests.                                                                                                                  |
| Accessibility    | The tab strip is the shadcn `Tabs` primitive (Radix), so roving focus and `aria-selected` come for free. "Reset to default" is a plain `<button>` styled as a link, with no confirmation and no announced result.                                     |
| i18n             | Tab labels and hints are hardcoded English; preset block copy is hardcoded Spanish.                                                                                                                                                                   |
| Analytics        | None beyond the single `template`/`update` activity entry, which does not record which variant changed.                                                                                                                                               |

## 14. TODOs & Open Questions

- **DEF-08-04** `[P2]` — The elegant `declined` preset omits the `location` block, contradicting
  the block model's own documented declined order.
  - **Evidence:** `src/components/public-invitation/templates/elegant/default-layout.ts:36`–`:42`
    (hero → guestMessage → footer) versus
    `src/components/public-invitation/blocks.ts:281` and its comment at `:266`
    (`declined — hero, location, leave-a-message, footer`).
  - **Impact:** A guest who declines loses the venue and map link from their page — the exact
    details they may still want (to send a gift, or if their plans change). Two "defaults" for
    the same variant also disagree, so behavior depends on whether a template preset exists.
  - **Proposed fix:** Add a `location` block to `elegantDeclinedLayout()` so the elegant preset
    matches the documented global order, or correct the global order and its comment to match.
- **TODO-08-05** `[P1]` `[ADD]` — Neither the elegant `accepted` nor the elegant `declined`
  preset contains an `rsvp` block, so a guest who has already answered has no way to revise their
  answer from the page they are served.
  - **Evidence:** `src/components/public-invitation/templates/elegant/default-layout.ts:8`–`:21`
    (accepted: no `rsvp`) and `:36`–`:42` (declined: no `rsvp`); the `rsvp` block appears only in
    `elegantPendingLayout()` at `:29`. The global `DEFAULT_ORDER.accepted` **does** include
    `rsvp` (`src/components/public-invitation/blocks.ts:272`), so the template preset is stricter
    than the global default.
  - **Rationale:** RSVP answers change — a guest falls ill, a plus-one drops out, a declined
    guest's schedule frees up. Once an answer is submitted the page flips variant and the form
    disappears, making the first answer effectively final unless the host edits it in the
    dashboard. The guest-facing half of this (what the RSVP block does and whether resubmission
    is even supported) belongs to [EP-07](../07-guest-experience/); the layout-composition half
    originates here, in the presets.
  - **Proposed rule:** The `accepted` and `declined` presets include an `rsvp` block (or an
    equivalent "change your answer" affordance), so every variant offers a path back to the form.
- **TODO-08-03** `[P2]` `[REMOVE]` — `resolveLayout()` is dead code.
  - **Evidence:** `src/components/public-invitation/blocks.ts:336`; no call sites — the editor
    uses its own `build()` (`template-settings.tsx:73`) and the renderer inlines the check
    (`invitation-template.tsx:33`).
  - **Rationale:** It hardcodes the `accepted` default (`defaultLayout()` with no argument), so
    any future caller would silently get the wrong variant. Keeping a wrong helper around is a
    trap.
  - **Proposed rule:** Delete it, or make it variant-aware and route both existing fallback sites
    through it.
- **TODO-08-06** `[P2]` `[CHANGE]` — Save always writes all three variants; there is no dirty
  tracking and no per-variant save.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:195`–`:199`
  - **Rationale:** An Editor who only meant to tweak the Pending page also republishes Accepted
    and Declined — including converting a variant that was previously _unset_ (and therefore
    tracking the template preset) into a frozen saved copy that will never pick up preset
    improvements.
  - **Proposed rule:** Send only variants the host actually modified, and keep untouched
    variants unset.
- **TODO-08-10** `[P2]` `[ADD]` — Editor state is initialized once; a concurrent save by another
  collaborator is silently overwritten.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:61` (the `useState`
    initializer never re-runs, even though `event` is live from Convex) and `:194` (the save
    sends the stale snapshot wholesale).
  - **Rationale:** Two Editors with the studio open is a normal scenario on a shared event; the
    last save wins and the other person's work vanishes with no conflict signal.
  - **Proposed rule:** Detect that the event's layout changed since the editor loaded and warn
    before overwriting.
- **TODO-08-15** `[P2]` `[ADD]` — "Reset to default" is destructive, immediate, unconfirmed and
  un-undoable.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:250`–`:263`
  - **Rationale:** One mis-click discards an entire variant's authoring. The control also
    renders as a small grey link, which under-signals its impact.
  - **Proposed rule:** Confirm before resetting a variant that has any host-authored content.
- **TODO-08-16** `[P2]` `[ADD]` — A variant cannot be intentionally left empty.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:82`;
    `src/components/public-invitation/templates/invitation-template.tsx:34`
  - **Rationale:** An empty array means "unset" everywhere, so a host who wants a deliberately
    minimal (or blank) declined page cannot express it — the default reappears.
  - **Proposed rule:** Distinguish "unset" (`undefined`) from "intentionally empty" (`[]`) in
    both the editor and the renderer.

### Open questions

- **Q1** — Should the elegant `declined` preset regain a `location` block (DEF-08-04), or should
  the global `DEFAULT_ORDER.declined` drop it so the two agree?
- **Q2** — Is a guest permitted to change a submitted RSVP at all? The answer determines whether
  TODO-08-05 is a layout fix here or a capability gap in EP-07.
- **Q3** — Should saving publish immediately to every live invitation, or should the studio gain
  a draft/publish separation (cross-ref TODO-08-02 in EP-08-F03)?
- **Q4** — When a host has never customized a variant, should later template improvements flow
  through to their page automatically? Today they do, until the first save freezes the variant.
- **Q5** — Should each tab indicate whether its layout is the host's own or still the template
  default, and should the active variant be reflected in the URL so it can be shared and survive
  a reload? (Both are consequences of TODO-08-06 and BR-08-F02-20.)

## 15. Traceability

| Concern                                   | Source                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| Route                                     | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:3`                  |
| Three-variant editor state                | `src/components/template-selection/template-settings.tsx:61`                     |
| Saved-variant lookup + legacy fallback    | `src/components/template-selection/template-settings.tsx:75`                     |
| Unknown-type filter                       | `src/components/template-selection/template-settings.tsx:81`                     |
| Preset / global fallback                  | `src/components/template-selection/template-settings.tsx:83`                     |
| Config merge precedence                   | `src/components/template-selection/template-settings.tsx:70`                     |
| Active variant state                      | `src/components/template-selection/template-settings.tsx:95`                     |
| Per-variant setter                        | `src/components/template-selection/template-settings.tsx:110`                    |
| Save handler                              | `src/components/template-selection/template-settings.tsx:194`                    |
| Tab strip                                 | `src/components/template-selection/template-settings.tsx:234`                    |
| Reset to default                          | `src/components/template-selection/template-settings.tsx:253`                    |
| Variant-aware preview                     | `src/components/template-selection/template-settings.tsx:381`                    |
| Tab labels                                | `src/components/template-selection/template-settings.tsx:398`                    |
| Tab hints                                 | `src/components/template-selection/template-settings.tsx:404`                    |
| `RsvpVariant` / `RSVP_VARIANTS`           | `src/components/public-invitation/blocks.ts:29`                                  |
| `DEFAULT_ORDER`                           | `src/components/public-invitation/blocks.ts:268`                                 |
| `defaultLayout()`                         | `src/components/public-invitation/blocks.ts:300`                                 |
| `resolveLayout()` (dead)                  | `src/components/public-invitation/blocks.ts:336`                                 |
| Renderer fallback chain                   | `src/components/public-invitation/templates/invitation-template.tsx:33`          |
| Elegant accepted preset                   | `src/components/public-invitation/templates/elegant/default-layout.ts:8`         |
| Elegant pending preset                    | `src/components/public-invitation/templates/elegant/default-layout.ts:25`        |
| Elegant declined preset                   | `src/components/public-invitation/templates/elegant/default-layout.ts:36`        |
| `elegantDefaultLayouts` map               | `src/components/public-invitation/templates/elegant/default-layout.ts:44`        |
| `defaultLayouts` contract                 | `src/components/public-invitation/templates/template-registry.ts:22`             |
| Server variant derivation                 | `convex/invitations.ts:138`                                                      |
| Server layout selection + legacy fallback | `convex/invitations.ts:188`                                                      |
| Resolved layout in the public payload     | `convex/invitations.ts:223`                                                      |
| Backend mutation                          | `convex/events.ts:199`                                                           |
| Authorization gate                        | `convex/events.ts:216`                                                           |
| Persistence                               | `convex/schema.ts:48` (`layoutBlocks`), `convex/schema.ts:52` (`layoutVariants`) |
| Layout validator                          | `convex/schema.ts:7`                                                             |
| Validation                                | None — no zod schema covers layout variants                                      |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
