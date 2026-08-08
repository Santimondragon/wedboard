# EP-08 — Invitation Design Studio

The host-side page builder at `/dashboard/[eventSlug]/template`. It is where a host chooses
how their public invitation looks, what sections it contains, in what order, and with what
words — for each of the three [RSVP Variants](../../glossary.md).

This epic covers the **authoring side only**. What a public guest sees, taps and submits on
the rendered page belongs to [EP-07 (Guest Experience)](../07-guest-experience/) and is
referenced here, never specified.

Domain terms: [Template](../../glossary.md), [Block](../../glossary.md),
[Block Config](../../glossary.md), [Layout](../../glossary.md),
[Layout Variants](../../glossary.md), [Design Studio](../../glossary.md),
[RSVP Variant](../../glossary.md).

> **Naming.** The route, the page heading and the Convex mutation all say "template"
> (`/template`, "Invitation Template", `events.setInvitationTemplate`). The product concept is
> the **Design Studio**. Specs use the product term in prose and the code identifiers verbatim
> when citing routes, files or functions.

---

## 1. Purpose

A wedding invitation is not a form with a skin on it. Hosts want to decide what the page
says, which sections appear, and in which order — and they want the page to say something
different to a guest who has not answered yet than to one who already confirmed.

The Design Studio exists so that a host with no design or engineering help can:

- pick a visual treatment (**template**),
- compose the page out of **blocks** (hero, location, itinerary, RSVP, …),
- author **every non-derived word** on it,
- do all of the above **three times**, once per RSVP variant, and
- see the result immediately in a live preview.

---

## 2. The architecture, as a product concept

The single most important idea in this epic — and the one most often misread — is:

> **A template owns its markup, not just its colors.**

A `TemplateDef` (`src/components/public-invitation/templates/template-registry.ts:11`)
supplies four things:

| Part                 | What it means for the product                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Frame`              | The page wrapper — the shape of the invitation itself (the elegant template is a phone-width white card on a soft background)                |
| `blocks`             | **One React component per block type.** Two templates rendering a `hero` may produce structurally different pages, not merely recolored ones |
| `defaultLayouts`     | An optional preset layout **per RSVP variant**, used when the event has never saved one                                                      |
| `defaultBlockConfig` | Per-block-type default copy, used to pre-fill a block the moment the host adds it                                                            |

Two consequences follow, and both are product-visible:

1. **`blocks` is a `Partial<Record<BlockType, BlockComponent>>`** — a template is allowed to
   implement only some block types. `InvitationTemplate` looks the component up and
   **renders nothing** when it is missing
   (`src/components/public-invitation/templates/invitation-template.tsx:42`). There is no
   fallback markup anywhere in the system.
2. The **block model is global, the implementation is per template.** `BLOCK_DEFS` and
   `BLOCK_PALETTE` (`src/components/public-invitation/blocks.ts:90`, `:244`) describe every
   block type that _exists_; nothing checks them against the selected template's `blocks`
   map. That gap is the origin of DEF-08-01 and DEF-08-03 below.

`elegant` is the only template shipped today
(`src/components/public-invitation/templates/template-registry.ts:35`), and it is the default
(`DEFAULT_TEMPLATE_ID`, `:48`). Because there is exactly one, the picker is hidden in the UI
(`src/components/template-selection/template-settings.tsx:207`) and the "template-agnostic"
seams have never been exercised by a second implementation — see TODO-08-04 and TODO-08-09.

### The three layouts

The host authors a separate ordered block list for `pending`, `accepted` and `declined`. The
public page never chooses; it renders the variant the server derived from the invitation's
guests (`convex/invitations.ts:138`). Which layout is used, per variant, follows a strict
fallback chain — saved variant → template preset → global default — specified in EP-08-F02.

---

## 3. Actors

| Actor                | Involvement                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full                                                                                                                       |
| Co-owner (`planner`) | Full                                                                                                                       |
| Editor               | Full — the template is content-adjacent and gated at `requireEventEditor(ctx, eventId, "editor")` (`convex/events.ts:216`) |
| Viewer               | No access — the guard's `editor` minimum read-blocks viewers                                                               |
| Public guest         | Never sees this screen; consumes its output via EP-07                                                                      |

Role semantics live in [roles-and-permissions.md](../../roles-and-permissions.md).

---

## 4. Features

| ID                                        | Feature             | Status    | Scope                                                                                                                            |
| ----------------------------------------- | ------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [EP-08-F01](./F01-template-selection.md)  | Template selection  | partial   | The picker, `TEMPLATES` / `TEMPLATE_LIST` / `DEFAULT_TEMPLATE_ID`, the editor-level gate, the `template`/`update` activity entry |
| [EP-08-F02](./F02-layout-variants.md)     | Layout variants     | defective | Pending / Accepted / Declined tabs, the fallback chain, the legacy `layoutBlocks` migration path, saving all three together      |
| [EP-08-F03](./F03-block-composition.md)   | Block composition   | defective | Add, reorder, duplicate, remove; repeated blocks; no undo, no autosave, no unsaved-changes guard                                 |
| [EP-08-F04](./F04-block-configuration.md) | Block configuration | defective | The six `ConfigField` input kinds and the authorable-vs-derived rule                                                             |
| [EP-08-F05](./F05-block-catalog.md)       | Block catalog       | defective | Reference table of every `BlockType`, its config fields, its default-layout membership and its elegant implementation            |
| [EP-08-F06](./F06-live-preview.md)        | Live preview        | partial   | Dummy data + real event details + real media URLs; disabled interactive controls                                                 |

---

## 5. Workflows

| ID       | Workflow                            | Spec      |
| -------- | ----------------------------------- | --------- |
| WF-08-01 | Choose an invitation template       | EP-08-F01 |
| WF-08-02 | Switch between RSVP variant tabs    | EP-08-F02 |
| WF-08-03 | Reset a variant to default          | EP-08-F02 |
| WF-08-04 | Save all three layout variants      | EP-08-F02 |
| WF-08-05 | Add a block                         | EP-08-F03 |
| WF-08-06 | Reorder, duplicate or remove blocks | EP-08-F03 |
| WF-08-07 | Author a block's content fields     | EP-08-F04 |
| WF-08-08 | Preview the layout before saving    | EP-08-F06 |

Every workflow above is completed on a single screen; there are no multi-page flows in this
epic.

---

## 6. Surfaces

| Surface                                                | Path                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Route                                                  | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:1`                                     |
| Editor shell (picker, tabs, block list, preview, save) | `src/components/template-selection/template-settings.tsx:45`                                        |
| Config field inputs                                    | `src/components/template-selection/config-field-input.tsx:49`                                       |
| Block model                                            | `src/components/public-invitation/blocks.ts:1`                                                      |
| Template registry                                      | `src/components/public-invitation/templates/template-registry.ts:11`                                |
| Renderer                                               | `src/components/public-invitation/templates/invitation-template.tsx:23`                             |
| Elegant template                                       | `src/components/public-invitation/templates/elegant/`                                               |
| Preview sample data                                    | `src/components/public-invitation/templates/dummy-data.ts:4`                                        |
| Backend                                                | `convex/events.ts:199` (`setInvitationTemplate`)                                                    |
| Persistence                                            | `convex/schema.ts:45` (`templateId`, `layoutBlocks`, `layoutVariants`, `LAYOUT_BLOCKS_VALIDATOR:7`) |

---

## 7. Dependencies

| Depends on                  | Why                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| EP-02 (Event Setup)         | The layout is stored on `events`; hero/location/countdown blocks render event-derived data (couple names, date, venue, map link) |
| EP-09 (Media Library)       | Every `image` config field stores a `media` id, picked through `MediaPickerDialog` and resolved to URLs by `mediaUrls`           |
| EP-06 (Special Invitations) | The `specialInvitation` block's `specialEventId` select is populated from `api.specialEvents.listByEvent`                        |
| EP-03-F05 (Activity Log)    | `setInvitationTemplate` writes a `template` / `update` entry (`convex/events.ts:220`)                                            |

## 8. Consumed by

| Consumer                 | Why                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| EP-07 (Guest Experience) | The saved layout **is** the public page; every interactive block a guest uses is one this epic placed and configured  |
| EP-10 (Sharing & SEO)    | Independent of the layout, but shares the same media library for its OG image                                         |
| EP-11 (Catering)         | `menuSelection` / `drinkSelection` blocks exist in this epic's palette but have no rendering anywhere — see DEF-08-01 |

---

## 9. Epic-level defects & gaps

Full detail lives in each feature's §14.

| ID         | Priority | Summary                                                                                                                                                | Spec |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| DEF-08-01  | P1       | `menuSelection` and `drinkSelection` are in the palette but the elegant template implements neither — the block saves and renders nothing, silently    | F05  |
| DEF-08-02  | P1       | No unsaved-changes guard: navigating away from the editor discards every edit with no warning                                                          | F03  |
| DEF-08-03  | P2       | The editor never warns that the selected template does not implement a block type it offers                                                            | F03  |
| DEF-08-04  | P2       | The elegant `declined` preset omits `location`, contradicting the documented declined order in the block model                                         | F02  |
| DEF-08-05  | P2       | `text.showFlourishes` renders as on when unset but the editor's Switch shows it off                                                                    | F04  |
| DEF-08-06  | P2       | Switching the template preserves the saved layouts verbatim, so blocks the new template does not implement are kept in the layout and then silently …  | F01  |
| TODO-08-01 | P1       | No validation of any kind on block config (no required fields, no max list length, no character limits)                                                | F04  |
| TODO-08-02 | P2       | No undo, no autosave, no draft/publish separation — saving publishes instantly to every live invitation                                                | F03  |
| TODO-08-03 | P2       | `resolveLayout()` has no callers — dead code                                                                                                           | F02  |
| TODO-08-04 | P2       | The template picker is hidden entirely while only one template exists, so the host never learns templates are a concept                                | F01  |
| TODO-08-05 | P1       | Neither the `accepted` nor the `declined` elegant preset contains an `rsvp` block, so a guest cannot revise an answer (cross-ref EP-07)                | F02  |
| TODO-08-06 | P2       | Save always writes all three variants; there is no per-variant save and no dirty tracking                                                              | F02  |
| TODO-08-07 | P2       | Reordering is up/down buttons only — no drag-and-drop                                                                                                  | F03  |
| TODO-08-08 | P2       | The preview always uses the same dummy invitation; a real invitation cannot be previewed                                                               | F06  |
| TODO-08-09 | P2       | Switching template does not reseed existing blocks' config from the new template's `defaultBlockConfig`                                                | F01  |
| TODO-08-10 | P2       | Editor state is initialized once; a concurrent save by another editor is silently overwritten                                                          | F02  |
| TODO-08-11 | P2       | Saved blocks whose type is unknown are silently dropped on load, with no notice                                                                        | F03  |
| TODO-08-12 | P2       | The preview cannot be viewed at a non-phone width and has no device toggle                                                                             | F06  |
| TODO-08-13 | P2       | `events.templateId` accepts any string, both in the schema and in the mutation.                                                                        | F01  |
| TODO-08-14 | P2       | The `template` / `update` activity entry carries no `entityName`, so the log cannot distinguish a template switch from a copy tweak.                   | F01  |
| TODO-08-15 | P2       | "Reset to default" is destructive, immediate, unconfirmed and un-undoable.                                                                             | F02  |
| TODO-08-16 | P2       | A variant cannot be intentionally left empty.                                                                                                          | F02  |
| TODO-08-17 | P2       | Removing a block has no confirmation and no undo, even for a block carrying substantial authored copy.                                                 | F03  |
| TODO-08-18 | P2       | The block list has no empty state.                                                                                                                     | F03  |
| TODO-08-19 | P2       | `BLOCK_DEFS[type].description` is authored but never shown.                                                                                            | F03  |
| TODO-08-20 | P2       | The `allergies` block renders a question line from a config key `question` that `BLOCK_DEFS.allergies` does not declare, so the string is …            | F04  |
| TODO-08-21 | P2       | An `image` field whose media item was deleted gives the Editor no signal: the thumbnail silently falls back to a generic icon while the button still … | F04  |
| TODO-08-22 | P2       | `location.address` and `location.buttonUrl` are seeded from the event's venue once and then never re-sync; editing the venue in Event Setup does not … | F04  |
| TODO-08-23 | P2       | `optionsSource` supports exactly one source (`"specialEvents"`), so no other event-derived list (menu options, drink options, tables) can back a …     | F04  |
| TODO-08-24 | P2       | The `countdown` block declares no config fields, so its heading "Faltan" and its unit labels "Días" / "Horas" / "Min" are unauthorable, breaking the … | F05  |
| TODO-08-25 | P2       | The `rsvp` block's +1 sub-question and +1 name placeholder are unauthorable, though every other string in the block is a config field.                 | F05  |
| TODO-08-26 | P2       | The `footer` block's palette description says "Closing line with the event name", but the component never renders the event name.                      | F05  |
| TODO-08-27 | P2       | Nothing keeps `BLOCK_PALETTE`, `BLOCK_DEFS` and a template's `blocks` map in agreement; DEF-08-01 exists precisely because no test or type asserts …   | F05  |
| TODO-08-28 | P2       | The `rsvp` attending-label placeholder ("Sí asistiré") and its seeded default ("Si asistiré") differ by an accent, so the host sees one spelling in …  | F05  |
| TODO-08-29 | P1       | The preview gives no signal that what it shows is unsaved, so the pane looks identical whether or not the layout has been published to live …          | F06  |
| TODO-08-30 | P1       | The preview's sample guests are always three `pending` guests, whatever variant is being designed, so the accepted and declined tabs render guest …    | F06  |
| TODO-08-31 | P2       | The preview always renders a sample special invitation, even for an event that has none and for a layout with no `specialInvitation` block bound, so … | F06  |
| TODO-08-32 | P2       | The preview resolves **all** of the event's media, whereas the public page resolves only ids referenced by the chosen layout and re-validates each …   | F06  |
