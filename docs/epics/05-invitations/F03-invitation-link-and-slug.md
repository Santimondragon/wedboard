---
id: EP-05-F03
title: Invitation Link & Slug
epic: EP-05 Invitations
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-05-F01, EP-02-F04, EP-02-F08, EP-02-F09]
---

# EP-05-F03 — Invitation Link & Slug

## 1. Summary

The invitation's slug is the only part of the product a guest ever types or clicks. It turns a
household record into a shareable URL, and because there is no email or messaging capability in
Wedboard, that URL **is** the delivery mechanism: the host copies it and sends it through
WhatsApp, a printed card, or anything else. This feature covers the two URL shapes (primary
domain versus the event's own custom domain), the copy-link control that picks between them, and
`regenerateSlug`, which mints a fresh slug from the invitation title.

This is workflow **WF-05-03 — Copy and share an invitation link**.

## 2. Actors & Permissions

| Actor                | Access           | Notes                                                                                                         |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Owner                | Full             |                                                                                                               |
| Co-owner (`planner`) | Full             |                                                                                                               |
| Editor               | Full             | Copying a link and regenerating a slug are content operations                                                 |
| Viewer               | None             | Cannot list invitations, so cannot reach the copy control                                                     |
| Public guest         | Consumes the URL | Knowledge of the URL is their only credential ([roles-and-permissions.md §6](../../roles-and-permissions.md)) |

Gate on `regenerateSlug`: `requireEventEditor(ctx, invitation.eventId)`
(`convex/invitations.ts:539`). Copying a link is a pure client operation and hits no backend.

## 3. User Stories

- **US-05-F03-01** — As an Editor, I want to copy an invitation's public link in one click so that
  I can paste it into a message.
- **US-05-F03-02** — As an Owner with a custom domain, I want the copied link to use my own domain
  so that guests never see the platform's URL.
- **US-05-F03-03** — As an Editor, I want a readable slug derived from the household name so that
  the link looks intentional.
- **US-05-F03-04** — As an Editor, I want to mint a new slug when a link leaked or was mistyped so
  that I can re-issue it.

## 4. Entry Points

| Entry point                         | Route / control                                                                                                                                                      | Actor        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| "Copy Link" button per row          | `/dashboard/[eventSlug]/invitations` (`src/components/invitations/invitation-list.tsx:177`)                                                                          | Editor+      |
| Slug field + regenerate icon button | Create/edit dialog (`src/components/invitations/invitation-form.tsx:327`, `:333`)                                                                                    | Editor+      |
| The public URL itself               | `/[eventSlug]/invitations/[invitationSlug]` (`src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx`)                                                            | Public guest |
| The custom-domain public URL        | `/{customDomain}/invitations/{slug}`, rewritten to `/_domain/[host]/invitations/[invitationSlug]` (`src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx`) | Public guest |

## 5. UX Flow

### URL shapes

| Context        | URL                                                        | Resolution                                                                                        |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Primary domain | `{origin}/{event-key}/invitations/{invitation-slug}`       | `api.invitations.getPublicInvitation({eventSlug, invitationSlug})` (`convex/invitations.ts:245`)  |
| Custom domain  | `{protocol}//{customDomain}/invitations/{invitation-slug}` | `api.invitations.getPublicInvitationByHost({host, invitationSlug})` (`convex/invitations.ts:258`) |

On a custom domain the [Event Key](../../glossary.md) never appears in the path — middleware
rewrites the host to `/_domain/{host}{path}`, and the event is resolved from the host itself
(`convex/lib/public.ts:30`). Both shapes resolve the invitation with the same per-event slug probe
`by_eventId_and_slug` and both refuse an inactive invitation
(`convex/lib/public.ts:56`, `:61`).

### Happy path — copy

1. The Editor presses "Copy Link" on an invitation row.
2. `CopyInvitationLinkButton` builds the URL: when a `customDomain` prop is present it uses
   `${window.location.protocol}//${customDomain}/invitations/${slug}`; otherwise
   `${window.location.origin}/${eventSlug}/invitations/${slug}`
   (`src/components/invitations/copy-invitation-link-button.tsx:21`–`:23`).
3. `navigator.clipboard.writeText(url)` runs; the button swaps to a green check and the label
   `"Copied"` for 2000 ms (`copy-invitation-link-button.tsx:24`–`:26`).

The `customDomain` prop is supplied by the page **only when the domain is verified**:
`customDomain={event.customDomainVerified ? event.customDomain : undefined}`
(`src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:60`). Public routing itself never
gates on verification ([roles-and-permissions.md §6](../../roles-and-permissions.md)) — the
verification check here only prevents the host from circulating a link whose DNS is not live yet.

### Happy path — slug authoring

1. **Create mode:** every keystroke in Title rewrites Slug via the client `slugify`
   (`invitation-form.tsx:198`, helper `:31`). The Editor may overwrite it manually.
2. **Edit mode:** the slug field is seeded from the stored slug and is _not_ re-derived from the
   title (`invitation-form.tsx:183`).
3. On save the server re-slugifies whatever string arrived and re-uniquifies it within the event,
   excluding the invitation itself (`convex/invitations.ts:357`–`:365`).

### Regenerate

- **Create mode:** the refresh button is purely local — it sets the field to
  `slugify(title) + "-" + <4 random base-36 chars>` (`invitation-form.tsx:211`). Nothing is
  written until Create.
- **Edit mode:** the refresh button calls `api.invitations.regenerateSlug({id})`, which
  **immediately patches the stored slug** to a fresh unique slug derived from the invitation's
  _stored title_ and returns it; the returned value is then written into the form field
  (`invitation-form.tsx:206`, `convex/invitations.ts:534`–`:551`). See DEF-05-01.

### Alternate & edge paths

- **A1** — Regenerating in edit mode when the title has not changed: `generateSlug(invitation.title)`
  usually reproduces the _current_ slug, and because `existingId` is passed the uniqueness probe
  accepts it (`convex/lib/slug.ts:78`). The slug is then rewritten to itself — a no-op that
  nevertheless issues a write.
- **A2** — Regenerating after the title was edited in the form but not saved: the new slug is
  derived from the **stored** title, not the typed one (`convex/invitations.ts:541`).
- **A3** — A title that slugifies to an empty string (e.g. only emoji): `generateSlug` returns `""`
  (`convex/lib/slug.ts:21`) and the invitation is stored with an empty slug. Client zod would have
  rejected an empty slug field (`src/lib/validations/invitation.ts:5`), but `regenerateSlug` does
  not run zod.
- **A4** — Accents in the title: the server strips them via NFD normalization
  (`convex/lib/slug.ts:24`), the client `slugify` does not — see TODO-05-07.
- **E1** — Clipboard permission denied or a non-secure context: `navigator.clipboard.writeText`
  rejects and the promise is unhandled — the button never flips to "Copied" and no toast appears
  (`copy-invitation-link-button.tsx:24`).
- **E2** — A guest opens a link whose slug was regenerated: `resolvePublicInvitation` finds no row
  and the page renders the branded "Invitation Not Found" screen (`convex/lib/public.ts:59`).

## 6. States

| State             | Behavior                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | None — the copy button is synchronous and the list is already loaded                                                                               |
| Empty             | No invitations → no copy controls (page-level empty state)                                                                                         |
| Error             | `regenerateSlug` failure toasts `"Failed to regenerate slug"` (`invitation-form.tsx:82`). A clipboard failure is silent                            |
| Success           | Copy: `Check` icon + `"Copied"` for 2 s. Regenerate: no success toast (the option is omitted), the slug field simply changes                       |
| Disabled / locked | The slug field is never locked — the Composition Lock covers guests and special invitations only ([F02](./F02-invitation-composition-and-lock.md)) |
| Mobile            | The copy button sits in the row's right-aligned action cluster (`invitation-list.tsx:176`)                                                         |

## 7. UI Specification

### Screens & components

| Element                      | Component                  | Path                                                                |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------- |
| Copy button                  | `CopyInvitationLinkButton` | `src/components/invitations/copy-invitation-link-button.tsx:13`     |
| Slug display under the title | `InvitationList` row       | `src/components/invitations/invitation-list.tsx:106`                |
| Slug field + regenerate      | `InvitationForm`           | `src/components/invitations/invitation-form.tsx:324`                |
| Custom-domain source         | `InvitationsPage`          | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:60` |

### Fields & validation

| Field         | Type        | Required | Rule                                                                 | Message                                                            |
| ------------- | ----------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Slug          | text (mono) | Yes      | `/^[a-z0-9-]+$/` client-side (`src/lib/validations/invitation.ts:5`) | `"Slug must only contain lowercase letters, numbers, and hyphens"` |
| Slug (server) | —           | —        | `generateSlug` then per-event uniqueness (`convex/lib/slug.ts:61`)   | Silent rename to `-2`, `-3`, …                                     |

### Copy deck

| Key                    | Copy                          | Source                               |
| ---------------------- | ----------------------------- | ------------------------------------ |
| Copy button (idle)     | `"Copy Link"`                 | `copy-invitation-link-button.tsx:36` |
| Copy button (done)     | `"Copied"`                    | `copy-invitation-link-button.tsx:36` |
| Slug label             | `"Slug *"`                    | `invitation-form.tsx:325`            |
| Regenerate tooltip     | `"Regenerate slug"`           | `invitation-form.tsx:338`            |
| Regenerate error toast | `"Failed to regenerate slug"` | `invitation-form.tsx:82`             |
| Row slug               | `/{slug}` (monospace, muted)  | `invitation-list.tsx:107`            |

## 8. Data Model

| Table         | Fields                                         | Read / Write         | Index                                                          |
| ------------- | ---------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `invitations` | `slug`                                         | Read + Write (patch) | `by_eventId_and_slug` (uniqueness probe and public resolution) |
| `events`      | `slug`, `customDomain`, `customDomainVerified` | Read                 | `by_slug`, `by_customDomain`                                   |

`regenerateSlug` writes only `slug` (`convex/invitations.ts:548`) and writes **no** `activityLogs`
row — unlike `updateInvitation`, it is not logged.

**Uniqueness scoping.** Invitation slugs are unique per event (`by_eventId_and_slug`,
`convex/lib/slug.ts:73`); the event key is unique globally (`by_slug`, `convex/lib/slug.ts:44`).
The event key therefore disambiguates identical invitation slugs across events on the primary
domain, and on a custom domain the host does the same job.

## 9. Backend Contract

| Function                                    | Type         | Args                          | Returns                 | Guard                                         | Caps                |
| ------------------------------------------- | ------------ | ----------------------------- | ----------------------- | --------------------------------------------- | ------------------- |
| `api.invitations.regenerateSlug`            | mutation     | `{id}`                        | `string` (the new slug) | `requireEventEditor(ctx, invitation.eventId)` | —                   |
| `api.invitations.updateInvitation`          | mutation     | `{id, slug?, …}`              | `void`                  | `requireEventEditor(ctx, invitation.eventId)` | —                   |
| `api.invitations.getPublicInvitation`       | public query | `{eventSlug, invitationSlug}` | payload or `null`       | none — data-gated                             | `.take(100)` guests |
| `api.invitations.getPublicInvitationByHost` | public query | `{host, invitationSlug}`      | payload or `null`       | none — data-gated                             | same                |

## 10. Business Rules

- **BR-05-F03-01** `[AS-BUILT]` — On the primary domain the public invitation URL is
  `{origin}/{event-key}/invitations/{invitation-slug}`
  (`src/components/invitations/copy-invitation-link-button.tsx:23`, route
  `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx`).
- **BR-05-F03-02** `[AS-BUILT]` — On a custom domain the public invitation URL is
  `{protocol}//{customDomain}/invitations/{invitation-slug}` and omits the event key
  (`copy-invitation-link-button.tsx:22`).
- **BR-05-F03-03** `[AS-BUILT]` — The copy control uses the custom-domain shape only when the
  invitations page passes a `customDomain`, which it does only when
  `event.customDomainVerified` is true
  (`src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:60`).
- **BR-05-F03-04** `[AS-BUILT]` — Copying writes the URL to the clipboard and shows the "Copied"
  affordance for 2000 ms (`copy-invitation-link-button.tsx:24`–`:26`).
- **BR-05-F03-05** `[AS-BUILT]` — A stored slug is always the output of `generateSlug`: lowercased,
  accent-stripped, non-alphanumerics dropped, whitespace collapsed to single hyphens, leading and
  trailing hyphens removed (`convex/lib/slug.ts:21`).
- **BR-05-F03-06** `[AS-BUILT]` — A stored slug is unique within its event; collisions append
  `-2`, `-3`, … (`convex/lib/slug.ts:70`).
- **BR-05-F03-07** `[AS-BUILT]` — When updating, the invitation's own row is excluded from the
  uniqueness probe, so re-saving an unchanged slug does not append a suffix
  (`convex/invitations.ts:363`, `convex/lib/slug.ts:78`).
- **BR-05-F03-08** `[AS-BUILT]` — `regenerateSlug` derives the new slug from the invitation's
  **stored** `title`, not from any client input (`convex/invitations.ts:541`).
- **BR-05-F03-09** `[AS-BUILT]` — `regenerateSlug` patches the stored slug immediately and returns
  it (`convex/invitations.ts:548`).
- **BR-05-F03-10** `[AS-BUILT]` — In create mode the regenerate button does not call the server; it
  appends four random base-36 characters to the slugified title locally
  (`invitation-form.tsx:211`).
- **BR-05-F03-11** `[AS-BUILT]` — Both public resolvers find the invitation by
  `(eventId, slug)` and return `null` unless `isActive` (`convex/lib/public.ts:56`, `:61`).
- **BR-05-F03-12** `[AS-BUILT]` — `regenerateSlug` writes no activity-log entry
  (`convex/invitations.ts:534`–`:551` contains no `logActivity` call).

## 11. Acceptance Criteria

- **AC-05-F03-01** — **Given** an event with event key `alba-y-luis` and an invitation slug
  `familia-perez`, and no custom domain **When** the Editor presses "Copy Link" **Then** the
  clipboard contains `{origin}/alba-y-luis/invitations/familia-perez`.
- **AC-05-F03-02** — **Given** the same event with `customDomain: "bodaalbayluis.com"` and
  `customDomainVerified: true` **When** the Editor presses "Copy Link" **Then** the clipboard
  contains `https://bodaalbayluis.com/invitations/familia-perez` and no event key.
- **AC-05-F03-03** — **Given** `customDomain` is set but `customDomainVerified` is false **When**
  "Copy Link" is pressed **Then** the primary-domain shape is copied.
- **AC-05-F03-04** — **Given** the copy succeeded **When** 2 seconds elapse **Then** the button
  reverts from "Copied" to "Copy Link".
- **AC-05-F03-05** — **Given** an invitation titled `"Familia Pérez"` **When** it is created
  server-side **Then** the stored slug is `familia-perez` with the accent stripped.
- **AC-05-F03-06** — **Given** an invitation whose slug is `familia-perez` **When** its title is
  edited and saved without touching the slug field **Then** the slug remains `familia-perez` and
  is not suffixed with `-2`.
- **AC-05-F03-07** — **Given** an invitation in edit mode **When** the regenerate button is pressed
  **Then** `regenerateSlug` runs and the stored slug is already changed **before** the Editor
  presses Save (DEF-05-01).
- **AC-05-F03-08** — **Given** an invitation's slug has been regenerated **When** a guest opens the
  previously shared URL **Then** the public query returns `null` and the "Invitation Not Found"
  screen renders.
- **AC-05-F03-09** — **Given** two events each containing an invitation slug `familia-perez`
  **When** each public URL is opened **Then** each resolves to its own event's invitation.
- **AC-05-F03-10** — **Given** an invitation with `isActive: false` **When** its URL is opened on
  either domain shape **Then** the invitation does not resolve.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                         |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| TC-05-F03-01 | unit        | `generateSlug` handles accents, punctuation, repeated and edge hyphens                                           |
| TC-05-F03-02 | unit        | `generateUniqueInvitationSlug` excludes `existingId` from the collision check                                    |
| TC-05-F03-03 | unit        | `CopyInvitationLinkButton` builds the custom-domain URL when the prop is present and the primary shape otherwise |
| TC-05-F03-04 | integration | `regenerateSlug` patches the row and returns the new slug                                                        |
| TC-05-F03-05 | integration | `regenerateSlug` on an unchanged title returns the same slug without suffixing                                   |
| TC-05-F03-06 | integration | `getPublicInvitation` and `getPublicInvitationByHost` resolve the same invitation from the two URL shapes        |
| TC-05-F03-07 | integration | Both public resolvers return `null` for an inactive invitation                                                   |
| TC-05-F03-08 | e2e         | Copy a link, open it in a fresh context, and land on the public invitation                                       |

### Manual QA checklist

- [ ] Copy a link with and without a verified custom domain and diff the two URLs.
- [ ] Confirm the row's monospace `/{slug}` matches the copied URL's last segment.
- [ ] Regenerate a slug, press Cancel, reload, and confirm the slug changed anyway (DEF-05-01).
- [ ] Open a pre-regeneration URL and confirm the not-found screen.
- [ ] Type an accented title in create mode and compare the client-proposed slug with the stored one.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | Slug uniqueness probing loops until free; no bound on the suffix counter (`convex/lib/slug.ts:70`)                                                           |
| Performance      | Each uniqueness attempt is one indexed `unique()` read                                                                                                       |
| Security & authz | The slug is a **soft secret** — the only credential a public guest holds. `regenerateSlug` requires editor role; the public resolvers require none by design |
| Accessibility    | The copy button conveys state through both icon and text label. No live-region announcement on copy                                                          |
| i18n             | Dashboard copy is English; slugs are ASCII-only by construction                                                                                              |
| Analytics        | None. Slug regeneration is not activity-logged                                                                                                               |

## 14. TODOs & Open Questions

- **DEF-05-01** `[P1]` — In edit mode, the regenerate button rewrites the stored slug immediately,
  before the Editor saves; Cancel does not undo it and every already-shared link breaks.
  - **Evidence:** `src/components/invitations/invitation-form.tsx:206` calls
    `regenerateSlug.run({id: invitation._id})` directly from the button handler, and
    `convex/invitations.ts:548` performs `ctx.db.patch(args.id, { slug: newSlug })` inside that
    mutation. The returned value is then merely echoed into the form field
    (`invitation-form.tsx:208`). Nothing in the Cancel path
    (`invitation-form.tsx:461`) reverts it.
  - **Impact:** Data loss of a shared URL. An Editor who presses the refresh icon to _preview_ an
    alternative slug and then cancels has already invalidated the link: the old URL now resolves to
    `null` and shows "Invitation Not Found" (`convex/lib/public.ts:59`). There is no undo, no
    confirmation, and no success toast to even signal that a write occurred (`invitation-form.tsx:81`
    configures an error message only). The list's monospace slug will silently disagree with any
    link already sent.
  - **Proposed fix:** Make regeneration a staged, client-side operation in both modes — compute the
    candidate locally (as create mode already does at `invitation-form.tsx:211`), put it in the
    form field, and let the existing `updateInvitation` slug path commit it on Save, where
    `generateUniqueInvitationSlug` already de-duplicates. If a server-side generator is required,
    it must be a **query** that proposes a slug without writing. Either way, changing a live
    invitation's slug should sit behind a confirmation naming the consequence ("guests who already
    have the old link will see 'Invitation Not Found'").
- **TODO-05-04** `[P2]` `[ADD]` — Provide a bulk share, QR or print affordance.
  - **Rationale:** The only sharing surface is a per-row "Copy Link" button
    (`src/components/invitations/invitation-list.tsx:177`). A search of
    `src/components/invitations/` and the invitations route finds no QR component, no print view,
    no CSV/link export and no multi-select — the sole other match for "share" is the sent-flag
    helper text (`invitation-form.tsx:296`). A host with 70 households must copy 70 links one at a
    time, and printed invitations (the dominant real-world case) have no QR to point at the link.
  - **Proposed rule:** The invitations page offers (a) an export of `title` + public URL for all
    invitations and (b) a per-invitation QR code rendered from the same URL the copy button builds.
- **TODO-05-07** `[P2]` `[CHANGE]` — Make the client `slugify` match the server `generateSlug`.
  - **Rationale:** The client helper (`src/components/invitations/invitation-form.tsx:31`) does not
    normalize accents; `"Familia Pérez"` proposes `familia-p-rez`, while the server would store
    `familia-perez` (`convex/lib/slug.ts:24`). Since the client value is what gets submitted, the
    Editor's worse slug wins. Spanish is the product's guest-facing language, so accented household
    names are the norm.
  - **Proposed rule:** The dialog derives the proposed slug with the same normalization the server
    applies, so the previewed slug equals the stored slug.

### Open questions

- **Q1** — Should slugs be unguessable (a random suffix by default) rather than derived from the
  household name? Today they are human-readable and therefore enumerable; the enumeration risk is
  already tracked at the platform level in [backlog.md](../../backlog.md).
- **Q2** — When the event key changes ([EP-02-F04](../02-event-setup/)) every primary-domain
  invitation link breaks. Should this epic surface that consequence on the invitations page?

## 15. Traceability

| Concern                                  | Source                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Copy control                             | `src/components/invitations/copy-invitation-link-button.tsx:13`     |
| URL selection                            | `src/components/invitations/copy-invitation-link-button.tsx:21`     |
| Custom-domain prop                       | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:60` |
| Copy button placement                    | `src/components/invitations/invitation-list.tsx:177`                |
| Row slug display                         | `src/components/invitations/invitation-list.tsx:106`                |
| Slug field + regenerate button           | `src/components/invitations/invitation-form.tsx:324`                |
| Regenerate handler                       | `src/components/invitations/invitation-form.tsx:204`                |
| Create-mode local regenerate             | `src/components/invitations/invitation-form.tsx:211`                |
| Client slugify                           | `src/components/invitations/invitation-form.tsx:31`                 |
| `regenerateSlug` mutation                | `convex/invitations.ts:534`                                         |
| Slug patch                               | `convex/invitations.ts:548`                                         |
| Update slug path                         | `convex/invitations.ts:357`                                         |
| `generateSlug`                           | `convex/lib/slug.ts:21`                                             |
| Per-event uniqueness                     | `convex/lib/slug.ts:61`                                             |
| Global (event key) uniqueness — contrast | `convex/lib/slug.ts:32`                                             |
| Public resolution by slug                | `convex/invitations.ts:245`                                         |
| Public resolution by host                | `convex/invitations.ts:258`                                         |
| Active-only gate                         | `convex/lib/public.ts:61`                                           |
| Primary public route                     | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx`         |
| Custom-domain public route               | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx`    |
| Validation                               | `src/lib/validations/invitation.ts:5`                               |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
