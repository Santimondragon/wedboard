# EP-09 — Media Library

Every image that appears on a public invitation — the hero photo, the map picture, the dress-code
shot, the special-invitation card art, the social-card image, the browser-tab favicon — comes from
one place: the event's **[Media Library](../../glossary.md#design--publishing)**.

---

## 1. Purpose

The library is a **per-event image catalog**. The binary blobs live in Convex file storage; the
`media` table is the catalog row that gives each blob a name, a mime type, a size and an owning
event (`convex/schema.ts:213`). Nothing else in the product stores an image.

This epic covers three things:

- **Getting an image in** — a three-step upload (`generateUploadUrl` → `POST` the blob →
  `register`), with the mime/size/count validation trio enforced server-side in `register`.
- **Living with the library** — listing every image with a resolved URL, renaming a row inline,
  and deleting a row together with its blob.
- **Consuming an image** — `MediaPickerDialog`, the single reusable "choose one image" surface,
  shared by the Design Studio's `image` config fields (EP-08-F04) and the social-card image
  picker (EP-10-F01).

What the library deliberately is _not_: it has no folders, no tags, no search, no alt text, no
resizing and no image optimization. Images are served straight from Convex storage at whatever
dimensions the host uploaded.

## 2. Actors

| Actor                    | Involvement                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| **Owner**                | Upload, rename, delete, pick                                                                      |
| **Co-owner** (`planner`) | Upload, rename, delete, pick                                                                      |
| **Editor**               | Upload, rename, delete, pick — media is content, gated at the default `editor` floor              |
| **Viewer**               | Blocked from every function in the epic (`requireEventEditor` defaults to `editor`)               |
| **Public guest**         | Never reaches the library; sees only the resolved storage URLs embedded in the invitation payload |
| **Superadmin**           | Bypasses the guard like every other event-scoped function                                         |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
Every function in this epic applies exactly one gate: `requireEventEditor(ctx, eventId)`.

## 3. Features

| ID                                 | Feature      | Status      | Summary                                                                                                         |
| ---------------------------------- | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------- |
| [EP-09-F01](./F01-upload-media.md) | Upload Media | implemented | `generateUploadUrl` → blob `POST` → `register`; mime whitelist, ≤5 MB against real blob metadata, ≤50 per event |
| [EP-09-F02](./F02-manage-media.md) | Manage Media | defective   | `listByEvent` (rows + resolved URL, newest first), inline rename, delete of row **and** blob                    |
| [EP-09-F03](./F03-media-picker.md) | Media Picker | implemented | `MediaPickerDialog` — pick or upload one image; consumed by EP-08-F04 and EP-10-F01                             |

## 4. Workflows

| ID       | Workflow                         | Spec                         |
| -------- | -------------------------------- | ---------------------------- |
| WF-09-01 | Upload an image to the library   | [F01](./F01-upload-media.md) |
| WF-09-02 | Browse and rename library images | [F02](./F02-manage-media.md) |
| WF-09-03 | Delete an image and its blob     | [F02](./F02-manage-media.md) |
| WF-09-04 | Pick an image for a block field  | [F03](./F03-media-picker.md) |

## 5. Dependencies

| Depends on                            | Why                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **EP-01 Account & Access**            | `requireUser` resolves the Clerk identity before any media write                                     |
| **EP-02 Event Setup**                 | Every row is `eventId`-scoped; the F06 delete cascade removes media rows **and** their storage blobs |
| **EP-03 Collaboration & Permissions** | `requireEventEditor` is the only guard in the epic                                                   |

| Depended on by                     | Why                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **EP-08 Invitation Design Studio** | `image` config fields store a `media` id; `getPublicInvitation` resolves them to URLs in `mediaUrls` (`convex/invitations.ts:194`) |
| **EP-10 Sharing & SEO**            | `events.meta.imageId` and `events.meta.faviconId` are `Id<"media">`; the favicon uploader writes into this library                 |
| **EP-07 Guest Experience**         | The public invitation renders the resolved URLs                                                                                    |

## 6. Cross-cutting notes

- **Two-stage trust.** The client tells `register` a mime type and a size, but `register`
  re-reads the actual blob metadata from `ctx.db.system` and enforces the limits against _that_,
  deleting the blob when it fails (`convex/media.ts:50`). The checks in `upload-button.tsx` are a
  UX convenience, not the security boundary.
- **No dangling-reference protection.** Deleting an image does not check whether a layout block
  or `events.meta` still points at it. Both consumers degrade quietly rather than erroring — see
  DEF-09-01 in [F02](./F02-manage-media.md).
- **Cap is also the page size.** `MAX_MEDIA_PER_EVENT` (50) doubles as the `.take()` bound in
  both `register`'s count check and `listByEvent`, so there is no pagination to build.

## 7. Epic-level defects & gaps

Full detail lives in each feature's §14; the index is here.

| ID         | Priority | Where                                                                                                                                         |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-09-01  | P1       | [F02](./F02-manage-media.md) — no reference check before delete; an in-use image silently disappears from the public page and the social card |
| TODO-09-01 | P1       | [F01](./F01-upload-media.md) — SVG upload is accepted and served from storage, a script-injection surface                                     |
| TODO-09-02 | P1       | [F02](./F02-manage-media.md) — no alt text anywhere in the library or the public render                                                       |
| TODO-09-03 | P2       | [F01](./F01-upload-media.md) — no image optimization, resizing or dimension guidance                                                          |
| TODO-09-04 | P2       | [F02](./F02-manage-media.md) — no folders, tags, search or sort control                                                                       |
| TODO-09-05 | P2       | [F01](./F01-upload-media.md) — client whitelist and server whitelist disagree on the `.ico` mime types                                        |
| TODO-09-06 | P2       | [F03](./F03-media-picker.md) — the picker cannot filter by mime type, so any field can be pointed at any image                                |
| TODO-09-07 | P2       | [F01](./F01-upload-media.md) — a blob is orphaned when registration fails on the 50-image cap                                                 |
| TODO-09-08 | P2       | [F01](./F01-upload-media.md) — server rejection reasons are swallowed by a generic upload toast                                               |
| TODO-09-09 | P2       | [F02](./F02-manage-media.md) — no length limit on a media name                                                                                |
| TODO-09-10 | P2       | [F03](./F03-media-picker.md) — the picker renders no loading state                                                                            |
