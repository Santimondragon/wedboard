---
id: EP-09-F02
title: Manage Media
epic: EP-09 Media Library
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-09-F01]
---

# EP-09-F02 — Manage Media

## 1. Summary

Once images are in the event's [Media Library](../../glossary.md#design--publishing), an editor
needs to see them, tell them apart, and get rid of the ones no longer wanted. This feature is the
Media page itself: a reactive grid of every image in the event with its resolved URL, an inline
rename on each tile, and a confirmed delete that removes both the catalog row and the underlying
blob from Convex file storage. There is no folder structure, no tagging, no search and no sort
control — the library is a flat, newest-first wall of up to fifty thumbnails.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                    |
| -------------------- | ------ | ------------------------------------------------------------------------ |
| Owner                | Full   | List, rename, delete                                                     |
| Co-owner (`planner`) | Full   |                                                                          |
| Editor               | Full   | Media is content; the default guard floor admits an editor               |
| Viewer               | None   | `listByEvent` itself throws for a viewer                                 |
| Public guest         | None   | Never reads `media`; only the storage URLs baked into the public payload |

`listByEvent` (`convex/media.ts:90`), `rename` (`convex/media.ts:112`) and `remove`
(`convex/media.ts:127`) all apply `requireEventEditor` at its default `editor` floor. The two
mutations load the row first and guard on `item.eventId`, which is what keeps a member of event A
from renaming or deleting event B's image. Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-09-F02-01** — As an Editor, I want to see every image in the event at a glance so that I can
  find the one I need for a block.
- **US-09-F02-02** — As an Editor, I want to rename an image so that `IMG_4821.jpg` becomes
  "Venue map".
- **US-09-F02-03** — As an Editor, I want to delete an image I no longer need so that the library
  does not fill up against its 50-image cap.
- **US-09-F02-04** — As an Owner, I want deleting an image to free the underlying storage, not just
  hide the row.

## 4. Entry Points

| Entry point                         | Route / control                         | Actor   |
| ----------------------------------- | --------------------------------------- | ------- |
| Media page                          | `/dashboard/[eventSlug]/media`          | Editor+ |
| Sidebar link "Media"                | `DashboardSidebar`, `minRole: "editor"` | Editor+ |
| Read-only listing inside the picker | `MediaPickerDialog` (EP-09-F03)         | Editor+ |

The page takes no id from the URL: `useEvent()._id` comes from `EventProvider`
(`src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:13`).

## 5. UX Flow

### Happy path — browse

1. The editor opens `/dashboard/[eventSlug]/media`.
2. The page subscribes to `api.media.listByEvent({ eventId })`
   (`src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:14`).
3. The query guards the caller, reads `media` by `by_eventId` in `.order("desc")` — newest first —
   `.take(50)`, and resolves each row's `storageId` to a URL with `ctx.storage.getUrl`
   (`convex/media.ts:92`).
4. The header shows the count in parentheses next to the title; `MediaGrid` renders a responsive
   square-thumbnail grid.

### Happy path — rename

1. The editor clicks the pencil icon on a tile → the tile swaps its name label for an autofocused
   `Input` seeded with the current name (`src/components/media/media-grid.tsx:107`).
2. Pressing **Enter** or clicking the check icon calls `api.media.rename({ id, name })` through
   `useToastMutation` (`src/components/media/media-grid.tsx:43`).
3. The server trims and rejects an empty name, then patches `name`
   (`convex/media.ts:115`).
4. Toast "Image renamed"; edit mode closes only when the mutation succeeded.

### Happy path — delete

1. The editor clicks the trash icon → an `AlertDialog` opens naming the image
   (`src/components/media/media-grid.tsx:119`).
2. Confirming calls `api.media.remove({ id })`.
3. The server loads the row, guards on its event, deletes the storage blob, then deletes the row
   (`convex/media.ts:129`).
4. Toast "Image deleted"; the grid re-renders without the tile.

### Alternate & edge paths

- **A1** — **Escape** while renaming abandons the edit without a mutation
  (`src/components/media/media-grid.tsx:81`).
- **A2** — An empty rename value is ignored client-side before any call is made
  (`src/components/media/media-grid.tsx:42`).
- **A3** — `ctx.storage.getUrl` returns `null` for a row whose blob has vanished; the tile renders
  the grey placeholder square and stays renameable and deletable
  (`src/components/media/media-grid.tsx:62`).
- **E1** — The row was already deleted by a collaborator → `ConvexError("Media not found")`, surfaced
  as the mutation's error toast.
- **E2** — Rename to whitespace only, if it reaches the server → `ConvexError("File name is
required")`.
- **E3** — The deleted image is still referenced by a layout block or by `events.meta` → **no check
  runs**; the delete succeeds and the reference dangles. See DEF-09-01.

## 6. States

| State             | Behavior                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Eight `Skeleton` squares in the grid layout while `items === undefined` (`src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:31`)      |
| Empty             | `EmptyState` — "No images yet" / "Upload images to use them in your public invitation template"                                              |
| Error             | Sonner error toast from `useToastMutation`; the grid itself has no error state (a throwing query surfaces through the Convex error boundary) |
| Success           | Toast "Image renamed" / "Image deleted"; the subscription re-renders                                                                         |
| Disabled / locked | No per-tile disabled state; the whole route is unreachable for a viewer                                                                      |
| Mobile            | Grid is `grid-cols-2`, widening to 3/4/5 columns at `sm`/`lg`/`xl` (`src/components/media/media-grid.tsx:55`)                                |

## 7. UI Specification

### Screens & components

| Element                           | Component                                              | Path                                                          |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Page shell, header, count, states | `MediaPage`                                            | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:12` |
| Thumbnail grid, rename, delete    | `MediaGrid`                                            | `src/components/media/media-grid.tsx:27`                      |
| Row type                          | `MediaItem` = `Doc<"media"> & { url: string \| null }` | `src/components/media/media-grid.tsx:21`                      |
| Delete confirmation               | `AlertDialog`                                          | `src/components/media/media-grid.tsx:130`                     |
| Empty state                       | `EmptyState`                                           | `src/components/app/empty-state.tsx`                          |

### Fields & validation

| Field                 | Type          | Required | Rule                                               | Message                 |
| --------------------- | ------------- | -------- | -------------------------------------------------- | ----------------------- |
| Rename input (client) | text          | Yes      | non-empty after `trim()`, else the save is a no-op | — (silent)              |
| `name` (server)       | string        | Yes      | non-empty after `trim()`                           | "File name is required" |
| `id` (server)         | `Id<"media">` | Yes      | row must exist                                     | "Media not found"       |

No length ceiling is enforced on a media name at any layer.

### Copy deck

Host-facing only; no guest-facing Spanish strings.

| Key                 | Copy                                                                                                   | Source                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Page title          | "Media" (with `(n)` count)                                                                             | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:20` |
| Empty title         | "No images yet"                                                                                        | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:39` |
| Empty body          | "Upload images to use them in your public invitation template"                                         | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:40` |
| Rename success      | "Image renamed"                                                                                        | `src/components/media/media-grid.tsx:33`                      |
| Rename failure      | "Failed to rename image"                                                                               | `src/components/media/media-grid.tsx:34`                      |
| Delete success      | "Image deleted"                                                                                        | `src/components/media/media-grid.tsx:37`                      |
| Delete failure      | "Failed to delete image"                                                                               | `src/components/media/media-grid.tsx:38`                      |
| Delete dialog title | "Delete Image"                                                                                         | `src/components/media/media-grid.tsx:136`                     |
| Delete dialog body  | "Delete "{name}"? Any template block using it will show its placeholder again. This cannot be undone." | `src/components/media/media-grid.tsx:137`                     |
| Tile actions        | `aria-label` "Rename" / "Delete" / "Save name"                                                         | `src/components/media/media-grid.tsx:87`, `:106`, `:118`      |

## 8. Data Model

| Table               | Fields | Read / Write                                   | Index        |
| ------------------- | ------ | ---------------------------------------------- | ------------ |
| `media`             | all    | Read (list), Write (`name` patch, row delete)  | `by_eventId` |
| `_storage` (system) | blob   | Read (`getUrl`), Delete (`ctx.storage.delete`) | —            |
| `events`            | `_id`  | Read through `requireEventEditor`              | —            |

**Cascade behavior.** `media.remove` deletes _outward_ — the blob then the row — but never
_inward_: nothing scans `events.layoutVariants`, `events.layoutBlocks` or `events.meta` for the id
being removed. Consumers are written to tolerate a missing id rather than to prevent it:
`getPublicInvitation` skips a config value whose media row is gone, so the key simply never appears
in `mediaUrls` and the block falls back to its placeholder (`convex/invitations.ts:202`), and
`meta.getPublicInvitationMeta`'s `resolveMediaUrl` returns `null`, so the social card loses its
image and the page loses its favicon (`convex/meta.ts:26`). The reverse direction — deleting the
event — does remove media rows and blobs (EP-02-F06).

## 9. Backend Contract

| Function                | Type     | Args                              | Returns                                                  | Guard                                   | Caps        |
| ----------------------- | -------- | --------------------------------- | -------------------------------------------------------- | --------------------------------------- | ----------- |
| `api.media.listByEvent` | query    | `{eventId: Id<"events">}`         | `(Doc<"media"> & {url: string \| null})[]`, newest first | `requireEventEditor(ctx, eventId)`      | `.take(50)` |
| `api.media.rename`      | mutation | `{id: Id<"media">, name: string}` | `void`                                                   | `requireEventEditor(ctx, item.eventId)` | —           |
| `api.media.remove`      | mutation | `{id: Id<"media">}`               | `void`                                                   | `requireEventEditor(ctx, item.eventId)` | —           |

## 10. Business Rules

- **BR-09-F02-01** `[AS-BUILT]` — Only a member with role `editor` or above may list, rename or
  delete an event's media (`convex/media.ts:90`, `:112`, `:127`).
- **BR-09-F02-02** `[AS-BUILT]` — `rename` and `remove` resolve the row first and guard on that
  row's `eventId`, so a member of one event cannot act on another event's media
  (`convex/media.ts:110`, `:125`).
- **BR-09-F02-03** `[AS-BUILT]` — A missing row throws `ConvexError("Media not found")`
  (`convex/media.ts:111`, `:126`).
- **BR-09-F02-04** `[AS-BUILT]` — `listByEvent` returns rows in `by_eventId` descending creation
  order — newest first (`convex/media.ts:95`).
- **BR-09-F02-05** `[AS-BUILT]` — `listByEvent` returns at most 50 rows, matching the per-event cap,
  and offers no pagination (`convex/media.ts:96`).
- **BR-09-F02-06** `[AS-BUILT]` — Each returned row carries `url`, resolved from `storageId`, which
  is `null` when the blob cannot be resolved (`convex/media.ts:101`).
- **BR-09-F02-07** `[AS-BUILT]` — `rename` stores the trimmed name and rejects a name that is empty
  after trimming (`convex/media.ts:115`).
- **BR-09-F02-08** `[AS-BUILT]` — `remove` deletes the storage blob **before** the catalog row, so a
  successful delete never leaves an orphaned blob (`convex/media.ts:129`).
- **BR-09-F02-09** `[AS-BUILT]` — Deletion is confirmed through an `AlertDialog` naming the image;
  it is not a one-click action (`src/components/media/media-grid.tsx:130`).
- **BR-09-F02-10** `[AS-BUILT]` — Rename edit mode closes only when the mutation reports success
  (`src/components/media/media-grid.tsx:44`).
- **BR-09-F02-11** `[AS-BUILT]` — Neither rename nor delete is written to the activity log; `media`
  is not among the `activityLogs.entity` values (`convex/schema.ts`, EP-03-F05).

## 11. Acceptance Criteria

- **AC-09-F02-01** — **Given** an event with three images uploaded at different times **When** an
  editor opens the Media page **Then** the most recently uploaded appears first and the header reads
  "Media (3)".
- **AC-09-F02-02** — **Given** a viewer **When** `media.listByEvent` runs **Then** it throws
  `Insufficient permissions` and no thumbnails are returned.
- **AC-09-F02-03** — **Given** an editor of event A **When** they call `media.rename` with an id
  belonging to event B **Then** the mutation throws and the name is unchanged.
- **AC-09-F02-04** — **Given** a tile in rename mode **When** the editor types "Venue map" and
  presses Enter **Then** the tile label reads "Venue map" and the toast reads "Image renamed".
- **AC-09-F02-05** — **Given** a tile in rename mode **When** the editor presses Escape **Then** the
  original name is restored and no mutation is called.
- **AC-09-F02-06** — **Given** the delete dialog is open for "hero.jpg" **When** the editor confirms
  **Then** the row is gone from the grid, the toast reads "Image deleted", and `ctx.storage.getUrl`
  for the old `storageId` no longer resolves.
- **AC-09-F02-07** — **Given** an event with no media **When** an editor opens the page **Then** the
  empty state reads "No images yet".
- **AC-09-F02-08** — **Given** the query has not resolved **When** the page renders **Then** eight
  skeleton squares are shown rather than an empty state.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                             |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-09-F02-01 | integration | `listByEvent` returns newest-first and caps at 50                                                                    |
| TC-09-F02-02 | integration | `listByEvent`, `rename`, `remove` each throw for a viewer                                                            |
| TC-09-F02-03 | integration | `rename`/`remove` throw for a member of a different event                                                            |
| TC-09-F02-04 | integration | `rename` trims, and rejects a whitespace-only name                                                                   |
| TC-09-F02-05 | integration | `remove` deletes both the blob and the row                                                                           |
| TC-09-F02-06 | integration | `remove` on an already-deleted id throws "Media not found"                                                           |
| TC-09-F02-07 | unit        | `MediaGrid` does not call `rename` when the input is blank                                                           |
| TC-09-F02-08 | e2e         | Rename inline, reload the page, the new name persists                                                                |
| TC-09-F02-09 | e2e         | Delete an image used by a hero block, then open the public invitation and observe the placeholder (covers DEF-09-01) |

### Manual QA checklist

- [ ] Grid reflows correctly at mobile, tablet and desktop widths.
- [ ] Rename via the check icon and via Enter both work.
- [ ] Escape cancels a rename cleanly.
- [ ] Deleting shows the image name inside the confirmation copy.
- [ ] Delete an image referenced by the social card, then re-share the invitation link and observe
      the card losing its image.
- [ ] Two editors on the same page: one deletes, the other's grid updates without a reload.

## 13. Non-Functional

| Concern          | Specification                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `.take(50)` matches the per-event cap; no pagination path exists                                                                   |
| Performance      | One query per page; `getUrl` is resolved for all rows in parallel via `Promise.all` (`convex/media.ts:98`)                         |
| Security & authz | Row-first load then `requireEventEditor(item.eventId)` on both mutations. Storage URLs themselves are unauthenticated once known   |
| Accessibility    | Action buttons carry `aria-label`s; the rename input autofocuses. Library images have **no author-supplied alt text** (TODO-09-02) |
| i18n             | Host-facing copy is English only                                                                                                   |
| Analytics        | Not activity-logged                                                                                                                |

## 14. TODOs & Open Questions

- **DEF-09-01** `[P1]` — Deleting a media row performs no reference check, so an image still in use
  by a layout block or by `events.meta` is removed and its consumers silently degrade.
  - **Evidence:** `convex/media.ts:122` — `remove` loads the row, guards, deletes the blob and the
    row, and touches nothing else. The consumers absorb the dangling id rather than reporting it:
    `convex/invitations.ts:202` skips a config value whose `media` row is missing, so the key never
    lands in `mediaUrls`; `convex/meta.ts:28` returns `null` from `resolveMediaUrl` when the row is
    gone. Neither `events.layoutVariants`, `events.layoutBlocks` nor `events.meta` is scanned before
    the delete, and no mutation clears the stale id afterwards — it stays in the document forever.
  - **Impact:** A published invitation loses artwork with no warning to anyone. The Design Studio
    case is _partly_ disclosed: the confirmation copy says "Any template block using it will show
    its placeholder again" (`src/components/media/media-grid.tsx:137`) — but it does not say
    _which_ blocks, or _whether any_, so an editor cannot tell a harmless delete from a destructive
    one. The `events.meta` case is disclosed nowhere: deleting the social image drops the OG and
    Twitter image tags from every already-shared link (`src/lib/invitation-metadata.ts:26`), and
    deleting the favicon drops the tab icon (`src/lib/invitation-metadata.ts:34`), with no dialog
    text, toast or badge mentioning it. WhatsApp/iMessage cache link previews, so the host may never
    see the breakage themselves.
  - **Proposed fix:** Before deleting, count references across `events.layoutVariants` (all three
    variants), the legacy `events.layoutBlocks`, `events.meta.imageId` and `events.meta.faviconId`.
    Either block the delete with a `ConvexError` naming the consumers, or return the count so the
    dialog can warn precisely ("Used by 2 blocks and your social card") and clear the stale ids in
    the same transaction when the editor proceeds.
- **TODO-09-02** `[P1]` `[ADD]` — The library stores no alt text, and none can be authored anywhere.
  - **Rationale:** `media` has exactly five fields and no description column
    (`convex/schema.ts:213`). Public templates therefore substitute derived or empty values: the
    hero and dress-code images reuse the event name
    (`src/components/public-invitation/templates/elegant/blocks/hero.tsx:26`,
    `.../dress-code.tsx:18`), while the footer and itinerary images pass `alt=""`
    (`.../footer.tsx:18`, `.../itinerary.tsx:40`). A guest using a screen reader on an
    image-heavy invitation hears the event name repeated, or nothing at all — including for the map
    image, which is genuinely informative content.
  - **Proposed rule:** Add an optional `altText` to `media`, editable beside the name on the tile,
    and have every template image consume it in preference to the derived fallback.
- **TODO-09-04** `[P2]` `[ADD]` — No folders, tags, search or sort control.
  - **Rationale:** The library is a flat newest-first wall bounded only by the 50-image cap
    (`convex/media.ts:95`), and the only affordance for finding an image is its filename in a
    truncated one-line label. At 40+ images the picker in particular becomes a scroll hunt.
  - **Proposed rule:** Add at minimum a client-side name filter on the Media page and inside
    `MediaPickerDialog`; folders and tags are a larger change to defer.
- **TODO-09-09** `[P2]` `[ADD]` — No media name length limit.
  - **Rationale:** `rename` only checks non-emptiness (`convex/media.ts:115`), so an arbitrarily
    long name is stored and then truncated purely by CSS in the tile
    (`src/components/media/media-grid.tsx:97`).
  - **Proposed rule:** Cap the stored name (e.g. 120 characters) server-side, mirroring the meta
    field caps in `convex/lib/meta.ts:77`.

### Open questions

- **Q1** — When an in-use image is deleted, should the stale id be cleared from the layout/meta
  documents, or preserved so that re-uploading under the same id would restore it? (Ids are not
  reusable in Convex, so preservation has no recovery value — this should be settled explicitly.)
- **Q2** — Should media create/rename/delete appear in the Activity log (EP-03-F05)? Every other
  editor-level content mutation is logged; media is the exception.

## 15. Traceability

| Concern                     | Source                                                        |
| --------------------------- | ------------------------------------------------------------- |
| Route                       | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:12` |
| UI — grid, rename, delete   | `src/components/media/media-grid.tsx:27`                      |
| UI — delete confirmation    | `src/components/media/media-grid.tsx:130`                     |
| UI — loading / empty states | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:30` |
| Backend — list              | `convex/media.ts:87`                                          |
| Backend — rename            | `convex/media.ts:107`                                         |
| Backend — remove            | `convex/media.ts:122`                                         |
| Schema                      | `convex/schema.ts:213`                                        |
| Guard                       | `convex/lib/permissions.ts:50`                                |
| Dangling reference — layout | `convex/invitations.ts:202`                                   |
| Dangling reference — meta   | `convex/meta.ts:26`                                           |
| Toast convention            | `src/hooks/use-toast-mutation.ts`                             |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
