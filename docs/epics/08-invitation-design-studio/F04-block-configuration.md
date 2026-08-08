---
id: EP-08-F04
title: Block Configuration
epic: EP-08 Invitation Design Studio
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-08-F03, EP-08-F05, EP-09-F01, EP-06-F01]
---

# EP-08-F04 — Block Configuration

## 1. Summary

Block configuration is how a host puts **their own words and pictures** into the public
invitation. Every [Block](../../glossary.md) placed on a layout carries a
[Block Config](../../glossary.md) — a key/value map whose editable shape is declared by the
block type's `ConfigField[]`. The Design Studio renders one input per field, switching on the
field's declared input kind, and writes the value straight into the block's `config` object.
The governing product rule is that **all non-derived copy is authorable**: if a string appears
on the public page and is not derived from event or guest data, the host can change it here.
Derived data — the event name, the couple's names, the date, the venue, the map link and the
guest names — is deliberately _not_ authorable in a block, because it is owned by Event Setup
and by the guest list and must stay consistent across every block that shows it.

## 2. Actors & Permissions

| Actor                | Access               | Notes                                                                                                                             |
| -------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full                 |                                                                                                                                   |
| Co-owner (`planner`) | Full                 |                                                                                                                                   |
| Editor               | Full                 | Config is saved by `events.setInvitationTemplate`, gated at `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) |
| Viewer               | None                 | The `editor` floor read-blocks viewers from the editor's queries                                                                  |
| Public guest         | None — consumes only | Sees the resolved copy on the rendered page (EP-07)                                                                               |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-08-F04-01** — As an Editor, I want to rewrite every visible sentence of a block so that
  the invitation speaks in the couple's voice rather than in the template's default Spanish.
- **US-08-F04-02** — As an Editor, I want to attach a photo from the event's
  [Media Library](../../glossary.md) to a block so that the page shows our own images.
- **US-08-F04-03** — As an Editor, I want to build the itinerary as a list of rows, each with a
  time, an activity and a picked illustration, so that the schedule reads as a designed
  timeline and not a paragraph.
- **US-08-F04-04** — As an Editor, I want to link the special-invitation block to one of the
  event's special invitations so that the card shows that sub-event's real details.
- **US-08-F04-05** — As an Editor, I want event-derived facts (date, venue, couple names) to
  appear automatically so that I never have to retype or re-sync them per block.

## 4. Entry Points

| Entry point                          | Route / control                                                                                           | Actor   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------- |
| Design Studio block list             | `/dashboard/[eventSlug]/template`                                                                         | Editor+ |
| Expand a block's config panel        | Chevron button on a block row (`src/components/template-selection/template-settings.tsx:293`)             | Editor+ |
| Media picker (image fields)          | "Choose from library" / thumbnail button (`src/components/template-selection/config-field-input.tsx:164`) | Editor+ |
| Illustration picker (itinerary rows) | Illustration button inside a list row (`src/components/template-selection/config-field-input.tsx:339`)    | Editor+ |

There is no deep link to a single block or field; configuration is always reached by expanding
a block on the Design Studio screen.

## 5. UX Flow

### Happy path

1. The Editor opens `/dashboard/[eventSlug]/template`. Blocks render collapsed — the expanded
   set starts empty (`template-settings.tsx:97`).
2. The Editor clicks a block's header. `toggleExpanded` adds its id to `expandedBlocks`
   (`template-settings.tsx:100`) and the config panel renders.
3. The panel filters `BLOCK_DEFS[block.type].fields` down to the fields whose `showWhen`
   condition is satisfied (`template-settings.tsx:337`), then renders a `ConfigFieldInput`
   per remaining field (`template-settings.tsx:348`).
4. The Editor edits a field. `ConfigFieldInput`'s `onChange` calls `updateConfig(block.id,
field.key, value)`, which replaces that one key on that one block's config in local state
   (`template-settings.tsx:156`).
5. The live preview re-renders immediately from the same in-memory block list
   (`template-settings.tsx:377`) — see EP-08-F06.
6. The Editor presses **Save layout**. All three variants, including every block config, are
   written by `api.events.setInvitationTemplate` (`convex/events.ts:199`).

### Alternate & edge paths

- **A1** — A block type with an empty `fields` array (`countdown`, `menuSelection`,
  `drinkSelection`) has nothing to configure; the panel renders nothing at all
  (`template-settings.tsx:345`).
- **A2** — `specialInvitation.image` is hidden until `specialTemplateId` equals `with-image`,
  via the field's `showWhen` (`src/components/public-invitation/blocks.ts:181`).
- **A3** — A `select` field always offers a **None** sentinel; choosing it stores `undefined`
  rather than an empty string (`config-field-input.tsx:44`, `:69`).
- **A4** — A dynamic `select` whose source is empty shows the inline hint "No special events
  yet — create one in the event's Special Events" (`config-field-input.tsx:83`).
- **A5** — An `image` field renders nothing when no `eventId` prop is supplied, because the
  media picker cannot be scoped (`config-field-input.tsx:107`).
- **A6** — Adding a block seeds its config from the template's `defaultBlockConfig` plus any
  event-derived values, so the fields open pre-filled rather than blank
  (`template-settings.tsx:116`).
- **A7** — A `location` block is seeded with a derived `address` and `buttonUrl` from the
  event's venue fields (`template-settings.tsx:410`); the Editor may overwrite both.
- **E1** — A stored config value of an unexpected type is ignored at render time rather than
  crashing: `getConfigString` returns `undefined` for non-strings and for blank/whitespace
  strings (`blocks.ts:328`), and `getConfigList` drops non-string, non-object entries
  (`blocks.ts:313`).
- **E2** — An `image` field pointing at a deleted media row resolves to no URL, and the
  elegant blocks fall back to the placeholder graphic (`elegant/blocks/primitives.tsx:223`,
  `:176`). In the editor the thumbnail falls back to a generic icon while the button still
  reads "Change" — see TODO-08-21.

## 6. States

| State             | Behavior                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading           | `media` and `specialEvents` are `undefined` until their queries resolve (`template-settings.tsx:47`, `:48`); image thumbnails and dynamic select options are empty until then                    |
| Empty             | A block with no fields renders no panel (`template-settings.tsx:345`); an empty media library shows the picker's "No images yet" empty state (`src/components/media/media-picker-dialog.tsx:58`) |
| Error             | None. No config field has validation, so no field-level error state exists — see TODO-08-01                                                                                                      |
| Success           | Edits appear in the live preview instantly; persistence is reported by the `useToastMutation` toast "Invitation layout saved" (`template-settings.tsx:52`)                                       |
| Disabled / locked | Only the Save button is ever disabled, while the mutation is in flight (`template-settings.tsx:389`). Individual fields are never disabled                                                       |
| Mobile            | The screen is a two-column `lg:` grid that collapses to one column below the `lg` breakpoint (`template-settings.tsx:203`); the block list scrolls independently                                 |

## 7. UI Specification

### Screens & components

| Element                                                        | Component                 | Path                                                                     |
| -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Design Studio shell, block list, expand/collapse, config panel | `TemplateSettings`        | `src/components/template-selection/template-settings.tsx:45`             |
| One config field                                               | `ConfigFieldInput`        | `src/components/template-selection/config-field-input.tsx:49`            |
| Image field (thumbnail, choose, clear)                         | `ImageFieldInput`         | `src/components/template-selection/config-field-input.tsx:147`           |
| List field (plain and structured rows)                         | `ListFieldInput`          | `src/components/template-selection/config-field-input.tsx:215`           |
| Itinerary illustration modal picker                            | `IllustrationPicker`      | `src/components/template-selection/config-field-input.tsx:316`           |
| Media library browser / uploader                               | `MediaPickerDialog`       | `src/components/media/media-picker-dialog.tsx:28`                        |
| Field model                                                    | `ConfigField`             | `src/components/public-invitation/blocks.ts:41`                          |
| Per-block field declarations                                   | `BLOCK_DEFS`              | `src/components/public-invitation/blocks.ts:90`                          |
| Illustration presets                                           | `ITINERARY_ILLUSTRATIONS` | `src/components/public-invitation/templates/elegant/illustrations.ts:21` |

### The six input kinds

`ConfigField.input` is a closed union of six values (`blocks.ts:47`). Each maps to exactly one
control and one stored shape.

| Input kind | Control                                                         | Stored shape                                                 | Extra `ConfigField` keys honored                    | Source                       |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- | ---------------------------- |
| `text`     | Single-line shadcn `Input`                                      | `string`                                                     | `placeholder`                                       | `config-field-input.tsx:134` |
| `textarea` | shadcn `Textarea`, `rows={3}`                                   | `string`                                                     | `placeholder`                                       | `config-field-input.tsx:120` |
| `list`     | Repeating rows with per-row Remove and a full-width "Add item"  | `string[]` (plain) or `Record<string,string>[]` (structured) | `itemFields`                                        | `config-field-input.tsx:215` |
| `image`    | Thumbnail button + "Choose from library" / "Change" + clear (X) | `string` — a `media` document id                             | none                                                | `config-field-input.tsx:147` |
| `toggle`   | shadcn `Switch`                                                 | `boolean`                                                    | none                                                | `config-field-input.tsx:91`  |
| `select`   | shadcn `Select` with a leading **None** item                    | `string` id, or `undefined` for None                         | `optionsSource` (dynamic) **or** `options` (static) | `config-field-input.tsx:57`  |

Two modifiers apply to any kind:

| Modifier                    | Effect                                                                                   | Source                               |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `placeholder`               | Passed to `text` / `textarea` inputs only                                                | `config-field-input.tsx:127`, `:139` |
| `showWhen: {key, equals[]}` | The field is rendered only when the block's `config[key]` stringifies to one of `equals` | `template-settings.tsx:337`          |

**`list` sub-shapes.** A field with no `itemFields` is a plain string list — each row is a
single `Input` and the row's value is a `string` (`config-field-input.tsx:278`). A field with
`itemFields` is a structured list — each row is a two-column grid of one control per item
field, and the row's value is a record keyed by `itemFields[].key`
(`config-field-input.tsx:246`). Adding a structured row seeds every item key to `""`
(`config-field-input.tsx:231`). An item field may itself declare `input: "illustration"`, which
swaps the text input for the modal preset picker (`config-field-input.tsx:255`); the only
structured list in the product today is `itinerary.items` (`blocks.ts:124`).

**`select` sources.** `optionsSource` is a closed union with exactly one member today,
`"specialEvents"` (`blocks.ts:53`). When set, the editor maps the event's special invitations
to `{value: _id, label: name}` (`config-field-input.tsx:61`); the list comes from
`api.specialEvents.listByEvent` (`template-settings.tsx:48`). When `optionsSource` is absent,
the field's static `options` array is used verbatim (`config-field-input.tsx:62`). A field that
sets both ignores `options` (`blocks.ts:57`).

**`image` fields.** The value stored is a media document id string, never a URL
(`blocks.ts:44`). It is resolved to a URL at render time — on the public page by
`getPublicInvitation`'s `mediaUrls` map (`convex/invitations.ts:194`), in the preview by the
editor's own media map (`template-settings.tsx:165`). The elegant blocks read it through
`getConfigImage` (`elegant/blocks/primitives.tsx:223`).

### The authorable-vs-derived rule

| Category                                              | Examples                                                                                                                                                                                                                                                              | Where it is authored                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Authorable** — every non-derived string on the page | Hero greeting, location title and button label, RSVP title/deadline/choice labels/note/submit label, allergy headline/note/labels/options, itinerary rows, dress-code body and note, special-invitation button labels, guest-message form labels, footer closing line | Block config, this feature                                                                                         |
| **Derived** — never authorable in a block             | Event name, bride name, groom name, event date, venue name, venue address, map link                                                                                                                                                                                   | Event Setup (EP-02); read from `data.event` by the blocks                                                          |
| **Derived** — never authorable in a block             | Guest names and their RSVP state                                                                                                                                                                                                                                      | The guest list (EP-04); read from `data.guests`                                                                    |
| **Derived** — never authorable in a block             | A special invitation's name, description, date and location                                                                                                                                                                                                           | Special Invitations (EP-06); read from the linked `specialEvents` row (`elegant/blocks/special-invitation.tsx:67`) |

The rule is visible in the block components: derived values are read off `data`, authorable
values off `block.config` with a `?? ELEGANT_COPY.*` fallback. For example the hero reads the
date and couple names from `data.event` but its greeting from config
(`elegant/blocks/hero.tsx:15`, `:16`), and the location derives its address from the venue
fields while still allowing an override (`elegant/blocks/location.tsx:16`, `:21`).

Two block-config fields are seeded _from_ derived data rather than reading it live:
`location.address` and `location.buttonUrl` are pre-filled from the event's venue at the moment
the block is created or the editor loads (`template-settings.tsx:410`). Once seeded they are
ordinary authorable strings and do **not** follow later edits to the event's venue — see
TODO-08-22.

### Fields & validation

| Field                           | Type                    | Required | Rule                                               | Message |
| ------------------------------- | ----------------------- | -------- | -------------------------------------------------- | ------- |
| Every `text` / `textarea` field | `string`                | No       | None — any length accepted                         | None    |
| Every `list` field              | array                   | No       | None — unbounded row count, rows may be blank      | None    |
| Every `image` field             | media id `string`       | No       | Not checked against the media library at save time | None    |
| Every `toggle` field            | `boolean`               | No       | None                                               | None    |
| Every `select` field            | `string` \| `undefined` | No       | Not checked for existence at save time             | None    |

**There is no validation anywhere in this feature.** No Zod schema covers block config; the
Convex validator accepts `config: v.optional(v.any())` (`convex/schema.ts:11`). See TODO-08-01.

### Copy deck

The Spanish strings below are the **defaults** seeded into a newly added block, quoted verbatim
from `src/components/public-invitation/templates/elegant/default-copy.ts`. They are all
authorable — the host may replace any of them. The full per-block mapping is in
[EP-08-F05](./F05-block-catalog.md).

| Key                              | Copy                                                                                                                                                                                                                                                           | Source               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `hero.body`                      | "Con mucha alegría en el corazón, queremos invitarte a acompañarnos en uno de los momentos más importantes de nuestras vidas. Será un día para celebrar el amor, la unión y el comienzo de una nueva historia que soñamos compartir con quienes más queremos." | `default-copy.ts:6`  |
| `location.title`                 | "Ubicación"                                                                                                                                                                                                                                                    | `default-copy.ts:69` |
| `location.buttonLabel`           | "Ver mapa"                                                                                                                                                                                                                                                     | `default-copy.ts:69` |
| `rsvp.title`                     | "Confirma tu asistencia"                                                                                                                                                                                                                                       | `default-copy.ts:8`  |
| `rsvp.deadline`                  | "Antes del 00 del Mes"                                                                                                                                                                                                                                         | `default-copy.ts:9`  |
| `rsvp.attendLabel`               | "Si asistiré"                                                                                                                                                                                                                                                  | `default-copy.ts:10` |
| `rsvp.declineLabel`              | "Lamentablemente no podré asistir"                                                                                                                                                                                                                             | `default-copy.ts:11` |
| `rsvp.note`                      | "Aunque adoramos a los más pequeños, hemos decidido que esta celebración sea exclusivamente para adultos."                                                                                                                                                     | `default-copy.ts:15` |
| `rsvp.submitLabel`               | "Enviar"                                                                                                                                                                                                                                                       | `default-copy.ts:14` |
| `allergies.headline`             | "Comida"                                                                                                                                                                                                                                                       | `default-copy.ts:17` |
| `allergies.note`                 | "Por favor, indícanos si tienes alguna alergia o restricción alimentaria para tenerlo en cuenta:"                                                                                                                                                              | `default-copy.ts:18` |
| `allergies.options`              | "Frutos secos" · "Mariscos / pescados" · "Lácteos" · "Gluten" · "Huevo" · "Vegetariano / Vegano"                                                                                                                                                               | `default-copy.ts:20` |
| `dressCode.dressCode`            | "_Hombres_: Smoking (traje y corbatín)\n*Mujeres*: Vestido formal de un solo tono\n\nAgradecemos evitar el color vinotinto, el blanco y sus tonalidades afines, tanto en vestuario femenino como masculino."                                                   | `default-copy.ts:34` |
| `specialInvitation.confirmLabel` | "Confirmar asistencia"                                                                                                                                                                                                                                         | `default-copy.ts:39` |
| `specialInvitation.detailsLabel` | "Ver detalles"                                                                                                                                                                                                                                                 | `default-copy.ts:40` |
| `guestMessage.headline`          | "Déjanos un mensaje"                                                                                                                                                                                                                                           | `default-copy.ts:48` |
| `guestMessage.note`              | "Sentimos que no puedas acompañarnos. Si quieres, déjanos unas palabras: nos encantará leerte."                                                                                                                                                                | `default-copy.ts:49` |
| `guestMessage.nameLabel`         | "Tu nombre"                                                                                                                                                                                                                                                    | `default-copy.ts:51` |
| `guestMessage.messageLabel`      | "Tu mensaje"                                                                                                                                                                                                                                                   | `default-copy.ts:52` |
| `guestMessage.placeholder`       | "Escribe aquí…"                                                                                                                                                                                                                                                | `default-copy.ts:53` |
| `guestMessage.submitLabel`       | "Enviar"                                                                                                                                                                                                                                                       | `default-copy.ts:54` |
| `footer.body`                    | "Esperamos celebrar juntos este comienzo tan importante en nuestras vidas."                                                                                                                                                                                    | `default-copy.ts:46` |
| `itinerary.items`                | "00:00 pm / Ceremonia" · "00:00 pm / Recepción" · "00:00 pm / Cocktail de bienvenida" · "00:00 pm / Fiesta"                                                                                                                                                    | `default-copy.ts:55` |

Editor-chrome copy (English, host-facing):

| Key                         | Copy                                                                | Source                       |
| --------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| Select placeholder          | "Select…"                                                           | `config-field-input.tsx:72`  |
| Select none option          | "None"                                                              | `config-field-input.tsx:75`  |
| Empty dynamic source hint   | "No special events yet — create one in the event's Special Events." | `config-field-input.tsx:84`  |
| Image chooser (unset / set) | "Choose from library" / "Change"                                    | `config-field-input.tsx:187` |
| List add button             | "Add item"                                                          | `config-field-input.tsx:305` |
| Illustration button (unset) | "Choose illustration"                                               | `config-field-input.tsx:358` |
| Illustration modal title    | "Choose Illustration"                                               | `config-field-input.tsx:365` |
| Media picker modal title    | "Choose Image"                                                      | `media-picker-dialog.tsx:46` |

### Itinerary illustrations

Each `itinerary.items` row carries an `illustration` key holding one of five stable preset
values (`illustrations.ts:21`): `church`, `cake`, `camera`, `celebration`, `food`. The stored
value is the preset key, never a path, so renaming an asset never breaks a saved layout
(`illustrations.ts:8`). The value is resolved to an SVG under `/templates/elegant` by
`itineraryIllustrationSrc` (`illustrations.ts:47`). A row with no illustration — or with an
unknown value — falls back to the preset at the row's index, cycling through the list
(`elegant/blocks/itinerary.tsx:37`, `illustrations.ts:42`), so an itinerary always renders
artwork.

## 8. Data Model

| Table           | Fields                                                                         | Read / Write                                                        | Index        |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------ |
| `events`        | `layoutVariants.{pending,accepted,declined}[].config`, `layoutBlocks[].config` | Read (editor load, public render) / Write (`setInvitationTemplate`) | by id        |
| `media`         | `_id`, `storageId`, `eventId`                                                  | Read — `image` config ids are resolved to URLs                      | `by_eventId` |
| `specialEvents` | `_id`, `name`                                                                  | Read — populates the `specialEvents` select source                  | `by_eventId` |

Block config is stored **inline on the event document**, inside the layout arrays; it has no
table of its own and no id. The persisted shape is loose: `LAYOUT_BLOCKS_VALIDATOR` types
`config` as `v.optional(v.any())` (`convex/schema.ts:7`).

**Lifecycle side effects.** Deleting a media item does not rewrite the config fields that
reference it; the id remains stored and simply stops resolving (see E2 and TODO-08-21).
Deleting a special invitation likewise leaves a dangling `specialEventId` — the
`specialInvitation` block then falls back to the sole accessible special event, or renders
nothing on the live page (`elegant/blocks/special-invitation.tsx:31`, `:45`). Deleting the
event cascades the media rows and their blobs along with the event document itself.

## 9. Backend Contract

| Function                              | Type         | Args                                                     | Returns                     | Guard                                                                 | Caps                                                                          |
| ------------------------------------- | ------------ | -------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `api.events.setInvitationTemplate`    | mutation     | `{eventId, templateId?, layoutBlocks?, layoutVariants?}` | `void`                      | `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) | None on config size or shape                                                  |
| `api.media.listByEvent`               | query        | `{eventId}`                                              | media rows + resolved `url` | `requireEventEditor`                                                  | Powers image thumbnails and the picker                                        |
| `api.specialEvents.listByEvent`       | query        | `{eventId}`                                              | special-invitation rows     | `requireEventEditor`                                                  | Powers the `specialEvents` select source                                      |
| `api.invitations.getPublicInvitation` | public query | `{eventSlug, invitationSlug}`                            | payload incl. `mediaUrls`   | none — data-level gating                                              | Resolves `image` config ids for the public page (`convex/invitations.ts:194`) |

## 10. Business Rules

- **BR-08-F04-01** `[AS-BUILT]` — A block's editable fields are exactly
  `BLOCK_DEFS[block.type].fields`; a block type with an empty `fields` array is not
  configurable (`blocks.ts:90`, `template-settings.tsx:285`).
- **BR-08-F04-02** `[AS-BUILT]` — `ConfigField.input` is one of exactly six kinds — `text`,
  `textarea`, `list`, `image`, `toggle`, `select` — and each maps to exactly one control
  (`blocks.ts:47`, `config-field-input.tsx:49`).
- **BR-08-F04-03** `[AS-BUILT]` — A field carrying `showWhen` renders only when the block's
  `config[showWhen.key]`, stringified, is contained in `showWhen.equals`
  (`template-settings.tsx:337`).
- **BR-08-F04-04** `[AS-BUILT]` — An `image` field stores the media document's id, not a URL
  (`config-field-input.tsx:207`, `blocks.ts:44`).
- **BR-08-F04-05** `[AS-BUILT]` — Clearing an `image` field writes `undefined`, not an empty
  string (`config-field-input.tsx:196`).
- **BR-08-F04-06** `[AS-BUILT]` — An `image` field renders no control when the editor supplies
  no `eventId`, because the picker must be scoped to one event's library
  (`config-field-input.tsx:107`).
- **BR-08-F04-07** `[AS-BUILT]` — A `select` field with `optionsSource: "specialEvents"` draws
  its options from the event's special invitations, mapping `_id` to value and `name` to label
  (`config-field-input.tsx:59`).
- **BR-08-F04-08** `[AS-BUILT]` — A `select` field without `optionsSource` uses its static
  `options` array (`config-field-input.tsx:62`).
- **BR-08-F04-09** `[AS-BUILT]` — Every `select` offers a **None** option that stores
  `undefined` (`config-field-input.tsx:69`, `:75`).
- **BR-08-F04-10** `[AS-BUILT]` — A `list` field with `itemFields` stores one record per row,
  keyed by the item-field keys; without `itemFields` it stores plain strings
  (`config-field-input.tsx:231`, `:280`).
- **BR-08-F04-11** `[AS-BUILT]` — A newly added structured list row is seeded with every item
  key set to the empty string (`config-field-input.tsx:231`).
- **BR-08-F04-12** `[AS-BUILT]` — An item field declaring `input: "illustration"` renders a
  modal preset picker instead of a text input, and stores the chosen preset's `value`
  (`config-field-input.tsx:255`, `:331`).
- **BR-08-F04-13** `[AS-BUILT]` — An itinerary row with no or unknown `illustration` renders
  the preset at the row's index modulo the preset count, so artwork is never missing
  (`elegant/blocks/itinerary.tsx:37`).
- **BR-08-F04-14** `[AS-BUILT]` — Adding a block pre-fills its config from the selected
  template's `defaultBlockConfig` for that block type, then overlays event-derived values
  (`template-settings.tsx:117`).
- **BR-08-F04-15** `[AS-BUILT]` — On editor load, a saved block's config wins over
  event-derived values, which win over the template's text defaults
  (`template-settings.tsx:70`).
- **BR-08-F04-16** `[AS-BUILT]` — A `location` block is seeded with `address` (venue name and
  address joined by ", ") and `buttonUrl` (the event's map URL, else a Google Maps search of
  that address) (`template-settings.tsx:414`).
- **BR-08-F04-17** `[AS-BUILT]` — Editing one field mutates only that field on that block
  instance; other blocks of the same type are unaffected (`template-settings.tsx:156`).
- **BR-08-F04-18** `[AS-BUILT]` — A config string that is absent, non-string, empty or
  whitespace-only is treated as unset at render time, and the block falls back to its
  template default copy (`blocks.ts:328`).
- **BR-08-F04-19** `[AS-BUILT]` — A config list that is absent, not an array, or empty is
  treated as unset at render time; entries that are neither strings nor plain objects are
  dropped (`blocks.ts:313`).
- **BR-08-F04-20** `[AS-BUILT]` — Derived event data — name, bride name, groom name, date,
  venue name, venue address, map link — is read from the event document by the block
  components and has no corresponding `ConfigField` in any block
  (`blocks.ts:90`, `elegant/blocks/hero.tsx:15`).
- **BR-08-F04-21** `[AS-BUILT]` — Guest names are read from `data.guests` and have no
  corresponding `ConfigField` in any block (`elegant/blocks/rsvp.tsx:104`).
- **BR-08-F04-22** `[AS-BUILT]` — A special invitation's name, description, date and location
  are read from the linked `specialEvents` row, not authored in the block; only the two button
  labels, the display template, the linked id and the optional image are configurable
  (`blocks.ts:154`, `elegant/blocks/special-invitation.tsx:67`).
- **BR-08-F04-23** `[AS-BUILT]` — Block config is persisted inline on the event document and is
  accepted by the backend as arbitrary JSON (`convex/schema.ts:11`, `convex/events.ts:204`).
- **BR-08-F04-24** `[AS-BUILT]` — Config edits are held in component state and reach the
  database only when **Save layout** is pressed; nothing autosaves
  (`template-settings.tsx:194`).

## 11. Acceptance Criteria

- **AC-08-F04-01** — **Given** a `countdown` block **When** the Editor expands it **Then** no
  config controls appear.
- **AC-08-F04-02** — **Given** a `rsvp` block **When** the Editor expands it **Then** six
  controls appear: five text/textarea inputs and one submit-label input, matching
  `BLOCK_DEFS.rsvp.fields`.
- **AC-08-F04-03** — **Given** a `specialInvitation` block whose `specialTemplateId` is
  `elegant` **When** the Editor expands it **Then** no Image field is shown; **When** the
  Editor switches the template to "With Image" **Then** the Image field appears.
- **AC-08-F04-04** — **Given** an `image` field **When** the Editor picks an image from the
  library **Then** the block's config holds that media document's id and the preview renders
  that image.
- **AC-08-F04-05** — **Given** an `image` field with a selection **When** the Editor clicks the
  clear (X) control **Then** the field is unset and the block renders its placeholder.
- **AC-08-F04-06** — **Given** an event with no special invitations **When** the Editor expands
  a `specialInvitation` block **Then** the linked-event select offers only **None** and the
  hint "No special events yet — create one in the event's Special Events." is shown.
- **AC-08-F04-07** — **Given** an `itinerary` block **When** the Editor adds a row **Then** the
  row has an empty Time input, an empty Activity input and an illustration button reading
  "Choose illustration".
- **AC-08-F04-08** — **Given** an itinerary row with the `church` illustration selected
  **When** the preview renders **Then** the row shows `/templates/elegant/itinerary-church.svg`.
- **AC-08-F04-09** — **Given** an itinerary row with no illustration **When** the preview
  renders **Then** the row still shows an illustration, chosen by row index.
- **AC-08-F04-10** — **Given** two `text` blocks on the same layout **When** the Editor edits
  the first block's headline **Then** the second block's headline is unchanged.
- **AC-08-F04-11** — **Given** a `hero` block whose `body` is cleared to whitespace **When**
  the page renders **Then** the default Spanish greeting from `ELEGANT_COPY.heroIntro` is shown.
- **AC-08-F04-12** — **Given** an event with a venue name and address **When** the Editor adds
  a `location` block **Then** its Address field is pre-filled with "name, address" and its
  Button URL with the event's map URL or a Google Maps search link.
- **AC-08-F04-13** — **Given** any block **When** the Editor looks for a field to change the
  couple's names, the event date or a guest's name **Then** no such field exists in any block.
- **AC-08-F04-14** — **Given** unsaved config edits **When** the Editor presses **Save layout**
  **Then** `events.setInvitationTemplate` is called with all three variants and the toast
  "Invitation layout saved" is shown.
- **AC-08-F04-15** — **Given** a config `image` id whose media row was deleted **When** the
  public page renders **Then** the block shows the placeholder image rather than a broken image.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                                   |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-08-F04-01 | unit        | `getConfigString` returns `undefined` for missing, non-string, empty and whitespace-only values, and the original string otherwise                         |
| TC-08-F04-02 | unit        | `getConfigList` returns `undefined` for non-arrays and empty arrays, and drops nested-array entries                                                        |
| TC-08-F04-03 | unit        | `itineraryIllustrationSrc` resolves each of the five preset keys and returns `undefined` for an unknown key                                                |
| TC-08-F04-04 | unit        | Every `ConfigField` in `BLOCK_DEFS` declares an `input` within the six-value union, and every `select` declares exactly one of `optionsSource` / `options` |
| TC-08-F04-05 | unit        | `deriveEventConfig` returns `{}` for every block type except `location`, and omits `address` / `buttonUrl` when the venue fields are blank                 |
| TC-08-F04-06 | integration | `ConfigFieldInput` renders the correct control for each of the six input kinds                                                                             |
| TC-08-F04-07 | integration | Choosing **None** in a `select` writes `undefined`, not `"__none__"`                                                                                       |
| TC-08-F04-08 | integration | Adding and removing rows in a structured list preserves the other rows' values and keys                                                                    |
| TC-08-F04-09 | integration | `showWhen` shows and hides the special-invitation Image field as `specialTemplateId` changes                                                               |
| TC-08-F04-10 | integration | Editing one block's config leaves sibling blocks of the same type untouched                                                                                |
| TC-08-F04-11 | e2e         | Edit the hero greeting, save, open the public invitation, and see the new greeting                                                                         |
| TC-08-F04-12 | e2e         | Pick a hero photo, save, and see that image on the public invitation                                                                                       |
| TC-08-F04-13 | e2e         | Delete the media item a saved `image` field references, reload the public page, and see the placeholder rather than a broken image                         |

### Manual QA checklist

- [ ] Expand every block type in turn and confirm the fields match [F05](./F05-block-catalog.md)
- [ ] Confirm no block exposes a field for the couple's names, the date, the venue or a guest name
- [ ] Paste a 5,000-character paragraph into a textarea, save, and inspect the public page
- [ ] Add 50 itinerary rows and confirm the editor and preview stay usable
- [ ] Switch a special-invitation block between "Elegant Card" and "With Image" and confirm the Image field appears and disappears
- [ ] Clear an image field and confirm the placeholder renders in the preview
- [ ] Confirm each of the five illustrations renders in both picker and preview

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | None on config. No maximum text length, no maximum list length, no maximum block count. The only adjacent caps are the Media Library's (≤5 MB per image, ≤50 images per event) and the special-invitation cap of 2 per event                           |
| Performance      | All editing is local component state; the preview re-renders synchronously on each keystroke. The whole layout — all three variants — is written on every save                                                                                         |
| Security & authz | `requireEventEditor(ctx, eventId, "editor")` on the write (`convex/events.ts:216`); `media` ids in config are re-validated against the event when resolved for the public page (`convex/invitations.ts:200`), so a foreign media id cannot be surfaced |
| Accessibility    | Every control carries an `aria-label` derived from the field label; list rows use "`<field label>` `<index>` — `<item label>`" (`config-field-input.tsx:271`); the expand control sets `aria-expanded` (`template-settings.tsx:296`)                   |
| i18n             | The editor chrome is English; the seeded defaults are Spanish. No locale switch exists; the host authors whatever language they type                                                                                                                   |
| Analytics        | None                                                                                                                                                                                                                                                   |

## 14. TODOs & Open Questions

- **TODO-08-01** `[P1]` `[ADD]` — Block config has no validation of any kind: no required
  fields, no maximum text length, no maximum list length, no check that an `image` id or a
  `specialEventId` still exists.
  - **Evidence:** `convex/schema.ts:11` (`config: v.optional(v.any())`);
    `convex/events.ts:204` patches `args` straight through with no inspection;
    `src/components/template-selection/config-field-input.tsx:49` has no validation branch;
    no schema in `src/lib/validations/` covers block config.
  - **Rationale:** A host can save a hero greeting of arbitrary length, a hundred itinerary
    rows, or a dangling media id, and only discover the consequence on the live invitation
    their guests are already reading.
  - **Proposed rule:** Declare per-field constraints on `ConfigField` (`required`, `maxLength`,
    `maxItems`), enforce them in the editor before enabling Save, and re-enforce them in
    `setInvitationTemplate` with a typed validator instead of `v.any()`.
- **DEF-08-05** `[P2]` — `text.showFlourishes` renders as **on** when unset but the editor's
  Switch shows it **off**, so the preview and the control disagree until the host toggles it
  twice.
  - **Evidence:** `src/components/public-invitation/templates/elegant/blocks/text.tsx:10`
    (`block.config?.showFlourishes !== false` — unset means on) versus
    `src/components/template-selection/config-field-input.tsx:96`
    (`checked={value === true}` — unset means off).
  - **Impact:** A `text` block added outside the elegant preset (whose
    `ELEGANT_BLOCK_CONFIG.text` does seed `showFlourishes: true`,
    `default-copy.ts:79`) shows flourishes in the preview while its Switch reads off. Turning
    the Switch on then off writes `false` and finally removes them — the control appears to do
    nothing the first time it is pressed.
  - **Proposed fix:** Make the stored value authoritative in both directions — either default
    the renderer to `=== true`, or have the editor treat `undefined` as on for this field.
- **TODO-08-20** `[P2]` `[ADD]` — The `allergies` block renders a question line from a config
  key `question` that `BLOCK_DEFS.allergies` does not declare, so the string is unauthorable.
  - **Evidence:** `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:141`
    reads `getConfigString(block, "question")`, but the field list at
    `src/components/public-invitation/blocks.ts:199` has no `question` entry; the string always
    falls back to `ELEGANT_COPY.foodQuestion` — "¿Tienes alguna alergia o restricción
    alimentaria?" (`default-copy.ts:28`).
  - **Rationale:** It breaks the epic's central promise that all non-derived copy is
    authorable, and the renderer already supports the override.
  - **Proposed rule:** Add `{key: "question", label: "Question", input: "text"}` to
    `BLOCK_DEFS.allergies.fields`.
- **TODO-08-21** `[P2]` `[CHANGE]` — An `image` field whose media item was deleted gives the
  Editor no signal: the thumbnail silently falls back to a generic icon while the button still
  reads "Change", as if an image were selected.
  - **Evidence:** `src/components/template-selection/config-field-input.tsx:156`
    (`media?.find(...)` yields `undefined`), `:170` (falls through to the icon), `:187`
    (label keyed off `mediaId`, which is still set). The public page degrades gracefully to the
    placeholder (`elegant/blocks/primitives.tsx:223`, `:176`) — the defect is host-facing only.
  - **Rationale:** The host believes the block has a photo; guests see a placeholder. Cross-ref
    [EP-09 (Media Library)](../09-media-library/), which owns the delete that orphans the id.
  - **Proposed rule:** Show a "Image no longer available" state on an unresolvable id and offer
    to clear the field.
- **TODO-08-22** `[P2]` `[CHANGE]` — `location.address` and `location.buttonUrl` are seeded
  from the event's venue once and then never re-sync; editing the venue in Event Setup does not
  update an already-saved location block.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:70` places
    `block.config` last in the merge, so a saved value always wins over `deriveEventConfig`
    (`:410`); the renderer likewise prefers config over the derived address
    (`elegant/blocks/location.tsx:21`).
  - **Rationale:** The venue is documented as derived data, but this one block turns it into a
    stale copy — the invitation can show an address the event no longer has.
  - **Proposed rule:** Leave the fields unset unless the host explicitly overrides them, so the
    renderer's derived fallback stays live.
- **TODO-08-23** `[P2]` `[ADD]` — `optionsSource` supports exactly one source
  (`"specialEvents"`), so no other event-derived list (menu options, drink options, tables) can
  back a select field.
  - **Evidence:** `src/components/public-invitation/blocks.ts:53`;
    `src/components/template-selection/config-field-input.tsx:59` hard-codes the single branch.
  - **Rationale:** Blocks that need to reference catering data have no mechanism today —
    cross-ref [EP-11 (Catering)](../11-catering/) and DEF-08-01 in
    [F05](./F05-block-catalog.md).
  - **Proposed rule:** Make `optionsSource` a registry of named sources the editor resolves
    generically.

### Open questions

- **Q1** — Should authorable copy carry the same `{variable}` substitution the Meta feature
  offers (`convex/lib/meta.ts`), so a host could write "Querida {guest-names}" in a hero
  greeting? No block config resolves variables today.
- **Q2** — Should a block field be able to declare itself required, given that every block
  currently renders a template default when its config is blank? Requiring a field would
  change the meaning of "unset" for that block.
- **Q3** — What is the intended maximum for an itinerary — the design's connector artwork
  assumes an alternating left/right rhythm that is untested past a handful of rows.

## 15. Traceability

| Concern                                             | Source                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Route                                               | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:1`                       |
| Field model (`ConfigField`, six input kinds)        | `src/components/public-invitation/blocks.ts:41`                                       |
| Per-block field declarations                        | `src/components/public-invitation/blocks.ts:90`                                       |
| Config readers (`getConfigList`, `getConfigString`) | `src/components/public-invitation/blocks.ts:313`, `:328`                              |
| Field renderer                                      | `src/components/template-selection/config-field-input.tsx:49`                         |
| Image field                                         | `src/components/template-selection/config-field-input.tsx:147`                        |
| List field                                          | `src/components/template-selection/config-field-input.tsx:215`                        |
| Illustration picker                                 | `src/components/template-selection/config-field-input.tsx:316`                        |
| Media picker                                        | `src/components/media/media-picker-dialog.tsx:28`                                     |
| Config panel + `showWhen` filter                    | `src/components/template-selection/template-settings.tsx:337`                         |
| Config write path                                   | `src/components/template-selection/template-settings.tsx:156`                         |
| Seeding on add                                      | `src/components/template-selection/template-settings.tsx:116`                         |
| Seeding on load (merge order)                       | `src/components/template-selection/template-settings.tsx:70`                          |
| Event-derived seed                                  | `src/components/template-selection/template-settings.tsx:410`                         |
| Illustration presets                                | `src/components/public-invitation/templates/elegant/illustrations.ts:21`              |
| Illustration fallback + resolver                    | `src/components/public-invitation/templates/elegant/illustrations.ts:42`, `:47`       |
| Default copy                                        | `src/components/public-invitation/templates/elegant/default-copy.ts:5`                |
| Default per-block config                            | `src/components/public-invitation/templates/elegant/default-copy.ts:67`               |
| Derived data in a block (hero)                      | `src/components/public-invitation/templates/elegant/blocks/hero.tsx:15`               |
| Derived data in a block (location)                  | `src/components/public-invitation/templates/elegant/blocks/location.tsx:16`           |
| Derived data in a block (special invitation)        | `src/components/public-invitation/templates/elegant/blocks/special-invitation.tsx:67` |
| Image resolution helper                             | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:223`        |
| Image placeholder fallback                          | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:176`        |
| Backend                                             | `convex/events.ts:199` (`setInvitationTemplate`), `:216` (guard)                      |
| Public media resolution                             | `convex/invitations.ts:194`                                                           |
| Persistence validator                               | `convex/schema.ts:7`                                                                  |
| Validation                                          | None — no schema in `src/lib/validations/` covers block config                        |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
