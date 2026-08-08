---
id: EP-08-F05
title: Block Catalog
epic: EP-08 Invitation Design Studio
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-08-F03, EP-08-F04]
---

# EP-08-F05 — Block Catalog

## 1. Summary

This is the reference page for every [Block](../../glossary.md) that exists in Wedboard: what
each one renders on a public invitation, which content fields a host can author on it, which
default layouts include it, and whether the `elegant` template actually implements it. It is
written for whoever needs a single authoritative answer to "what can this invitation contain?"
— a host deciding what to add, a QA engineer deciding what to test, or an engineer adding a
second template and needing the full contract to implement. Every row is enumerated from
`BLOCK_DEFS` and `BLOCK_PALETTE` (`src/components/public-invitation/blocks.ts:90`, `:244`) and
from the `elegant` block map (`src/components/public-invitation/templates/elegant/blocks/index.ts:15`)
— nothing here is inferred.

## 2. Actors & Permissions

| Actor                | Access        | Notes                                                                                                                                           |
| -------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full          |                                                                                                                                                 |
| Co-owner (`planner`) | Full          |                                                                                                                                                 |
| Editor               | Full          | Every block in the palette is offered to any Editor; the save is gated at `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) |
| Viewer               | None          | The `editor` floor read-blocks viewers                                                                                                          |
| Public guest         | Consumes only | Sees the blocks that the resolved layout contains and that the template implements                                                              |

There is **no per-block permission**. Every role that can open the Design Studio can place
every block type. Role semantics live in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-08-F05-01** — As an Editor, I want to see every available block with a name and a
  one-line description so that I can decide what my invitation should contain.
- **US-08-F05-02** — As an Editor, I want a block I add to actually appear on the invitation,
  so that the page reflects what the builder told me I had built.
- **US-08-F05-03** — As a QA engineer, I want an exact list of each block's config keys and
  defaults so that I can assert on rendered copy without reading the components.
- **US-08-F05-04** — As an engineer adding a second template, I want the complete block
  contract so that I know exactly which components my template must supply.

## 4. Entry Points

| Entry point                                           | Route / control                                                                                   | Actor   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| "Add block" select — the palette, in display order    | `/dashboard/[eventSlug]/template` (`src/components/template-selection/template-settings.tsx:266`) | Editor+ |
| Block rows in the variant's list — the current layout | `/dashboard/[eventSlug]/template` (`src/components/template-selection/template-settings.tsx:284`) | Editor+ |

## 5. UX Flow

### Happy path

1. The Editor opens the **Add block** select. It lists every entry of `BLOCK_PALETTE`, in the
   array's order, labeled with `BLOCK_DEFS[type].label`
   (`src/components/template-selection/template-settings.tsx:274`).
2. Choosing one appends a block of that type to the active variant, pre-seeded with the
   template's default config for that type (`template-settings.tsx:116`).
3. The block appears in the list, collapsed, labeled with the same `BLOCK_DEFS` label
   (`template-settings.tsx:305`).
4. The live preview re-renders. `InvitationTemplate` looks the block type up in the selected
   template's `blocks` map and renders the component, or **nothing** if the template has no
   component for that type (`src/components/public-invitation/templates/invitation-template.tsx:42`).

### Alternate & edge paths

- **A1** — A block type not in `BLOCK_PALETTE` can still exist in a layout (a template preset
  may include it), and it renders normally. `BLOCK_PALETTE` governs only what is _offered_.
  Today the palette contains all 13 block types.
- **A2** — A saved block whose `type` has no `BLOCK_DEFS` entry is silently dropped when the
  editor loads (`template-settings.tsx:81`) — see TODO-08-11, owned by
  [F03](./F03-block-composition.md).
- **E1** — A block whose type the template does not implement renders nothing on the page and
  gives no signal anywhere in the editor. This is DEF-08-01 and DEF-08-03.

## 6. States

| State             | Behavior                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Palette entries are static constants and render immediately; only `media` and `specialEvents` (used by config fields) load asynchronously                                                         |
| Empty             | A variant with no blocks renders an empty frame in the preview; `InvitationTemplate` falls back to the template preset only when `blocks` is empty at render entry (`invitation-template.tsx:33`) |
| Error             | None — no palette operation can fail                                                                                                                                                              |
| Success           | The added block appears in the list and, if implemented by the template, in the preview                                                                                                           |
| Disabled / locked | No palette entry is ever disabled — including the two the elegant template cannot render (DEF-08-01)                                                                                              |
| Mobile            | The palette is a standard shadcn `Select`; it is usable at any width                                                                                                                              |

## 7. UI Specification

### Screens & components

| Element                                 | Component                           | Path                                                                      |
| --------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| Block type union                        | `BlockType`                         | `src/components/public-invitation/blocks.ts:7`                            |
| Per-block label, description and fields | `BLOCK_DEFS`                        | `src/components/public-invitation/blocks.ts:90`                           |
| Palette (add-menu order)                | `BLOCK_PALETTE`                     | `src/components/public-invitation/blocks.ts:244`                          |
| Global per-variant default order        | `DEFAULT_ORDER` / `defaultLayout()` | `src/components/public-invitation/blocks.ts:268`, `:300`                  |
| Elegant preset layouts                  | `elegantDefaultLayouts`             | `src/components/public-invitation/templates/elegant/default-layout.ts:44` |
| Elegant component map                   | `ELEGANT_BLOCKS`                    | `src/components/public-invitation/templates/elegant/blocks/index.ts:15`   |
| Renderer (look-up-or-nothing)           | `InvitationTemplate`                | `src/components/public-invitation/templates/invitation-template.tsx:41`   |

---

### 7.1 The catalog

Thirteen block types exist (`blocks.ts:7`). All thirteen are in the palette (`blocks.ts:244`).
Eleven have an `elegant` component (`elegant/blocks/index.ts:15`).

**Legend.** _Palette #_ is the position in the add-menu. _Default layouts_ lists membership in
the global `defaultLayout(variant)` (`G`) and in the elegant preset (`E`) for each variant —
`A` accepted, `P` pending, `D` declined. _Elegant_ is whether the elegant template supplies a
component.

| #   | Type                | Label                       | Renders                                                                                                            | Config fields       | Default layouts       | Elegant                       |
| --- | ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------- | ----------------------------- |
| 1   | `text`              | Text                        | A centered paragraph with an optional script headline and two decorative flourishes                                | 3                   | `E:A` (twice)         | ✅ `ElegantText`              |
| 2   | `hero`              | Hero                        | Event date, a sealed square photo, the couple's names in script, and a greeting paragraph                          | 2                   | `G:A P D` · `E:A P D` | ✅ `ElegantHero`              |
| 3   | `location`          | Location & Address          | A flourish, a title, a full-width venue image with an overlaid map button, and the address                         | 5                   | `G:A P D` · `E:A P`   | ✅ `ElegantLocation`          |
| 4   | `countdown`         | Countdown                   | "Faltan" plus a live days:hours:minutes counter to the event date                                                  | 0                   | `G:A` · `E:A`         | ✅ `ElegantCountdown`         |
| 5   | `itinerary`         | Itinerary                   | "Itinerario", the event date, and an alternating left/right timeline of rows, each with a preset illustration      | 1 (structured list) | `G:A` · `E:A`         | ✅ `ElegantItinerary`         |
| 6   | `dressCode`         | Dress Code                  | "Dress code", a tilted sealed photo, and the dress-code body plus optional note, both rich-text                    | 3                   | `G:A` · `E:A`         | ✅ `ElegantDressCode`         |
| 7   | `specialInvitation` | Special Invitation          | A card for one linked special invitation plus a button opening a per-guest RSVP modal                              | 5                   | `G:A` · `E:A`         | ✅ `ElegantSpecialInvitation` |
| 8   | `rsvp`              | RSVP (per guest)            | Title, deadline, one attending/declining radio group per named guest, per-host +1 sub-question, note and submit    | 6                   | `G:A P` · `E:P`       | ✅ `ElegantRsvp`              |
| 9   | `allergies`         | Allergies (per guest)       | Headline, note, a per-guest none/has radio plus a multi-select of allergy options and an "other" field, and submit | 7                   | `G:A` · `E:A`         | ✅ `ElegantAllergies`         |
| 10  | `menuSelection`     | Menu Selection (per guest)  | **Nothing — no component exists**                                                                                  | 0                   | none                  | ❌ **not implemented**        |
| 11  | `drinkSelection`    | Drink Selection (per guest) | **Nothing — no component exists**                                                                                  | 0                   | none                  | ❌ **not implemented**        |
| 12  | `guestMessage`      | Message to the host         | Headline, note, a name field, a message field and a submit button writing a `guestMessages` row                    | 6                   | `G:D` · `E:D`         | ✅ `ElegantGuestMessage`      |
| 13  | `footer`            | Footer                      | A gold closing line and a flourish graphic                                                                         | 1                   | `G:A P D` · `E:A P D` | ✅ `ElegantFooter`            |

**Unimplemented palette entries.** Exactly two — `menuSelection` and `drinkSelection`. Every
other palette entry has an `elegant` component. See DEF-08-01.

---

### 7.2 Per-block detail

Each subsection lists the block's `BLOCK_DEFS` description verbatim, then every config field
with its key, label, input kind, placeholder and seeded default. "Default" is the value written
into a newly added block from `ELEGANT_BLOCK_CONFIG`
(`src/components/public-invitation/templates/elegant/default-copy.ts:67`); "—" means the field
is seeded empty. "Render fallback" is what the elegant component shows when the field is unset.

#### 1. `text` — Text

> "A free paragraph with an optional headline."

| Key              | Label           | Input      | Placeholder           | Seeded default | Render fallback                    |
| ---------------- | --------------- | ---------- | --------------------- | -------------- | ---------------------------------- |
| `headline`       | Headline        | `text`     | "Optional headline"   | —              | Headline omitted entirely          |
| `body`           | Text            | `textarea` | "Write your message…" | —              | Paragraph omitted entirely         |
| `showFlourishes` | Show flourishes | `toggle`   | —                     | `true`         | Flourishes **shown** (unset ≠ off) |

The elegant preset places two `text` blocks with their own copy: "Gracias por confirmar tu
asistencia y por acompañarnos en este día tan especial para nosotros." with flourishes on, and
a headline-only "Lluvia de sobres" with flourishes off (`elegant/default-layout.ts:12`, `:15`).
Both `headline` and `body` are conditionally rendered, so a `text` block with neither set
renders an empty section (`elegant/blocks/text.tsx:29`, `:34`). See DEF-08-05 in
[F04](./F04-block-configuration.md) for the `showFlourishes` mismatch.

#### 2. `hero` — Hero

> "Event name, date, photo and greeting."

| Key         | Label    | Input      | Placeholder        | Seeded default           | Render fallback                    |
| ----------- | -------- | ---------- | ------------------ | ------------------------ | ---------------------------------- |
| `body`      | Greeting | `textarea` | "Intro paragraph…" | `ELEGANT_COPY.heroIntro` | Same Spanish greeting              |
| `heroImage` | Photo    | `image`    | —                  | —                        | `/templates/image-placeholder.jpg` |

Derived, not authorable: the date (`data.event.date`) and the couple's names, taken from
`brideName` / `groomName` and falling back to splitting the event name
(`elegant/blocks/hero.tsx:15`, `:21`, `:28`).

Default greeting, verbatim (`default-copy.ts:6`):

> "Con mucha alegría en el corazón, queremos invitarte a acompañarnos en uno de los momentos
> más importantes de nuestras vidas. Será un día para celebrar el amor, la unión y el comienzo
> de una nueva historia que soñamos compartir con quienes más queremos."

#### 3. `location` — Location & Address

> "Venue name and address."

| Key           | Label          | Input   | Placeholder                 | Seeded default                                                        | Render fallback                                       |
| ------------- | -------------- | ------- | --------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| `title`       | Title          | `text`  | "Ubicación"                 | "Ubicación"                                                           | "Ubicación"                                           |
| `address`     | Address        | `text`  | "Venue name, address…"      | Event venue name + address, joined ", "                               | Same derived string, else "Venue Name, Venue Address" |
| `mapImage`    | Location image | `image` | —                           | —                                                                     | `/templates/image-placeholder.jpg`                    |
| `buttonLabel` | Button label   | `text`  | "Ver mapa"                  | "Ver mapa"                                                            | "Ver mapa"                                            |
| `buttonUrl`   | Button URL     | `text`  | "https://maps.google.com/…" | `event.venueMapUrl`, else a Google Maps search of the derived address | `mapHref(event, address)`                             |

The map button renders only when the event has a `venueAddress` or the block has an explicit
`buttonUrl` (`elegant/blocks/location.tsx:25`). `address` and `buttonUrl` are seeded from event
data by `deriveEventConfig` (`template-settings.tsx:414`) and then never re-sync — TODO-08-22.

#### 4. `countdown` — Countdown

> "Live countdown to the event date."

No config fields — `fields: []` (`blocks.ts:122`). Entirely data-driven: the heading "Faltan",
the zero-padded `days:hours:minutes` figure and the labels "Días" / "Horas" / "Min" are
hard-coded in the component (`elegant/blocks/countdown.tsx:10`, `:16`) and are **not**
authorable. See TODO-08-24.

#### 5. `itinerary` — Itinerary

> "Schedule of the day."

| Key     | Label    | Input               | Item fields                                                                                                                          | Seeded default                                 |
| ------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `items` | Schedule | `list` (structured) | `time` (Time, text) · `label` (Activity, text) · `illustration` (Illustration, `illustration` picker over `ITINERARY_ILLUSTRATIONS`) | The four rows of `ELEGANT_COPY.itineraryItems` |

Seeded rows, verbatim (`default-copy.ts:55`): "00:00 pm — Ceremonia", "00:00 pm — Recepción",
"00:00 pm — Cocktail de bienvenida", "00:00 pm — Fiesta". None carries an illustration, so all
four fall back by index.

The heading "Itinerario" and the date line are derived and not authorable
(`elegant/blocks/itinerary.tsx:23`, `:26`). Rows with neither a time nor a label are dropped at
render (`elegant/blocks/itinerary.tsx:18`). Illustration presets: `church`, `cake`, `camera`,
`celebration`, `food` (`elegant/illustrations.ts:21`).

#### 6. `dressCode` — Dress Code

> "Dress code and a short note."

| Key         | Label      | Input      | Placeholder          | Seeded default           | Render fallback                    |
| ----------- | ---------- | ---------- | -------------------- | ------------------------ | ---------------------------------- |
| `dressCode` | Dress code | `textarea` | "Formal / Black Tie" | `ELEGANT_COPY.dressCode` | Same Spanish text                  |
| `note`      | Note       | `textarea` | "Optional note"      | —                        | Note omitted entirely              |
| `photo`     | Photo      | `image`    | —                    | —                        | `/templates/image-placeholder.jpg` |

Both text fields render through `RichText`, so `*bold*` and `_italic_` markers are honored and
newlines are preserved (`elegant/blocks/dress-code.tsx:21`,
`elegant/blocks/primitives.tsx:187`). The heading "Dress code" is hard-coded
(`elegant/blocks/dress-code.tsx:13`). Default body, verbatim (`default-copy.ts:34`):

> "_Hombres_: Smoking (traje y corbatín)\n*Mujeres*: Vestido formal de un solo tono\n\nAgradecemos evitar el color vinotinto, el blanco y sus tonalidades afines, tanto en vestuario femenino como masculino."

#### 7. `specialInvitation` — Special Invitation

> "Shows a special event (managed in Special Events) and lets guests RSVP to it."

| Key                 | Label                             | Input    | Options / source                                                 | Seeded default         |
| ------------------- | --------------------------------- | -------- | ---------------------------------------------------------------- | ---------------------- |
| `specialEventId`    | Linked special event              | `select` | `optionsSource: "specialEvents"`                                 | —                      |
| `specialTemplateId` | Template                          | `select` | static: `elegant` ("Elegant Card") · `with-image` ("With Image") | `"elegant"`            |
| `image`             | Image                             | `image`  | shown only when `specialTemplateId` is `with-image` (`showWhen`) | —                      |
| `confirmLabel`      | Confirm button                    | `text`   | placeholder "Confirmar asistencia"                               | "Confirmar asistencia" |
| `detailsLabel`      | Details button (after responding) | `text`   | placeholder "Ver detalles"                                       | "Ver detalles"         |

The card's name, description, date and location come from the linked
[Special Invitation](../../glossary.md), not from config
(`elegant/blocks/special-invitation.tsx:67`). Binding: the configured id if the invitation has
access to it, else the sole accessible one, else nothing
(`elegant/blocks/special-invitation.tsx:31`). When nothing is bound the block **renders nothing
on the live page** (`:45`); in the preview it shows the sample sub-event with the button
disabled. The button label switches to `detailsLabel` once every non-declined guest already has
a stored status for that special invitation (`:54`).

#### 8. `rsvp` — RSVP (per guest)

> "Attending / declines choice per guest (plus-one aware)."

| Key            | Label           | Input      | Placeholder                                    | Seeded default                     |
| -------------- | --------------- | ---------- | ---------------------------------------------- | ---------------------------------- |
| `title`        | Title           | `text`     | "Confirma tu asistencia"                       | "Confirma tu asistencia"           |
| `deadline`     | Deadline        | `text`     | "Antes del 00 del Mes"                         | "Antes del 00 del Mes"             |
| `attendLabel`  | Attending label | `text`     | "Sí asistiré"                                  | "Si asistiré"                      |
| `declineLabel` | Declining label | `text`     | "Lamentablemente no podré asistir"             | "Lamentablemente no podré asistir" |
| `note`         | Note            | `textarea` | "Optional note shown below the RSVP controls…" | `ELEGANT_COPY.rsvpNote`            |
| `submitLabel`  | Submit button   | `text`     | "Enviar"                                       | "Enviar"                           |

Note the discrepancy between the field's placeholder "Sí asistiré" (`blocks.ts:193`) and the
seeded value "Si asistiré", unaccented (`default-copy.ts:10`).

Not authorable: the +1 sub-question "Vendré con un acompañante (+1)" and the +1 name
placeholder "Nombre del acompañante (opcional)" (`default-copy.ts:12`, `:13`, used at
`elegant/blocks/rsvp.tsx:163`, `:188`). See TODO-08-25. Default note, verbatim
(`default-copy.ts:15`):

> "Aunque adoramos a los más pequeños, hemos decidido que esta celebración sea exclusivamente
> para adultos."

Behavior belongs to [EP-07](../07-guest-experience/): one radio group per named guest, every
one required before submit, writing through `api.guests.submitPublicRsvp`
(`elegant/blocks/rsvp.tsx:96`, `:125`).

#### 9. `allergies` — Allergies (per guest)

> "Dietary restrictions input per guest."

| Key           | Label               | Input                  | Placeholder                    | Seeded default                     |
| ------------- | ------------------- | ---------------------- | ------------------------------ | ---------------------------------- |
| `headline`    | Headline            | `text`                 | "Food"                         | "Comida"                           |
| `note`        | Note                | `textarea`             | "Tell us about any allergies…" | `ELEGANT_COPY.foodNote`            |
| `noneLabel`   | No-allergies label  | `text`                 | "No, como de todo"             | "No, como de todo"                 |
| `hasLabel`    | Has-allergies label | `text`                 | "Sí, tengo algunas"            | "Sí, tengo algunas"                |
| `otherLabel`  | Other label         | `text`                 | "Otra:"                        | "Otra:"                            |
| `submitLabel` | Submit button       | `text`                 | "Enviar"                       | "Enviar"                           |
| `options`     | Options             | `list` (plain strings) | —                              | The six `ELEGANT_COPY.foodOptions` |

Seeded options, verbatim (`default-copy.ts:20`): "Frutos secos", "Mariscos / pescados",
"Lácteos", "Gluten", "Huevo", "Vegetariano / Vegano". Default note, verbatim
(`default-copy.ts:18`):

> "Por favor, indícanos si tienes alguna alergia o restricción alimentaria para tenerlo en
> cuenta:"

The component also reads a `question` key that `BLOCK_DEFS` does not declare, so the question
line "¿Tienes alguna alergia o restricción alimentaria?" is unauthorable — TODO-08-20 in
[F04](./F04-block-configuration.md). Submitting writes each guest's `allergies` **and forces
`rsvpStatus: "attending"`** for every guest on the invitation
(`elegant/blocks/allergies.tsx:167`), which is why the block belongs on the accepted layout.

#### 10. `menuSelection` — Menu Selection (per guest)

> "Menu choice per guest."

No config fields (`blocks.ts:215`). **No `elegant` component** — the type is absent from
`ELEGANT_BLOCKS` (`elegant/blocks/index.ts:15`). Adding it produces a block that saves
successfully and renders nothing. Not present in any default layout. See DEF-08-01.

#### 11. `drinkSelection` — Drink Selection (per guest)

> "Drink choice per guest."

No config fields (`blocks.ts:220`). **No `elegant` component** (`elegant/blocks/index.ts:15`).
Same behavior as `menuSelection`. Not present in any default layout. See DEF-08-01.

#### 12. `guestMessage` — Message to the host

> "Lets a guest leave the host a message (e.g. when they can't attend)."

| Key            | Label               | Input      | Placeholder                           | Seeded default             |
| -------------- | ------------------- | ---------- | ------------------------------------- | -------------------------- |
| `headline`     | Headline            | `text`     | "Déjanos un mensaje"                  | "Déjanos un mensaje"       |
| `note`         | Note                | `textarea` | "Optional note shown above the form…" | `ELEGANT_COPY.messageNote` |
| `nameLabel`    | Name label          | `text`     | "Tu nombre"                           | "Tu nombre"                |
| `messageLabel` | Message label       | `text`     | "Tu mensaje"                          | "Tu mensaje"               |
| `placeholder`  | Message placeholder | `text`     | "Escribe aquí…"                       | "Escribe aquí…"            |
| `submitLabel`  | Submit button       | `text`     | "Enviar"                              | "Enviar"                   |

Default note, verbatim (`default-copy.ts:49`):

> "Sentimos que no puedas acompañarnos. Si quieres, déjanos unas palabras: nos encantará
> leerte."

Submits through `api.messages.submitGuestMessage`; the messages surface at
`/dashboard/[eventSlug]/messages` (EP-03).

#### 13. `footer` — Footer

> "Closing line with the event name."

| Key    | Label        | Input      | Placeholder                            | Seeded default            |
| ------ | ------------ | ---------- | -------------------------------------- | ------------------------- |
| `body` | Closing line | `textarea` | "We can't wait to celebrate with you…" | `ELEGANT_COPY.footerNote` |

Default, verbatim (`default-copy.ts:46`):

> "Esperamos celebrar juntos este comienzo tan importante en nuestras vidas."

Despite the description "Closing line with the event name", the component renders only the
closing line and a flourish graphic — the event name does not appear
(`elegant/blocks/footer.tsx:11`). See TODO-08-26.

---

### 7.3 Default layout membership

The global fallback order (`blocks.ts:268`), used when neither a saved variant nor a template
preset exists:

| Variant    | Order                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `accepted` | `hero` → `location` → `rsvp` → `countdown` → `itinerary` → `allergies` → `dressCode` → `specialInvitation` → `footer` |
| `pending`  | `hero` → `location` → `rsvp` → `footer`                                                                               |
| `declined` | `hero` → `location` → `guestMessage` → `footer`                                                                       |

The elegant presets (`elegant/default-layout.ts:8`, `:25`, `:36`), which take precedence:

| Variant    | Order                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `accepted` | `hero` → `location` → `text` → `countdown` → `itinerary` → `text` → `allergies` → `dressCode` → `specialInvitation` → `footer` |
| `pending`  | `hero` → `location` → `rsvp` → `footer`                                                                                        |
| `declined` | `hero` → `guestMessage` → `footer`                                                                                             |

Two differences are product-visible and are owned by [F02](./F02-layout-variants.md): the
elegant `accepted` preset contains **no `rsvp` block** (TODO-08-05), and the elegant `declined`
preset omits `location` (DEF-08-04). Neither `menuSelection` nor `drinkSelection` appears in
any layout, global or elegant.

### Fields & validation

| Field                           | Type                                    | Required | Rule                                                              | Message |
| ------------------------------- | --------------------------------------- | -------- | ----------------------------------------------------------------- | ------- |
| Block type (add-menu selection) | `BlockType`                             | Yes      | Must be a `BLOCK_PALETTE` member — the select offers nothing else | None    |
| Every config field              | see [F04](./F04-block-configuration.md) | No       | None                                                              | None    |

### Copy deck

Palette labels and descriptions, host-facing English, from `BLOCK_DEFS`
(`src/components/public-invitation/blocks.ts:90`):

| Key                 | Copy                                                                                                   | Source          |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------- |
| `hero`              | "Hero" / "Event name, date, photo and greeting."                                                       | `blocks.ts:92`  |
| `text`              | "Text" / "A free paragraph with an optional headline."                                                 | `blocks.ts:100` |
| `location`          | "Location & Address" / "Venue name and address."                                                       | `blocks.ts:109` |
| `countdown`         | "Countdown" / "Live countdown to the event date."                                                      | `blocks.ts:120` |
| `itinerary`         | "Itinerary" / "Schedule of the day."                                                                   | `blocks.ts:125` |
| `dressCode`         | "Dress Code" / "Dress code and a short note."                                                          | `blocks.ts:146` |
| `specialInvitation` | "Special Invitation" / "Shows a special event (managed in Special Events) and lets guests RSVP to it." | `blocks.ts:155` |
| `rsvp`              | "RSVP (per guest)" / "Attending / declines choice per guest (plus-one aware)."                         | `blocks.ts:188` |
| `allergies`         | "Allergies (per guest)" / "Dietary restrictions input per guest."                                      | `blocks.ts:200` |
| `menuSelection`     | "Menu Selection (per guest)" / "Menu choice per guest."                                                | `blocks.ts:213` |
| `drinkSelection`    | "Drink Selection (per guest)" / "Drink choice per guest."                                              | `blocks.ts:218` |
| `guestMessage`      | "Message to the host" / "Lets a guest leave the host a message (e.g. when they can't attend)."         | `blocks.ts:223` |
| `footer`            | "Footer" / "Closing line with the event name."                                                         | `blocks.ts:235` |

Guest-facing Spanish defaults are quoted verbatim in §7.2 above, each with its
`default-copy.ts` line.

## 8. Data Model

| Table           | Fields                                                                         | Read / Write                                                           | Index             |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------- |
| `events`        | `layoutVariants.{pending,accepted,declined}[]`, `layoutBlocks[]`, `templateId` | Read (editor, public render) / Write (`setInvitationTemplate`)         | by id             |
| `specialEvents` | `_id`, `name`, `description`, `date`, `location`                               | Read — the `specialInvitation` block's content                         | `by_eventId`      |
| `media`         | `_id`, `storageId`                                                             | Read — `image` config fields                                           | `by_eventId`      |
| `guests`        | `_id`, `firstName`, `lastName`, `rsvpStatus`, `allowsPlusOne`                  | Read — the per-guest blocks (`rsvp`, `allergies`, `specialInvitation`) | `by_invitationId` |
| `guestMessages` | all                                                                            | Write — by the `guestMessage` block's form (EP-07)                     | `by_invitationId` |

The catalog itself is **code, not data**: `BLOCK_DEFS` and `BLOCK_PALETTE` are compile-time
constants. A layout stores only `{id, type, config}` per block, with `type` typed as a bare
`v.string()` on the wire (`convex/schema.ts:10`) — the backend does not know the block type
union.

## 9. Backend Contract

| Function                                    | Type            | Args                                                                             | Returns                                                                                 | Guard                                                                 | Caps                                                              |
| ------------------------------------------- | --------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `api.events.setInvitationTemplate`          | mutation        | `{eventId, templateId?, layoutBlocks?, layoutVariants?}`                         | `void`                                                                                  | `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) | Accepts any `type` string; does not validate against `BlockType`  |
| `api.invitations.getPublicInvitation`       | public query    | `{eventSlug, invitationSlug}`                                                    | `{event (incl. layoutBlocks), rsvpState, invitation, guests, specialEvents, mediaUrls}` | none — data-level gating                                              | Returns the variant-resolved layout (`convex/invitations.ts:188`) |
| `api.invitations.getPublicInvitationByHost` | public query    | `{host, invitationSlug}`                                                         | identical payload                                                                       | none                                                                  | Custom-domain variant                                             |
| `api.guests.submitPublicRsvp`               | public mutation | `{eventSlug, invitationSlug, guestUpdates, plusOneUpdates?, specialEventRsvps?}` | —                                                                                       | none — validates every referenced id                                  | Used by the `rsvp`, `allergies` and `specialInvitation` blocks    |
| `api.messages.submitGuestMessage`           | public mutation | `{eventSlug, invitationSlug, name, message}`                                     | —                                                                                       | none                                                                  | Used by the `guestMessage` block                                  |
| `api.specialEvents.listByEvent`             | query           | `{eventId}`                                                                      | special-invitation rows                                                                 | `requireEventEditor`                                                  | Populates the `specialEventId` select                             |

## 10. Business Rules

- **BR-08-F05-01** `[AS-BUILT]` — Exactly thirteen block types exist, enumerated by the
  `BlockType` union (`blocks.ts:7`).
- **BR-08-F05-02** `[AS-BUILT]` — All thirteen are offered in the add-menu, in `BLOCK_PALETTE`
  order (`blocks.ts:244`, `template-settings.tsx:274`).
- **BR-08-F05-03** `[AS-BUILT]` — Every block type has a `BLOCK_DEFS` entry with a label, a
  description and a `fields` array (`blocks.ts:90`).
- **BR-08-F05-04** `[AS-BUILT]` — `countdown`, `menuSelection` and `drinkSelection` declare no
  config fields and are therefore not configurable (`blocks.ts:122`, `:215`, `:220`).
- **BR-08-F05-05** `[AS-BUILT]` — A template implements a subset of block types; the renderer
  looks the type up in the template's map and renders `null` when absent
  (`invitation-template.tsx:42`).
- **BR-08-F05-06** `[AS-BUILT]` — The `elegant` template implements eleven of the thirteen
  types; `menuSelection` and `drinkSelection` are absent (`elegant/blocks/index.ts:15`).
- **BR-08-F05-07** `[AS-BUILT]` — A block type may appear more than once in a layout; the
  elegant `accepted` preset uses two `text` blocks with distinct configs
  (`elegant/default-layout.ts:12`, `:15`).
- **BR-08-F05-08** `[AS-BUILT]` — The global default order per variant is fixed by
  `DEFAULT_ORDER` and is used only when the template supplies no preset for that variant
  (`blocks.ts:268`, `invitation-template.tsx:36`).
- **BR-08-F05-09** `[AS-BUILT]` — `defaultLayout(variant)` assigns deterministic block ids of
  the shape `{variant}-{type}-default-{index}`, so server and client render identically
  (`blocks.ts:300`).
- **BR-08-F05-10** `[AS-BUILT]` — `createBlock` assigns a per-instance id of the shape
  `{type}-{uuid}` (`blocks.ts:284`, `:292`).
- **BR-08-F05-11** `[AS-BUILT]` — The `specialInvitation` block renders nothing on the live
  page when it is bound to no accessible special invitation
  (`elegant/blocks/special-invitation.tsx:45`).
- **BR-08-F05-12** `[AS-BUILT]` — The backend stores a block's `type` as an unconstrained
  string and performs no membership check against `BlockType` (`convex/schema.ts:10`).

## 11. Acceptance Criteria

- **AC-08-F05-01** — **Given** the Design Studio **When** the Editor opens the "Add block"
  select **Then** exactly thirteen entries appear, in `BLOCK_PALETTE` order, starting with
  "Text" and ending with "Footer".
- **AC-08-F05-02** — **Given** an event with the elegant template **When** the Editor adds a
  "Menu Selection (per guest)" block **Then** the block appears in the list and **nothing**
  appears for it in the preview (DEF-08-01).
- **AC-08-F05-03** — **Given** that same layout is saved **When** a public guest opens the
  invitation **Then** no menu-selection markup is present in the page.
- **AC-08-F05-04** — **Given** the elegant template **When** every other palette entry is added
  in turn **Then** each one produces visible markup in the preview.
- **AC-08-F05-05** — **Given** an event with no saved `accepted` variant **When** the public
  page resolves the accepted state **Then** the elegant accepted preset renders, in the order
  hero, location, text, countdown, itinerary, text, allergies, dress code, special invitation,
  footer.
- **AC-08-F05-06** — **Given** a `hero` block whose `body` is unset **When** the page renders
  **Then** the Spanish greeting from `ELEGANT_COPY.heroIntro` is shown.
- **AC-08-F05-07** — **Given** a `countdown` block **When** the Editor expands it **Then** no
  config controls are shown, because it declares no fields.
- **AC-08-F05-08** — **Given** an `allergies` block with its default options **When** the page
  renders **Then** the six options "Frutos secos", "Mariscos / pescados", "Lácteos", "Gluten",
  "Huevo", "Vegetariano / Vegano" are shown in that order.
- **AC-08-F05-09** — **Given** a `specialInvitation` block on an invitation with no granted
  special-invitation access **When** the public page renders **Then** the block produces no
  markup.
- **AC-08-F05-10** — **Given** two `text` blocks in one layout **When** the page renders
  **Then** both render, each with its own copy.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                                        |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-08-F05-01 | unit        | Every `BlockType` union member has a `BLOCK_DEFS` entry, and `BLOCK_DEFS` has no key outside the union                                                          |
| TC-08-F05-02 | unit        | Every `BLOCK_PALETTE` entry is a valid `BlockType`, and the palette has no duplicates                                                                           |
| TC-08-F05-03 | unit        | **Regression guard for DEF-08-01** — every `BLOCK_PALETTE` entry has a component in `ELEGANT_BLOCKS`                                                            |
| TC-08-F05-04 | unit        | Every block type referenced by `DEFAULT_ORDER` and by `elegantDefaultLayouts` has an `ELEGANT_BLOCKS` component                                                 |
| TC-08-F05-05 | unit        | `defaultLayout(variant)` returns the documented order for each of the three variants, with deterministic ids                                                    |
| TC-08-F05-06 | unit        | `createBlock` returns unique ids across repeated calls for the same type                                                                                        |
| TC-08-F05-07 | unit        | Every config key read by an elegant block component is declared in that block's `BLOCK_DEFS.fields` (would currently fail on `allergies.question` — TODO-08-20) |
| TC-08-F05-08 | integration | Rendering a layout containing `menuSelection` produces no DOM node for it and throws nothing                                                                    |
| TC-08-F05-09 | integration | Each of the eleven implemented block types renders its documented landmark copy with default config                                                             |
| TC-08-F05-10 | e2e         | Save a layout containing every implemented block type and confirm each section appears on the public invitation                                                 |

### Manual QA checklist

- [ ] Open the add-menu and check the thirteen entries against §7.1
- [ ] Add each block type in turn and confirm the preview matches the "Renders" column
- [ ] Confirm `menuSelection` and `drinkSelection` render nothing and give no warning
- [ ] Confirm the elegant accepted preset order matches §7.3
- [ ] Confirm the elegant declined preset has no location block (DEF-08-04)
- [ ] Confirm the elegant accepted preset has no RSVP block (TODO-08-05)
- [ ] Compare every seeded Spanish default against §7.2 after adding a fresh block

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | No cap on the number of blocks in a layout, nor on repeats of a type. The `specialInvitation` block is bounded indirectly by the cap of 2 special invitations per event                                |
| Performance      | The whole layout renders on every keystroke in the preview; `countdown` runs a live interval per instance (`elegant/blocks/primitives.tsx:313`)                                                        |
| Security & authz | Placing a block writes only to the event document. Per-guest blocks submit through public mutations that re-validate every referenced id server-side                                                   |
| Accessibility    | Block components carry semantic `<section>` wrappers (`elegant/blocks/primitives.tsx:19`); interactive blocks use real checkboxes and radios (`CheckRow`, `:232`); decorative artwork is `aria-hidden` |
| i18n             | Palette labels and descriptions are English (host-facing); all guest-facing defaults are Spanish. No locale mechanism exists                                                                           |
| Analytics        | None — no block-usage telemetry                                                                                                                                                                        |

## 14. TODOs & Open Questions

- **DEF-08-01** `[P1]` — `menuSelection` and `drinkSelection` are offered in the block palette
  but the elegant template implements neither, so an Editor can add them, configure nothing,
  save successfully, and have them render **nothing** on the live invitation — with no warning
  at any point.
  - **Evidence:**
    - `src/components/public-invitation/blocks.ts:244` — `BLOCK_PALETTE` contains
      `"menuSelection"` (`:254`) and `"drinkSelection"` (`:255`).
    - `src/components/public-invitation/blocks.ts:212`, `:218` — both have `BLOCK_DEFS`
      entries with labels, descriptions and `fields: []`.
    - `src/components/public-invitation/templates/elegant/blocks/index.ts:15` — `ELEGANT_BLOCKS`
      maps eleven types (`hero`, `location`, `rsvp`, `countdown`, `itinerary`, `text`,
      `allergies`, `dressCode`, `specialInvitation`, `guestMessage`, `footer`). Neither
      `menuSelection` nor `drinkSelection` is present. These are the **only** two palette
      entries with no component; every other entry maps.
    - `src/components/public-invitation/templates/invitation-template.tsx:42` — the renderer
      does `template.blocks[block.type]` and returns `null` when it is undefined. There is no
      fallback markup and no console warning.
    - `convex/schema.ts:10` — `type` is stored as an unconstrained `v.string()`, so the save
      succeeds and the dead block persists on the event document indefinitely.
  - **Impact:** A host who intends to collect meal choices places the block, sees it listed in
    the builder, saves, and ships an invitation that never asks. The failure is silent on both
    sides: the host sees a populated block list, the guest sees no menu question.
  - **Cross-reference:** This spec owns the _authoring_ half — a palette entry that cannot
    render. [EP-11 (Catering)](../11-catering/) owns the other half: there is no path anywhere
    in the product by which a guest can choose a menu or drink option, so
    `guests.menuOptionId` / `guests.drinkOptionId` are only ever set from the dashboard.
    Fixing either half alone leaves the workflow incomplete.
  - **Proposed fix:** Either (a) implement `ElegantMenuSelection` / `ElegantDrinkSelection`
    with config fields and a `submitPublicRsvp` write, or (b) remove both types from
    `BLOCK_PALETTE` until they are implemented. Until one is done, the palette must not offer a
    block that renders nothing — see also DEF-08-03 for the general form of this gap.
- **TODO-08-24** `[P2]` `[ADD]` — The `countdown` block declares no config fields, so its
  heading "Faltan" and its unit labels "Días" / "Horas" / "Min" are unauthorable, breaking the
  epic's authorable-copy rule for this one block.
  - **Evidence:** `src/components/public-invitation/blocks.ts:119` (`fields: []`);
    `src/components/public-invitation/templates/elegant/blocks/countdown.tsx:10`, `:16` —
    strings are literals in the component.
  - **Rationale:** Every other copy-bearing block lets the host rewrite its wording; a host
    writing an invitation in another language cannot change these four words.
  - **Proposed rule:** Add `title` and per-unit label fields to `BLOCK_DEFS.countdown`.
- **TODO-08-25** `[P2]` `[ADD]` — The `rsvp` block's +1 sub-question and +1 name placeholder are
  unauthorable, though every other string in the block is a config field.
  - **Evidence:** `src/components/public-invitation/blocks.ts:187` lists six fields, none for
    the +1; `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:163`, `:188`
    read `ELEGANT_COPY.rsvpPlusOneQuestion` / `rsvpPlusOneNamePlaceholder` directly
    (`default-copy.ts:12`, `:13`).
  - **Rationale:** The +1 question is the most guest-facing sentence in the block and the one a
    host is most likely to want to word carefully.
  - **Proposed rule:** Add `plusOneLabel` and `plusOneNamePlaceholder` to `BLOCK_DEFS.rsvp`.
- **TODO-08-26** `[P2]` `[CHANGE]` — The `footer` block's palette description says "Closing line
  with the event name", but the component never renders the event name.
  - **Evidence:** `src/components/public-invitation/blocks.ts:236` versus
    `src/components/public-invitation/templates/elegant/blocks/footer.tsx:11`, which renders
    only the config `body` and a flourish image.
  - **Rationale:** The description sets an expectation the block does not meet; a host looking
    for where the event name appears will place a footer and find nothing.
  - **Proposed rule:** Correct the description to "Closing line and flourish", or render the
    event name.
- **TODO-08-27** `[P2]` `[ADD]` — Nothing keeps `BLOCK_PALETTE`, `BLOCK_DEFS` and a template's
  `blocks` map in agreement; DEF-08-01 exists precisely because no test or type asserts the
  intersection.
  - **Evidence:** `src/components/public-invitation/templates/template-registry.ts:20` types
    `blocks` as `Partial<Record<BlockType, BlockComponent>>`, which permits any subset by
    design; no test file in the repository asserts palette-to-template coverage.
  - **Rationale:** A cheap unit test (TC-08-F05-03) would have caught DEF-08-01 at authoring
    time and will catch the next one when a second template lands.
  - **Proposed rule:** Every `BLOCK_PALETTE` entry must have a component in every registered
    template, or the editor must mark it unavailable for the selected template.
- **TODO-08-28** `[P2]` `[CHANGE]` — The `rsvp` attending-label placeholder ("Sí asistiré") and
  its seeded default ("Si asistiré") differ by an accent, so the host sees one spelling in the
  field's ghost text and another in the actual value.
  - **Evidence:** `src/components/public-invitation/blocks.ts:193` versus
    `src/components/public-invitation/templates/elegant/default-copy.ts:10`.
  - **Rationale:** "Si asistiré" is a misspelling of the conditional-vs-affirmative "Sí" and
    ships as the default on every pending invitation.
  - **Proposed rule:** Correct `ELEGANT_COPY.rsvpAttendLabel` to "Sí asistiré".

### Open questions

- **Q1** — Should `menuSelection` / `drinkSelection` be implemented or removed? The answer
  depends on whether EP-11 intends guests to choose their own meal at all, or whether the
  dashboard-only assignment is the product.
- **Q2** — Should the palette be filtered per selected template, or should templates be
  required to implement the full block set? The former is more flexible; the latter is the only
  option that keeps a saved layout portable across templates.
- **Q3** — Should a block type ever be limited to one instance per layout (`hero`, `footer`,
  `rsvp` are plausible candidates)? Today every type may repeat without limit.

## 15. Traceability

| Concern                                                   | Source                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Route                                                     | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:1`                               |
| Block type union                                          | `src/components/public-invitation/blocks.ts:7`                                                |
| Block definitions (labels, descriptions, fields)          | `src/components/public-invitation/blocks.ts:90`                                               |
| Palette                                                   | `src/components/public-invitation/blocks.ts:244`                                              |
| Global default order                                      | `src/components/public-invitation/blocks.ts:268`                                              |
| `createBlock` / `defaultLayout`                           | `src/components/public-invitation/blocks.ts:292`, `:300`                                      |
| Palette rendering in the editor                           | `src/components/template-selection/template-settings.tsx:274`                                 |
| Renderer look-up-or-nothing                               | `src/components/public-invitation/templates/invitation-template.tsx:41`                       |
| Template contract (`blocks` is `Partial`)                 | `src/components/public-invitation/templates/template-registry.ts:20`                          |
| Elegant component map                                     | `src/components/public-invitation/templates/elegant/blocks/index.ts:15`                       |
| Elegant preset layouts                                    | `src/components/public-invitation/templates/elegant/default-layout.ts:8`, `:25`, `:36`, `:44` |
| Default copy + per-block seeds                            | `src/components/public-invitation/templates/elegant/default-copy.ts:5`, `:67`                 |
| Illustration presets                                      | `src/components/public-invitation/templates/elegant/illustrations.ts:21`                      |
| `hero`                                                    | `src/components/public-invitation/templates/elegant/blocks/hero.tsx:14`                       |
| `location`                                                | `src/components/public-invitation/templates/elegant/blocks/location.tsx:14`                   |
| `countdown`                                               | `src/components/public-invitation/templates/elegant/blocks/countdown.tsx:6`                   |
| `itinerary`                                               | `src/components/public-invitation/templates/elegant/blocks/itinerary.tsx:12`                  |
| `text`                                                    | `src/components/public-invitation/templates/elegant/blocks/text.tsx:7`                        |
| `dressCode`                                               | `src/components/public-invitation/templates/elegant/blocks/dress-code.tsx:8`                  |
| `rsvp`                                                    | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:52`                       |
| `allergies`                                               | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:139`                 |
| `specialInvitation`                                       | `src/components/public-invitation/templates/elegant/blocks/special-invitation.tsx:20`         |
| `guestMessage`                                            | `src/components/public-invitation/templates/elegant/blocks/guest-message.tsx:13`              |
| `footer`                                                  | `src/components/public-invitation/templates/elegant/blocks/footer.tsx:8`                      |
| Shared primitives (sections, buttons, photos, `CheckRow`) | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:12`                 |
| Backend                                                   | `convex/events.ts:199`                                                                        |
| Public layout resolution                                  | `convex/invitations.ts:188`                                                                   |
| Persistence validator (`type` is a bare string)           | `convex/schema.ts:7`                                                                          |
| Validation                                                | None — no schema validates block types or config                                              |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
