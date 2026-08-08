---
id: EP-10-F02
title: Favicon
epic: EP-10 Sharing & SEO
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-09-F01, EP-10-F01]
---

# EP-10-F02 — Favicon

## 1. Summary

The small icon in the browser tab is the last piece of branding on a public invitation. Without it,
a guest who leaves the invitation open among a dozen tabs sees the generic Wedboard mark on the
couple's page — or, on a custom domain, an icon that has nothing to do with the wedding. This
feature lets an editor upload an `.ico`, `.svg` or `.png` and have it served as the tab icon on
every public invitation page for that event. The upload goes into the same
[Media Library](../../glossary.md#design--publishing) as every other image; only the accepted mime
types and the entry point differ.

## 2. Actors & Permissions

| Actor                | Access            | Notes                                                                             |
| -------------------- | ----------------- | --------------------------------------------------------------------------------- |
| Owner                | Full              |                                                                                   |
| Co-owner (`planner`) | Full              |                                                                                   |
| Editor               | Full              | Same `editor` floor as the rest of the Meta page                                  |
| Viewer               | None              | Blocked by `media.generateUploadUrl`, `media.register` and `meta.updateEventMeta` |
| Public guest         | Read (implicitly) | The browser fetches the icon URL                                                  |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
The upload path applies `requireEventEditor(ctx, eventId)` (`convex/media.ts:22`, `:37`); the save
applies `requireEventEditor(ctx, eventId, "editor")` (`convex/meta.ts:107`).

## 3. User Stories

- **US-10-F02-01** — As an Editor, I want to upload our monogram as the favicon so that the public
  invitation tab carries the couple's branding.
- **US-10-F02-02** — As an Editor, I want a `.ico` file to be accepted even though my browser reports
  no mime type for it, so that the most common favicon format is not silently rejected.
- **US-10-F02-03** — As an Editor, I want to see the current favicon and be able to remove it so
  that I can revert to the default.

## 4. Entry Points

| Entry point                                              | Route / control                                     | Actor           |
| -------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Meta & Sharing page → Favicon section → "Upload Favicon" | `/dashboard/[eventSlug]/meta`                       | Editor+         |
| Public consumption                                       | `generateMetadata` on both public invitation routes | Guest / crawler |

Unlike the social image, the favicon slot does **not** open `MediaPickerDialog` — an existing
library image cannot be selected as a favicon, only a freshly uploaded file
(`src/components/meta/meta-settings.tsx:247`; see TODO-10-08).

## 5. UX Flow

### Happy path

1. The editor clicks **Upload Favicon** → `FaviconUploadButton` opens a hidden file input restricted
   by `accept=".ico,.svg,.png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/png"`
   (`src/components/meta/favicon-upload-button.tsx:81`).
2. `resolveMimeType(file)` returns `file.type`, or — when the browser reported an empty string and
   the filename ends in `.ico` — the literal `image/x-icon`
   (`src/components/meta/favicon-upload-button.tsx:15`).
3. The resolved mime is checked against `FAVICON_MIME_TYPES`, and the size against 5 MB
   (`src/components/meta/favicon-upload-button.tsx:38`).
4. `media.generateUploadUrl({ eventId })` → the file is `POST`ed with the **resolved** mime as its
   `Content-Type` (`src/components/meta/favicon-upload-button.tsx:52`) → `media.register` catalogs
   it under all the EP-09-F01 rules.
5. Toast "Favicon uploaded"; `onUploaded(mediaId)` sets `faviconId` in the page's local state
   (`src/components/meta/meta-settings.tsx:249`), and the 40×40 preview box resolves it from the
   `media.listByEvent` subscription.
6. The editor clicks **Save Changes** → `meta.updateEventMeta` verifies the row belongs to this
   event and that its stored mime is in `FAVICON_MIME_TYPES`, then persists
   `events.meta.faviconId` (`convex/meta.ts:129`).
7. On a public invitation request, `getPublicInvitationMeta` resolves the id to `faviconUrl` +
   `faviconMimeType` (`convex/meta.ts:78`), and `buildInvitationMetadata` emits an `icons.icon`
   entry carrying that URL and, when known, its `type`
   (`src/lib/invitation-metadata.ts:34`).

### Alternate & edge paths

- **A1** — **Removing the favicon.** The "Remove" button appears only when `faviconId` is set and
  clears local state (`src/components/meta/meta-settings.tsx:251`); the removal persists only on
  **Save Changes**, and the underlying media row remains in the library.
- **A2** — The `.ico` extension fallback applies only when `file.type` is empty; a browser reporting
  `image/vnd.microsoft.icon` passes directly, since that spelling is in `FAVICON_MIME_TYPES`.
- **A3** — A `.png` chosen here is equally valid as a social image, and vice versa; nothing separates
  the two roles inside the library.
- **E1** — The resolved mime is not in `FAVICON_MIME_TYPES` (e.g. a `.jpg`, or a `.ico` whose name
  the fallback could not match) → `toast.error("Favicon must be an .ico, .svg, or .png file")` and
  no upload occurs.
- **E2** — The file exceeds 5 MB → `toast.error("Favicon must be smaller than 5MB")`.
- **E3** — Any step of the upload throws → `toast.error("Failed to upload favicon")`, swallowing the
  server's message exactly as the general uploader does (TODO-09-08).
- **E4** — The library already holds 50 images → `register` throws and surfaces as E3's generic
  toast.
- **E5** — The chosen media row is later deleted from the library → `resolveMediaUrl` returns `null`
  and no `icons` key is emitted; the tab silently reverts to the browser default (DEF-09-01).
- **E6** — A `.gif` is set as `faviconId` by a non-UI caller → `updateEventMeta` rejects it with
  "Favicon must be an .ico, .svg, or .png file" (`convex/meta.ts:132`).
- **E7** — A `.ico` uploaded through the fallback while the blob itself reports no `contentType` is
  cataloged with the client-resolved `image/x-icon` (`convex/media.ts:80`), which keeps it valid for
  the later favicon check.

## 6. States

| State             | Behavior                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Loading           | Button disabled, reading "Uploading…" (`src/components/meta/favicon-upload-button.tsx:95`) |
| Empty             | The 40×40 box shows a grey `ImageIcon` placeholder and no "Remove" button                  |
| Error             | Sonner error toast; the file input is reset so the same file can be retried                |
| Success           | Toast "Favicon uploaded"; the preview box shows the icon at `h-6 w-6` contained            |
| Disabled / locked | Disabled during upload; the route is unreachable for a viewer                              |
| Mobile            | The section is a simple flex row; the native file picker handles selection                 |

## 7. UI Specification

### Screens & components

| Element         | Component                 | Path                                               |
| --------------- | ------------------------- | -------------------------------------------------- |
| Favicon section | `MetaSettings`            | `src/components/meta/meta-settings.tsx:226`        |
| Uploader        | `FaviconUploadButton`     | `src/components/meta/favicon-upload-button.tsx:27` |
| Mime fallback   | `resolveMimeType`         | `src/components/meta/favicon-upload-button.tsx:15` |
| Metadata mapper | `buildInvitationMetadata` | `src/lib/invitation-metadata.ts:34`                |

### Fields & validation

| Field                | Type          | Required | Rule                                                                                                            | Message                                         |
| -------------------- | ------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| File (client)        | `File`        | Yes      | Resolved mime ∈ `FAVICON_MIME_TYPES` = `image/x-icon`, `image/vnd.microsoft.icon`, `image/svg+xml`, `image/png` | "Favicon must be an .ico, .svg, or .png file"   |
| File (client)        | `File`        | Yes      | `size ≤ 5 MB`                                                                                                   | "Favicon must be smaller than 5MB"              |
| Blob (server)        | —             | Yes      | All EP-09-F01 `register` rules apply                                                                            | See EP-09-F01                                   |
| `faviconId` (server) | `Id<"media">` | No       | Row must belong to this event                                                                                   | "Image not found in this event's media library" |
| `faviconId` (server) | `Id<"media">` | No       | Stored `mimeType` ∈ `FAVICON_MIME_TYPES`                                                                        | "Favicon must be an .ico, .svg, or .png file"   |

`FAVICON_MIME_TYPES` is defined once in `convex/lib/meta.ts:81` and imported by both the client
uploader and the mutation — unlike the general image whitelist, which is duplicated (TODO-09-05).

### Copy deck

Host-facing only; no guest-facing Spanish strings.

| Key               | Copy                                                                                       | Source                                             |
| ----------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Section heading   | "Favicon"                                                                                  | `src/components/meta/meta-settings.tsx:228`        |
| Section help      | "The browser-tab icon on your public invitation pages. Accepts .ico, .svg, or .png files." | `src/components/meta/meta-settings.tsx:229`        |
| Button idle       | "Upload Favicon"                                                                           | `src/components/meta/favicon-upload-button.tsx:95` |
| Button busy       | "Uploading…"                                                                               | `src/components/meta/favicon-upload-button.tsx:95` |
| Remove button     | "Remove"                                                                                   | `src/components/meta/meta-settings.tsx:257`        |
| Success toast     | "Favicon uploaded"                                                                         | `src/components/meta/favicon-upload-button.tsx:66` |
| Type error        | "Favicon must be an .ico, .svg, or .png file"                                              | `src/components/meta/favicon-upload-button.tsx:39` |
| Size error        | "Favicon must be smaller than 5MB"                                                         | `src/components/meta/favicon-upload-button.tsx:43` |
| Generic failure   | "Failed to upload favicon"                                                                 | `src/components/meta/favicon-upload-button.tsx:69` |
| Server mime error | "Favicon must be an .ico, .svg, or .png file"                                              | `convex/meta.ts:132`                               |

## 8. Data Model

| Table               | Fields                             | Read / Write                                       | Index        |
| ------------------- | ---------------------------------- | -------------------------------------------------- | ------------ |
| `media`             | `storageId`, `mimeType`, `eventId` | Write (upload), Read (validation + URL)            | `by_eventId` |
| `events`            | `meta.faviconId`                   | Read (public + dashboard), Write (wholesale patch) | —            |
| `_storage` (system) | blob                               | Write on upload, Read via `getUrl`                 | —            |

The favicon is an ordinary `media` row — it appears on the Media page, can be renamed there, and can
be deleted there with no awareness that `events.meta.faviconId` points at it (DEF-09-01). Removing
the favicon from the Meta page clears only the pointer; the row and blob remain.

## 9. Backend Contract

| Function                           | Type           | Args                                                    | Returns                                  | Guard                                        | Caps               |
| ---------------------------------- | -------------- | ------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- | ------------------ |
| `api.media.generateUploadUrl`      | mutation       | `{eventId}`                                             | upload URL                               | `requireEventEditor(ctx, eventId)`           | —                  |
| `api.media.register`               | mutation       | `{eventId, storageId, name, mimeType, size}`            | `Id<"media">`                            | `requireEventEditor(ctx, eventId)`           | 5 MB, 50/event     |
| `api.meta.updateEventMeta`         | mutation       | `{eventId, title?, description?, imageId?, faviconId?}` | `void`                                   | `requireEventEditor(ctx, eventId, "editor")` | favicon mime check |
| `api.meta.getPublicInvitationMeta` | query (public) | `{eventSlug?, host?, invitationSlug}`                   | includes `faviconUrl`, `faviconMimeType` | none — data-level                            | —                  |

This feature introduces no function of its own; it is a constrained path through EP-09-F01 and
EP-10-F01.

## 10. Business Rules

- **BR-10-F02-01** `[AS-BUILT]` — An acceptable favicon mime is one of `image/x-icon`,
  `image/vnd.microsoft.icon`, `image/svg+xml`, `image/png` (`convex/lib/meta.ts:81`).
- **BR-10-F02-02** `[AS-BUILT]` — When the browser reports an empty mime type and the filename ends
  in `.ico` (case-insensitively), the client resolves the mime to `image/x-icon`
  (`src/components/meta/favicon-upload-button.tsx:16`).
- **BR-10-F02-03** `[AS-BUILT]` — When the browser reports an empty mime type for any other
  extension, the resolved mime is the empty string and the upload is rejected client-side
  (`src/components/meta/favicon-upload-button.tsx:18`).
- **BR-10-F02-04** `[AS-BUILT]` — The resolved mime — not `file.type` — is sent as the blob's
  `Content-Type` and as `register`'s `mimeType` argument
  (`src/components/meta/favicon-upload-button.tsx:52`, `:64`).
- **BR-10-F02-05** `[AS-BUILT]` — A favicon file over 5 MB is rejected client-side before any upload
  (`src/components/meta/favicon-upload-button.tsx:42`).
- **BR-10-F02-06** `[AS-BUILT]` — A favicon upload is an ordinary `media.register` call and is
  therefore subject to every EP-09-F01 rule, including the 50-image cap
  (`src/components/meta/favicon-upload-button.tsx:59`).
- **BR-10-F02-07** `[AS-BUILT]` — `updateEventMeta` rejects a `faviconId` whose stored `mimeType` is
  outside `FAVICON_MIME_TYPES` (`convex/meta.ts:129`).
- **BR-10-F02-08** `[AS-BUILT]` — `updateEventMeta` rejects a `faviconId` whose row belongs to
  another event, checked before the mime check (`convex/meta.ts:122`).
- **BR-10-F02-09** `[AS-BUILT]` — A `faviconId` pointing at a row that no longer exists resolves to
  `null` and no `icons` key is emitted (`convex/meta.ts:28`, `src/lib/invitation-metadata.ts:34`).
- **BR-10-F02-10** `[AS-BUILT]` — The emitted icon entry carries `type` only when
  `faviconMimeType` is non-null (`src/lib/invitation-metadata.ts:40`).
- **BR-10-F02-11** `[AS-BUILT]` — The favicon reaches both public invitation routes, because both
  build their metadata through `buildInvitationMetadata`
  (`src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:17`,
  `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:17`).
- **BR-10-F02-12** `[AS-BUILT]` — Uploading sets the favicon only in local page state; it is
  persisted only when the editor saves the Meta page
  (`src/components/meta/meta-settings.tsx:249`, `:97`).
- **BR-10-F02-13** `[AS-BUILT]` — The "Remove" control renders only when a favicon is set and clears
  the local pointer, leaving the media row intact
  (`src/components/meta/meta-settings.tsx:251`).
- **BR-10-F02-14** `[AS-BUILT]` — The favicon slot offers upload only; there is no way to select an
  image already in the library (`src/components/meta/meta-settings.tsx:246`).

## 11. Acceptance Criteria

- **AC-10-F02-01** — **Given** an editor selects a `.png` **When** the upload completes **Then** the
  40×40 preview shows it and the toast reads "Favicon uploaded".
- **AC-10-F02-02** — **Given** a `.ico` file for which the browser reports `file.type === ""`
  **When** the editor selects it **Then** it is uploaded as `image/x-icon` and accepted.
- **AC-10-F02-03** — **Given** a `.jpg` **When** the editor selects it in the favicon slot **Then**
  the toast reads "Favicon must be an .ico, .svg, or .png file" and no upload occurs.
- **AC-10-F02-04** — **Given** a 6 MB `.png` **When** selected **Then** the toast reads "Favicon must
  be smaller than 5MB".
- **AC-10-F02-05** — **Given** an uploaded favicon **When** the editor navigates away without saving
  **Then** `events.meta.faviconId` is unchanged and the public page shows no custom icon.
- **AC-10-F02-06** — **Given** a saved favicon **When** a guest opens the public invitation on the
  primary domain **Then** the rendered `<link rel="icon">` points at the Convex storage URL and
  carries the stored mime type.
- **AC-10-F02-07** — **Given** a saved favicon **When** the invitation is opened on the event's
  custom domain **Then** the same icon is served.
- **AC-10-F02-08** — **Given** a saved favicon **When** the editor clicks "Remove" and saves **Then**
  the public page emits no `icons` key and the media row still exists in the library.
- **AC-10-F02-09** — **Given** a caller passing a `faviconId` for a `.gif` row **When**
  `updateEventMeta` runs **Then** it throws "Favicon must be an .ico, .svg, or .png file".
- **AC-10-F02-10** — **Given** a `faviconId` belonging to another event **When** `updateEventMeta`
  runs **Then** it throws "Image not found in this event's media library".
- **AC-10-F02-11** — **Given** a saved favicon whose media row is then deleted from the Media page
  **When** the public invitation is requested **Then** no `icons` key is emitted and no error occurs.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------- |
| TC-10-F02-01 | unit        | `resolveMimeType` returns `file.type` when set, `image/x-icon` for an empty-type `.ico`, `""` otherwise |
| TC-10-F02-02 | unit        | `resolveMimeType` is case-insensitive on the `.ICO` extension                                           |
| TC-10-F02-03 | unit        | `FAVICON_MIME_TYPES` contains exactly the four documented types                                         |
| TC-10-F02-04 | unit        | `buildInvitationMetadata` omits `icons` without a favicon URL and omits `type` without a mime           |
| TC-10-F02-05 | integration | `updateEventMeta` rejects a non-favicon mime and a cross-event row                                      |
| TC-10-F02-06 | integration | `getPublicInvitationMeta` returns `faviconUrl` + `faviconMimeType` for a saved favicon                  |
| TC-10-F02-07 | integration | A deleted favicon row yields `faviconUrl: null`                                                         |
| TC-10-F02-08 | e2e         | Upload, save, and assert the `<link rel="icon">` on the public page                                     |
| TC-10-F02-09 | e2e         | Remove, save, and assert the icon link is gone                                                          |

### Manual QA checklist

- [ ] Upload a real multi-resolution `.ico` in Chrome, Safari and Firefox — the extension fallback
      matters in at least one of them.
- [ ] Upload an `.svg` favicon and confirm the tab icon in a browser that supports SVG icons.
- [ ] Upload, do **not** save, reload the page — the favicon slot reverts to the saved value.
- [ ] Check the tab icon on both the primary domain and the custom domain.
- [ ] Check the custom-domain **root** landing page — it does not carry the favicon (TODO-10-06).
- [ ] Delete the favicon's row from the Media page and confirm the public page still renders.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 5 MB, and a favicon consumes one of the event's 50 media slots                                                                                                                                                              |
| Performance      | The icon is served straight from Convex storage; no resizing or multi-size icon set is generated                                                                                                                            |
| Security & authz | `editor` floor on both the upload and the save; the mime is validated on the client, again on the stored row at save time, and the underlying blob content type is validated by `register`. SVG favicons inherit TODO-09-01 |
| Accessibility    | The preview image has `alt="Favicon"` (`src/components/meta/meta-settings.tsx:239`); the tab icon itself is decorative                                                                                                      |
| i18n             | Host-facing copy is English only                                                                                                                                                                                            |
| Analytics        | Persisted as part of the `meta` / `update` activity entry (EP-10-F01, BR-10-F01-18); the upload itself is not logged                                                                                                        |

## 14. TODOs & Open Questions

- **TODO-10-06** `[P2]` `[ADD]` — The favicon does not reach the custom-domain landing page.
  - **Rationale:** The custom-domain root builds its metadata inline and returns only a title and a
    description, never touching `events.meta`
    (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:24`). A guest who opens `https://ana-y-luis.com`
    therefore sees the app-level default icon, while the same domain's `/invitations/{slug}` shows
    the couple's. The catch-all also returns `{}` for unknown paths, so the branded not-found page
    is unbranded in the tab.
  - **Proposed rule:** Resolve `events.meta.faviconId` by host for the landing route and emit the
    same `icons` entry.
- **TODO-10-08** `[P2]` `[ADD]` — An image already in the library cannot be chosen as the favicon.
  - **Rationale:** The slot renders `FaviconUploadButton` only
    (`src/components/meta/meta-settings.tsx:246`), so re-selecting a previously uploaded favicon —
    after clicking "Remove", or when reusing a monogram already uploaded for a block — requires
    uploading the same file again, consuming another of the 50 slots. `MediaPickerDialog` already
    exists and would serve, given the mime filter proposed in TODO-09-06.
  - **Proposed rule:** Offer the picker alongside the uploader, restricted to `FAVICON_MIME_TYPES`.
- **TODO-10-09** `[P2]` `[ADD]` — No apple-touch-icon or multi-size icon set.
  - **Rationale:** `buildInvitationMetadata` emits a single `icons.icon` entry
    (`src/lib/invitation-metadata.ts:36`). A guest who saves the invitation to an iOS home screen —
    a plausible act for a wedding they are attending — gets a screenshot thumbnail rather than the
    couple's icon.
  - **Proposed rule:** Emit `apple` and `shortcut` icon entries from the same media row.

### Open questions

- **Q1** — Should the favicon be validated for square aspect ratio or minimum dimensions? Nothing
  checks either today, and a wide photo renders as an unreadable smear at 16 px.
- **Q2** — Should the favicon default to the social image when unset, rather than to the app icon?

## 15. Traceability

| Concern                       | Source                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| Route                         | `src/app/(dashboard)/dashboard/[eventSlug]/meta/page.tsx:3`        |
| UI — favicon section          | `src/components/meta/meta-settings.tsx:226`                        |
| UI — uploader                 | `src/components/meta/favicon-upload-button.tsx:27`                 |
| UI — mime fallback            | `src/components/meta/favicon-upload-button.tsx:15`                 |
| UI — accept attribute         | `src/components/meta/favicon-upload-button.tsx:81`                 |
| Helpers — favicon mimes       | `convex/lib/meta.ts:81`                                            |
| Backend — upload              | `convex/media.ts:19`                                               |
| Backend — register            | `convex/media.ts:28`                                               |
| Backend — favicon validation  | `convex/meta.ts:129`                                               |
| Backend — public resolution   | `convex/meta.ts:78`                                                |
| Metadata mapper — icons       | `src/lib/invitation-metadata.ts:34`                                |
| Public route — primary domain | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:7`      |
| Public route — custom domain  | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:7` |
| Landing route without favicon | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:9`                  |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
