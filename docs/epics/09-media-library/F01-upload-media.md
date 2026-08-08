---
id: EP-09-F01
title: Upload Media
epic: EP-09 Media Library
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F01, EP-03-F01]
---

# EP-09-F01 — Upload Media

## 1. Summary

An editor adds an image to the event's [Media Library](../../glossary.md#design--publishing) so it
can be used on the public invitation — as a hero photo, a map picture, a dress-code shot, a
special-invitation card image, a social-card image or a favicon. The upload is a three-step
handshake: the server issues a one-time upload URL, the browser posts the file straight to Convex
file storage, and a second call catalogs the resulting blob as a `media` row. Cataloging is where
the product decides whether the file is acceptable at all: it must be an image of an allowed type,
at most 5 MB, and the event must not already hold 50 images.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                              |
| -------------------- | ------ | ------------------------------------------------------------------ |
| Owner                | Full   |                                                                    |
| Co-owner (`planner`) | Full   |                                                                    |
| Editor               | Full   | Media is content; the default guard floor already admits an editor |
| Viewer               | None   | Blocked — the guard's default `minRole` is `editor`                |
| Public guest         | None   | No public function reads or writes `media`                         |

Both mutations apply the same gate: `requireEventEditor(ctx, args.eventId)`
(`convex/media.ts:22`, `convex/media.ts:37`). Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-09-F01-01** — As an Editor, I want to upload a photo from my computer so that I can place it
  on the public invitation.
- **US-09-F01-02** — As an Editor, I want an obviously wrong file (a PDF, a 20 MB RAW photo) to be
  rejected before it reaches my library so that the library stays usable.
- **US-09-F01-03** — As an Owner, I want a hard ceiling on how much an event can store so that one
  board cannot consume unbounded storage.
- **US-09-F01-04** — As an Editor, I want to upload an image without leaving the dialog I am in, so
  that picking an image for a block does not interrupt my work.

## 4. Entry Points

| Entry point                             | Route / control                                                                                         | Actor   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| Media page header button "Upload Image" | `/dashboard/[eventSlug]/media`                                                                          | Editor+ |
| Picker dialog upload button             | Any dialog rendering `MediaPickerDialog` (Design Studio image fields EP-08-F04, social image EP-10-F01) | Editor+ |
| Favicon uploader                        | `/dashboard/[eventSlug]/meta` → "Upload Favicon" (EP-10-F02)                                            | Editor+ |

Sidebar link **Media** is filtered at `minRole: "editor"`
(`src/components/dashboard/dashboard-sidebar.tsx`).

## 5. UX Flow

### Happy path

1. The editor clicks **Upload Image** → `UploadButton` opens the hidden `<input type="file">`
   (`src/components/media/upload-button.tsx:85`).
2. The browser reports a `File`; the component pre-checks `file.type` against its local
   `ALLOWED_TYPES` and `file.size` against 5 MB (`src/components/media/upload-button.tsx:32`).
3. The component calls `api.media.generateUploadUrl({ eventId })`, which guards the caller and
   returns `ctx.storage.generateUploadUrl()` (`convex/media.ts:23`).
4. The browser `POST`s the raw file to that URL with the file's own `Content-Type`
   (`src/components/media/upload-button.tsx:44`) and receives `{ storageId }`.
5. The component calls `api.media.register({ eventId, storageId, name, mimeType, size })`.
6. `register` validates the client-reported mime, size and name, then **re-reads the blob's own
   metadata** and validates size and content type again against that, then counts existing rows,
   then inserts the catalog row storing the blob's mime type and size — not the client's
   (`convex/media.ts:39`–`convex/media.ts:82`).
7. `toast.success("Image uploaded")`; the Convex `listByEvent` subscription re-renders the grid,
   and `onUploaded(mediaId)` fires for callers that want the id (the picker selects it
   immediately).

### Alternate & edge paths

- **A1** — Upload started from `MediaPickerDialog`: on success the dialog selects the new image and
  closes (`src/components/media/media-picker-dialog.tsx:50`).
- **A2** — Upload started from the favicon uploader: a different client whitelist applies
  (`FAVICON_MIME_TYPES`) and a `.ico` file with an empty browser mime is mapped to `image/x-icon`
  before both the check and the POST (`src/components/meta/favicon-upload-button.tsx:15`). See
  EP-10-F02.
- **E1** — Client pre-check fails on type → `toast.error("Only image files are allowed (jpg, png,
svg, webp, gif)")` and nothing is uploaded.
- **E2** — Client pre-check fails on size → `toast.error("Image must be smaller than 5MB")`.
- **E3** — The blob `POST` returns non-OK, or any step throws → the whole `try` block is caught and
  reported as `toast.error("Failed to upload image")`. The server's `ConvexError` message is
  swallowed, so a cap or mime rejection from `register` surfaces as the same generic copy
  (`src/components/media/upload-button.tsx:62`).
- **E4** — The blob is larger than 5 MB or has a disallowed `contentType` when `register` inspects
  it → the blob is **deleted from storage** and a `ConvexError` is thrown, leaving no orphan
  (`convex/media.ts:55`, `convex/media.ts:62`).
- **E5** — The event already holds 50 rows → `ConvexError("Media library is full (max 50 images)")`.
  The already-uploaded blob is **not** deleted in this branch (see TODO-09-07).
- **E6** — `args.name` is blank after trimming → `ConvexError("File name is required")`.

## 6. States

| State             | Behavior                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Button is disabled and reads "Uploading…" (`src/components/media/upload-button.tsx:88`)                                   |
| Empty             | Not applicable to the upload control itself; the page behind it shows `EmptyState` "No images yet"                        |
| Error             | Sonner error toast; the file input is reset so the same file can be retried (`src/components/media/upload-button.tsx:66`) |
| Success           | Sonner "Image uploaded"; grid updates reactively                                                                          |
| Disabled / locked | Disabled while an upload is in flight; the whole page is unreachable for a viewer                                         |
| Mobile            | The button is a standard `size="sm"` button in the page header; the native file picker handles selection                  |

## 7. UI Specification

### Screens & components

| Element                      | Component             | Path                                                          |
| ---------------------------- | --------------------- | ------------------------------------------------------------- |
| Media page                   | `MediaPage`           | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:12` |
| Upload control               | `UploadButton`        | `src/components/media/upload-button.tsx:25`                   |
| Favicon variant              | `FaviconUploadButton` | `src/components/meta/favicon-upload-button.tsx:27`            |
| Picker embedding the control | `MediaPickerDialog`   | `src/components/media/media-picker-dialog.tsx:28`             |

### Fields & validation

| Field               | Type       | Required | Rule                                                                                              | Message                                                   |
| ------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| File (client)       | `File`     | Yes      | `file.type ∈ {image/jpeg, image/png, image/svg+xml, image/webp, image/gif}`                       | "Only image files are allowed (jpg, png, svg, webp, gif)" |
| File (client)       | `File`     | Yes      | `file.size ≤ 5 MB`                                                                                | "Image must be smaller than 5MB"                          |
| `mimeType` (server) | string     | Yes      | ∈ `ALLOWED_IMAGE_MIME_TYPES` (the five above **plus** `image/x-icon`, `image/vnd.microsoft.icon`) | "Only image files are allowed"                            |
| `size` (server)     | number     | Yes      | `≤ 5 * 1024 * 1024`                                                                               | "Image must be smaller than 5MB"                          |
| `name` (server)     | string     | Yes      | non-empty after `trim()`                                                                          | "File name is required"                                   |
| Blob metadata       | system doc | Yes      | blob must exist                                                                                   | "Uploaded file not found"                                 |
| Blob `size`         | number     | Yes      | `≤ 5 MB` — blob deleted on failure                                                                | "Image must be smaller than 5MB"                          |
| Blob `contentType`  | string?    | No       | when present, ∈ `ALLOWED_IMAGE_MIME_TYPES` — blob deleted on failure                              | "Only image files are allowed"                            |
| Library count       | derived    | —        | `< 50` existing rows for the event                                                                | "Media library is full (max 50 images)"                   |

No Zod schema participates; validation is entirely hand-written in the component and the mutation.

### Copy deck

The Media Library is host-facing only — it renders no guest-facing Spanish strings.

| Key              | Copy                                                                             | Source                                                        |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Button idle      | "Upload Image"                                                                   | `src/components/media/upload-button.tsx:88`                   |
| Button busy      | "Uploading…"                                                                     | `src/components/media/upload-button.tsx:88`                   |
| Success toast    | "Image uploaded"                                                                 | `src/components/media/upload-button.tsx:60`                   |
| Type error       | "Only image files are allowed (jpg, png, svg, webp, gif)"                        | `src/components/media/upload-button.tsx:33`                   |
| Size error       | "Image must be smaller than 5MB"                                                 | `src/components/media/upload-button.tsx:37`                   |
| Generic failure  | "Failed to upload image"                                                         | `src/components/media/upload-button.tsx:63`                   |
| Page empty state | "No images yet" / "Upload images to use them in your public invitation template" | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:39` |

## 8. Data Model

| Table               | Fields                                             | Read / Write                                                               | Index                            |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| `media`             | `eventId`, `storageId`, `name`, `mimeType`, `size` | Write (insert)                                                             | `by_eventId` (for the cap count) |
| `_storage` (system) | `size`, `contentType`                              | Read via `ctx.db.system.get`; delete via `ctx.storage.delete` on rejection | —                                |
| `events`            | `_id`                                              | Read through `requireEventEditor`                                          | —                                |

`mimeType` and `size` on the inserted row are taken from the blob (`blob.contentType ?? args.mimeType`,
`blob.size`), so the catalog records the truth rather than the client's claim
(`convex/media.ts:80`).

**Why the blob re-read matters.** `generateUploadUrl` hands the browser a URL it posts to directly;
Convex does not police what goes through it. If `register` trusted `args.size` and `args.mimeType`,
a caller could upload a 500 MB file (or an executable) and then declare it a 4 KB PNG — the row
would look benign while the storage bill and the served content would not. Re-reading
`ctx.db.system.get(storageId)` closes that gap, and deleting the blob on failure means a rejected
upload leaves nothing behind.

**Storage lifecycle.** Blobs are removed in exactly three places: a failed `register`
(`convex/media.ts:55`, `:62`), `media.remove` (EP-09-F02), and the event delete cascade
(EP-02-F06).

## 9. Backend Contract

| Function                      | Type     | Args                                                                                 | Returns             | Guard                              | Caps                                |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------ | ------------------- | ---------------------------------- | ----------------------------------- |
| `api.media.generateUploadUrl` | mutation | `{eventId: Id<"events">}`                                                            | upload URL `string` | `requireEventEditor(ctx, eventId)` | —                                   |
| `api.media.register`          | mutation | `{eventId, storageId: Id<"_storage">, name: string, mimeType: string, size: number}` | `Id<"media">`       | `requireEventEditor(ctx, eventId)` | 5 MB, 50 rows/event, mime whitelist |

## 10. Business Rules

- **BR-09-F01-01** `[AS-BUILT]` — Only a member with role `editor` or above may request an upload
  URL for an event (`convex/media.ts:22`).
- **BR-09-F01-02** `[AS-BUILT]` — Only a member with role `editor` or above may register a blob as
  event media (`convex/media.ts:37`).
- **BR-09-F01-03** `[AS-BUILT]` — `register` rejects a client-reported mime type outside
  `ALLOWED_IMAGE_MIME_TYPES` = `image/jpeg`, `image/png`, `image/svg+xml`, `image/webp`,
  `image/gif`, `image/x-icon`, `image/vnd.microsoft.icon` (`convex/media.ts:5`, `:39`).
- **BR-09-F01-04** `[AS-BUILT]` — `register` rejects a client-reported size above 5 MB
  (`convex/media.ts:42`).
- **BR-09-F01-05** `[AS-BUILT]` — `register` rejects a blank name after trimming
  (`convex/media.ts:45`).
- **BR-09-F01-06** `[AS-BUILT]` — `register` rejects a `storageId` with no blob behind it
  (`convex/media.ts:51`).
- **BR-09-F01-07** `[AS-BUILT]` — `register` re-validates the size against the blob's own metadata
  and deletes the blob when it exceeds 5 MB (`convex/media.ts:54`).
- **BR-09-F01-08** `[AS-BUILT]` — `register` re-validates the blob's own `contentType` against the
  whitelist when the blob reports one, and deletes the blob when it fails (`convex/media.ts:58`).
- **BR-09-F01-09** `[AS-BUILT]` — A blob whose `contentType` is absent passes the second content
  check and is cataloged with the client-reported `mimeType` (`convex/media.ts:58`, `:80`).
- **BR-09-F01-10** `[AS-BUILT]` — An event may hold at most 50 `media` rows; registration beyond
  that throws (`convex/media.ts:17`, `:70`).
- **BR-09-F01-11** `[AS-BUILT]` — The stored `mimeType` and `size` come from the blob when
  available, not from the client arguments (`convex/media.ts:80`).
- **BR-09-F01-12** `[AS-BUILT]` — The stored `name` is the client-supplied name, trimmed
  (`convex/media.ts:81`).
- **BR-09-F01-13** `[AS-BUILT]` — Client-side type and size checks in `UploadButton` are advisory
  only: they short-circuit an obviously bad file before the network round-trip and are not the
  authority (`src/components/media/upload-button.tsx:32`).

## 11. Acceptance Criteria

- **AC-09-F01-01** — **Given** a viewer of an event **When** they call `media.generateUploadUrl`
  **Then** the mutation throws `Insufficient permissions` and no URL is issued.
- **AC-09-F01-02** — **Given** an editor **When** they upload a valid 1 MB JPEG **Then** a `media`
  row exists for the event with `mimeType: "image/jpeg"` and the toast reads "Image uploaded".
- **AC-09-F01-03** — **Given** a blob of 8 MB uploaded to storage **When** `register` is called
  claiming `size: 1000` **Then** the mutation throws "Image must be smaller than 5MB" **and** the
  blob no longer exists in storage.
- **AC-09-F01-04** — **Given** a blob whose `contentType` is `application/pdf` **When** `register`
  is called claiming `image/png` **Then** the mutation throws "Only image files are allowed" and the
  blob is deleted.
- **AC-09-F01-05** — **Given** an event that already holds 50 media rows **When** an editor
  registers a 51st **Then** the mutation throws "Media library is full (max 50 images)".
- **AC-09-F01-06** — **Given** an editor **When** `register` is called with `name: "   "` **Then**
  the mutation throws "File name is required".
- **AC-09-F01-07** — **Given** a valid upload **When** the row is inserted **Then** `size` equals
  the blob's real byte length regardless of the `size` argument.
- **AC-09-F01-08** — **Given** the editor selects a `.pdf` in the file dialog **When** the change
  handler runs **Then** an error toast appears and neither `generateUploadUrl` nor `register` is
  called.
- **AC-09-F01-09** — **Given** an upload in flight **When** the editor looks at the button **Then**
  it is disabled and reads "Uploading…".

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                      |
| ------------ | ----------- | --------------------------------------------------------------------------------------------- |
| TC-09-F01-01 | unit        | `ALLOWED_IMAGE_MIME_TYPES` contains exactly the seven documented types                        |
| TC-09-F01-02 | integration | `register` rejects each disallowed client mime with "Only image files are allowed"            |
| TC-09-F01-03 | integration | `register` deletes the blob when blob size exceeds 5 MB                                       |
| TC-09-F01-04 | integration | `register` deletes the blob when blob `contentType` is disallowed                             |
| TC-09-F01-05 | integration | `register` throws at the 51st row and does not insert                                         |
| TC-09-F01-06 | integration | `register` stores the blob's `contentType`/`size`, ignoring mismatched args                   |
| TC-09-F01-07 | integration | `generateUploadUrl` and `register` both throw for a viewer                                    |
| TC-09-F01-08 | e2e         | Editor uploads a PNG on `/dashboard/{slug}/media` and sees it in the grid without a reload    |
| TC-09-F01-09 | e2e         | Editor uploads from inside `MediaPickerDialog`; the dialog closes with the new image selected |

### Manual QA checklist

- [ ] Upload a JPEG, a PNG, a WEBP, a GIF and an SVG — all five appear in the grid.
- [ ] Try a `.pdf` — blocked client-side with a toast, no network call.
- [ ] Try a 10 MB photo — blocked client-side with the size toast.
- [ ] Upload the same file twice — two independent rows, both usable.
- [ ] Upload while offline — generic "Failed to upload image" toast, button re-enables.
- [ ] As a viewer (role set directly in the DB), confirm the Media sidebar link is hidden.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | 5 MB per image; 50 images per event; no per-account quota                                                                                                                      |
| Performance      | The cap count uses `by_eventId` with `.take(50)`, so it is bounded regardless of library size                                                                                  |
| Security & authz | `requireEventEditor` on both mutations; blob metadata re-read rather than trusted; rejected blobs deleted. **SVG is accepted and served from Convex storage** — see TODO-09-01 |
| Accessibility    | The file input is visually hidden and driven by a labelled button; uploaded images carry no alt text (TODO-09-02)                                                              |
| i18n             | Host-facing copy is English only                                                                                                                                               |
| Analytics        | Uploads are **not** written to the activity log (`convex/lib/activity.ts` entities do not include media)                                                                       |

## 14. TODOs & Open Questions

- **TODO-09-01** `[P1]` `[CHANGE]` — SVG upload is allowed, and the stored blob is served from a
  Convex storage URL and embedded on the public invitation page.
  - **Evidence:** `convex/media.ts:8` (`"image/svg+xml"` in the whitelist),
    `src/components/media/upload-button.tsx:15`, and the public render path
    `convex/invitations.ts:204` → `mediaUrls` → `<img src>` in
    `src/components/public-invitation/templates/elegant/blocks.tsx`.
  - **Impact:** An SVG can carry `<script>`. Today every consumer renders it through an `<img>`
    tag, which does not execute embedded script, so there is no known live XSS. The exposure is
    that the file is a first-class, publicly reachable asset on the Convex storage origin: anyone
    with the URL fetches it directly, where script _does_ run in the storage origin's context, and
    any future change that inlines the SVG (or renders it via `<object>`/`<embed>`) turns it into
    stored XSS on the invitation page. An editor is a semi-trusted actor — an invited collaborator,
    not the owner — so this is a real privilege-escalation surface within a shared board.
  - **Proposed rule:** Either drop `image/svg+xml` from `ALLOWED_IMAGE_MIME_TYPES`, or sanitize
    SVG bytes on registration and serve them with `Content-Security-Policy: sandbox` /
    `Content-Disposition: attachment` headers. Whichever is chosen, the favicon path must keep
    working (`FAVICON_MIME_TYPES` includes SVG — `convex/lib/meta.ts:81`).
- **TODO-09-03** `[P2]` `[ADD]` — No image optimization, resizing or dimension guidance on upload.
  - **Rationale:** A 4.9 MB, 6000 px hero photo is stored and served verbatim to every guest, most
    of them on a phone over mobile data. The only dimension hint in the product is the social-image
    caption "Recommended 1200×630" (`src/components/meta/meta-settings.tsx:181`), and nothing
    enforces it.
  - **Proposed rule:** Generate and store a bounded-width derivative at registration, and serve the
    derivative to public pages while keeping the original for download.
- **TODO-09-05** `[P2]` `[CHANGE]` — The client whitelist and the server whitelist disagree.
  - **Rationale:** `ALLOWED_TYPES` in `src/components/media/upload-button.tsx:11` omits
    `image/x-icon` and `image/vnd.microsoft.icon`, which `convex/media.ts:5` accepts. A `.ico`
    therefore cannot be added from the Media page even though the server would take it; it can only
    enter through the favicon uploader. The two lists are hand-copied rather than shared.
  - **Proposed rule:** Export the whitelist from one module and import it on both sides, and state
    explicitly whether `.ico` belongs in the general library.
- **TODO-09-07** `[P2]` `[CHANGE]` — A blob is orphaned when registration fails on the 50-image cap.
  - **Rationale:** The mime and size failure branches delete the blob (`convex/media.ts:55`, `:62`)
    but the cap branch throws without deleting (`convex/media.ts:70`), so a full library accumulates
    unreferenced storage that no cascade will ever reach — `events.deleteEvent` deletes blobs by
    walking `media` rows, and there is no row for an orphan.
  - **Proposed rule:** Delete the blob before throwing the cap error, exactly as the other two
    rejection branches do.
- **TODO-09-08** `[P2]` `[CHANGE]` — Server rejection reasons never reach the user.
  - **Rationale:** `UploadButton` wraps the whole flow in one `catch` that emits "Failed to upload
    image" (`src/components/media/upload-button.tsx:62`), so "Media library is full (max 50 images)"
    — the one server error a well-behaved client will actually hit — is invisible.
  - **Proposed rule:** Surface the `ConvexError` message when present, as `useToastMutation` callers
    elsewhere do.

### Open questions

- **Q1** — Should the 50-image cap be per event or per account? A host running three boards gets
  150 images today with no plan-level control (EP-16).
- **Q2** — Should `.ico` be uploadable from the Media page, or remain reachable only through the
  favicon uploader?

## 15. Traceability

| Concern                     | Source                                                        |
| --------------------------- | ------------------------------------------------------------- |
| Route                       | `src/app/(dashboard)/dashboard/[eventSlug]/media/page.tsx:12` |
| UI — upload control         | `src/components/media/upload-button.tsx:25`                   |
| UI — client pre-checks      | `src/components/media/upload-button.tsx:32`                   |
| UI — upload POST            | `src/components/media/upload-button.tsx:44`                   |
| UI — favicon variant        | `src/components/meta/favicon-upload-button.tsx:36`            |
| Backend — upload URL        | `convex/media.ts:19`                                          |
| Backend — register          | `convex/media.ts:28`                                          |
| Backend — mime whitelist    | `convex/media.ts:5`                                           |
| Backend — size + count caps | `convex/media.ts:16`                                          |
| Backend — blob re-read      | `convex/media.ts:50`                                          |
| Schema                      | `convex/schema.ts:213`                                        |
| Guard                       | `convex/lib/permissions.ts:50`                                |
| Public consumption          | `convex/invitations.ts:194`                                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
