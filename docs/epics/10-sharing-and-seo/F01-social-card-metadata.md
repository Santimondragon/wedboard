---
id: EP-10-F01
title: Social Card Metadata
epic: EP-10 Sharing & SEO
version: 1.0.0
status: partial
last_updated: 2026-07-28
depends_on: [EP-02-F03, EP-05-F01, EP-09-F03]
---

# EP-10-F01 — Social Card Metadata

## 1. Summary

When a host pastes an invitation link into WhatsApp or iMessage, the messaging app unfurls a preview
card. This feature lets the host control that card: a **title template**, a **description template**
and a **social image**, stored once per event on `events.meta`. The templates are not fixed strings —
they may contain `{variables}` such as `{guest-names}` or `{couple-names}`, which are resolved at
request time against the _specific invitation_ whose URL was shared. One authored template therefore
produces a personally addressed card for every family on the guest list. When the host authors
nothing, the product falls back to defaults built from the same variables, so a card is never empty.

## 2. Actors & Permissions

| Actor                | Access            | Notes                                                                                         |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Owner                | Full              |                                                                                               |
| Co-owner (`planner`) | Full              |                                                                                               |
| Editor               | Full              | Meta is content-adjacent; the guard passes `"editor"` explicitly (`convex/meta.ts:107`)       |
| Viewer               | None              | Blocked by the same guard, and by `media.listByEvent` / `invitations.listByEvent` on the page |
| Public guest         | Read (implicitly) | Receives the resolved card; never sees the templates                                          |
| Link-preview crawler | Read              | Unauthenticated; `getPublicInvitationMeta` has no auth check                                  |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
Public visibility is data-level: the metadata query resolves through `convex/lib/public.ts`, so an
archived event or an inactive invitation returns `null`.

## 3. User Stories

- **US-10-F01-01** — As an Editor, I want to write the title and description that appear when an
  invitation link is shared so that guests recognise the message as ours and not as spam.
- **US-10-F01-02** — As an Editor, I want to insert `{variables}` into that copy so that each family
  sees a card addressed to them without me writing one per invitation.
- **US-10-F01-03** — As an Editor, I want to choose a photo as the preview image so that the card
  carries the wedding's imagery.
- **US-10-F01-04** — As an Editor, I want to see the card before I share it so that I can judge the
  copy at the length platforms actually display.
- **US-10-F01-05** — As an Owner, I want a sensible card even if I never open this page.

## 4. Entry Points

| Entry point                         | Route / control                                                      | Actor           |
| ----------------------------------- | -------------------------------------------------------------------- | --------------- |
| Meta & Sharing page                 | `/dashboard/[eventSlug]/meta`                                        | Editor+         |
| Sidebar link "Meta"                 | `DashboardSidebar`, `minRole: "editor"`                              | Editor+         |
| Public consumption (primary domain) | `generateMetadata` on `/[eventSlug]/invitations/[invitationSlug]`    | Crawler / guest |
| Public consumption (custom domain)  | `generateMetadata` on `/_domain/[host]/invitations/[invitationSlug]` | Crawler / guest |

## 5. UX Flow

### Happy path — authoring

1. The editor opens `/dashboard/[eventSlug]/meta`; the route renders `MetaSettings`
   (`src/app/(dashboard)/dashboard/[eventSlug]/meta/page.tsx:4`).
2. The component reads the event from `useEvent()` and seeds local state from `event.meta`
   (`src/components/meta/meta-settings.tsx:39`), re-seeding whenever the event document changes
   rather than in an effect (`src/components/meta/meta-settings.tsx:53`).
3. It subscribes to `api.media.listByEvent` (to resolve the chosen image and favicon to thumbnails)
   and `api.invitations.listByEvent` (to sample an invitation for the preview)
   (`src/components/meta/meta-settings.tsx:32`).
4. The editor types a title, or clicks a `{variable}` badge to insert the token at the caret when the
   title input is focused, appending it otherwise
   (`src/components/meta/meta-settings.tsx:85`).
5. The editor types a description; the same variables work there, though the badge row only writes
   into the title.
6. The editor clicks "Choose image" → `MediaPickerDialog` (EP-09-F03) → the id is held in local
   state.
7. The right-hand column re-renders the social-card preview live on every keystroke.
8. **Save Changes** calls `meta.updateEventMeta({ eventId, title, description, imageId, faviconId })`
   through `useToastMutation` (`src/components/meta/meta-settings.tsx:97`).
9. The server guards at `editor`, trims, enforces the length caps, verifies that each supplied media
   id belongs to this event's library, verifies the favicon's mime, **replaces** `events.meta`
   wholesale and writes an activity entry of entity `meta`, action `update`
   (`convex/meta.ts:106`–`convex/meta.ts:149`).
10. Toast "Sharing settings saved"; `useEvent()` re-renders and the form re-seeds from the saved
    document.

### Happy path — a guest receives the link

1. The host copies the public invitation URL (EP-05) and pastes it into a chat.
2. The platform's crawler requests the page; Next.js runs `generateMetadata`, which calls
   `fetchQuery(api.meta.getPublicInvitationMeta, { eventSlug, invitationSlug })`
   (`src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:13`) — or `{ host, invitationSlug }`
   on a custom domain (`src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:13`).
3. The query resolves the event (by slug or by host) and the invitation through `convex/lib/public.ts`,
   loads up to 50 of the invitation's guests, drops `isPlusOne` records, and builds the variable
   values (`convex/meta.ts:60`).
4. It resolves the templates — the authored ones, or the defaults when unset — and resolves the OG
   image and favicon ids to storage URLs (`convex/meta.ts:76`).
5. `buildInvitationMetadata` maps the result to a Next.js `Metadata`: `title`, `description`,
   `openGraph` (`type: "website"`, plus `images` when an image exists) and `twitter`
   (`summary_large_image` when an image exists, else `summary`), plus `icons` when a favicon exists
   (`src/lib/invitation-metadata.ts:19`).
6. The crawler reads the rendered tags and draws the card.

### Alternate & edge paths

- **A1** — No authored title/description → `DEFAULT_META_TITLE` and `DEFAULT_META_DESCRIPTION` are
  resolved instead, so the card still names the couple (`convex/meta.ts:83`).
- **A2** — No OG image → `imageUrl` is `null`, no `og:image` is emitted and the Twitter card
  degrades to `summary` (`src/lib/invitation-metadata.ts:29`).
- **A3** — The invitation has no non-`isPlusOne` guests → `{guest-name}` falls back to the invitation
  title and `{guest-names}` likewise (`convex/lib/meta.ts:55`).
- **A4** — The event has no `brideName`/`groomName` → `{couple-names}` falls back to the event name;
  `{bride-name}` and `{groom-name}` resolve to empty strings (`convex/lib/meta.ts:52`).
- **A5** — The template contains an unrecognised token such as `{venue}` → it is left in the output
  verbatim (`convex/lib/meta.ts:37`).
- **A6** — A previously chosen image is deleted from the library → `resolveMediaUrl` returns `null`
  and the card silently loses its image (`convex/meta.ts:28`; see DEF-09-01).
- **E1** — The event is archived, the invitation is inactive, or either slug is unknown →
  `getPublicInvitationMeta` returns `null` and `buildInvitationMetadata` emits only
  `title: "Invitation Not Found"` (`src/lib/invitation-metadata.ts:16`).
- **E2** — The Convex request throws → `.catch(() => null)` in `generateMetadata` produces the same
  not-found metadata rather than failing the render.
- **E3** — Neither `eventSlug` nor `host` is supplied → the query returns `null`
  (`convex/meta.ts:46`).
- **E4** — A supplied `imageId`/`faviconId` belongs to another event → `updateEventMeta` throws
  "Image not found in this event's media library".
- **E5** — Title over 120 or description over 300 characters reaching the server → `ConvexError`
  naming the cap. The inputs carry matching `maxLength` attributes, so this is only reachable
  outside the UI.

## 6. States

| State             | Behavior                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `media` and `invitations` are `undefined`: thumbnails render their placeholder icon and the preview uses the sample invitation "The Smith Family" |
| Empty             | No authored meta: inputs are empty and show the defaults as `placeholder`; the preview resolves the defaults                                      |
| Error             | Save failure → toast "Failed to save sharing settings"; public failure → not-found metadata                                                       |
| Success           | Toast "Sharing settings saved"; the form re-seeds from the saved event                                                                            |
| Disabled / locked | Save button disabled and reading "Saving…" while pending; the route is unreachable for a viewer                                                   |
| Mobile            | Single column (`grid-cols-1`), preview stacked under the form; two columns at `lg`                                                                |

## 7. UI Specification

### Screens & components

| Element           | Component                         | Path                                                        |
| ----------------- | --------------------------------- | ----------------------------------------------------------- |
| Route             | `MetaPage`                        | `src/app/(dashboard)/dashboard/[eventSlug]/meta/page.tsx:3` |
| Whole page        | `MetaSettings`                    | `src/components/meta/meta-settings.tsx:28`                  |
| Variable badges   | `Badge` inside a `button` row     | `src/components/meta/meta-settings.tsx:136`                 |
| Image picker      | `MediaPickerDialog` (EP-09-F03)   | `src/components/meta/meta-settings.tsx:215`                 |
| Favicon uploader  | `FaviconUploadButton` (EP-10-F02) | `src/components/meta/meta-settings.tsx:247`                 |
| Live preview card | inline markup                     | `src/components/meta/meta-settings.tsx:269`                 |
| Metadata mapper   | `buildInvitationMetadata`         | `src/lib/invitation-metadata.ts:15`                         |

### Fields & validation

| Field        | Type              | Required | Rule                                                                              | Message                                                                                         |
| ------------ | ----------------- | -------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Title        | text              | No       | `maxLength={120}` client-side; server rejects `> META_TITLE_MAX` after trim       | "Title must be at most 120 characters"                                                          |
| Description  | textarea (3 rows) | No       | `maxLength={300}` client-side; server rejects `> META_DESCRIPTION_MAX` after trim | "Description must be at most 300 characters"                                                    |
| Social image | media id          | No       | Must be a `media` row of this event                                               | "Image not found in this event's media library"                                                 |
| Favicon      | media id          | No       | Must be a `media` row of this event **and** an allowed favicon mime               | "Image not found in this event's media library" / "Favicon must be an .ico, .svg, or .png file" |

An empty string is normalised to `undefined` on both sides (`title || undefined` in the component
and `title || undefined` in the mutation), so a cleared field means "use the default", never "an
empty card". No Zod schema participates.

### Meta variables

Enumerated exactly as `META_VARIABLES` (`convex/lib/meta.ts:15`):

| Token                | Badge tooltip                               | Resolves to                                    | Fallback             |
| -------------------- | ------------------------------------------- | ---------------------------------------------- | -------------------- |
| `{invitation-title}` | `Invitation title, e.g. "The Smith Family"` | `invitation.title`                             | —                    |
| `{guest-name}`       | `First guest's full name`                   | First non-`isPlusOne` guest, `"First Last"`    | The invitation title |
| `{guest-names}`      | `All guest names on the invitation`         | All non-`isPlusOne` guests as `"A, B & C"`     | The invitation title |
| `{event-name}`       | `Event name`                                | `event.name`                                   | —                    |
| `{bride-name}`       | `Bride's name`                              | `event.brideName`                              | `""`                 |
| `{groom-name}`       | `Groom's name`                              | `event.groomName`                              | `""`                 |
| `{couple-names}`     | `Both names, e.g. "Ava & Liam"`             | `"{bride} & {groom}"`, dropping a missing half | `event.name`         |

Defaults (`convex/lib/meta.ts:70`):

| Default                    | Value                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| `DEFAULT_META_TITLE`       | `Invitation for {invitation-title} — {couple-names}`                              |
| `DEFAULT_META_DESCRIPTION` | `You're invited to the wedding of {couple-names}. Open your invitation and RSVP.` |

### Copy deck

The card copy itself is authored by the host, so it has no fixed value. The defaults are English and
guest-visible; the host-facing chrome is English throughout.

| Key                   | Copy                                                                                                                                                                                                   | Source                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Page title            | "Meta & Sharing"                                                                                                                                                                                       | `src/components/meta/meta-settings.tsx:112` |
| Page intro            | "Controls how your public invitation links look when shared on WhatsApp, iMessage, and social networks, plus the browser-tab icon. Leave a field empty to use the default built from your event data." | `src/components/meta/meta-settings.tsx:115` |
| Title hint            | "{n}/120 · Click a variable to insert it:"                                                                                                                                                             | `src/components/meta/meta-settings.tsx:133` |
| Description hint      | "{n}/300 · The same variables work here."                                                                                                                                                              | `src/components/meta/meta-settings.tsx:166` |
| Social image heading  | "Social Image"                                                                                                                                                                                         | `src/components/meta/meta-settings.tsx:177` |
| Social image help     | "Shown as the large preview image when the link is shared. Recommended 1200×630."                                                                                                                      | `src/components/meta/meta-settings.tsx:180` |
| Preview heading       | "Social card preview"                                                                                                                                                                                  | `src/components/meta/meta-settings.tsx:271` |
| Preview no-image      | "No image selected" / "Platforms may pick a random image from the page"                                                                                                                                | `src/components/meta/meta-settings.tsx:283` |
| Preview footnote      | "Preview uses your invitation "{title}" / a sample invitation. Guest-name variables resolve per invitation on the real page."                                                                          | `src/components/meta/meta-settings.tsx:301` |
| Save button           | "Save Changes" / "Saving…"                                                                                                                                                                             | `src/components/meta/meta-settings.tsx:265` |
| Save toasts           | "Sharing settings saved" / "Failed to save sharing settings"                                                                                                                                           | `src/components/meta/meta-settings.tsx:35`  |
| Public fallback title | "Invitation Not Found"                                                                                                                                                                                 | `src/lib/invitation-metadata.ts:17`         |

### Live preview

The preview is a 1200×630-ratio image slot above the resolved title, the resolved description
(clamped to two lines) and a synthetic URL. The URL is built from `event.customDomain` when present,
otherwise `NEXT_PUBLIC_PRIMARY_DOMAIN` (falling back to the literal `wedboard.app`) plus the event
slug, and ends with the sampled invitation's slug or `the-smith-family`
(`src/components/meta/meta-settings.tsx:81`). Variables are resolved with
`guestNames: []` — deliberately, and disclosed in the footnote — so `{guest-name}` and
`{guest-names}` show the invitation title in the preview and real names on the live card.

## 8. Data Model

| Table          | Fields                                              | Read / Write                                          | Index                                                    |
| -------------- | --------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `events`       | `meta {title?, description?, imageId?, faviconId?}` | Read (public + dashboard), Write (`patch`, wholesale) | `by_slug` / `by_customDomain` via `convex/lib/public.ts` |
| `events`       | `name`, `brideName`, `groomName`                    | Read — variable values and defaults                   | —                                                        |
| `invitations`  | `title`, `slug`, `isActive`                         | Read                                                  | `by_eventId_and_slug`                                    |
| `guests`       | `firstName`, `lastName`, `isPlusOne`                | Read, `.take(50)`                                     | `by_invitationId`                                        |
| `media`        | `storageId`, `mimeType`, `eventId`                  | Read (URL resolution, ownership check)                | —                                                        |
| `activityLogs` | entity `meta`, action `update`                      | Write                                                 | `by_eventId`                                             |

**Wholesale replacement.** `updateEventMeta` patches `meta` with a freshly built object containing
all four keys (`convex/meta.ts:136`). Any key absent from the arguments becomes `undefined` in the
stored object — there is no field-level merge. The UI always sends all four, so this is invisible
in-app, but it makes the mutation unusable as a partial update.

## 9. Backend Contract

| Function                           | Type           | Args                                                                                              | Returns                                                                                                           | Guard                                               | Caps                       |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- |
| `api.meta.getPublicInvitationMeta` | query (public) | `{eventSlug?: string, host?: string, invitationSlug: string}`                                     | `{title, description, imageUrl: string\|null, faviconUrl: string\|null, faviconMimeType: string\|null}` or `null` | none — data-level gating via `convex/lib/public.ts` | guests `.take(50)`         |
| `api.meta.updateEventMeta`         | mutation       | `{eventId, title?: string, description?: string, imageId?: Id<"media">, faviconId?: Id<"media">}` | `void`                                                                                                            | `requireEventEditor(ctx, eventId, "editor")`        | title 120, description 300 |
| `api.media.listByEvent`            | query          | `{eventId}`                                                                                       | media rows + URL                                                                                                  | `requireEventEditor`                                | 50                         |
| `api.invitations.listByEvent`      | query          | `{eventId}`                                                                                       | invitations                                                                                                       | auth (EP-05)                                        | —                          |

Pure helpers (no Convex imports, shared with the client through the `convex/*` alias):
`META_VARIABLES`, `resolveMetaTemplate`, `buildMetaVariables`, `DEFAULT_META_TITLE`,
`DEFAULT_META_DESCRIPTION`, `META_TITLE_MAX`, `META_DESCRIPTION_MAX`, `FAVICON_MIME_TYPES`
(`convex/lib/meta.ts`).

## 10. Business Rules

- **BR-10-F01-01** `[AS-BUILT]` — Only a member with role `editor` or above may write `events.meta`
  (`convex/meta.ts:107`).
- **BR-10-F01-02** `[AS-BUILT]` — `getPublicInvitationMeta` requires no authentication and resolves
  the event by `eventSlug` when given, otherwise by `host`, otherwise returns `null`
  (`convex/meta.ts:46`).
- **BR-10-F01-03** `[AS-BUILT]` — The query returns `null` when the event does not publicly resolve
  (archived) or the invitation is not active, via `convex/lib/public.ts` (`convex/meta.ts:51`, `:58`).
- **BR-10-F01-04** `[AS-BUILT]` — Variable values are built from at most 50 of the invitation's
  guests, excluding `isPlusOne` records (`convex/meta.ts:63`).
- **BR-10-F01-05** `[AS-BUILT]` — `resolveMetaTemplate` replaces every `{token}` matching
  `[a-z-]+` that is a known variable, leaves unknown tokens intact, collapses runs of whitespace and
  trims the result (`convex/lib/meta.ts:36`).
- **BR-10-F01-06** `[AS-BUILT]` — The known variables are exactly `invitation-title`, `guest-name`,
  `guest-names`, `event-name`, `bride-name`, `groom-name`, `couple-names` (`convex/lib/meta.ts:15`).
- **BR-10-F01-07** `[AS-BUILT]` — `{guest-name}` is the first non-`isPlusOne` guest's full name, or
  the invitation title when there is none (`convex/lib/meta.ts:55`).
- **BR-10-F01-08** `[AS-BUILT]` — `{guest-names}` joins all names with commas and an ampersand before
  the last, or falls back to the invitation title (`convex/lib/meta.ts:56`, `:64`).
- **BR-10-F01-09** `[AS-BUILT]` — `{couple-names}` joins the present names with `" & "` and falls
  back to the event name when both are absent (`convex/lib/meta.ts:52`, `:60`).
- **BR-10-F01-10** `[AS-BUILT]` — An unset or empty stored title/description resolves
  `DEFAULT_META_TITLE` / `DEFAULT_META_DESCRIPTION` instead (`convex/meta.ts:83`, `:87`).
- **BR-10-F01-11** `[AS-BUILT]` — `imageId` and `faviconId` resolve to a URL only when the row exists
  **and** belongs to the same event; otherwise the field is `null` (`convex/meta.ts:28`).
- **BR-10-F01-12** `[AS-BUILT]` — `updateEventMeta` trims the title and description before
  validating and storing (`convex/meta.ts:109`).
- **BR-10-F01-13** `[AS-BUILT]` — A title longer than 120 characters after trimming is rejected
  (`convex/meta.ts:111`).
- **BR-10-F01-14** `[AS-BUILT]` — A description longer than 300 characters after trimming is rejected
  (`convex/meta.ts:116`).
- **BR-10-F01-15** `[AS-BUILT]` — A supplied `imageId` or `faviconId` that does not exist, or belongs
  to another event, is rejected (`convex/meta.ts:122`).
- **BR-10-F01-16** `[AS-BUILT]` — `updateEventMeta` replaces `events.meta` wholesale; an omitted
  argument stores `undefined` for that key (`convex/meta.ts:136`).
- **BR-10-F01-17** `[AS-BUILT]` — An empty-string title or description is stored as `undefined`, not
  as an empty value (`convex/meta.ts:138`).
- **BR-10-F01-18** `[AS-BUILT]` — A successful save writes an `activityLogs` row with
  `entity: "meta"`, `action: "update"` and no `entityName` (`convex/meta.ts:144`).
- **BR-10-F01-19** `[AS-BUILT]` — When `getPublicInvitationMeta` returns `null`, the page's metadata
  is exactly `{ title: "Invitation Not Found" }` (`src/lib/invitation-metadata.ts:16`).
- **BR-10-F01-20** `[AS-BUILT]` — Resolved metadata emits `title`, `description`, an `openGraph`
  object of `type: "website"` with the same title/description, and a `twitter` object
  (`src/lib/invitation-metadata.ts:19`).
- **BR-10-F01-21** `[AS-BUILT]` — `og:image` and `twitter:image` are emitted only when an image URL
  resolved (`src/lib/invitation-metadata.ts:26`, `:32`).
- **BR-10-F01-22** `[AS-BUILT]` — The Twitter card type is `summary_large_image` with an image and
  `summary` without (`src/lib/invitation-metadata.ts:29`).
- **BR-10-F01-23** `[AS-BUILT]` — Both public routes catch metadata-fetch failures and fall through
  to the not-found metadata rather than erroring
  (`src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:16`).
- **BR-10-F01-24** `[AS-BUILT]` — The custom-domain route decodes the `host` route parameter before
  querying (`src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:14`).
- **BR-10-F01-25** `[AS-BUILT]` — The in-app preview resolves the templates with an empty guest-name
  list and with the event's **first** invitation as the sample, or a hardcoded "The Smith Family"
  when the event has none (`src/components/meta/meta-settings.tsx:65`).
- **BR-10-F01-26** `[AS-BUILT]` — Clicking a variable badge inserts the token at the caret when the
  title input holds focus, and appends it to the title otherwise
  (`src/components/meta/meta-settings.tsx:87`).

## 11. Acceptance Criteria

- **AC-10-F01-01** — **Given** a viewer **When** `meta.updateEventMeta` is called **Then** it throws
  `Insufficient permissions` and `events.meta` is unchanged.
- **AC-10-F01-02** — **Given** an event with no `meta` **When** a crawler fetches an active
  invitation URL **Then** the title reads `Invitation for {invitation title} — {couple names}` with
  both tokens resolved.
- **AC-10-F01-03** — **Given** the title template `Boda de {couple-names}` and an event with
  `brideName: "Ana"`, `groomName: "Luis"` **When** any invitation URL is fetched **Then** the title
  is `Boda de Ana & Luis`.
- **AC-10-F01-04** — **Given** the title template `Hola {guest-names}` and an invitation with guests
  Ana Pérez, Luis Pérez and Sofía Pérez **When** that invitation's URL is fetched **Then** the title
  is `Hola Ana Pérez, Luis Pérez & Sofía Pérez`.
- **AC-10-F01-05** — **Given** an invitation whose only other guest is a `+1` record **When** the
  card resolves **Then** the `+1` name is absent from `{guest-names}`.
- **AC-10-F01-06** — **Given** the template `Nos casamos en {venue}` **When** the card resolves
  **Then** the output still contains the literal `{venue}`.
- **AC-10-F01-07** — **Given** a chosen social image **When** the card resolves **Then**
  `openGraph.images[0].url` is a Convex storage URL and `twitter.card` is `summary_large_image`.
- **AC-10-F01-08** — **Given** no social image **When** the card resolves **Then** no `og:image` tag
  is emitted and `twitter.card` is `summary`.
- **AC-10-F01-09** — **Given** an archived event **When** any of its invitation URLs is fetched
  **Then** the metadata is exactly `{ title: "Invitation Not Found" }`.
- **AC-10-F01-10** — **Given** an inactive invitation **When** its URL is fetched **Then** the same
  not-found metadata is returned.
- **AC-10-F01-11** — **Given** an event with a connected custom domain **When** the invitation is
  fetched at `https://{customDomain}/invitations/{slug}` **Then** the resolved card is identical to
  the one served on the primary domain.
- **AC-10-F01-12** — **Given** an editor submits a 130-character title **When** `updateEventMeta`
  runs **Then** it throws "Title must be at most 120 characters".
- **AC-10-F01-13** — **Given** an editor submits an `imageId` belonging to another event **When**
  `updateEventMeta` runs **Then** it throws "Image not found in this event's media library".
- **AC-10-F01-14** — **Given** an editor clears the title field and saves **When** the card resolves
  **Then** the default title is used, not an empty title.
- **AC-10-F01-15** — **Given** a successful save **When** the Activity page is opened **Then** a
  `meta` / `update` entry naming the actor appears.
- **AC-10-F01-16** — **Given** the editor types in the title field **When** each keystroke lands
  **Then** the preview card's title updates without a save.
- **AC-10-F01-17** — **Given** the title input is focused with the caret mid-string **When** the
  editor clicks the `{event-name}` badge **Then** the token is inserted at the caret.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                              |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| TC-10-F01-01 | unit        | `resolveMetaTemplate` replaces every known token and preserves unknown ones                                                           |
| TC-10-F01-02 | unit        | `resolveMetaTemplate` collapses whitespace and trims                                                                                  |
| TC-10-F01-03 | unit        | `buildMetaVariables` fallbacks: no guests, no bride/groom, one guest, three guests                                                    |
| TC-10-F01-04 | unit        | `formatNameList` output for 0, 1, 2 and 3 names                                                                                       |
| TC-10-F01-05 | unit        | `buildInvitationMetadata` emits `summary` without an image and `summary_large_image` with one                                         |
| TC-10-F01-06 | unit        | `buildInvitationMetadata(null)` returns only the not-found title                                                                      |
| TC-10-F01-07 | integration | `getPublicInvitationMeta` returns `null` for archived events, inactive invitations, and when neither `eventSlug` nor `host` is passed |
| TC-10-F01-08 | integration | `getPublicInvitationMeta` excludes `isPlusOne` guests from the variables                                                              |
| TC-10-F01-09 | integration | `getPublicInvitationMeta` by `host` equals the result by `eventSlug`                                                                  |
| TC-10-F01-10 | integration | `updateEventMeta` enforces both length caps and both media-ownership checks                                                           |
| TC-10-F01-11 | integration | `updateEventMeta` called with only a title clears `imageId` (documents TODO-10-05)                                                    |
| TC-10-F01-12 | integration | `updateEventMeta` writes an activity row and throws for a viewer                                                                      |
| TC-10-F01-13 | e2e         | Save a template, request the invitation page, and assert the rendered `<meta property="og:title">`                                    |
| TC-10-F01-14 | e2e         | Delete the chosen social image, re-request the page, and assert no `og:image` (covers DEF-09-01)                                      |

### Manual QA checklist

- [ ] Paste an invitation link into WhatsApp, iMessage and a Slack channel; compare all three against
      the in-app preview.
- [ ] Two invitations on the same event produce two differently addressed cards.
- [ ] Clear both text fields, save, and confirm the defaults come back.
- [ ] Insert every one of the seven badges and verify each resolves on the live card.
- [ ] Confirm the same card on the custom domain.
- [ ] Confirm an archived event's link previews as "Invitation Not Found".

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | Title 120, description 300 (`convex/lib/meta.ts:77`); guests `.take(50)` per invitation                                                                                                                 |
| Performance      | One `fetchQuery` per crawler request; image and favicon URLs resolved in parallel (`convex/meta.ts:76`). No caching directive is set on the metadata query                                              |
| Security & authz | Write is `editor`+; the read is fully public by design. The resolved card **contains guest names when the host uses those variables** — see TODO-10-02                                                  |
| Accessibility    | Preview images use decorative alt text; the variable badges are real buttons that suppress `mousedown` so the input keeps focus (`src/components/meta/meta-settings.tsx:141`)                           |
| i18n             | Host-facing chrome and both defaults are English, while the invitation templates themselves are Spanish (EP-08). A host who never opens this page gets an English card in front of a Spanish invitation |
| Analytics        | Saves are activity-logged; card impressions are not measurable                                                                                                                                          |

## 14. TODOs & Open Questions

- **TODO-10-01** `[P1]` `[ADD]` — There is no `robots` directive anywhere in the application, so
  public invitation pages are fully indexable.
  - **Rationale:** A repository-wide search finds no `robots.ts`, no `robots.txt`, no `noindex`
    string and no `metadata.robots` key: `buildInvitationMetadata` emits only title, description,
    `openGraph`, `twitter` and `icons` (`src/lib/invitation-metadata.ts:19`), the root layout sets
    only a static title (`src/app/layout.tsx:38`), and `public/` contains no robots file. The
    default is therefore "index, follow". Invitation URLs are semi-private — the roles document
    states plainly that knowledge of the URL is the only credential a public guest holds
    (`docs/roles-and-permissions.md:143`) — and the pages they lead to display guest full names, the
    venue address, the event date and, on the `declined` layout, a message form. Indexed, these
    become searchable by a guest's name. Nothing about the current design distinguishes an
    invitation the host wants findable from one they do not.
  - **Proposed rule:** Emit `robots: { index: false, follow: false }` from `buildInvitationMetadata`
    for every public invitation page, and add an app-level `robots.ts` disallowing `/*/invitations/`
    and the custom-domain rewrite target. If discoverability is ever wanted, make it an explicit
    per-event opt-in on this page rather than the default.
- **TODO-10-02** `[P1]` `[CHANGE]` — `{guest-name}` and `{guest-names}` place real guest names in a
  preview card rendered by every recipient of the link, not only the intended one.
  - **Rationale:** The variables resolve from the invitation's guests
    (`convex/meta.ts:64`) and land in `og:title` / `og:description`
    (`src/lib/invitation-metadata.ts:20`). Invitation links are routinely forwarded — a family
    member pastes it into a wider group chat, or a guest posts it to a story — and the card
    renders for everyone who sees the message, without anyone opening the link. There is no
    per-recipient token in the URL and no auth, so this is unavoidable once the variable is used.
    The names are low-sensitivity, but the leak is silent: nothing on the Meta page warns that a
    forwarded link exposes them, and the in-app preview specifically does _not_ show real names
    (`src/components/meta/meta-settings.tsx:71`), so the host authoring the template never sees the
    behavior they are enabling.
  - **Proposed rule:** Label the two guest badges as personal-data variables in the UI with an
    explicit "visible to anyone the link is forwarded to" warning, and make the preview render the
    sampled invitation's real guest names so the consequence is visible at authoring time.
- **TODO-10-03** `[P2]` `[CHANGE]` — The preview can differ materially from the real card.
  - **Rationale:** Three divergences: guest variables resolve to the invitation title rather than to
    names (`src/components/meta/meta-settings.tsx:71`); the preview always samples
    `invitations[0]` so the host sees one invitation's card and ships many; and the preview clamps
    the description to two CSS lines, which is not how any platform truncates. The footnote
    discloses only the first (`src/components/meta/meta-settings.tsx:305`).
  - **Proposed rule:** Resolve the preview through the sampled invitation's real guests, and let the
    host switch which invitation is sampled.
- **TODO-10-04** `[P2]` `[ADD]` — No `og:url`, no canonical link and no OG image dimensions.
  - **Rationale:** `buildInvitationMetadata` emits an image URL with no `width`/`height`
    (`src/lib/invitation-metadata.ts:26`), so crawlers must fetch and measure it; several defer or
    drop the image when they cannot. There is also no `og:url` or canonical, which matters
    specifically because the same invitation is reachable at two URLs — the primary domain and the
    custom domain (EP-02-F08).
  - **Proposed rule:** Emit `og:url` and a canonical pointing at the custom domain when connected,
    and store or measure image dimensions at registration (EP-09-F01) so they can be emitted.
- **TODO-10-05** `[P2]` `[CHANGE]` — `updateEventMeta` replaces `events.meta` wholesale.
  - **Rationale:** The patch builds a complete object from the arguments (`convex/meta.ts:136`), so
    calling it with only `{eventId, title}` silently clears the description, the social image and
    the favicon. The current UI always sends all four fields, so nothing breaks today — but the
    contract is a trap for any future partial caller, and it makes the mutation non-idempotent under
    concurrent edits by two editors on different fields.
  - **Proposed rule:** Merge against the stored `meta`, or accept an explicit `clear` list, so an
    omitted argument means "leave unchanged".
- **TODO-10-07** `[P2]` `[ADD]` — The social card exists only at the invitation level.
  - **Rationale:** The custom-domain root builds its own metadata inline — a title of the couple
    names and a hardcoded Spanish description `Nuestra boda — {couple}` — with no image, no favicon
    and no use of `events.meta`
    (`src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:24`). There is no page at all at
    `/[eventSlug]` on the primary domain. A host who shares their domain root rather than a specific
    invitation gets a bare card despite having configured one.
  - **Proposed rule:** Resolve `events.meta` for the landing page too, with the invitation-specific
    variables falling back to event-level values.

### Open questions

- **Q1** — Should public invitation pages be indexable at all? The product has never made this
  decision explicitly; today it is inherited from the framework default (TODO-10-01).
- **Q2** — Should the defaults be Spanish, to match the invitation templates?
- **Q3** — Should the card copy be authorable per invitation, rather than per event with variables?
  Variables cover addressing but not tone (a card for the bride's grandmother versus one for
  university friends).

## 15. Traceability

| Concern                             | Source                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| Route — dashboard                   | `src/app/(dashboard)/dashboard/[eventSlug]/meta/page.tsx:3`        |
| UI — page                           | `src/components/meta/meta-settings.tsx:28`                         |
| UI — variable insertion             | `src/components/meta/meta-settings.tsx:85`                         |
| UI — save                           | `src/components/meta/meta-settings.tsx:97`                         |
| UI — live preview                   | `src/components/meta/meta-settings.tsx:269`                        |
| Backend — public query              | `convex/meta.ts:39`                                                |
| Backend — media URL resolution      | `convex/meta.ts:21`                                                |
| Backend — update mutation           | `convex/meta.ts:98`                                                |
| Helpers — variables & defaults      | `convex/lib/meta.ts:15`                                            |
| Helpers — template resolution       | `convex/lib/meta.ts:32`                                            |
| Helpers — caps                      | `convex/lib/meta.ts:77`                                            |
| Metadata mapper                     | `src/lib/invitation-metadata.ts:15`                                |
| Route — public primary domain       | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx:7`      |
| Route — public custom domain        | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx:7` |
| Route — custom-domain root metadata | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx:9`                  |
| Public resolution helpers           | `convex/lib/public.ts`                                             |
| Guard                               | `convex/lib/permissions.ts:50`                                     |
| Activity logging                    | `convex/lib/activity.ts`                                           |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
