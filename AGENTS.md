<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

---

# Wedboard — Project Reference

Wedding and event management platform. A logged-in planner manages event boards (invitations, guests, RSVPs, menus, seating). Guests access public invitation pages by slug — no login required.

## Stack

| Layer           | Technology                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 App Router (`src/` dir, `@/*` alias)                                                                  |
| Backend / DB    | Convex (`convex/` at root, `convex/*` alias)                                                                     |
| Auth            | Clerk (`@clerk/nextjs` v7) + `ConvexProviderWithClerk`                                                           |
| UI              | shadcn/ui + Tailwind CSS v4 (see Design System)                                                                  |
| Icons           | `lucide-react` **only** (`components.json` → lucide)                                                             |
| Fonts           | Inter (`--font-sans`) + Bricolage Grotesque (`--font-display`); Fleur De Leah / Gowun Batang are invitation-only |
| Mobile nav      | `vaul` drawer (under `md`)                                                                                       |
| Forms           | react-hook-form + zod + @hookform/resolvers                                                                      |
| Tables          | @tanstack/react-table                                                                                            |
| Toasts          | sonner                                                                                                           |
| Dates           | date-fns                                                                                                         |
| Package manager | pnpm                                                                                                             |

## Running locally

```bash
pnpm convex:dev   # terminal 1 — deploys schema, regenerates types
pnpm dev          # terminal 2 — Next.js on :3000
# or combined:
pnpm dev:all
```

Convex deployment: `brilliant-retriever-770.convex.cloud`

Required env in `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=https://brilliant-retriever-770.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_FRONTEND_API_URL=https://sharing-akita-57.clerk.accounts.dev
NEXT_PUBLIC_PRIMARY_DOMAIN=localhost:3000   # hosts ≠ this are treated as custom domains by middleware
NEXT_PUBLIC_APP_DOMAINS=                    # optional comma-separated extra hosts that also serve the full app (bypass the custom-domain rewrite)
# Custom domains (Vercel Domains API, used by /api/domains):
VERCEL_TOKEN=...        # vercel.com/account/tokens
VERCEL_PROJECT_ID=...   # Project Settings → General
VERCEL_TEAM_ID=...      # optional, only when the project is in a team
```

Required Convex env (set once via CLI):

```bash
npx convex env set CLERK_FRONTEND_API_URL "https://sharing-akita-57.clerk.accounts.dev"
npx convex env set PRIMARY_DOMAIN "yourdomain.com"  # custom-domain validation; Convex can't read NEXT_PUBLIC_* vars
npx convex env set SUPERADMIN_EMAILS "you@example.com"  # comma-separated; these users are auto-promoted to role "superadmin" on login
```

---

## Database Schema (`convex/schema.ts`)

### `users`

Mirrors Clerk identity. Created/updated on every login via `upsertCurrentUser`.

| Field           | Type    | Notes                                                                                                                                                                                                                                                             |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| clerkId         | string  | Clerk `subject`                                                                                                                                                                                                                                                   |
| tokenIdentifier | string  | Canonical identity key — always use this for lookups                                                                                                                                                                                                              |
| email           | string  |                                                                                                                                                                                                                                                                   |
| firstName       | string? |                                                                                                                                                                                                                                                                   |
| lastName        | string? |                                                                                                                                                                                                                                                                   |
| role            | string  | `"user"` (default) or `"superadmin"`. Auto-promoted for emails in the `SUPERADMIN_EMAILS` Convex env var (checked in `upsertCurrentUser`/`ensureCurrentUser`, promote-only). Superadmins bypass all event access checks and land on the global `/admin` dashboard |

Indexes: `by_clerkId`, `by_tokenIdentifier`, `by_email` (`by_email` backs adding a shared member by email in `members.addMember`)

---

### `events`

Top-level board. One event = one wedding/occasion.

| Field                | Type                                         |
| -------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                 | string                                       |
| slug                 | string                                       | Handle-style **event key**, globally unique, editable in settings. Used in public URLs.                                                                                                                                                                                                                                                                     |
| ownerUserId          | Id<"users">                                  |
| brideName            | string?                                      | Shown on the public invitation (hero)                                                                                                                                                                                                                                                                                                                       |
| groomName            | string?                                      | Shown on the public invitation (hero)                                                                                                                                                                                                                                                                                                                       |
| date                 | number?                                      | Unix ms timestamp                                                                                                                                                                                                                                                                                                                                           |
| venueName            | string?                                      |                                                                                                                                                                                                                                                                                                                                                             |
| venueAddress         | string?                                      |                                                                                                                                                                                                                                                                                                                                                             |
| venueMapUrl          | string?                                      | Google Maps (or any maps) link; backs the location "Ver mapa" button                                                                                                                                                                                                                                                                                        |
| subdomain            | string?                                      | Future                                                                                                                                                                                                                                                                                                                                                      |
| customDomain         | string?                                      | Owner's own domain serving the public invitations (normalized bare hostname, globally unique). Set/cleared only via `setCustomDomain`/`removeCustomDomain` (orchestrated with the Vercel attach/detach by `/api/domains`)                                                                                                                                   |
| customDomainVerified | boolean?                                     | Cached Vercel verification state for the settings UI only — public routing never gates on it                                                                                                                                                                                                                                                                |
| templateId           | string?                                      | Public invitation template id (`"elegant"`); defaults to elegant when unset                                                                                                                                                                                                                                                                                 |
| layoutBlocks         | `{id,type,config?}[]`?                       | **Legacy** single layout. Kept for back-compat; read as the `accepted` variant fallback when `layoutVariants.accepted` is unset. Validator shared via `LAYOUT_BLOCKS_VALIDATOR` (exported from `schema.ts`)                                                                                                                                                 |
| layoutVariants       | `{pending?,accepted?,declined?}`?            | Per-RSVP-state page-builder layouts (each a `{id,type,config?}[]`). The public page picks one from the invitation's guests' RSVP state (see `getPublicInvitation`). Each variant undefined = the selected template's default layout for that state                                                                                                          |
| meta                 | `{title?,description?,imageId?,faviconId?}`? | Social sharing / SEO metadata for the public invitation pages. `title`/`description` are templates that may contain `{variables}` (see `convex/lib/meta.ts`); `imageId` is the OG/social-card image, `faviconId` an .ico/.svg/.png — both `Id<"media">`. Unset fields fall back to defaults derived from event data. Written only by `meta.updateEventMeta` |
| status               | `"draft" \| "active" \| "archived"`          |

Indexes: `by_ownerUserId`, `by_slug`, `by_subdomain`, `by_customDomain`

---

### `eventMembers`

Links users to events with roles. Backs **event sharing** (managed at `/dashboard/[eventSlug]/members`). The owner's row (`role: "owner"`) is created at `createEvent`; additional members are added via `members.addMember`.

| Field   | Type                                           |
| ------- | ---------------------------------------------- |
| eventId | Id<"events">                                   |
| userId  | Id<"users">                                    |
| role    | `"owner" \| "planner" \| "editor" \| "viewer"` |

**Role semantics** (enforced by `requireEventEditor`/`requireEventMember`; superadmins bypass): `owner` = full access (only role that can delete the event and manage the owner); `planner` = **"Co-owner"** in the UI — everything except deleting the event and touching the owner row; `editor` = content only (guests, invitations, special events, menu, drinks, tables, media, **template, meta**), no settings/domain/sharing/archive/delete; `viewer` = read-only (in schema; **not surfaced** in the Members UI, which offers only Co-owner/Editor). `requireEventEditor` defaults to a `minRole` of `"editor"`, so viewers are read-blocked from content queries/mutations.

Indexes: `by_eventId`, `by_userId`, `by_eventId_and_userId`

---

### `invitations`

A shareable link representing a person, couple, family, or group.
Public URL: `/{event-key}/invitations/{slug}`

| Field        | Type                                  |
| ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| eventId      | Id<"events">                          |
| title        | string                                | e.g. "The Smith Family"                                                                                           |
| slug         | string                                | URL-safe, unique per event                                                                                        |
| type         | `("single" \| "group" \| "plusOne")?` | **Deprecated** — no longer surfaced, read, or written. Kept optional for back-compat with existing docs           |
| maxGuests    | number?                               | **Deprecated** — no longer surfaced, read, or written. Kept optional for back-compat with existing docs           |
| allowPlusOne | boolean?                              | **Deprecated** — +1 is now per-guest (`guests.allowsPlusOne`). Kept optional for back-compat; not read or written |
| isActive     | boolean                               |
| isSent       | boolean?                              | Owner-managed "invitation was sent" flag — informational only, toggled via `setInvitationSent`                    |
| notes        | string?                               | Admin-only                                                                                                        |

Indexes: `by_eventId`, `by_slug`, `by_eventId_and_slug`

---

### `guests`

Individual attendees. Belong to an event; optionally linked to an invitation.
A guest with no `invitationId` is "un-invited" and can be selected when creating an invitation.
A guest may host a **+1**: a separate, fully-manageable guest record (`isPlusOne: true`,
`plusOneOfGuestId` → host) that is materialized when the host RSVPs attending **and** brings it,
and torn down if the host declines or is deleted (see `convex/lib/guests.ts`).

| Field            | Type                                     |
| ---------------- | ---------------------------------------- | --------------------------------------------------------- |
| eventId          | Id<"events">                             |
| invitationId     | Id<"invitations">?                       | Optional — un-invited guests have none                    |
| firstName        | string                                   |
| lastName         | string                                   |
| email            | string?                                  |
| phone            | string?                                  |
| isPrimaryContact | boolean?                                 | **Deprecated** — never surfaced; optional for back-compat |
| isPlusOne        | boolean                                  | This record _is_ a +1 (created from a host guest)         |
| allowsPlusOne    | boolean?                                 | Host guest is permitted to bring a +1                     |
| plusOneOfGuestId | Id<"guests">?                            | Set on a +1 record → its host; powers cascade delete      |
| rsvpStatus       | `"pending" \| "attending" \| "declined"` |
| allergies        | string?                                  |
| specialRequests  | string?                                  |
| menuOptionId     | Id<"menuOptions">?                       |
| drinkOptionId    | Id<"drinkOptions">?                      |
| tableId          | Id<"tables">?                            |
| seatNumber       | number?                                  | 0-based internally, 1-based in UI                         |

Indexes: `by_eventId`, `by_eventId_and_invitationId` (powers the un-invited guests query via `eq("invitationId", undefined)`), `by_invitationId`, `by_plusOneOf` (find a host's +1), `by_tableId`, `by_tableId_and_seatNumber`, `by_eventId_and_rsvpStatus`

> **+1 / decline lifecycle:** +1 is a per-guest flag (`allowsPlusOne`), not per-invitation. The +1
> becomes a real linked guest (sharing the host's `invitationId`) only on RSVP=attending; name is
> optional at RSVP. A guest who RSVPs **declined stays linked** to its invitation (so the public
> `declined` layout still triggers) but is **removed from every special invitation** (its
> `guestSpecialEventRsvps` rows are deleted) and loses its +1. Shared helpers live in
> `convex/lib/guests.ts` (`findPlusOne`, `applyDeclineEffects`, `deletePlusOneCascade`).

---

### `specialEvents`

Optional sub-events (rehearsal dinner, after-party, etc.).

| Field       | Type         |
| ----------- | ------------ |
| eventId     | Id<"events"> |
| name        | string       |
| description | string?      |
| date        | number?      |
| location    | string?      |
| isActive    | boolean      |

Index: `by_eventId`

---

### `guestSpecialEventRsvps`

Per-guest RSVP for each special event.

| Field          | Type                                     |
| -------------- | ---------------------------------------- |
| eventId        | Id<"events">                             |
| guestId        | Id<"guests">                             |
| specialEventId | Id<"specialEvents">                      |
| status         | `"pending" \| "attending" \| "declined"` |

Indexes: `by_eventId`, `by_guestId`, `by_specialEventId`, `by_guestId_and_specialEventId`

---

### `invitationSpecialEventAccess`

Controls which invitations can RSVP to which special events.

| Field          | Type                |
| -------------- | ------------------- |
| eventId        | Id<"events">        |
| invitationId   | Id<"invitations">   |
| specialEventId | Id<"specialEvents"> |

Indexes: `by_eventId`, `by_invitationId`, `by_specialEventId`, `by_invitationId_and_specialEventId`

---

### `menuOptions`

Food choices offered at the event.

| Field       | Type         |
| ----------- | ------------ |
| eventId     | Id<"events"> |
| name        | string       |
| description | string?      |
| isActive    | boolean      |
| sortOrder   | number       |

Index: `by_eventId`

---

### `drinkOptions`

Drink packages / options. Same shape as menuOptions.

Index: `by_eventId`

---

### `media`

Per-event image library (template photos, maps, etc.). Blobs live in Convex file storage; this table is the catalog. Only image mime types (jpeg/png/svg+xml/webp/gif, plus x-icon/vnd.microsoft.icon for favicons), ≤ 5MB, max 50 per event (enforced in `media.register`).

| Field     | Type            |
| --------- | --------------- |
| eventId   | Id<"events">    |
| storageId | Id<"\_storage"> |
| name      | string          |
| mimeType  | string          |
| size      | number          |

Index: `by_eventId`

---

### `tables`

Seating tables. Seat assignments live on `guests` (tableId + seatNumber).

| Field      | Type         |
| ---------- | ------------ | ---- |
| eventId    | Id<"events"> |
| name       | string       |
| seatsCount | number       | 1–20 |
| sortOrder  | number       |

Index: `by_eventId`

---

### `guestMessages`

Messages guests leave for the host (e.g. from the `declined` public layout, when they can't attend). Read by the planner in the dashboard.

| Field        | Type              |
| ------------ | ----------------- | ------- |
| eventId      | Id<"events">      |
| invitationId | Id<"invitations"> |
| name         | string            |
| message      | string            |
| createdAt    | number            | Unix ms |

Indexes: `by_eventId`, `by_invitationId`

---

### `activityLogs`

Append-only audit trail of dashboard actions on an event, shown on the Activity page (`/dashboard/[eventSlug]/activity`). Written via `logActivity` (`convex/lib/activity.ts`) from the relevant mutations; read via `activity.listByEvent`. Timestamps come from `_creationTime`.

| Field       | Type                                                                | Notes                                                          |
| ----------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| eventId     | Id<"events">                                                        |                                                                |
| actorUserId | Id<"users">                                                         |                                                                |
| actorName   | string                                                              | Denormalized "First Last" (or email) so the list needs no join |
| action      | `"create" \| "update" \| "delete"`                                  |                                                                |
| entity      | `"guest" \| "invitation" \| "specialEvent" \| "template" \| "meta"` | template/meta only ever use `action: "update"`                 |
| entityName  | string?                                                             | Guest/invitation/special-event name (absent for template/meta) |

Index: `by_eventId`. Logged actions: guest create/update/delete (+ addPlusOne/removePlusOne, bulk-create as one aggregate entry), invitation create/update/delete, specialEvent create/update/delete, `events.setInvitationTemplate` (template/update), `meta.updateEventMeta` (meta/update). **Not** logged: public `submitPublicRsvp`/`submitGuestMessage`, per-guest special-RSVP toggles, seat assignments. No retention cap.

---

## Convex Modules

### `convex/lib/auth.ts`

- `getAuthenticatedUser(ctx)` — calls `ctx.auth.getUserIdentity()`, throws `ConvexError("Unauthorized")` if null
- `requireUser(ctx)` — calls getAuthenticatedUser, looks up user by `tokenIdentifier`, throws if not found

### `convex/lib/permissions.ts`

- `requireEventAccess(ctx, eventId, userId)` — verifies eventMembers membership or ownership (any role)
- `requireEventEditor(ctx, eventId, minRole = "editor")` — **the standard guard**: `requireUser` + `requireEventMember` in one call, returns the user doc. Default `minRole` is `"editor"` (content queries/mutations); pass `"viewer"` for member-readable data (`members.listMembers`, `activity.listByEvent`) and `"planner"` for privileged ops. Used by nearly all event-scoped functions
- `requireEventMember(ctx, eventId, userId, minRole?)` — enforces role hierarchy (`owner:4, planner:3, editor:2, viewer:1`)
- `getEventRole(ctx, eventId, userId)` — resolves the caller's effective `EventRole` (superadmin + owner → `"owner"`), or null. Used by `events.getEventBySlug` (returns `{...event, myRole}`) and `members` guards
- **Superadmin bypass**: `requireEventAccess` and `requireEventMember` both early-return when the caller's `users.role === "superadmin"`, so every event-scoped query/mutation works for a superadmin. `requireSuperadmin(ctx)` — `requireUser` + throws `ConvexError("Unauthorized")` unless role is `"superadmin"`; guards `convex/admin.ts`

### `convex/lib/activity.ts`

- `logActivity(ctx, {eventId, actor, action, entity, entityName?})` — inserts an `activityLogs` row; `actorName` derived from the actor user doc ("First Last" || email). Called from dashboard mutations after the write.

### `convex/lib/public.ts`

- `resolvePublicEvent(ctx, eventSlug)` — public (unauthenticated) event lookup by slug; returns null for archived events (draft allowed for preview)
- `resolvePublicEventByHost(ctx, host)` — public event lookup by custom domain (normalized Host header, `by_customDomain`); same archived gating
- `resolvePublicInvitation(ctx, event, invitationSlug)` — active invitation within a resolved public event

### `convex/lib/domains.ts`

Pure custom-domain helpers (unit-tested in `tests/domains.test.ts`):

- `normalizeCustomDomain(input)` — lowercase; strips protocol/path/query/port/trailing dot
- `validateCustomDomain(domain)` — returns a user-facing error or null: hostname regex, ASCII-only (IDN must be punycode), rejects `*.vercel.app` and the primary domain (Convex env `PRIMARY_DOMAIN`, fallback localhost) + its subdomains

### `convex/lib/meta.ts`

Pure helpers for public-invitation social metadata (no Convex imports — also consumed by the dashboard Meta page via the `convex/*` alias): `META_VARIABLES` (`invitation-title`, `guest-name`, `guest-names`, `event-name`, `bride-name`, `groom-name`, `couple-names`), `resolveMetaTemplate(template, values)` (replaces `{variables}`, leaves unknown tokens), `buildMetaVariables(...)`, `DEFAULT_META_TITLE`/`DEFAULT_META_DESCRIPTION`, `META_TITLE_MAX` (120) / `META_DESCRIPTION_MAX` (300), `FAVICON_MIME_TYPES` (ico/svg/png).

### `convex/lib/options.ts`

Shared logic behind `menu.ts` and `drinks.ts` (they are thin wrappers): `listPublicOptions`, `listAdminOptions`, `createOption`, `updateOption`, `deleteOption`, plus `nextSortOrder(ctx, table, eventId)` (also used by `tables.createTable`).

### `convex/lib/guests.ts`

+1 / decline cascade helpers shared by `guests.ts` mutations:

- `findPlusOne(ctx, hostGuestId)` — the +1 record linked to a host (via `by_plusOneOf`), or null
- `deletePlusOneCascade(ctx, plusOne)` — delete a +1 guest + its `guestSpecialEventRsvps`
- `applyDeclineEffects(ctx, guest)` — on a guest becoming `declined`: delete its special-event RSVPs and its +1 (the guest itself stays linked to its invitation)

### `convex/lib/slug.ts`

- `generateSlug(text)` — lowercases and hyphenates
- `generateUniqueSlug(ctx, tableName, slug, existingId?)` — global uniqueness (used for event slugs); appends -2, -3 etc.
- `generateUniqueInvitationSlug(ctx, eventId, slug, existingId?)` — uniqueness **scoped per event** via `by_eventId_and_slug`
- `RESERVED_EVENT_SLUGS` — set of top-level route names an event key may not use

### `convex/users.ts`

| Function            | Type             | Notes                                                                                                                                                                               |
| ------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCurrentUser`    | query            | Returns user doc or null                                                                                                                                                            |
| `upsertCurrentUser` | mutation         | Creates/updates user from Clerk JWT — called on every app load. Auto-promotes to `role: "superadmin"` when the email is in `SUPERADMIN_EMAILS` (insert + patch paths, promote-only) |
| `ensureCurrentUser` | internalMutation | Same as upsert, internal use                                                                                                                                                        |

### `convex/events.ts`

| Function                  | Type                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listMyEvents`            | query — events where user is owner or member (non-null)                                                                                                                                                                                                                                                                                      |
| `getEventById`            | query                                                                                                                                                                                                                                                                                                                                        |
| `getEventBySlug`          | query — resolves an event by its slug (auth + access); used by dashboard routes. Returns `{...event, myRole}` (the caller's `EventRole` via `getEventRole`) so the client can gate UI                                                                                                                                                        |
| `getPublicEventByHost`    | query — **Public** — args `{host}`; resolves via `resolvePublicEventByHost` (archived gated) and returns only display-safe fields `{name, brideName, groomName, date, venueName, venueAddress, venueMapUrl}` or null. Powers the custom-domain root landing page (countdown) + its `generateMetadata`                                        |
| `getEventSummary`         | query — event + counts                                                                                                                                                                                                                                                                                                                       |
| `createEvent`             | mutation — creates eventMember with owner role; returns `{ eventId, slug }`                                                                                                                                                                                                                                                                  |
| `updateEvent`             | mutation — accepts optional `slug` (validates format, reserved words, global uniqueness). No longer accepts `customDomain`/`subdomain` — domains go through the dedicated mutations below                                                                                                                                                    |
| `setCustomDomain`         | mutation (min role planner) — normalizes + validates via `lib/domains.ts`, enforces global uniqueness (`by_customDomain`), patches `{customDomain, customDomainVerified: false}`, returns the normalized domain. Convex-only claim; the Vercel attach is orchestrated by `/api/domains` (claim first, roll back on Vercel failure)           |
| `removeCustomDomain`      | mutation (min role planner) — clears `customDomain` + `customDomainVerified`                                                                                                                                                                                                                                                                 |
| `setCustomDomainVerified` | mutation (min role planner) — caches the live Vercel verification state; called by `/api/domains/status`                                                                                                                                                                                                                                     |
| `setInvitationTemplate`   | mutation (min role **editor** — template is content-adjacent) — sets `templateId`, `layoutVariants` (`{pending,accepted,declined}`), and/or legacy `layoutBlocks`. The editor writes `layoutVariants`. Logs a `template`/`update` activity entry                                                                                             |
| `archiveEvent`            | mutation (owner)                                                                                                                                                                                                                                                                                                                             |
| `deleteEvent`             | mutation — owner-only, **permanent**. Cascades: deletes every row in all event-scoped tables (guests, invitations, specialEvents, guestSpecialEventRsvps, invitationSpecialEventAccess, menuOptions, drinkOptions, tables, eventMembers, guestMessages, **activityLogs**) plus media rows **and their storage blobs**, then the event itself |

### `convex/invitations.ts`

| Function                    | Type     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listByEvent`               | query    | Auth required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `getById`                   | query    | Auth required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `getInvitationsPageData`    | query    | Auth required — invitations for the event each enriched with `guestCount`, `guests:[{_id,firstName,lastName,isPlusOne,rsvpStatus}]` (linked guests **incl. +1s**) and `specialEvents:[{_id,name}]` (its accessible special invitations). Powers the invitations dashboard table + the edit dialog's composition gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `getPublicInvitation`       | query    | **Public** — args `{eventSlug, invitationSlug}`; resolves via `lib/public.ts` (null for archived events / inactive invitations). Derives `rsvpState` (`pending`/`accepted`/`declined`) from the invitation's guests (any attending → accepted; else any pending or no guests → pending; else declined) and returns the **state-resolved** layout: `event.layoutBlocks` is set to `layoutVariants[state]` (accepted falls back to legacy `layoutBlocks`), or undefined to let the client use the template default for that state. Returns `{event (incl. brideName, groomName, venueMapUrl, templateId, layoutBlocks), rsvpState, invitation, guests:[{_id,firstName,lastName,rsvpStatus,allowsPlusOne,isPlusOne,plusOneOfGuestId}], specialEvents:[{_id,name,description,date,location,guestStatuses:{guestId→status}}] (accessible special events — via `invitationSpecialEventAccess`— each enriched with every **non-declined** guest's per-event RSVP status; powers the elegant`specialInvitation` confirm modal), mediaUrls}` (media resolved over the chosen layout only). The returned `event` includes `slug` so custom-domain pages (no slug in the URL) can call the slug-based public mutations. Enrichment shared with the by-host variant via the local `buildPublicInvitationPayload` helper |
| `getPublicInvitationByHost` | query    | **Public** — args `{host, invitationSlug}`; custom-domain variant of `getPublicInvitation` (resolves the event via `resolvePublicEventByHost`), identical payload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `createInvitation`          | mutation | Per-event-unique slug; optional `guestIds` (≤20) links selected un-invited guests; optional `specialEventIds` grants `invitationSpecialEventAccess` to the chosen special invitations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `updateInvitation`          | mutation | Patches title/slug/notes/isActive. Optional `guestIds` + `specialEventIds` **reconcile** the invitation's directly-linked (non-+1) guests and special-invitation access — but only while **every linked guest is still pending** (throws otherwise); removing a host also tears down its +1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `deleteInvitation`          | mutation | **Unassigns** its guests (sets invitationId undefined), does not delete them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `setInvitationSent`         | mutation | Auth — `{id, isSent}`; toggles the informational `isSent` flag (wired to the list's Sent checkbox + the edit dialog's switch). Per-toggle, intentionally not activity-logged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `setSpecialEventAccess`     | mutation | Adds/removes invitationSpecialEventAccess row; verifies the special event belongs to the same event                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `regenerateSlug`            | mutation |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### `convex/guests.ts`

| Function                        | Type     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listByEvent`                   | query    | Auth required                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `listByInvitation`              | query    | Auth required                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `listUnassignedByEvent`         | query    | Auth required — event guests with no `invitationId` (uses `by_eventId_and_invitationId` with `eq(undefined)`)                                                                                                                                                                                                                                                                                                                                                                       |
| `getGuestsPageData`             | query    | Auth required — `{guests, invitations, menuOptions, drinkOptions, tables, specialEvents, accessByEvent (specialEventId→invitationId[]), specialRsvpByGuest (guestId→specialEventId→status)}` in one round trip; powers the guests dashboard page (incl. per-special-event + +1 columns)                                                                                                                                                                                             |
| `getGuestById`                  | query    |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `createGuest`                   | mutation | Requires `eventId`; optional `invitationId` (creates un-invited guest if omitted); optional `allowsPlusOne`                                                                                                                                                                                                                                                                                                                                                                         |
| `updateGuest`                   | mutation | Optional `allowsPlusOne`. On transition to `declined` runs `applyDeclineEffects`; turning `allowsPlusOne` off removes the +1                                                                                                                                                                                                                                                                                                                                                        |
| `addPlusOne`                    | mutation | Auth — `{hostGuestId, firstName?, lastName?}`: creates (or returns) the +1 guest linked to a host that `allowsPlusOne`; placeholder name when blank                                                                                                                                                                                                                                                                                                                                 |
| `removePlusOne`                 | mutation | Auth — `{hostGuestId}` → `deletePlusOneCascade`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `setSpecialEventRsvp`           | mutation | Auth (`requireEventEditor`) — `{guestId, specialEventId, status}`; owner-side upsert into `guestSpecialEventRsvps` (verifies the special event belongs to the guest's event). Mirrors `submitPublicRsvp`'s special-event path; wired to the guest details dialog's per-special-event status selects. **Adds a guest to a special event regardless of invitation access** (the RSVP row, not `invitationSpecialEventAccess`)                                                         |
| `removeSpecialEventRsvp`        | mutation | Auth (`requireEventEditor`) — `{guestId, specialEventId}`; deletes the guest's `guestSpecialEventRsvps` row (sets them back to "not invited" for that special event from the dashboard)                                                                                                                                                                                                                                                                                             |
| `deleteGuest`                   | mutation | Cascades to guestSpecialEventRsvps **and** the guest's +1                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `bulkCreateGuestsForInvitation` | mutation | ≤20 guests per call; optional `allowsPlusOne` per guest                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `submitPublicRsvp`              | mutation | **Public** — resolves via `{eventSlug, invitationSlug}`; patches whitelisted RSVP fields, validates menu/drink ownership + `invitationSpecialEventAccess`, bounds arrays/strings. Optional `plusOneUpdates:[{hostGuestId,attending,firstName?,lastName?}]` materialize/remove each host's +1 (only for attending hosts that `allowsPlusOne`). Declining guests run `applyDeclineEffects` and are skipped for special-event RSVPs. Wired to the elegant `rsvp` block's submit button |

### `convex/specialEvents.ts`

`listByEvent` (auth), `getSpecialEventsPageData` (auth — `{specialEvents, invitations, accessByEvent}` in one round trip; powers the special-events dashboard page, incl. the per-invitation assignment checkboxes), `listForInvitation` (**public**), `createSpecialEvent` (enforces **`MAX_SPECIAL_EVENTS` = 2** per event), `updateSpecialEvent`, `deleteSpecialEvent` (cascades access + RSVPs). Per-invitation visibility is set via `invitations.setSpecialEventAccess`.

### `convex/menu.ts`

`listMenuOptionsByEvent` (**public**), `listMenuOptionsByEventAdmin` (auth), `getSelectionCounts` (auth — `{menuCounts, drinkCounts, menuUnassigned, drinkUnassigned, totalGuests}` so the menu page never ships the full guest list), `createMenuOption`, `updateMenuOption`, `deleteMenuOption`. Shared logic lives in `lib/options.ts`.

### `convex/drinks.ts`

Same shape as `menu.ts` (thin wrappers over `lib/options.ts`).

### `convex/media.ts`

| Function            | Notes                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `generateUploadUrl` | mutation (auth + event access) — Convex storage upload URL                                                               |
| `register`          | mutation — catalogs an uploaded blob; validates image mime whitelist, ≤5MB (against actual blob metadata), ≤50 per event |
| `listByEvent`       | query (auth) — media rows + resolved `url`, newest first                                                                 |
| `rename`            | mutation                                                                                                                 |
| `remove`            | mutation — deletes the row **and** the storage blob                                                                      |

### `convex/tables.ts`

| Function                | Notes                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `listTablesByEvent`     |                                                             |
| `getTablesAndGuests`    | Returns `{tables, guestsByTable, unassignedGuests}`         |
| `createTable`           |                                                             |
| `updateTable`           |                                                             |
| `deleteTable`           | Unassigns all guests first                                  |
| `updateTableSeats`      | Unassigns guests outside new range                          |
| `assignGuestToSeat`     | Moves guest if already seated; bumps occupant if seat taken |
| `unassignGuestFromSeat` | Sets tableId + seatNumber to undefined                      |

### `convex/messages.ts`

| Function              | Notes                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submitGuestMessage`  | **Public** mutation — args `{eventSlug, invitationSlug, name, message}`; resolves via `lib/public.ts`, trims + validates (`message` non-empty ≤1000, `name` ≤200), caps at 20 messages per invitation, inserts a `guestMessages` row. Wired to the elegant `guestMessage` block |
| `listMessagesByEvent` | query (auth via `requireEventEditor`) — `guestMessages` for the event, newest first, each enriched with `invitationTitle`                                                                                                                                                       |

### `convex/dashboard.ts`

`getOverviewStats` — returns `{totalInvitations, totalGuests, attendingCount, declinedCount, pendingCount, allergyCount, menuCompletionCount, tableAssignmentCount}`

---

### `convex/admin.ts`

Superadmin-only global queries (guarded by `requireSuperadmin`):

- `listAllEvents` — every event (`take(200)`) enriched with owner name/email and guest/invitation counts (`by_eventId.take(1000).length`, the `getOverviewStats` counting pattern) + `hasCustomDomain`/`customDomain`. Powers the `/admin` events table
- `listAllUsers` — every user (`take(500)`): `{_id, email, firstName, lastName, role, createdAt}`. Powers the `/admin` users table

### `convex/meta.ts`

| Function                  | Type     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPublicInvitationMeta` | query    | **Public** — args `{eventSlug?, host?, invitationSlug}` (slug for the primary domain, host for custom domains). Resolves the event/invitation via `lib/public.ts`, builds the variable values from the invitation's non-+1 guests, and returns `{title, description, imageUrl, faviconUrl, faviconMimeType}` with `event.meta` templates resolved (defaults when unset), or null. Consumed by `generateMetadata` on both public routes |
| `updateEventMeta`         | mutation | Min role **editor** (content-adjacent) — replaces `events.meta` wholesale. Trims + enforces max lengths, verifies `imageId`/`faviconId` belong to the event's media library, and that the favicon is ico/svg/png. Logs a `meta`/`update` activity entry                                                                                                                                                                                |

### `convex/members.ts`

Event sharing (guards via `requireEventEditor`). `listMembers` is readable by any member (`minRole "viewer"`); the mutations require **planner** (co-owner) and add extra owner-only rules.

| Function           | Type     | Notes                                                                                                                                                                                                                      |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listMembers`      | query    | `eventMembers` for the event (incl. the owner row), enriched with each user's name/email + `isSelf`, sorted owner→viewer                                                                                                   |
| `addMember`        | mutation | Args `{eventId, email, role: planner\|editor\|viewer}`. Looks up an **existing** account by `users.by_email` (throws if none — "ask them to sign up first"); rejects the owner / an already-linked member; inserts the row |
| `updateMemberRole` | mutation | Never touches the owner row or the caller's own row; **only the owner** may promote to / demote from `planner`                                                                                                             |
| `removeMember`     | mutation | Same safety rules; **only the owner** may remove a `planner`                                                                                                                                                               |

### `convex/activity.ts`

`listByEvent` — query (any member, `requireEventEditor(..., "viewer")`) — `activityLogs` for the event, `by_eventId` `.order("desc").take(200)`. Powers the Activity page. Writes happen via `logActivity` (`lib/activity.ts`) from guest/invitation/specialEvent/template/meta mutations.

### `convex/seed.ts`

`seedDemoEventForCurrentUser` (**public mutation**) — creates a full demo event (5 invitations, 15 guests, 2 special events, 3 menu options, 3 drink options, 6 tables) and returns the new `eventId`. Refuses once the user already owns 3+ events (spam guard).

---

## App Routes

```
/                               Marketing landing page
/sign-in, /sign-up              Clerk hosted auth components
/pricing                        Placeholder

/dashboard                            Lists all events — minimal chrome (logo + user menu), NO event sidebar. No auto-redirect, EXCEPT superadmins are client-redirected to /admin.
/admin                                Superadmin-only global dashboard (in the (dashboard) route group) — tables of ALL events (owner, guest/invitation counts, custom-domain flag, status, open link) and ALL users. Non-superadmins are client-redirected to /dashboard; queries enforce requireSuperadmin server-side.
/dashboard/[eventSlug]                Overview — 7 StatCards, each a link into the list it summarises
/dashboard/[eventSlug]/invitations    Invitation CRUD + copy public link
/dashboard/[eventSlug]/special-events Special invitations (mini sub-events) CRUD, ≤2 per event, + per-invitation visibility assignment. The route segment stays `special-events`; **all user-facing copy says "Special Invitations"**
/dashboard/[eventSlug]/guests         Guest table with search/filter + detail sheet + Add Guest
/dashboard/[eventSlug]/menu           Food & drink option management
/dashboard/[eventSlug]/tables         Drag-free seat assignment grid
/dashboard/[eventSlug]/messages       Guest messages left for the host (listMessagesByEvent)
/dashboard/[eventSlug]/activity       Activity log of dashboard changes (activity.listByEvent), newest first
/dashboard/[eventSlug]/template       Template picker + per-RSVP-variant block page-builder (Pending/Accepted/Declined tabs; add/reorder/duplicate/remove/edit incl. list + image fields) + live preview (dummy data + real media)
/dashboard/[eventSlug]/media          Per-event image library — upload (Convex storage), rename, delete
/dashboard/[eventSlug]/meta           Meta & Sharing — social-card title/description templates (with {variables}), OG image picker, favicon upload, live social-card preview
/dashboard/[eventSlug]/members        Event sharing — member list + add-by-email + role select + remove (planner+; Danger-Zone-style guards). In-page guard redirects editors
/dashboard/[eventSlug]/settings       Event metadata + editable event key + custom-domain wizard + archive/delete. Planner+ only (editors see an access notice); Delete card owner-only

/[eventSlug]/invitations/[invitationSlug]   Public invitation page (guest names) — no auth required. Exports generateMetadata (fetchQuery meta.getPublicInvitationMeta → src/lib/invitation-metadata.ts buildInvitationMetadata: title/description/OG/Twitter/favicon)

/api/domains                Route handler (POST connect / DELETE remove) — Clerk auth + Convex ownership via forwarded JWT, then Vercel Domains API
/api/domains/status         Route handler (GET) — live Vercel verified/configured check (+ verify attempt), syncs customDomainVerified, returns DNS records

/_domain/[host]/invitations/[invitationSlug]   Internal target of the middleware custom-domain rewrite (folder is `%5Fdomain` — plain `_domain` would be a private, non-routable App Router folder). Renders PublicInvitationPage by host; same generateMetadata as the primary route (by host)
/_domain/[host]/[[...rest]]                    Root path (`/`) renders EventLanding — an elegant-styled countdown landing page (couple names, date, countdown, venue + "Ver mapa") via events.getPublicEventByHost, with generateMetadata from the couple/event name; any other unknown path shows the branded "Invitation Not Found". Both 404 when hit directly on the primary domain
```

Custom domains: middleware compares the request `Host` against `NEXT_PUBLIC_PRIMARY_DOMAIN` (plus localhost/`*.vercel.app`); non-primary hosts are rewritten to `/_domain/{host}{path}` **before any Clerk logic**, so `https://{customDomain}/invitations/{invitationSlug}` serves the invitation and nothing else. The owner connects a domain in Settings (guided wizard); `/api/domains` claims it in Convex first, then attaches it to the Vercel project (`src/lib/vercel-domains.ts`), rolling back the claim if the attach fails.

Route groups:

- `(auth)` — sign-in/sign-up (both `fallbackRedirectUrl="/dashboard"`), no dashboard shell. `(auth)/layout.tsx` supplies the shared split-screen chrome and `(auth)/appearance.ts` the shared Clerk `appearance` object both pages pass to `<SignIn>`/`<SignUp>`
- `(dashboard)` — minimal group layout (`UserSync` only). `/dashboard` renders its own minimal top bar; the per-event routes `/dashboard/[eventSlug]/*` are wrapped by `dashboard/[eventSlug]/layout.tsx` in `EventProvider` (resolves slug → event) + `DashboardShell` (sidebar + header)
- `(marketing)` — landing, pricing

Error boundaries: `src/app/error.tsx` (root) and `src/app/(dashboard)/error.tsx` (renders inside the shell, so the sidebar stays usable). Both render `StateBlock kind="error"` with a `reset` retry. They are the **only** place a thrown Convex query error is handled — see Key Conventions.

> The `[eventSlug]` segment is resolved to its event by `EventProvider`; pages read it via the `useEvent()` hook (`event._id`, `event.slug`) instead of a route id.

---

## Design System

All token work lives in **one file**: `src/app/globals.css` (Tailwind v4, CSS-first — there is no
`tailwind.config.*`). Fonts are loaded in `src/app/layout.tsx`.

### Tokens

- **Palette** — warm paper neutrals (`--background`, `--card`, `--foreground`, `--muted`,
  `--border`) with a clay `--accent` (+ `--accent-soft`) as the single brand gesture. `--radius`
  is `0.75rem`.
- **Semantic status tokens** — `--success` / `--warning` / `--danger`, each with a `-soft` and a
  `-foreground` variant, exposed to Tailwind as `bg-success-soft`, `text-danger` etc.
  **`--destructive` is an alias of `--danger`.** Never hardcode a status colour at a call site —
  use `StatusPill` or the semantic classes.
- **Shadows are namespaced `--shadow-soft-*` → `shadow-soft-xs|sm|md|lg`.** Tailwind's built-in
  `shadow-*` scale is deliberately **left untouched**: the public invitation's polaroid frames
  depend on it, and overriding it also breaks `shadow-{color}` tinting app-wide. Surfaces rest at
  `shadow-soft-xs`; dialogs and popovers use `shadow-soft-lg`. **Future work must follow this —
  add to `--shadow-soft-*`, never redefine `--shadow-*`.**
- **Charts** — `--chart-1..5` are a warm ramp (clay, sage, ochre, dusty rose, warm slate).

### Typography

`Inter` on `--font-sans`, **`Bricolage Grotesque` on `--font-display`**, and
`--font-heading: var(--font-display)` in `@theme inline` — so every shadcn title
(`ui/card`, `ui/dialog`, `ui/sheet`, `ui/alert-dialog`) inherits the display face with no
call-site edits. `Geist`/`Geist_Mono`/`Figtree` are gone. `Fleur_De_Leah` (`--font-script`) and
`Gowun_Batang` (`--font-serif-elegant`) are **invitation-only** and unchanged.

Type scale utilities (defined once in `globals.css`, used instead of ad-hoc class strings):

| Class             | Face      | Use                                                     |
| ----------------- | --------- | ------------------------------------------------------- |
| `text-display`    | Bricolage | `/dashboard` + marketing hero                           |
| `text-title`      | Bricolage | page `<h1>` — rendered by `PageHeader`, not by the page |
| `text-section`    | Bricolage | card / section headings                                 |
| `text-body`       | Inter     | default body copy                                       |
| `text-caption`    | Inter     | muted subtitles and helper text                         |
| `text-metric`     | Bricolage | `StatCard` values (tabular-nums)                        |
| `tabular-figures` | —         | opt-in tabular numerals for numeric table cells         |

### Icons

`components.json` declares `iconLibrary: "lucide"`. **`lucide-react` is the only icon library** —
`@hugeicons/react` and `@hugeicons/core-free-icons` have been removed from `package.json`.

### The `.invitation-theme` contract

Dashboard tokens are global (Radix portals mount to `document.body`, so scoping them to a wrapper
would strand every menu and toast). The public guest invitation — a finished design that is
**out of scope** and must not shift — is therefore **positively pinned** by a `.invitation-theme`
class in `globals.css` that re-declares `--background`, `--card`, `--popover`, `--foreground`,
`--border`, `--muted`, `--ring`, `--radius: 0.625rem` and `--font-sans` to their pre-redesign
values, and **re-applies `font-family` and `color` as real declarations** (redefining the variables
alone does not reach the subtree, because `html { font-family: var(--font-sans) }` resolves once
and inherits as a computed string).

It is applied in exactly three places:

1. `public-invitation/templates/elegant/frame.tsx` — the `ElegantFrame` root
2. `public-invitation/templates/elegant/blocks/special-invitation-dialog.tsx` — on the
   `DialogContent` itself (custom properties inherit from the element, so this survives the
   Radix portal)
3. `template-selection/template-settings.tsx` — the preview container wrapping
   `<InvitationTemplate>`, so the editor preview keeps matching the live page

**Rules that follow from this:**

- **Any new public template must apply `.invitation-theme` to its own frame.**
- **Any shadcn primitive the guest page consumes must carry the class** (today `ui/dialog` is the
  only one).
- Nothing type-checks or tests this — it is a convention, not an invariant (see TODO-08-33).

Known accepted deviation: `ElegantFrame`'s translucent `bg-wedding-soft/40` backdrop composites
against `<body>`, which is outside the pinned scope, so the desktop gutter tint shifts by 2–6/255.
Sub-perceptual, invisible at mobile widths, accepted (TODO-07-31).

---

## Component Map

```
src/components/
  providers/
    root-providers.tsx          ClerkProvider > ConvexClientProvider > ThemeProvider > Toaster
    convex-client-provider.tsx  ConvexProviderWithClerk wired to Clerk useAuth

  app/                          Shared dashboard primitives. Barrel: `src/components/app/index.ts` — import from `@/components/app`
    page-header.tsx             PageHeader `{title, description?, actions?, breadcrumb?, className?}` — the page `<h1>` (text-title) + optional actions row. Pages must NOT render their own `<h1>`
    panel.tsx                   Panel `{title?, description?, actions?, footer?, padded?=true, children?, className?, bodyClassName?}` — the standard bordered surface (wraps shadcn Card)
    list-row.tsx                ListRow `{leading?, title, subtitle?, meta?, actions?, className?}` + ListRows — retires the hand-rolled `<ul>` rows in messages/activity/members/special-events/menu
    data-table-shell.tsx        DataTableShell `{toolbar?, children, footer?, className?}` — owns `overflow-x-auto`, the sticky `<thead>` and the 56px row rhythm. Every dashboard table goes through it
    stat-card.tsx               StatCard `{label, value, hint?, icon?, href?, tone?}` — the metric tile (text-metric). `href` makes it a real link. Replaces the deleted `dashboard/metric-card.tsx` (its dead `trend` prop is gone)
    state-block.tsx             StateBlock `{kind: "empty"|"loading"|"error", title?, description?, icon?, action?, retry?, compact?, className?}` — the single async-state surface
    status-pill.tsx             StatusPill `{tone?, dot?, children, className?}` — semantic status chip; replaces the per-call-site pastel maps
    access-notice.tsx           AccessNotice `{requiredRole: EventRole, children?, className?}` — the "you need role X" panel for role-gated pages
    query-error-boundary.tsx    Client error boundary for a single async subtree (not in the barrel; the route `error.tsx` files are the default path)
    logo.tsx                    "Wedboard" wordmark
    loading-state.tsx           Thin wrapper over `StateBlock kind="loading"` (kept for call-site compatibility)
    empty-state.tsx             Thin wrapper over `StateBlock kind="empty"` (kept for call-site compatibility)
    status-badge.tsx            Maps status string → StatusPill
    copy-button.tsx             Clipboard copy with checkmark feedback

  dashboard/
    event-provider.tsx          Resolves [eventSlug]→event via getEventBySlug (payload = `{...event, myRole}`); exposes useEvent() (typed `EventWithRole`) + `useEventRole()`; handles loading/not-found. Wraps only event routes.
    dashboard-shell.tsx         Sidebar + Header + scrollable main. **Owns all page padding and rhythm** — `px-5 py-6 / md:px-10 md:py-9` with an inner `mx-auto max-w-[1180px] space-y-9`. Pages render bare fragments (see Key Conventions)
    dashboard-sidebar.tsx       Grouped nav + event-switcher + user info. Exports `NAV_GROUPS` (Overview / Guests / Event / Design / Manage) and `getSectionLabel(segment)`. Each item carries a `minRole` and is **filtered by the caller's event role** (`useEventRole()` + `hasMinRole`); a group whose items are all gated out renders nothing, label included. Collapse-to-rail is persisted in `localStorage` under `wedboard:sidebar-collapsed` (module-level store + `useSyncExternalStore`); under `md` the nav is a `vaul` drawer. The "Wedboard" logo is a home Link — /admin for superadmins, /dashboard otherwise
    dashboard-header.tsx        `Breadcrumb` (event → section, via `getSectionLabel`), event name (useEvent), status badge, UserButton. There is no `PAGE_TITLES` map — the page title belongs to `PageHeader`
    event-switcher.tsx          `Command`-based searchable combobox to switch events (by slug → /dashboard/{slug}) or create new
    user-sync.tsx               Invisible — calls upsertCurrentUser on mount
    create-event-dialog.tsx     Form dialog to create an event; navigates to /dashboard/{slug}
    custom-domain-settings.tsx  "use client" — guided custom-domain wizard on the settings page: none → connect (POST /api/domains) → pending-DNS (record table w/ copy buttons + TXT-challenge note, records re-fetched from /api/domains/status after reloads) → live (badge, visit link, remove behind AlertDialog)

  invitations/
    invitation-list.tsx         **Table** (column headings: Invitation/Guests/Special Invitations/Status/Sent/Actions — Sent is a checkbox wired to `setInvitationSent`; the edit dialog receives the fresh row looked up by id so its Sent switch stays live) of invitations with edit/delete/copy-link; the Guests column lists each linked guest's name with a **+1** marker on +1 records (props from getInvitationsPageData). Takes an optional `customDomain` prop (the event's verified custom domain, if any) forwarded to `CopyInvitationLinkButton`
    invitation-form.tsx         Create/edit dialog (styled like the guest dialog — scrollable, `space-y-1.5` fields); no Max Guests / Type fields (removed). **Both modes** manage the linked **guests** (checklist of the invitation's guests + un-invited pool) and the **special-invitations** checklist; on save these go to `createInvitation`/`updateInvitation` as `guestIds`/`specialEventIds`. In edit mode the composition controls **lock** (disabled + amber notice) once any linked guest has responded (server enforces the same). No +1 switch (moved to guests). Edit mode shows a prominent "Invitation sent / Not sent yet" Switch card at the top (green when sent), saved immediately via `setInvitationSent`
    copy-invitation-link-button.tsx  Copies the public invitation link to clipboard — `https://{customDomain}/invitations/{slug}` when the event has a verified custom domain (`customDomain` prop), else `{origin}/{eventSlug}/invitations/{slug}`

  guests/
    guest-table.tsx             TanStack Table — search + RSVP filter; Menu/Drink columns shown only when those options exist; a **+1 column** (host → its +1 name / "Allowed"; +1 record → "↳ +1 de <host>") and **one column per special invitation** (Not invited / pending / accepted / declined)
    guest-details-sheet.tsx     Centered **Dialog** (despite the filename) — edit guest fields (no special-requests field) + **"Allows +1" toggle and +1 management** (Add/Remove via addPlusOne/removePlusOne; +1 records show their host read-only) + a combined **RSVPs** group: the main-event status select alongside one editable status select per **special invitation in the event** (incl. ones the guest wasn't invited to, default "Not invited"). Picking a status adds the guest via `setSpecialEventRsvp`; picking "Not invited" removes them via `removeSpecialEventRsvp`. Saved immediately; statuses sourced from the enriched guest's `specialStatuses`
    guest-form.tsx              Add guest form — props `{eventId, invitationId?}`; **"Allows +1"** checkbox (`allowsPlusOne`), no primary-contact/plus-one checkboxes
    rsvp-status-badge.tsx       attending=green, declined=rose, pending=amber

  menu/
    menu-option-list.tsx        List of options with active toggle + edit/delete
    menu-option-form.tsx        Create/edit dialog for menu or drink option
    selection-summary.tsx       Option → guest count breakdown (props: options + counts/unassigned from menu.getSelectionCounts). The menu page renders a `StateBlock kind="loading"` for the panel while the counts query is in flight

  media/
    media-grid.tsx              Thumbnail grid with inline rename + delete (exports MediaItem type)
    upload-button.tsx           File input → Convex upload URL → media.register (client-side type/size checks)
    media-picker-dialog.tsx     Pick (or upload) one image from the event library — used by the template editor's image fields. Has its own loading and empty `StateBlock`s

  meta/
    meta-settings.tsx           "use client" — the Meta & Sharing page: title/description template inputs with clickable {variable} badges + char counters, social-image picker (MediaPickerDialog), favicon uploader, and a live social-card preview resolved against the event's first invitation; saves via meta.updateEventMeta
    favicon-upload-button.tsx   Uploads an .ico/.svg/.png into the media library (extension fallback for browsers reporting empty .ico mime)

  messages/
    message-list.tsx            `ListRow`s of host messages (sender initial, name, invitation title, body, relative date in a `<time datetime>` carrying the absolute timestamp) — exports GuestMessageItem type. An unnamed sender renders as **"Anonymous"** (host UI is English)

  activity/
    activity-list.tsx           List of activity-log rows ("{actor} {created|modified|removed} {entity} {name}" + relative time) — exports ActivityLogItem type

  members/
    member-list.tsx             Member rows (name/email, role Select or static Owner/co-owner Badge, remove behind AlertDialog); role edits via members.updateMemberRole, removal via members.removeMember (owner-only for co-owners). Exports MemberItem type
    add-member-dialog.tsx       Add-by-email + role Select (Co-owner offered only to the owner) → members.addMember

  special-events/
    special-event-list.tsx      Rows: name, date/time, location, description, active toggle, edit/delete (+ "visible to N invitations" count)
    special-event-form.tsx      Create/edit dialog (name, description, datetime-local date, location, active) + per-invitation visibility checkboxes (edit mode; toggles invitations.setSpecialEventAccess). Powered by getSpecialEventsPageData.

  tables/
    table-grid.tsx              Responsive grid of TableCards
    table-card.tsx              Single table: seats, assign/unassign, edit/delete. Generates seat indices **0..seatsCount-1** and labels them **1..seatsCount** (matching the server's 0-based `seatNumber` bound). Shrinking the seat count opens an `AlertDialog` naming the guests who would be unseated
    seat-select.tsx             Dropdown to assign an unassigned guest to a seat — takes the 0-based `seatNumber` it sends and a 1-based `seatLabel` used only in the accessible name
    add-table-dialog.tsx        Create table dialog

  public-invitation/
    public-invitation-page.tsx  Loads the invitation via getPublicInvitation (eventSlug prop) or getPublicInvitationByHost (host prop — custom domains; the other query is "skip"ped); handles loading/not-found, then renders InvitationTemplate with event.templateId + event.layoutBlocks. On custom domains data.eventSlug is sourced from the payload's event.slug so public mutations keep working
    invitation-not-found.tsx    Branded "Invitation Not Found" screen — shared by public-invitation-page and the /_domain catch-all
    event-landing.tsx           "use client" — custom-domain root landing: loads events.getPublicEventByHost, renders an elegant-styled countdown page (couple names, formatted date, days/hours/min countdown or "¡Llegó el día!", venue + "Ver mapa") reusing ElegantFrame + elegant primitives; null → InvitationNotFound
    types.ts                    Local PublicEvent/PublicInvitation/PublicGuest/PublicInvitationData (incl. mediaUrls) types for the template
    blocks.ts                   Page-builder model: BlockType union (incl. `guestMessage`), RsvpVariant (`pending`/`accepted`/`declined`) + RSVP_VARIANTS, LayoutBlock, ConfigField (input: text | textarea | list | image | toggle | select; list supports itemFields for structured rows; select resolves options via `optionsSource` for a dynamic source — currently `"specialEvents"` — or a static `options` list, e.g. the special-invitation `specialTemplateId` template picker), BLOCK_DEFS, BLOCK_PALETTE, createBlock(), defaultLayout(variant) (per-variant fallback order), resolveLayout(), getConfigString(), getConfigList()
    template-theme.tsx          "use client" — TemplateTheme tokens for elegant; TemplateThemeProvider + useTemplateTheme (consumed by the template frame/blocks)
    templates/
      template-registry.ts      Source of truth for templates: TemplateDef ({id,label,description,theme, Frame, blocks (per-BlockType markup), optional defaultLayouts (per RsvpVariant), optional defaultBlockConfig used to seed configs of newly added blocks}), TEMPLATES, TEMPLATE_LIST, DEFAULT_TEMPLATE_ID (="elegant"), resolveTemplate()
      types.ts                  Shared template contracts: BlockComponentProps/BlockComponent + FrameProps/FrameComponent (imported by every template's frame + blocks)
      invitation-template.tsx   "use client" — resolves the template, renders its Frame, and for each LayoutBlock its block component (block types the template omits render nothing); takes `rsvpState`; layout = saved blocks ?? template.defaultLayouts[rsvpState]() ?? defaultLayout(rsvpState)
      dummy-data.ts             DUMMY_INVITATION_DATA sample used by the live preview
      elegant/                  The official template (Figma design, node 452:172) — its own markup, not the default sections
        frame.tsx               ElegantFrame — phone-width card, NO global gap (each block owns padding). **Carries `.invitation-theme` on its root** (see Design System)
        blocks.tsx              "use client" — ELEGANT_BLOCKS: a component per design section (hero/location/rsvp/countdown/itinerary/text/allergies/dressCode/specialInvitation/guestMessage/footer) + primitives (ElegantSection [24px horizontal padding; each block sets its own vertical padding/gap], WeddingButton [renders an `<a>` when given `href` — location "Ver mapa" links to `event.venueMapUrl`], CheckRow [real interactive checkbox/radio], CircularPhoto/ImagePlaceholder render real images from mediaUrls when an "image" config field is set). The `guestMessage` block (`blocks/guest-message.tsx`) is a working name + message form wired to `messages.submitGuestMessage`. The `specialInvitation` block (`blocks/special-invitation.tsx`) renders a decorated sub-event card (its name/description/date/location **sourced from the linked special event**, managed under the dashboard's Special Events page — not authored in the block) plus a "Confirmar asistencia" button that opens a themed modal (shadcn `Dialog`) showing the event's date/time/location/description and a per-guest attending/declining radio group, submitting via `submitPublicRsvp.specialEventRsvps`. It binds to a special event via its `specialEventId` config (falls back to the sole accessible one) and picks a display template via `specialTemplateId` (a small `SPECIAL_TEMPLATES` registry — `elegant` (decorated card) or `with-image` (a full-width 16/10 photo from the block's `image` config above name/description); both share the same modal button via `blocks/special-invitation-dialog.tsx`, and the `with-image` card lives in `blocks/special-invitation-with-image.tsx`). Because `getPublicInvitation` only returns special events the invitation has access to, the block **renders nothing on the live page when unbound** (i.e. the invitation isn't assigned it); in the editor preview it shows the sample sub-event with the button disabled. Each guest is prefilled from `specialEvents[].guestStatuses`. Hero uses `event.brideName`/`groomName` (stacked on two lines). All copy reads block.config first, falling back to ELEGANT_COPY
        default-copy.ts         ELEGANT_COPY (the design's Spanish copy) + ELEGANT_BLOCK_CONFIG (per-block default configs)
        default-layout.ts       elegantDefaultLayouts: Record<RsvpVariant,()=>LayoutBlock[]> — accepted (full design order), pending (hero/location/rsvp/footer), declined (hero/location/guestMessage/footer); configs seeded from ELEGANT_BLOCK_CONFIG. elegantDefaultLayout() = the accepted layout
        index.ts                Re-exports ElegantFrame, ELEGANT_BLOCKS, elegantDefaultLayout(s)

  template-selection/
    template-settings.tsx       "use client" — template picker + per-RSVP-variant block page-builder (Pending/Accepted/Declined Tabs; add via Select with template-seeded config, reorder up/down, duplicate, remove, edit fields) + live InvitationTemplate preview (dummy data + the event's real media URLs, `rsvpState` = active tab); saves all three variants via events.setInvitationTemplate `layoutVariants`. The preview container carries `.invitation-theme` so it matches the live page. Rendered by /dashboard/[eventSlug]/template
    config-field-input.tsx      "use client" — ConfigFieldInput: renders one block-config field switching on field.input (text / textarea / list with add-remove rows / image via MediaPickerDialog / select populated from a dynamic source, e.g. the event's special events). Takes an optional `specialEvents` prop for select fields.

src/hooks/
  use-toast-mutation.ts         useToastMutation(ref, {success?, error}) — wraps useMutation with the try/catch + sonner toast convention; returns {run, pending}; run never throws, returns {ok, value} | {ok:false}

src/lib/
  roles.ts                      EventRole / AssignableRole types, ROLE_RANK, hasMinRole(role, min), ROLE_LABELS (planner → "Co-owner"). Client mirror of the Convex role hierarchy — used to gate sidebar nav, settings, and the members UI
```

> **Public template (page builder):** the public invitation is a **page builder** — an ordered list
> of `LayoutBlock`s (`{id, type, config?}`) defined in `blocks.ts`, authored **per RSVP variant**
> (`pending`/`accepted`/`declined`). The public page derives the variant from the invitation's guests
> and renders that variant's layout (see `getPublicInvitation`); the owner authors all three in the
> template editor's tabs. Block types (hero, text, location, countdown, itinerary, dressCode,
> specialInvitation, rsvp, allergies, menuSelection, drinkSelection, guestMessage, footer)
> may repeat (e.g. several `text` blocks). **All non-derived text is authorable**:
> every block with copy carries it in `config` (incl. `rsvp` title/deadline/attendLabel/declineLabel/note/submitLabel, `footer.body`, `allergies`
> headline/note/options string-list, `itinerary.items` `{time,label,illustration}` list — each
> itinerary item's `illustration` is picked from a preset set of SVGs via a modal picker; the presets
> live in `templates/elegant/illustrations.ts` (`ITINERARY_ILLUSTRATIONS`, documented for adding more));
> only derived data (event
> name/bride/groom names/date/venue/map link, guest names — managed in event settings) is not. The
> hero shows the couple via `event.brideName`/`groomName` (falling back to splitting the event name),
> and the location "Ver mapa" button links to `event.venueMapUrl` (falling back to a Google Maps search
> of the address). Image slots are `config` fields of input kind `"image"`
> storing a media id (`hero.heroImage`, `location.mapImage`, `dressCode.photo`, `specialInvitation.image`),
> resolved to URLs via `getPublicInvitation.mediaUrls`.
> The owner builds the layouts at `/dashboard/[eventSlug]/template` (pick template + Pending/Accepted/Declined
> tabs + add/reorder/duplicate/remove/edit + live preview). Layouts are stored on `events.layoutVariants`
> (`{pending,accepted,declined}`); a variant undefined = the selected template's `defaultLayouts[variant]()`,
> then the global `defaultLayout(variant)`. The legacy single `events.layoutBlocks` is read as the `accepted`
> fallback (migration path). **RSVP-state rule:** any guest attending → `accepted`; else any pending or no
> guests → `pending`; else (all declined) → `declined`. The elegant `rsvp` block requires every named guest
> to pick a choice before submitting, so the derived state stays unambiguous.
>
> **Templates own their markup.** A `TemplateDef` (template-registry) supplies its own page `Frame`,
> a per-`BlockType` component map, and an optional preset `defaultLayouts` (per RsvpVariant); block types a
> template omits render nothing. There is no shared default markup — the shared `BlockComponentProps`/`FrameProps`
> contracts live in `templates/types.ts`. So templates differ in **markup and structure**, not just theme.
>
> - **`elegant`** is the **only official template** (default), implementing the Figma
>   design (file `heSJxDYKECFLtzVd9F1LyJ`, frame `525:3`) under `templates/elegant/`: its own `Frame`
>   - a component per section, gold/serif styling via the `wedding-*` palette and
>     `font-script`/`font-elegant` (see globals.css + layout.tsx), and a preset Spanish layout (configs
>     seeded from `default-copy.ts`). **Spacing mirrors the Figma frame exactly**: 390px-wide white card
>     on `wedding-soft` (`ElegantFrame`); 24px horizontal padding on every block (`ElegantSection` base
>     `px-6`); and **each block owns its vertical padding + gap** (the frame has no global gap) per the
>     design's per-section values (e.g. hero `py-10`, location `pt-24 pb-6`, rsvp `px-10 py-12`, special
>     invite `px-16 py-40`, footer `py-10`). Palette/fonts already matched the design (gold `#c5a46d`,
>     ink `#3c3c3c`, soft `#ececec`, muted `#d9d9d9`; Fleur De Leah / Gowun Batang). Checkboxes are real
>     interactive controls (`CheckRow` — `checkbox` for food multi-select, `radio` for stay); the food
>     controls are not yet wired to `submitPublicRsvp`. The `rsvp` block **is** wired: it renders one
>     attending/declining radio group per **named guest** (+1 records are not shown as their own rows).
>     Each host that `allowsPlusOne` gets a +1 sub-question (a "bring a +1" checkbox + optional name input)
>     shown once the host is marked attending. Submit calls `submitPublicRsvp` with `guestUpdates` (named
>     guests) + `plusOneUpdates` (per host), which materializes the +1 as a real linked guest. Submission needs `data.eventSlug` +
>     `data.invitationSlug` (injected by `public-invitation-page`); they're absent in the editor preview,
>     so the button is disabled there. Image slots render the configured media image or a placeholder.
>     The `guestMessage` block (shown on the `declined` layout) is likewise wired — a name + message form
>     that calls `messages.submitGuestMessage`; messages surface at `/dashboard/[eventSlug]/messages`.
>     The `specialInvitation` block **is** wired too: special invitations are first-class mini sub-events
>     (table `specialEvents`, ≤2 per event) managed at `/dashboard/[eventSlug]/special-events`, where the
>     owner sets name/description/date/location and assigns **which invitations** can see each (per-invitation
>     `invitationSpecialEventAccess`). In the Template Editor the block selects which special event to show
>     (`specialEventId`) and a display template (`specialTemplateId`); its card content is sourced from the
>     linked special event (not authored in the block). On the public page the card button opens a themed modal
>     showing the event details (date/time and location prefixed with calendar / map-pin icons) + a per-guest
>     attending/declining radio group, submitting via `submitPublicRsvp.specialEventRsvps` (`guestUpdates: []`);
>     responses persist **only** to `guestSpecialEventRsvps` (no aggregate invitation/guest status yet). The
>     card button label is authorable two ways: `confirmLabel` (default "Confirmar asistencia") before
>     responding, and `detailsLabel` (default "Ver detalles") once **every** named guest already has a stored
>     status for that special event — then the button is a read-only "view details" affordance opening the same
>     modal with their saved choices. Because the block only renders for invitations granted access, it
>     **renders nothing on the live page when unassigned**; the editor preview shows the sample sub-event with
>     the button disabled.
> - **A new template's `Frame` must apply the `.invitation-theme` class on its root**, and any
>   shadcn primitive its blocks consume must carry it too — otherwise the guest page inherits the
>   dashboard's global tokens. See the Design System section.
> - Add more templates by giving each its own `Frame`/`blocks` (and optional `defaultLayouts`) in its
>   `TemplateDef`; a template implements the markup for every block type it intends to render.

---

## Auth Flow

1. Middleware (`src/middleware.ts`) first checks the request `Host`: a host is treated as "primary" (serves the normal app) if it matches `NEXT_PUBLIC_PRIMARY_DOMAIN` (or `www.` + it), `localhost`/`127.0.0.1`, any `*.vercel.app`, or is listed in the optional `NEXT_PUBLIC_APP_DOMAINS` comma-separated allowlist (for hosting the app itself on an additional domain). Any other host is a custom-domain and is rewritten to `/_domain/{host}{path}`, **never touching Clerk**; on a primary host, direct `/_domain` paths 404. Then it protects every non-public route: if there's no `userId` it **redirects to `/`** (not `/sign-in`). The marketing landing links to sign-in.
2. After sign-in/sign-up, Clerk redirects to `/dashboard` (via `fallbackRedirectUrl`). `/dashboard` shows the events list — it does **not** auto-redirect into a single event. This Clerk app uses the **native Convex integration** (activated at `dashboard.clerk.com/apps/setup/convex`), **not** a JWT template: the Clerk **session token itself** carries `aud: "convex"`, so there is **no JWT template named `convex`** — calling `getToken({ template: "convex" })` against this app returns a Clerk `404 "No JWT template exists with name: convex"`. Fetch the Convex token with plain `getToken()` instead (client-side, `ConvexProviderWithClerk` does this automatically by checking `sessionClaims.aud`; server-side, use `getConvexToken()` from `src/lib/convex-token.ts`, which mirrors that check)
3. `ConvexProviderWithClerk` attaches the Clerk JWT to every Convex request
4. `convex/auth.config.ts` validates the JWT against `CLERK_FRONTEND_API_URL`
5. The `(dashboard)/layout.tsx` gates its subtree on Convex auth state via `<AuthLoading>` / `<Authenticated>` / `<Unauthenticated>` (from `convex/react`). This is required: it ensures no query/mutation (`UserSync`, `listMyEvents`, `getEventBySlug`, …) runs before the Clerk token is attached to the Convex client — otherwise `requireUser` throws `Unauthorized` on a hard refresh. `<Unauthenticated>` client-redirects to `/` (`RedirectToHome`).
6. `UserSync` (inside `<Authenticated>`) calls `upsertCurrentUser` on mount → creates/updates the `users` table row
7. All protected Convex functions call `requireUser(ctx)` which reads `ctx.auth.getUserIdentity()` and looks up by `tokenIdentifier`
8. Public routes (`/[eventSlug]/invitations/[invitationSlug]`, `/_domain/*` rewrites, `/api/(.*)`) skip Clerk middleware auth — public Convex functions use no auth checks; the `/api/domains*` handlers do their own auth check and forward the Clerk JWT via `getConvexToken()` (`src/lib/convex-token.ts` — mirrors ConvexProviderWithClerk: plain `getToken()` when the session token already has `aud: "convex"` from the native Clerk Convex integration, else the legacy `getToken({template:"convex"})` JWT template) to Convex via `fetchQuery`/`fetchMutation`, so event ownership is still enforced by `requireEventMember`

## Custom Domains

Implemented for **custom domains only** (`events.subdomain` + `by_subdomain` remain future). Flow:

- Owner connects a domain in Settings (`custom-domain-settings.tsx`) → `POST /api/domains` claims it in Convex (`setCustomDomain`: normalize/validate/unique) **then** attaches it to the Vercel project (`src/lib/vercel-domains.ts`, `POST /v10/projects/{id}/domains`); on Vercel failure the Convex claim is rolled back. Requires `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` (+ optional `VERCEL_TEAM_ID`) env.
- The wizard shows the DNS records to add at the registrar (A `76.76.21.21` for apex / CNAME `cname.vercel-dns.com` for subdomains, plus Vercel TXT ownership challenges when the domain is held by another Vercel account — built by `buildDnsInstructions` from live Vercel responses). "Check status" hits `GET /api/domains/status`, which attempts a verify, computes `live = verified && !misconfigured`, and syncs `customDomainVerified`.
- Middleware rewrites non-primary hosts to `/_domain/{host}{path}`; `getPublicInvitationByHost` resolves the event via `resolvePublicEventByHost` (archived events 404). The custom domain's root renders the countdown landing (`event-landing.tsx` via `events.getPublicEventByHost`); other unknown paths render the branded `invitation-not-found.tsx`. Routing never gates on `customDomainVerified`.
- Removing (`DELETE /api/domains`) detaches from Vercel (404 tolerated) then clears the Convex fields. Media URLs are absolute Convex URLs, so they are domain-independent.
- Local testing: set `customDomain` on an event, then `curl -H "Host: mywedding.test" http://localhost:3000/invitations/{slug}` (or add the host to `/etc/hosts`).

## Product Specs (`docs/`)

This file is the **system** reference: schema, Convex modules, routes, component map — _what
exists in the codebase_. [`docs/`](docs/) is the **product** reference: _what workflow a user
performs, under what rules, and how we know it works._ Reach for it whenever the question is
behavioral rather than structural.

| Document                                                       | Use it for                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [docs/README.md](docs/README.md)                               | Index, how to read a spec, status legend, epic map                       |
| [docs/glossary.md](docs/glossary.md)                           | Domain language — Event, Invitation, +1, RSVP Variant, Event Key, Block… |
| [docs/roles-and-permissions.md](docs/roles-and-permissions.md) | **Authoritative** capability × role matrix                               |
| [docs/workflow-catalog.md](docs/workflow-catalog.md)           | All 86 workflows → epic, actor, spec, status                             |
| [docs/backlog.md](docs/backlog.md)                             | All 298 defects and gaps, P0–P2, issue-ready                             |
| [docs/\_conventions/](docs/_conventions/)                      | The spec template and authoring guide                                    |

16 epics, 64 feature specs under `docs/epics/`. Each spec follows a fixed 16-section
skeleton; the sections most worth reading are §10 Business Rules (each tagged `[AS-BUILT]`
and traced to `path:line`), §11 Acceptance Criteria, §14 TODOs & defects, and §15
Traceability.

**Before changing behavior, read the owning spec.** Its §10 states the rules the code is
expected to satisfy, and §14 records what is already known to be wrong — which often means
the change is already specified.

> **The specs are as-built, not aspirational.** Where a spec and the code disagree, the code
> wins and the discrepancy is a defect. Where this file and the code disagree, the same rule
> applies — several such discrepancies are recorded in `docs/CHANGELOG.md`.

## Documentation Rule

**CLAUDE.md, AGENTS.md, _and the affected product spec_ must be updated whenever the app changes.**

This applies to every PR, fix, or feature — no exceptions:

- Added or removed a DB table or field → update the Schema section
- Added, renamed, or deleted a Convex function → update the Convex Modules section
- Added a new route or changed a route path → update the App Routes section
- Added, renamed, or deleted a component → update the Component Map section
- Introduced a new convention or changed an existing one → update Key Conventions
- Changed how auth works → update the Auth Flow section
- Added or changed a Zod schema → update the Zod Validations section

**Behavior changes additionally require a spec update, in the same change as the code:**

- Changed a business rule, guard, cap, or contract → update the owning spec's §10/§9, bump
  its `version` (`MAJOR` when a rule changes meaning, `MINOR` when one is added), and add a
  row to its §16 Changelog
- Added a user-facing capability → add or update the feature spec, and register its
  workflow in `docs/workflow-catalog.md`
- Fixed a `DEF-`/`TODO-` → remove it from the spec's §14 **and** from `docs/backlog.md`
- Found a new defect or gap → add it to the owning spec's §14 **and** `docs/backlog.md`

Spec ↔ backlog parity is a hard requirement: an ID exists in exactly one spec's §14 and in
`docs/backlog.md`, never one without the other. See
[docs/\_conventions/authoring-guide.md](docs/_conventions/authoring-guide.md) for the ID
scheme and semver rules.

`CLAUDE.md` is a one-line `@AGENTS.MD` import, so editing this file is sufficient — do not
duplicate its contents into `CLAUDE.md`.

## Key Conventions

- **Date fields**: always store as Unix ms timestamp (`number`). Convert HTML `<input type="date">` strings with `new Date(str).getTime()` before sending to Convex.
- **ID types**: use `Id<"tableName">` from `convex/_generated/dataModel`. Cast URL params: `params.eventId as Id<"events">`.
- **Convex imports from Next.js**: use `convex/*` path alias (e.g. `import { api } from "convex/_generated/api"`), not `@/`.
- **Shadcn/app imports**: use `@/*` alias (e.g. `import { Button } from "@/components/ui/button"`).
- **No `.collect()`**: use `.take(n)` for bounded queries per Convex guidelines.
- **No `.filter()`**: always use `.withIndex()`.
- **Mutations always toast**: use `useToastMutation` (`src/hooks/use-toast-mutation.ts`) instead of hand-rolled try/catch — it wraps `useMutation` with the success/error sonner toasts and a `pending` flag; `run()` returns `{ok, value}` for branching. It **unwraps `ConvexError` payloads** (`err.data`, string or `{message}`) and toasts the server's own message, falling back to the caller's generic `error` string only for unexpected failures. So a `ConvexError` thrown in a mutation is user-facing copy — write it that way.
- **Design tokens, not literals**: no `zinc-*`/`gray-*` and no hardcoded status colours anywhere under `src/` outside `src/components/public-invitation/`. Use the semantic tokens, the type-scale classes (`text-title`, `text-caption`, …) and `StatusPill`.
- **Shadows**: `shadow-soft-xs|sm|md|lg` only. Never redefine Tailwind's built-in `--shadow-*` scale — the public invitation depends on it and overriding it breaks `shadow-{color}` tinting app-wide.
- **`.invitation-theme`**: every public invitation frame, and every shadcn primitive the guest page consumes, must carry the class. See Design System.
- **Shell owns the page frame**: `DashboardShell` applies the padding (`px-5 py-6 / md:px-10 md:py-9`), the `max-w-[1180px]` measure and the `space-y-9` rhythm. **Dashboard pages render bare fragments** — no per-page padding, no `max-w-*`, no wrapper `<div className="p-6 space-y-6">`, and no `<h1>` (that belongs to `PageHeader`).
- **Async states**: a page owns its **empty** and **loading** states via `StateBlock`; it does **not** write an inline error branch. Convex `useQuery` _throws_ on failure rather than returning `null`, so errors are caught by the route `error.tsx` boundary (`src/app/error.tsx`, `src/app/(dashboard)/error.tsx`). `undefined` means loading and only loading. Use `QueryErrorBoundary` only when one subtree must fail without taking the page with it.
- **Tables**: every dashboard table renders inside `DataTableShell`, which owns horizontal scrolling and the sticky header — do not hand-roll `overflow-x-auto`.
- **Bounded reads are disclosed**: where a query `.take()`s a cap, the surface renders a footer saying so (Activity 200, Messages 500, `/admin` events 200 / users 500). A new capped list must do the same.
- **Icon-only buttons** carry an accessible name (`aria-label` or an `sr-only` span) and, in dense rows, a `Tooltip`.
- **Copy**: the dashboard is **English**; the guest-facing invitation is **Spanish**. Host-facing fallbacks (e.g. an unnamed message sender → "Anonymous") use the host UI's language. "Special Events" is called **"Special Invitations"** in all user-facing copy; only the route segment and the `specialEvents` table keep the old name.
- **Convex auth guard**: event-scoped functions call `requireEventEditor(ctx, eventId)` (or load the doc first, then guard on `doc.eventId`); public slug-based functions resolve via `convex/lib/public.ts` so archived-event gating stays centralized.
- **Event roles**: `requireEventEditor` now takes a `minRole` (default `"editor"`) — content (guests/invitations/special events/menu/tables/media/**template/meta**) is editor+, privileged ops (settings/domain/members management) are planner+ ("Co-owner"), archive/delete are owner-only. Read-only member data uses `"viewer"`. Surface the caller's role to the client via `getEventBySlug`'s `myRole`; gate UI with `hasMinRole` (`src/lib/roles.ts`). Server guards are the source of truth — UI gating is convenience only.
- **Activity logging**: dashboard mutations that create/update/delete a guest, invitation, or special event — plus `setInvitationTemplate` and `updateEventMeta` — call `logActivity(ctx, {...})` (`convex/lib/activity.ts`) **after** the write, reusing the user doc returned by `requireEventEditor`. Public and per-toggle mutations are intentionally not logged.
- **Seat numbering**: `guests.seatNumber` is **0-based** on the server (`assignGuestToSeat` rejects `seatNumber >= table.seatsCount`, and `updateTableSeats` unseats on the same arithmetic). The UI stores 0-based and **labels 1-based**. Never send a 1-based index to a seating mutation.
- **Client components**: any file using Convex hooks, Clerk hooks, or browser APIs needs `"use client"` at the top.

## Zod Validations (`src/lib/validations/`)

| File               | Schema               | Key rules                                                                                                                                                    |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `event.ts`         | `eventSchema`        | name min 2 chars, optional `slug` (`/^[a-z0-9-]+$/`, min 2), date optional string, optional brideName/groomName, optional `venueMapUrl` (valid URL or empty) |
| `invitation.ts`    | `invitationSchema`   | title min 2, slug: `/^[a-z0-9-]+$/`, optional notes (no `type`, no `maxGuests`, no `allowPlusOne`)                                                           |
| `guest.ts`         | `guestSchema`        | firstName/lastName required, email optional, `allowsPlusOne` boolean                                                                                         |
| `menu.ts`          | `menuOptionSchema`   | name required, isActive boolean                                                                                                                              |
| `table.ts`         | `tableSchema`        | name required, seatsCount 1–20                                                                                                                               |
| `special-event.ts` | `specialEventSchema` | name required, optional description/location, optional `date` (datetime-local string → `new Date(str).getTime()`), isActive boolean                          |
| `public-rsvp.ts`   | `publicRsvpSchema`   | array of guest updates + optional `plusOneUpdates` + optional special event RSVPs                                                                            |
| `guest-message.ts` | `guestMessageSchema` | optional name ≤200, message required 1–1000 chars                                                                                                            |

> **Note:** Do not use `.default()` on Zod booleans — it causes Resolver type mismatches with react-hook-form. Use `defaultValues` in `useForm` instead.
