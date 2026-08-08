---
id: EP-08-F01
title: Template Selection
epic: EP-08 Invitation Design Studio
version: 1.0.0
status: partial
last_updated: 2026-07-28
depends_on: [EP-02-F01, EP-03-F05]
---

# EP-08-F01 — Template Selection

## 1. Summary

A [Template](../../glossary.md) is the complete visual implementation of an event's public
invitation — not a color scheme applied to shared markup, but its own page frame plus its own
React component for each kind of section the page can contain. This feature covers how an event
gets a template: which templates exist, which one is the default, how the host picks one in the
[Design Studio](../../glossary.md) at `/dashboard/[eventSlug]/template`, how the choice is
persisted on `events.templateId`, and what the choice implies for the blocks already composed.
Today `elegant` is the only official template, so the picker is hidden and every event renders
`elegant` — but the selection mechanism, the persistence field and the fallback resolver are all
built and exercised on every save.

## 2. Actors & Permissions

| Actor                | Access   | Notes                                                                          |
| -------------------- | -------- | ------------------------------------------------------------------------------ |
| Owner                | Full     | Reads and saves the template                                                   |
| Co-owner (`planner`) | Full     | Same as owner                                                                  |
| Editor               | Full     | The template is content-adjacent; the gate is the `editor` floor               |
| Viewer               | None     | The `editor` floor read-blocks viewers, and the sidebar link is filtered out   |
| Public guest         | Indirect | Never sees this screen; the chosen template renders the page they open (EP-07) |

The only gate this feature applies is `requireEventEditor(ctx, args.eventId, "editor")` in
`events.setInvitationTemplate` (`convex/events.ts:216`). Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-08-F01-01** — As an Editor, I want to open the Design Studio and see which template my
  invitation currently uses, so that I know what visual treatment my guests will receive.
- **US-08-F01-02** — As an Editor, I want to pick a different template from a list of available
  templates, so that I can change the look of my invitation without re-authoring its content.
- **US-08-F01-03** — As an Editor, I want my template choice to be saved with my layouts in one
  action, so that the preview I approved is exactly what is published.
- **US-08-F01-04** — As an Owner, I want the template change recorded in the Activity Log, so
  that I can see when a collaborator changed how the invitation looks.
- **US-08-F01-05** — As an Editor whose event has never had a template set, I want the invitation
  to still render, so that a newly created event has a usable public page immediately.

## 4. Entry Points

| Entry point             | Route / control                                                                                                                                          | Actor   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Design Studio page      | `/dashboard/[eventSlug]/template`                                                                                                                        | Editor+ |
| Sidebar link "Template" | `NAV_ITEMS` entry, `minRole: editor`                                                                                                                     | Editor+ |
| Template picker cards   | The `Template` section of the left column, rendered only when `TEMPLATE_LIST.length > 1` (`src/components/template-selection/template-settings.tsx:207`) | Editor+ |
| Save                    | "Save layout" button (`src/components/template-selection/template-settings.tsx:385`)                                                                     | Editor+ |

There is no deep link to a specific template, and no `?template=` query parameter. The picker
is part of the same screen as block composition (EP-08-F03) and the live preview (EP-08-F06).

## 5. UX Flow

### Happy path

1. The Editor opens `/dashboard/[eventSlug]/template`
   (`src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:3`).
2. `TemplateSettings` mounts and seeds local state once: `templateId` is initialized from
   `event.templateId ?? DEFAULT_TEMPLATE_ID`
   (`src/components/template-selection/template-settings.tsx:56`).
3. The same initializer resolves the template definition via
   `resolveTemplate(event.templateId ?? DEFAULT_TEMPLATE_ID)` and reads its `defaultBlockConfig`
   to pre-fill every block's config (`:63`).
4. If more than one template is registered, the picker renders one card per `TEMPLATE_LIST`
   entry, showing its `label` and `description` (`:211`–`:227`); the currently selected card
   carries a `border-zinc-900 bg-zinc-50` treatment.
5. The Editor clicks a card → `setTemplateId(template.id)` (`:215`). Nothing is persisted yet.
6. The live preview re-renders immediately: `InvitationTemplate` receives the new `templateId`
   (`:379`), calls `resolveTemplate(templateId)`
   (`src/components/public-invitation/templates/invitation-template.tsx:29`) and uses the new
   template's `Frame` and `blocks` map.
7. The Editor clicks "Save layout" → `handleSave` calls
   `api.events.setInvitationTemplate` with `{eventId, templateId, layoutVariants}`
   (`src/components/template-selection/template-settings.tsx:194`).
8. The mutation guards at `editor`, patches the event, and writes a `template` / `update`
   activity entry (`convex/events.ts:216`–`:225`).
9. A sonner toast reads "Invitation layout saved" (`:52`); on failure, "Failed to save layout"
   (`:53`).

### Alternate & edge paths

- **A1** — Only one template is registered (today's state) → the entire `Template` section is
  not rendered (`src/components/template-selection/template-settings.tsx:207`). The Editor never
  sees the concept, but `templateId` is still initialized and still sent on save.
- **A2** — The event has no `templateId` → `DEFAULT_TEMPLATE_ID` (`"elegant"`) is used for the
  editor state (`:57`), and the public renderer independently falls back through
  `resolveTemplate(undefined)` → `TEMPLATES.elegant`
  (`src/components/public-invitation/templates/template-registry.ts:53`).
- **A3** — The event's stored `templateId` names a template that is not in `TEMPLATES` (e.g. a
  removed template) → `resolveTemplate` returns `TEMPLATES.elegant` with no error and no notice,
  both in the editor and on the public page (`template-registry.ts:53`).
- **A4** — The Editor switches template and then saves → the layouts held in editor state are
  saved verbatim alongside the new `templateId`; they are neither reseeded from the new
  template's `defaultBlockConfig` nor filtered against its `blocks` map (see DEF-08-06,
  TODO-08-09).
- **E1** — The caller is a Viewer or a non-member → `requireEventEditor` throws
  `Insufficient permissions` / `Unauthorized`; `useToastMutation` catches it and toasts
  "Failed to save layout" without throwing (`src/hooks/use-toast-mutation.ts`).

## 6. States

| State             | Behavior                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The route renders immediately; `EventProvider` resolves the slug before `TemplateSettings` mounts, so `event.templateId` is always available at initialization. The `media` and `specialEvents` queries used by the rest of the studio load independently and do not block the picker. |
| Empty             | Never empty: `TEMPLATES` always contains `elegant`, and `resolveTemplate` always returns a definition.                                                                                                                                                                                 |
| Error             | A failed save toasts "Failed to save layout"; the local `templateId` selection is retained, so the Editor can retry.                                                                                                                                                                   |
| Success           | Toast "Invitation layout saved". The picker keeps the chosen card highlighted; no navigation occurs.                                                                                                                                                                                   |
| Disabled / locked | The "Save layout" button is disabled while `setTemplate.pending` is true and its label becomes "Saving…" (`template-settings.tsx:389`–`:391`). The picker cards themselves are never disabled.                                                                                         |
| Mobile            | The studio uses `lg:grid-cols-[24rem_1fr]` (`:203`), so below the `lg` breakpoint the controls column and the preview stack vertically.                                                                                                                                                |

## 7. UI Specification

### Screens & components

| Element                                                    | Component                                                              | Path                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Route shell + page heading "Invitation Template"           | `TemplatePage`                                                         | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:3`         |
| Studio shell (picker + tabs + block list + preview + save) | `TemplateSettings`                                                     | `src/components/template-selection/template-settings.tsx:45`            |
| Template picker cards                                      | inline `<button>` per `TEMPLATE_LIST` entry                            | `src/components/template-selection/template-settings.tsx:211`           |
| Template registry                                          | `TEMPLATES`, `TEMPLATE_LIST`, `DEFAULT_TEMPLATE_ID`, `resolveTemplate` | `src/components/public-invitation/templates/template-registry.ts:35`    |
| Renderer                                                   | `InvitationTemplate`                                                   | `src/components/public-invitation/templates/invitation-template.tsx:23` |
| Elegant page frame                                         | `ElegantFrame`                                                         | `src/components/public-invitation/templates/elegant/frame.tsx:9`        |
| Elegant block component map                                | `ELEGANT_BLOCKS`                                                       | `src/components/public-invitation/templates/elegant/blocks/index.ts:15` |
| Theme tokens (supplies `label` / `description`)            | `TEMPLATE_THEMES`                                                      | `src/components/public-invitation/template-theme.tsx:33`                |

### Fields & validation

| Field                     | Type                     | Required | Rule                                                                           | Message |
| ------------------------- | ------------------------ | -------- | ------------------------------------------------------------------------------ | ------- |
| `templateId` (client)     | string                   | No       | Chosen from `TEMPLATE_LIST`; initialized to `event.templateId ?? "elegant"`    | None    |
| `templateId` (server arg) | `v.optional(v.string())` | No       | **No validation** — any string is accepted and stored (`convex/events.ts:201`) | None    |

There is no zod schema for the Design Studio; the studio is not a react-hook-form surface.

### Copy deck

The picker's own strings are English dashboard copy, not guest-facing. The template's `label`
and `description` are sourced from `TEMPLATE_THEMES.elegant`.

| Key                    | Copy                                                                                                                                              | Source                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Page heading           | `Invitation Template`                                                                                                                             | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:8`  |
| Page subheading        | `Pick a template, then build your page: add, reorder, duplicate, or remove blocks. Changes apply to every public invitation page for this event.` | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:11` |
| Picker section heading | `Template`                                                                                                                                        | `src/components/template-selection/template-settings.tsx:209`    |
| Elegant label          | `Elegant`                                                                                                                                         | `src/components/public-invitation/template-theme.tsx:35`         |
| Elegant description    | `Gold script, soft serif, mobile-first.`                                                                                                          | `src/components/public-invitation/template-theme.tsx:36`         |
| Save button            | `Save layout` / `Saving…`                                                                                                                         | `src/components/template-selection/template-settings.tsx:391`    |
| Save success toast     | `Invitation layout saved`                                                                                                                         | `src/components/template-selection/template-settings.tsx:52`     |
| Save error toast       | `Failed to save layout`                                                                                                                           | `src/components/template-selection/template-settings.tsx:53`     |

Guest-facing Spanish default copy belongs to the blocks, not the picker; it is specified in
EP-08-F04 and EP-08-F05. The one string this feature causes to appear when a template is first
applied is the elegant seed set (`ELEGANT_BLOCK_CONFIG`,
`src/components/public-invitation/templates/elegant/default-copy.ts:67`), e.g.
`location: { title: "Ubicación", buttonLabel: "Ver mapa" }` (`:69`).

## 8. Data Model

| Table          | Fields                                                                          | Read / Write                                                        | Index                                          |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| `events`       | `templateId`                                                                    | Read (editor init, public render) / Write (`setInvitationTemplate`) | none — the doc is loaded by id or by `by_slug` |
| `events`       | `layoutVariants`, `layoutBlocks`                                                | Written in the same patch as `templateId`                           | —                                              |
| `activityLogs` | `eventId`, `actorUserId`, `actorName`, `action: "update"`, `entity: "template"` | Write                                                               | `by_eventId`                                   |

`events.templateId` is `v.optional(v.string())` (`convex/schema.ts:45`) — it is **not** a union
of known template ids, so the schema does not constrain it to a registered template.

### Cascades and lifecycle

Changing `templateId` has **no cascade**. `setInvitationTemplate` performs a single
`ctx.db.patch(eventId, updates)` with whatever subset of `{templateId, layoutBlocks,
layoutVariants}` was supplied (`convex/events.ts:218`). Saved layouts are neither migrated,
validated against the new template, nor cleared. Deleting the event removes the field with the
document as part of the standard event cascade (EP-02).

Because `templateId` lives on `events`, the template is **per event, not per invitation**: one
change re-skins every public invitation of that event at once, as the page subheading states.

## 9. Backend Contract

| Function                              | Type         | Args                                                                                                                            | Returns                          | Guard                                                                 | Caps                                                           |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `api.events.setInvitationTemplate`    | mutation     | `{eventId: Id<"events">, templateId?: string, layoutBlocks?: LayoutBlock[], layoutVariants?: {pending?, accepted?, declined?}}` | `void`                           | `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) | None — no size, count or membership validation on any argument |
| `api.events.getEventBySlug`           | query        | `{slug}`                                                                                                                        | `{...event, myRole}`             | `requireEventAccess`                                                  | Supplies `event.templateId` to the editor via `EventProvider`  |
| `api.invitations.getPublicInvitation` | public query | `{eventSlug, invitationSlug}`                                                                                                   | payload incl. `event.templateId` | none (data-level gating)                                              | Consumed by EP-07                                              |

`LAYOUT_BLOCKS_VALIDATOR` (`convex/schema.ts:7`) validates each block as
`{id: string, type: string, config?: any}` — `type` is a bare string, so the server accepts a
block type that no template implements and no `BlockType` names.

## 10. Business Rules

- **BR-08-F01-01** `[AS-BUILT]` — A template supplies its own page `Frame` and its own component
  per block type; there is no shared default markup anywhere in the system
  (`src/components/public-invitation/templates/template-registry.ts:11`–`:28`).
- **BR-08-F01-02** `[AS-BUILT]` — `TemplateDef.blocks` is a
  `Partial<Record<BlockType, BlockComponent>>`, so a template may implement any subset of block
  types (`template-registry.ts:20`).
- **BR-08-F01-03** `[AS-BUILT]` — When the selected template has no component for a block's
  type, the renderer emits `null` for that block: the block is silently skipped, and no
  placeholder or error is shown (`invitation-template.tsx:42`).
- **BR-08-F01-04** `[AS-BUILT]` — `elegant` is the only entry in `TEMPLATES`
  (`template-registry.ts:35`) and the value of `DEFAULT_TEMPLATE_ID` (`:48`).
- **BR-08-F01-05** `[AS-BUILT]` — `TEMPLATE_LIST` is `Object.values(TEMPLATES)` and defines the
  picker's display order (`template-registry.ts:50`).
- **BR-08-F01-06** `[AS-BUILT]` — `resolveTemplate(id)` returns `TEMPLATES[id]` when `id` is
  truthy and registered, otherwise `TEMPLATES.elegant`; it never throws and never returns
  `undefined` (`template-registry.ts:52`).
- **BR-08-F01-07** `[AS-BUILT]` — The template picker section renders only when
  `TEMPLATE_LIST.length > 1`; with one registered template the host is shown no picker
  (`template-settings.tsx:207`).
- **BR-08-F01-08** `[AS-BUILT]` — The editor initializes its `templateId` state to
  `event.templateId ?? DEFAULT_TEMPLATE_ID` (`template-settings.tsx:56`).
- **BR-08-F01-09** `[AS-BUILT]` — Selecting a template updates local state only; nothing is
  persisted until "Save layout" is pressed (`template-settings.tsx:215`, `:194`).
- **BR-08-F01-10** `[AS-BUILT]` — A single save writes the template id and all three layout
  variants in one `setInvitationTemplate` call (`template-settings.tsx:195`–`:199`).
- **BR-08-F01-11** `[AS-BUILT]` — `setInvitationTemplate` requires the `editor` role floor, so
  Editors may change the template while Viewers may not (`convex/events.ts:216`).
- **BR-08-F01-12** `[AS-BUILT]` — Every successful `setInvitationTemplate` writes exactly one
  `activityLogs` row with `entity: "template"` and `action: "update"`, after the patch
  (`convex/events.ts:220`–`:225`). See [EP-03-F05](../03-collaboration-and-permissions/) for how
  the entry is rendered.
- **BR-08-F01-13** `[AS-BUILT]` — The activity entry carries no `entityName`, so the log cannot
  say which template was chosen or which variant changed (`convex/events.ts:220`).
- **BR-08-F01-14** `[AS-BUILT]` — The template is stored on the event, so it applies to every
  invitation of that event; there is no per-invitation override (`convex/schema.ts:45`).
- **BR-08-F01-15** `[AS-BUILT]` — Newly added blocks are pre-filled from the **currently
  resolved** template's `defaultBlockConfig` at the moment of adding
  (`template-settings.tsx:117`).
- **BR-08-F01-16** `[AS-BUILT]` — The elegant template implements eleven of the thirteen block
  types: `hero`, `location`, `rsvp`, `countdown`, `itinerary`, `text`, `allergies`, `dressCode`,
  `specialInvitation`, `guestMessage`, `footer`
  (`src/components/public-invitation/templates/elegant/blocks/index.ts:15`–`:27`).

## 11. Acceptance Criteria

- **AC-08-F01-01** — **Given** an event with `templateId` unset **When** an Editor opens the
  Design Studio **Then** the preview renders with the elegant frame and the editor's internal
  selection is `elegant`. _(BR-08-F01-04, BR-08-F01-08)_
- **AC-08-F01-02** — **Given** an event whose `templateId` is `"does-not-exist"` **When** the
  public invitation page is opened **Then** it renders using the elegant template without an
  error. _(BR-08-F01-06)_
- **AC-08-F01-03** — **Given** exactly one registered template **When** an Editor opens the
  Design Studio **Then** no "Template" heading or picker card is present in the DOM.
  _(BR-08-F01-07)_
- **AC-08-F01-04** — **Given** a second template is registered in `TEMPLATES` **When** an Editor
  opens the Design Studio **Then** one card per template appears, in `Object.values(TEMPLATES)`
  order, each showing its label and description. _(BR-08-F01-05, BR-08-F01-07)_
- **AC-08-F01-05** — **Given** two registered templates **When** the Editor clicks the
  non-selected card **Then** the live preview re-renders with that template's frame **and** no
  Convex mutation is issued. _(BR-08-F01-09)_
- **AC-08-F01-06** — **Given** a layout containing a block type the selected template does not
  implement **When** the page renders **Then** that block produces no DOM output and the
  surrounding blocks render normally. _(BR-08-F01-03)_
- **AC-08-F01-07** — **Given** an Editor on the Design Studio **When** "Save layout" is pressed
  **Then** exactly one `setInvitationTemplate` call is made carrying `templateId` and all three
  variants, and the toast reads "Invitation layout saved". _(BR-08-F01-10)_
- **AC-08-F01-08** — **Given** a Viewer **When** `setInvitationTemplate` is invoked **Then** the
  mutation throws and no `events` field changes. _(BR-08-F01-11)_
- **AC-08-F01-09** — **Given** a successful save **When** the Activity page is opened **Then** a
  new entry with entity `template` and action `update` appears, naming the actor.
  _(BR-08-F01-12)_
- **AC-08-F01-10** — **Given** an Editor adds a `location` block **When** the block is expanded
  **Then** its Title field reads `Ubicación` and its Button label reads `Ver mapa`, seeded from
  the elegant `defaultBlockConfig`. _(BR-08-F01-15)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                                             |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-08-F01-01 | unit        | `resolveTemplate("elegant")` returns the elegant def; `resolveTemplate(undefined)`, `resolveTemplate(null)` and `resolveTemplate("nope")` all return the elegant def |
| TC-08-F01-02 | unit        | `TEMPLATE_LIST` equals `Object.values(TEMPLATES)` and `DEFAULT_TEMPLATE_ID` is a key of `TEMPLATES`                                                                  |
| TC-08-F01-03 | unit        | `ELEGANT_BLOCKS` has no key for `menuSelection` or `drinkSelection`, and has a component for each of the other eleven `BlockType` values                             |
| TC-08-F01-04 | unit        | `InvitationTemplate` renders nothing for a block whose type is absent from `template.blocks`, and still renders its siblings                                         |
| TC-08-F01-05 | integration | `setInvitationTemplate` as an Editor patches `templateId` and inserts one `activityLogs` row with `entity: "template"`                                               |
| TC-08-F01-06 | integration | `setInvitationTemplate` as a Viewer throws and leaves `events.templateId` unchanged                                                                                  |
| TC-08-F01-07 | integration | `setInvitationTemplate` called with only `{eventId, templateId}` leaves `layoutVariants` untouched                                                                   |
| TC-08-F01-08 | e2e         | With one registered template, the Design Studio shows no picker; the Save button still persists `templateId: "elegant"`                                              |
| TC-08-F01-09 | e2e         | With a stubbed second template, clicking its card changes the preview frame without a network write, and Save persists the new id                                    |

### Manual QA checklist

- [ ] Open `/dashboard/[eventSlug]/template` on an event that has never been saved — the preview renders and no picker is visible.
- [ ] Save without changing anything; confirm the "Invitation layout saved" toast.
- [ ] Open `/dashboard/[eventSlug]/activity` and confirm a template entry was added by the current user.
- [ ] Sign in as an Editor collaborator and confirm the Template sidebar link is present and the save succeeds.
- [ ] Manually set `events.templateId` to a bogus value and confirm the public invitation still renders.
- [ ] Confirm the same template applies to two different invitations of the same event.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No cap on the number of registered templates. `setInvitationTemplate` imposes no size limit on the saved layouts; the only ceiling is the Convex document size limit.                                                                                           |
| Performance      | Template resolution is a synchronous object lookup; switching templates re-renders the preview client-side with no network round trip. Persisting is a single `ctx.db.patch`.                                                                                   |
| Security & authz | `requireEventEditor(ctx, eventId, "editor")` is the sole gate (`convex/events.ts:216`). `templateId` is an unvalidated string, but `resolveTemplate` makes an unknown value inert rather than dangerous — no value is interpolated into markup or a URL.        |
| Accessibility    | Picker cards are real `<button type="button">` elements and are keyboard reachable, but the selected card is conveyed by border/background only — there is no `aria-pressed`, `role="radiogroup"` or visible selected-state text (`template-settings.tsx:212`). |
| i18n             | The studio chrome is English-only and hardcoded. The template's guest-facing default copy is Spanish (`default-copy.ts`). There is no locale switch.                                                                                                            |
| Analytics        | None. The only trace of a template change is the `activityLogs` row.                                                                                                                                                                                            |

## 14. TODOs & Open Questions

- **DEF-08-06** `[P2]` — Switching the template preserves the saved layouts verbatim, so blocks
  the new template does not implement are kept in the layout and then silently render nothing.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:215` (changing
    `templateId` does not touch `variants` state); `:194` (save writes the untouched variants);
    `src/components/public-invitation/templates/invitation-template.tsx:42` (missing component →
    `null`).
  - **Impact:** A host who switches template can lose whole sections of their page with no
    warning at switch time, no warning at save time, and no visible difference in the block list
    — only the preview goes quiet. Not reachable today because `elegant` is the only registered
    template, but it is the first thing a second template will hit.
  - **Proposed fix:** On template change, diff the composed block types against the incoming
    template's `blocks` map and surface the unsupported ones for explicit removal or keep-anyway
    confirmation before the save is allowed.
- **TODO-08-04** `[P2]` `[CHANGE]` — The picker is hidden entirely while only one template is
  registered, so the host never learns that "template" is a concept distinct from the block
  layout.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:207`
  - **Rationale:** The page heading and subheading both say "Pick a template", promising a
    control that is not on screen. It also means the picker's own rendering path is never
    exercised in production.
  - **Proposed rule:** Render the section whenever `TEMPLATE_LIST.length >= 1`, showing the
    single template as a selected, non-interactive card with an explanatory note.
- **TODO-08-09** `[P2]` `[ADD]` — Switching template does not reseed existing blocks' config
  from the new template's `defaultBlockConfig`.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:63` (seeding happens
    once, in the state initializer, from the **event's** template) and `:117` (reseeding happens
    only for newly added blocks).
  - **Rationale:** After a switch, existing blocks keep the previous template's default copy,
    while any block added afterwards gets the new template's copy — one page, two voices.
  - **Proposed rule:** On template change, re-apply the new template's `defaultBlockConfig` to
    every block, keeping host-authored values that differ from the previous template's defaults.
- **TODO-08-13** `[P2]` `[ADD]` — `events.templateId` accepts any string, both in the schema and
  in the mutation.
  - **Evidence:** `convex/schema.ts:45`; `convex/events.ts:201`
  - **Rationale:** An unknown id silently degrades to `elegant`, so the host's stored intent and
    the rendered page disagree with no signal anywhere.
  - **Proposed rule:** `setInvitationTemplate` rejects a `templateId` that is not a registered
    template id.
- **TODO-08-14** `[P2]` `[ADD]` — The `template` / `update` activity entry carries no
  `entityName`, so the log cannot distinguish a template switch from a copy tweak.
  - **Evidence:** `convex/events.ts:220`–`:225`
  - **Rationale:** Design changes are the highest-blast-radius edit a collaborator can make —
    they change every invitation at once — and the audit trail records only "someone modified the
    template".
  - **Proposed rule:** Log the resulting template label as `entityName`.

### Open questions

- **Q1** — Should the template be selectable per invitation (e.g. a different treatment for the
  wedding party) rather than only per event?
- **Q2** — When a second template ships, is switching expected to preserve the host's authored
  copy, or is a template switch a deliberate "start over" action?
- **Q3** — Should an unregistered `templateId` be a hard error on the public page instead of a
  silent fallback to `elegant`?

## 15. Traceability

| Concern                            | Source                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Route                              | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:3`         |
| Studio shell                       | `src/components/template-selection/template-settings.tsx:45`            |
| `templateId` editor state          | `src/components/template-selection/template-settings.tsx:56`            |
| Picker visibility gate             | `src/components/template-selection/template-settings.tsx:207`           |
| Picker cards                       | `src/components/template-selection/template-settings.tsx:211`           |
| Save handler                       | `src/components/template-selection/template-settings.tsx:194`           |
| `TemplateDef` contract             | `src/components/public-invitation/templates/template-registry.ts:11`    |
| `blocks` is `Partial<Record<...>>` | `src/components/public-invitation/templates/template-registry.ts:20`    |
| `TEMPLATES`                        | `src/components/public-invitation/templates/template-registry.ts:35`    |
| `DEFAULT_TEMPLATE_ID`              | `src/components/public-invitation/templates/template-registry.ts:48`    |
| `TEMPLATE_LIST`                    | `src/components/public-invitation/templates/template-registry.ts:50`    |
| `resolveTemplate`                  | `src/components/public-invitation/templates/template-registry.ts:52`    |
| Missing-block-component → `null`   | `src/components/public-invitation/templates/invitation-template.tsx:42` |
| Block component contract           | `src/components/public-invitation/templates/types.ts:6`                 |
| Elegant frame                      | `src/components/public-invitation/templates/elegant/frame.tsx:9`        |
| Elegant block map                  | `src/components/public-invitation/templates/elegant/blocks/index.ts:15` |
| Elegant seed config                | `src/components/public-invitation/templates/elegant/default-copy.ts:67` |
| Theme label / description          | `src/components/public-invitation/template-theme.tsx:33`                |
| Backend mutation                   | `convex/events.ts:199`                                                  |
| Authorization gate                 | `convex/events.ts:216`                                                  |
| Activity log write                 | `convex/events.ts:220`                                                  |
| Persistence                        | `convex/schema.ts:45`                                                   |
| Layout validator                   | `convex/schema.ts:7`                                                    |
| Public consumption of `templateId` | `convex/invitations.ts:222`                                             |
| Validation                         | None — the Design Studio has no zod schema                              |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
