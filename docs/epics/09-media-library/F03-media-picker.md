---
id: EP-09-F03
title: Media Picker
epic: EP-09 Media Library
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: [EP-09-F01, EP-09-F02]
---

# EP-09-F03 — Media Picker

## 1. Summary

Choosing an image is not something an editor does on the Media page — it is something they do while
building an invitation block or setting up a social card. `MediaPickerDialog` is the one shared
surface for that: a modal that lists the event's [Media Library](../../glossary.md#design--publishing),
lets the editor click a thumbnail to select it, lets them upload a brand-new image without leaving
the modal, and lets them clear the current selection. It is deliberately dumb — it holds no state of
its own, returns a media id string to its caller, and leaves persistence entirely to whoever opened
it.

Two consumers exist today: the Design Studio's `image` config fields (EP-08-F04) and the social-card
image on the Meta & Sharing page (EP-10-F01).

## 2. Actors & Permissions

| Actor                | Access | Notes                                                       |
| -------------------- | ------ | ----------------------------------------------------------- |
| Owner                | Full   |                                                             |
| Co-owner (`planner`) | Full   |                                                             |
| Editor               | Full   | Both consuming pages are editor-level features              |
| Viewer               | None   | `media.listByEvent` throws before any thumbnail is returned |
| Public guest         | None   |                                                             |

The dialog itself carries no guard; it inherits the guards of `media.listByEvent`
(`convex/media.ts:90`) and, when uploading, `media.generateUploadUrl` / `media.register`. Role
semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-09-F03-01** — As an Editor, I want to pick an image from the library for a block field so
  that the block renders a real photo instead of a placeholder.
- **US-09-F03-02** — As an Editor, I want to upload a new image from inside the picker so that I do
  not have to leave the Design Studio and lose my place.
- **US-09-F03-03** — As an Editor, I want to see which image is currently selected so that I can
  tell whether my change took effect.
- **US-09-F03-04** — As an Editor, I want to clear a field's image so that the block falls back to
  its placeholder.

## 4. Entry Points

| Entry point                                                                       | Route / control                                                                                                           | Actor   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| Block `image` config field — thumbnail button or "Choose from library" / "Change" | `/dashboard/[eventSlug]/template` via `ConfigFieldInput` (`src/components/template-selection/config-field-input.tsx:202`) | Editor+ |
| Social image — "Choose image" / "Change image"                                    | `/dashboard/[eventSlug]/meta` via `MetaSettings` (`src/components/meta/meta-settings.tsx:215`)                            | Editor+ |

The favicon slot on the Meta page does **not** use the picker — it uploads directly through
`FaviconUploadButton` (EP-10-F02).

## 5. UX Flow

### Happy path

1. The consumer sets `open` to true and passes `eventId`, the current `value` (a media id or
   `undefined`) and an `onSelect` callback.
2. The dialog subscribes to `api.media.listByEvent` — but only while open; when closed the query
   argument is the literal `"skip"`, so a closed picker costs nothing
   (`src/components/media/media-picker-dialog.tsx:35`).
3. The editor sees a scrollable 3–4 column thumbnail grid, each tile showing the image and its
   truncated name. The tile matching `value` is outlined with a ring
   (`src/components/media/media-picker-dialog.tsx:73`).
4. Clicking a tile calls `choose(item._id)`, which invokes `onSelect(mediaId)` and then closes the
   dialog (`src/components/media/media-picker-dialog.tsx:37`).
5. The consumer persists the id its own way: `ConfigFieldInput` writes it into the block's `config`,
   saved later by `events.setInvitationTemplate` (EP-08); `MetaSettings` holds it in local state
   until the editor clicks "Save Changes", which calls `meta.updateEventMeta` (EP-10-F01).

### Alternate & edge paths

- **A1** — **Upload from inside the picker.** The header hosts `UploadButton` with
  `onUploaded={(id) => choose(id)}`, so a successful upload immediately selects the new image and
  closes the dialog (`src/components/media/media-picker-dialog.tsx:50`). The upload obeys every
  EP-09-F01 rule, including the 50-image cap.
- **A2** — **Clear the selection.** The "Remove image" button renders only when `value` is set and
  calls `choose(undefined)`, so the consumer receives `undefined`
  (`src/components/media/media-picker-dialog.tsx:52`).
- **A3** — Consumers also expose their own clear affordance outside the dialog: an X button on the
  block field (`src/components/template-selection/config-field-input.tsx:196`) and a "Remove" button
  beside the social image (`src/components/meta/meta-settings.tsx:208`).
- **A4** — Dismissing the dialog with Escape or the overlay changes nothing; `onSelect` fires only
  through `choose`.
- **E1** — The library is empty → the grid is replaced by an `EmptyState`; the upload button remains
  available in the header (`src/components/media/media-picker-dialog.tsx:58`).
- **E2** — A row whose blob does not resolve renders as an empty grey square but is still selectable
  (`src/components/media/media-picker-dialog.tsx:79`).
- **E3** — The library is at 50 images → uploading from inside the picker fails with the generic
  "Failed to upload image" toast (see TODO-09-08 in [F01](./F01-upload-media.md)); selection still
  works.

## 6. States

| State             | Behavior                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `items` is `undefined` → the grid renders zero tiles and the empty state is suppressed, so the dialog body is briefly blank (`src/components/media/media-picker-dialog.tsx:58`) |
| Empty             | `EmptyState` "No images yet" / "Upload an image to use it in your invitation"                                                                                                   |
| Error             | No dialog-level error state; upload errors surface as toasts                                                                                                                    |
| Success           | The dialog closes on selection; the consumer reflects the new thumbnail                                                                                                         |
| Disabled / locked | Closed picker skips its query entirely; no per-tile disabled state                                                                                                              |
| Mobile            | Grid is `grid-cols-3` widening to 4 at `sm`; the grid scrolls within `max-h-[50vh]`                                                                                             |

## 7. UI Specification

### Screens & components

| Element                      | Component                                    | Path                                                           |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| The picker                   | `MediaPickerDialog`                          | `src/components/media/media-picker-dialog.tsx:28`              |
| Upload control inside it     | `UploadButton`                               | `src/components/media/upload-button.tsx:25`                    |
| Empty state                  | `EmptyState`                                 | `src/components/app/empty-state.tsx`                           |
| Consumer — block image field | `ConfigFieldInput` (`input: "image"` branch) | `src/components/template-selection/config-field-input.tsx:160` |
| Consumer — social image      | `MetaSettings`                               | `src/components/meta/meta-settings.tsx:215`                    |

### Props contract

| Prop           | Type                                     | Meaning                                                |
| -------------- | ---------------------------------------- | ------------------------------------------------------ |
| `eventId`      | `Id<"events">`                           | Library to list and upload into                        |
| `open`         | `boolean`                                | Controlled by the consumer                             |
| `onOpenChange` | `(open: boolean) => void`                | Consumer closes the dialog                             |
| `value`        | `string \| undefined`                    | Currently selected media id, drives the ring highlight |
| `onSelect`     | `(mediaId: string \| undefined) => void` | Fires with the chosen id, or `undefined` when cleared  |

`onSelect` deals in plain strings, so `MetaSettings` casts back to `Id<"media">` at the call site
(`src/components/meta/meta-settings.tsx:220`).

### Fields & validation

None. The picker performs no validation of its own; anything the library holds is selectable.

### Copy deck

Host-facing only; no guest-facing Spanish strings.

| Key                 | Copy                                           | Source                                                         |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| Dialog title        | "Choose Image"                                 | `src/components/media/media-picker-dialog.tsx:46`              |
| Clear button        | "Remove image"                                 | `src/components/media/media-picker-dialog.tsx:53`              |
| Empty title         | "No images yet"                                | `src/components/media/media-picker-dialog.tsx:61`              |
| Empty body          | "Upload an image to use it in your invitation" | `src/components/media/media-picker-dialog.tsx:62`              |
| Block field button  | "Choose from library" / "Change"               | `src/components/template-selection/config-field-input.tsx:187` |
| Social image button | "Choose image" / "Change image"                | `src/components/meta/meta-settings.tsx:202`                    |

## 8. Data Model

| Table                               | Fields               | Read / Write                        | Index        |
| ----------------------------------- | -------------------- | ----------------------------------- | ------------ |
| `media`                             | all + resolved `url` | Read via `media.listByEvent`        | `by_eventId` |
| `events.layoutVariants[*][].config` | image field value    | Written by the consumer (EP-08)     | —            |
| `events.meta.imageId`               | `Id<"media">`        | Written by the consumer (EP-10-F01) | —            |

The picker itself writes nothing. The stored value is the **media id string**; resolution to a URL
happens later — server-side in `getPublicInvitation`'s `mediaUrls` for blocks
(`convex/invitations.ts:194`) and in `meta.getPublicInvitationMeta`'s `resolveMediaUrl` for the
social card (`convex/meta.ts:21`).

## 9. Backend Contract

| Function                      | Type     | Args                                         | Returns                          | Guard                              | Caps           |
| ----------------------------- | -------- | -------------------------------------------- | -------------------------------- | ---------------------------------- | -------------- |
| `api.media.listByEvent`       | query    | `{eventId}` (or `"skip"` while closed)       | media rows + `url`, newest first | `requireEventEditor(ctx, eventId)` | `.take(50)`    |
| `api.media.generateUploadUrl` | mutation | `{eventId}`                                  | upload URL                       | `requireEventEditor(ctx, eventId)` | —              |
| `api.media.register`          | mutation | `{eventId, storageId, name, mimeType, size}` | `Id<"media">`                    | `requireEventEditor(ctx, eventId)` | 5 MB, 50/event |

The picker introduces no function of its own.

## 10. Business Rules

- **BR-09-F03-01** `[AS-BUILT]` — A closed picker issues no query; the argument is `"skip"` until
  `open` is true (`src/components/media/media-picker-dialog.tsx:35`).
- **BR-09-F03-02** `[AS-BUILT]` — The picker lists exactly the images of the `eventId` it is given,
  because `media.listByEvent` is event-scoped and guarded
  (`convex/media.ts:92`).
- **BR-09-F03-03** `[AS-BUILT]` — Selecting a tile calls `onSelect` with that row's `_id` and then
  closes the dialog in the same action (`src/components/media/media-picker-dialog.tsx:37`).
- **BR-09-F03-04** `[AS-BUILT]` — The tile whose `_id` equals `value` is visually marked with a
  dark border and ring (`src/components/media/media-picker-dialog.tsx:73`).
- **BR-09-F03-05** `[AS-BUILT]` — The "Remove image" control renders only when `value` is set, and
  calls `onSelect(undefined)` (`src/components/media/media-picker-dialog.tsx:51`).
- **BR-09-F03-06** `[AS-BUILT]` — A successful in-picker upload selects the newly created media id
  and closes the dialog (`src/components/media/media-picker-dialog.tsx:50`).
- **BR-09-F03-07** `[AS-BUILT]` — The picker persists nothing; the selected id is stored only when
  the consumer saves — `events.setInvitationTemplate` for blocks, `meta.updateEventMeta` for the
  social image (`src/components/meta/meta-settings.tsx:97`).
- **BR-09-F03-08** `[AS-BUILT]` — The picker applies no mime-type filter: every row in the library
  is offered for every consuming field
  (`src/components/media/media-picker-dialog.tsx:66`).

## 11. Acceptance Criteria

- **AC-09-F03-01** — **Given** a closed picker **When** the page renders **Then** no
  `media.listByEvent` subscription exists for it.
- **AC-09-F03-02** — **Given** an event with four images **When** the editor opens a block's image
  field picker **Then** four thumbnails are listed, newest first.
- **AC-09-F03-03** — **Given** an image is already selected **When** the picker opens **Then** that
  tile shows the selection ring.
- **AC-09-F03-04** — **Given** the picker is open **When** the editor clicks a thumbnail **Then**
  the dialog closes and the consuming field shows that image as its thumbnail.
- **AC-09-F03-05** — **Given** an image is selected **When** the editor clicks "Remove image"
  **Then** the dialog closes and the consuming field returns to its placeholder icon.
- **AC-09-F03-06** — **Given** the picker is open on an empty library **When** the editor uploads a
  valid PNG **Then** the dialog closes with that PNG selected.
- **AC-09-F03-07** — **Given** an empty library **When** the picker opens **Then** the body reads
  "No images yet" and the upload button is still present.
- **AC-09-F03-08** — **Given** a selection made in the Design Studio **When** the editor navigates
  away without saving the template **Then** the block's image reverts, because the picker persisted
  nothing.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                     |
| ------------ | ----------- | -------------------------------------------------------------------------------------------- |
| TC-09-F03-01 | unit        | `useQuery` receives `"skip"` while `open` is false                                           |
| TC-09-F03-02 | unit        | Clicking a tile calls `onSelect` with its `_id` and `onOpenChange(false)`                    |
| TC-09-F03-03 | unit        | "Remove image" renders only when `value` is set and emits `undefined`                        |
| TC-09-F03-04 | unit        | The tile matching `value` receives the selected class names                                  |
| TC-09-F03-05 | integration | In-picker upload registers a `media` row and selects it                                      |
| TC-09-F03-06 | e2e         | Pick a hero image in the Design Studio, save, and see it on the public invitation            |
| TC-09-F03-07 | e2e         | Pick a social image on the Meta page, save, and see it in `getPublicInvitationMeta.imageUrl` |

### Manual QA checklist

- [ ] Open the picker from a block field and from the Meta page — identical dialog.
- [ ] Selection ring follows the currently stored image in both consumers.
- [ ] Upload inside the picker closes the dialog with the new image chosen.
- [ ] "Remove image" clears the field in both consumers.
- [ ] Escape closes without changing the selection.
- [ ] With 50 images the grid scrolls inside the dialog rather than overflowing the page.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | Inherits `.take(50)`; no pagination or lazy loading                                                                                                                                                          |
| Performance      | The `"skip"` argument keeps closed pickers free; a Design Studio page with several image fields therefore holds at most one live media subscription                                                          |
| Security & authz | All authorization is inherited from `media.listByEvent` / `register`; the dialog adds none                                                                                                                   |
| Accessibility    | Tiles are real `<button>` elements; the trigger controls carry `aria-label`s (`src/components/template-selection/config-field-input.tsx:168`). Tiles have no selected-state announcement (no `aria-pressed`) |
| i18n             | Host-facing copy is English only                                                                                                                                                                             |
| Analytics        | None; selection is only observable once the consumer saves                                                                                                                                                   |

## 14. TODOs & Open Questions

- **TODO-09-06** `[P2]` `[ADD]` — The picker cannot filter by mime type, so any field can be pointed
  at any image.
  - **Rationale:** The grid maps every row unconditionally
    (`src/components/media/media-picker-dialog.tsx:66`), and the only mime-specific consumer —
    the favicon — sidesteps the picker entirely for that reason. The social image accepts a `.gif`
    or `.svg` that many platforms will not render in a link preview, with no warning at pick time;
    `meta.updateEventMeta` validates the mime only for the favicon (`convex/meta.ts:129`), not for
    `imageId`.
  - **Proposed rule:** Accept an optional `accept: string[]` prop and hide or disable rows outside
    it, so the favicon could adopt the picker and the social image could exclude formats platforms
    ignore.

### Open questions

- **Q1** — Should the picker offer multi-select? Every consuming field is single-image today, but a
  gallery block would need it.
- **Q2** — Should the picker show which fields already use an image, so an editor can see reuse (and
  see the delete blast radius described in DEF-09-01)?

## 15. Traceability

| Concern                         | Source                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| UI — dialog                     | `src/components/media/media-picker-dialog.tsx:28`              |
| UI — skip-while-closed query    | `src/components/media/media-picker-dialog.tsx:35`              |
| UI — selection handler          | `src/components/media/media-picker-dialog.tsx:37`              |
| UI — in-picker upload           | `src/components/media/media-picker-dialog.tsx:50`              |
| Consumer — block image field    | `src/components/template-selection/config-field-input.tsx:202` |
| Consumer — social image         | `src/components/meta/meta-settings.tsx:215`                    |
| Backend — list                  | `convex/media.ts:87`                                           |
| Backend — register              | `convex/media.ts:28`                                           |
| Public resolution — blocks      | `convex/invitations.ts:194`                                    |
| Public resolution — social card | `convex/meta.ts:21`                                            |

## 16. Changelog

| Version | Date       | Author             | Change                                                                            |
| ------- | ---------- | ------------------ | --------------------------------------------------------------------------------- |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-09-10 closed.** The picker renders its own loading and empty `StateBlock`s |
| 1.0.0   | 2026-07-28 | Spec suite v1      | Initial as-built specification                                                    |
