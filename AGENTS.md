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

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router (`src/` dir, `@/*` alias) |
| Backend / DB | Convex (`convex/` at root, `convex/*` alias) |
| Auth | Clerk (`@clerk/nextjs` v7) + `ConvexProviderWithClerk` |
| UI | shadcn/ui + Tailwind CSS v4 |
| Forms | react-hook-form + zod + @hookform/resolvers |
| Tables | @tanstack/react-table |
| Toasts | sonner |
| Dates | date-fns |
| Package manager | pnpm |

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
```

Required Convex env (set once via CLI):
```bash
npx convex env set CLERK_FRONTEND_API_URL "https://sharing-akita-57.clerk.accounts.dev"
```

---

## Database Schema (`convex/schema.ts`)

### `users`
Mirrors Clerk identity. Created/updated on every login via `upsertCurrentUser`.

| Field | Type | Notes |
|---|---|---|
| clerkId | string | Clerk `subject` |
| tokenIdentifier | string | Canonical identity key — always use this for lookups |
| email | string | |
| firstName | string? | |
| lastName | string? | |
| role | string | Default `"user"` |

Indexes: `by_clerkId`, `by_tokenIdentifier`

---

### `events`
Top-level board. One event = one wedding/occasion.

| Field | Type |
|---|---|
| name | string |
| slug | string | Handle-style **event key**, globally unique, editable in settings. Used in public URLs. |
| ownerUserId | Id<"users"> |
| brideName | string? | Shown on the public invitation (hero) |
| groomName | string? | Shown on the public invitation (hero) |
| date | number? | Unix ms timestamp |
| venueName | string? | |
| venueAddress | string? | |
| venueMapUrl | string? | Google Maps (or any maps) link; backs the location "Ver mapa" button |
| subdomain | string? | Future |
| customDomain | string? | Future |
| templateId | string? | Public invitation template id (`"elegant"`); defaults to elegant when unset |
| layoutBlocks | `{id,type,config?}[]`? | Ordered page-builder blocks for the public invitation (see `public-invitation/blocks`). Undefined = default layout. `config` is `v.any()` (per-instance content, e.g. text headline/body) |
| status | `"draft" \| "active" \| "archived"` |

Indexes: `by_ownerUserId`, `by_slug`, `by_subdomain`, `by_customDomain`

---

### `eventMembers`
Links users to events with roles. Supports future multi-planner setup.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| userId | Id<"users"> |
| role | `"owner" \| "planner" \| "editor" \| "viewer"` |

Indexes: `by_eventId`, `by_userId`, `by_eventId_and_userId`

---

### `invitations`
A shareable link representing a person, couple, family, or group.
Public URL: `/{event-key}/invitations/{slug}`

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| title | string | e.g. "The Smith Family" |
| slug | string | URL-safe, unique per event |
| type | `"single" \| "group" \| "plusOne"` |
| maxGuests | number | 1–10 |
| allowPlusOne | boolean |
| isActive | boolean |
| notes | string? | Admin-only |

Indexes: `by_eventId`, `by_slug`, `by_eventId_and_slug`

---

### `guests`
Individual attendees. Belong to an event; optionally linked to an invitation.
A guest with no `invitationId` is "un-invited" and can be selected when creating an invitation.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| invitationId | Id<"invitations">? | Optional — un-invited guests have none |
| firstName | string |
| lastName | string |
| email | string? |
| phone | string? |
| isPrimaryContact | boolean |
| isPlusOne | boolean |
| rsvpStatus | `"pending" \| "attending" \| "declined"` |
| allergies | string? |
| specialRequests | string? |
| menuOptionId | Id<"menuOptions">? |
| drinkOptionId | Id<"drinkOptions">? |
| tableId | Id<"tables">? |
| seatNumber | number? | 0-based internally, 1-based in UI |

Indexes: `by_eventId`, `by_eventId_and_invitationId` (powers the un-invited guests query via `eq("invitationId", undefined)`), `by_invitationId`, `by_tableId`, `by_tableId_and_seatNumber`, `by_eventId_and_rsvpStatus`

---

### `specialEvents`
Optional sub-events (rehearsal dinner, after-party, etc.).

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| name | string |
| description | string? |
| date | number? |
| location | string? |
| isActive | boolean |

Index: `by_eventId`

---

### `guestSpecialEventRsvps`
Per-guest RSVP for each special event.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| guestId | Id<"guests"> |
| specialEventId | Id<"specialEvents"> |
| status | `"pending" \| "attending" \| "declined"` |

Indexes: `by_eventId`, `by_guestId`, `by_specialEventId`, `by_guestId_and_specialEventId`

---

### `invitationSpecialEventAccess`
Controls which invitations can RSVP to which special events.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| invitationId | Id<"invitations"> |
| specialEventId | Id<"specialEvents"> |

Indexes: `by_invitationId`, `by_specialEventId`, `by_invitationId_and_specialEventId`

---

### `menuOptions`
Food choices offered at the event.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| name | string |
| description | string? |
| isActive | boolean |
| sortOrder | number |

Index: `by_eventId`

---

### `drinkOptions`
Drink packages / options. Same shape as menuOptions.

Index: `by_eventId`

---

### `media`
Per-event image library (template photos, maps, etc.). Blobs live in Convex file storage; this table is the catalog. Only image mime types (jpeg/png/svg+xml/webp/gif), ≤ 5MB, max 50 per event (enforced in `media.register`).

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| storageId | Id<"_storage"> |
| name | string |
| mimeType | string |
| size | number |

Index: `by_eventId`

---

### `tables`
Seating tables. Seat assignments live on `guests` (tableId + seatNumber).

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| name | string |
| seatsCount | number | 1–20 |
| sortOrder | number |

Index: `by_eventId`

---

## Convex Modules

### `convex/lib/auth.ts`
- `getAuthenticatedUser(ctx)` — calls `ctx.auth.getUserIdentity()`, throws `ConvexError("Unauthorized")` if null
- `requireUser(ctx)` — calls getAuthenticatedUser, looks up user by `tokenIdentifier`, throws if not found

### `convex/lib/permissions.ts`
- `requireEventAccess(ctx, eventId, userId)` — verifies eventMembers membership or ownership
- `requireEventEditor(ctx, eventId)` — **the standard guard**: `requireUser` + `requireEventAccess` in one call, returns the user doc. Used by nearly all event-scoped functions
- `requireEventMember(ctx, eventId, userId, minRole?)` — enforces role hierarchy

### `convex/lib/public.ts`
- `resolvePublicEvent(ctx, eventSlug)` — public (unauthenticated) event lookup by slug; returns null for archived events (draft allowed for preview). Reuse for any future public resolver (e.g. custom-domain lookup)
- `resolvePublicInvitation(ctx, event, invitationSlug)` — active invitation within a resolved public event

### `convex/lib/options.ts`
Shared logic behind `menu.ts` and `drinks.ts` (they are thin wrappers): `listPublicOptions`, `listAdminOptions`, `createOption`, `updateOption`, `deleteOption`, plus `nextSortOrder(ctx, table, eventId)` (also used by `tables.createTable`).

### `convex/lib/slug.ts`
- `generateSlug(text)` — lowercases and hyphenates
- `generateUniqueSlug(ctx, tableName, slug, existingId?)` — global uniqueness (used for event slugs); appends -2, -3 etc.
- `generateUniqueInvitationSlug(ctx, eventId, slug, existingId?)` — uniqueness **scoped per event** via `by_eventId_and_slug`
- `RESERVED_EVENT_SLUGS` — set of top-level route names an event key may not use

### `convex/users.ts`
| Function | Type | Notes |
|---|---|---|
| `getCurrentUser` | query | Returns user doc or null |
| `upsertCurrentUser` | mutation | Creates/updates user from Clerk JWT — called on every app load |
| `ensureCurrentUser` | internalMutation | Same as upsert, internal use |

### `convex/events.ts`
| Function | Type |
|---|---|
| `listMyEvents` | query — events where user is owner or member (non-null) |
| `getEventById` | query |
| `getEventBySlug` | query — resolves an event by its slug (auth + access); used by dashboard routes |
| `getEventSummary` | query — event + counts |
| `createEvent` | mutation — creates eventMember with owner role; returns `{ eventId, slug }` |
| `updateEvent` | mutation — accepts optional `slug` (validates format, reserved words, global uniqueness) |
| `setInvitationTemplate` | mutation — sets `templateId` and/or `layoutBlocks` (min role planner) |
| `archiveEvent` | mutation |

### `convex/invitations.ts`
| Function | Type | Notes |
|---|---|---|
| `listByEvent` | query | Auth required |
| `getById` | query | Auth required |
| `getPublicInvitation` | query | **Public** — args `{eventSlug, invitationSlug}`; resolves via `lib/public.ts` (null for archived events / inactive invitations); returns `{event (incl. brideName, groomName, venueMapUrl, templateId, layoutBlocks), invitation, guests:[{firstName,lastName}], mediaUrls}` where `mediaUrls` maps media ids referenced in layout config → signed URLs |
| `createInvitation` | mutation | Per-event-unique slug; optional `guestIds` (≤20) links selected un-invited guests |
| `updateInvitation` | mutation | |
| `deleteInvitation` | mutation | **Unassigns** its guests (sets invitationId undefined), does not delete them |
| `setSpecialEventAccess` | mutation | Adds/removes invitationSpecialEventAccess row; verifies the special event belongs to the same event |
| `regenerateSlug` | mutation | |

### `convex/guests.ts`
| Function | Type | Notes |
|---|---|---|
| `listByEvent` | query | Auth required |
| `listByInvitation` | query | Auth required |
| `listUnassignedByEvent` | query | Auth required — event guests with no `invitationId` (uses `by_eventId_and_invitationId` with `eq(undefined)`) |
| `getGuestsPageData` | query | Auth required — `{guests, invitations, menuOptions, drinkOptions, tables}` in one round trip; powers the guests dashboard page |
| `getGuestById` | query | |
| `createGuest` | mutation | Requires `eventId`; optional `invitationId` (creates un-invited guest if omitted) |
| `updateGuest` | mutation | |
| `deleteGuest` | mutation | Cascades to guestSpecialEventRsvps |
| `bulkCreateGuestsForInvitation` | mutation | ≤20 guests per call |
| `submitPublicRsvp` | mutation | **Public** — resolves via `{eventSlug, invitationSlug}`; only patches whitelisted RSVP fields, validates menu/drink option ownership + `invitationSpecialEventAccess`, bounds arrays (≤20 guest updates) and strings (≤1000 chars). RSVP UI currently deferred |

### `convex/specialEvents.ts`
`listByEvent` (auth), `listForInvitation` (**public**), `createSpecialEvent`, `updateSpecialEvent`, `deleteSpecialEvent` (cascades access + RSVPs)

### `convex/menu.ts`
`listMenuOptionsByEvent` (**public**), `listMenuOptionsByEventAdmin` (auth), `getSelectionCounts` (auth — `{menuCounts, drinkCounts, menuUnassigned, drinkUnassigned, totalGuests}` so the menu page never ships the full guest list), `createMenuOption`, `updateMenuOption`, `deleteMenuOption`. Shared logic lives in `lib/options.ts`.

### `convex/drinks.ts`
Same shape as `menu.ts` (thin wrappers over `lib/options.ts`).

### `convex/media.ts`
| Function | Notes |
|---|---|
| `generateUploadUrl` | mutation (auth + event access) — Convex storage upload URL |
| `register` | mutation — catalogs an uploaded blob; validates image mime whitelist, ≤5MB (against actual blob metadata), ≤50 per event |
| `listByEvent` | query (auth) — media rows + resolved `url`, newest first |
| `rename` | mutation |
| `remove` | mutation — deletes the row **and** the storage blob |

### `convex/tables.ts`
| Function | Notes |
|---|---|
| `listTablesByEvent` | |
| `getTablesAndGuests` | Returns `{tables, guestsByTable, unassignedGuests}` |
| `createTable` | |
| `updateTable` | |
| `deleteTable` | Unassigns all guests first |
| `updateTableSeats` | Unassigns guests outside new range |
| `assignGuestToSeat` | Moves guest if already seated; bumps occupant if seat taken |
| `unassignGuestFromSeat` | Sets tableId + seatNumber to undefined |

### `convex/dashboard.ts`
`getOverviewStats` — returns `{totalInvitations, guestCapacity, totalGuests, attendingCount, declinedCount, pendingCount, allergyCount, menuCompletionCount, tableAssignmentCount}`

### `convex/seed.ts`
`seedDemoEventForCurrentUser` (**public mutation**) — creates a full demo event (5 invitations, 15 guests, 2 special events, 3 menu options, 3 drink options, 6 tables) and returns the new `eventId`. Refuses once the user already owns 3+ events (spam guard).

---

## App Routes

```
/                               Marketing landing page
/sign-in, /sign-up              Clerk hosted auth components
/pricing                        Placeholder

/dashboard                            Lists all events — minimal chrome (logo + user menu), NO event sidebar. No auto-redirect.
/dashboard/[eventSlug]                Overview — 8 metric cards
/dashboard/[eventSlug]/invitations    Invitation CRUD + copy public link
/dashboard/[eventSlug]/guests         Guest table with search/filter + detail sheet + Add Guest
/dashboard/[eventSlug]/menu           Food & drink option management
/dashboard/[eventSlug]/tables         Drag-free seat assignment grid
/dashboard/[eventSlug]/template       Template picker + block page-builder (add/reorder/duplicate/remove/edit incl. list + image fields) + live preview (dummy data + real media)
/dashboard/[eventSlug]/media          Per-event image library — upload (Convex storage), rename, delete
/dashboard/[eventSlug]/settings       Event metadata + editable event key + archive

/[eventSlug]/invitations/[invitationSlug]   Public invitation page (guest names) — no auth required
```

Route groups:
- `(auth)` — sign-in/sign-up (both `fallbackRedirectUrl="/dashboard"`), no dashboard shell
- `(dashboard)` — minimal group layout (`UserSync` only). `/dashboard` renders its own minimal top bar; the per-event routes `/dashboard/[eventSlug]/*` are wrapped by `dashboard/[eventSlug]/layout.tsx` in `EventProvider` (resolves slug → event) + `DashboardShell` (sidebar + header)
- `(marketing)` — landing, pricing

> The `[eventSlug]` segment is resolved to its event by `EventProvider`; pages read it via the `useEvent()` hook (`event._id`, `event.slug`) instead of a route id.

---

## Component Map

```
src/components/
  providers/
    root-providers.tsx          ClerkProvider > ConvexClientProvider > ThemeProvider > Toaster
    convex-client-provider.tsx  ConvexProviderWithClerk wired to Clerk useAuth

  app/
    logo.tsx                    "Wedboard" wordmark
    loading-state.tsx           Centered spinner
    empty-state.tsx             Icon + title + description + optional action
    error-state.tsx             AlertCircle + message + retry
    status-badge.tsx            Maps status string → colored Badge
    copy-button.tsx             Clipboard copy with checkmark feedback

  dashboard/
    event-provider.tsx          Resolves [eventSlug]→event via getEventBySlug; exposes useEvent(); handles loading/not-found. Wraps only event routes.
    dashboard-shell.tsx         Sidebar + Header + scrollable main (rendered only inside the event layout)
    dashboard-sidebar.tsx       Nav links (built from eventSlug), event-switcher, user info
    dashboard-header.tsx        Page title (from path section), event name (useEvent), status badge, UserButton
    event-switcher.tsx          Dropdown to switch events (by slug → /dashboard/{slug}) or create new
    metric-card.tsx             Stat card with title/value/icon
    user-sync.tsx               Invisible — calls upsertCurrentUser on mount
    create-event-dialog.tsx     Form dialog to create an event; navigates to /dashboard/{slug}

  invitations/
    invitation-list.tsx         Renders InvitationCard rows with edit/delete state
    invitation-card.tsx         Single row: title, slug, type, status, actions
    invitation-form.tsx         Create/edit dialog; create mode lists un-invited guests to link (Add Guest CTA if none)
    copy-invitation-link-button.tsx  Copies /{eventSlug}/invitations/{slug} to clipboard

  guests/
    guest-table.tsx             TanStack Table with search + RSVP filter
    guest-details-sheet.tsx     Right-side sheet — edit all guest fields
    guest-form.tsx              Add guest form — props `{eventId, invitationId?}` (event-level or invitation-scoped)
    rsvp-status-badge.tsx       attending=green, declined=rose, pending=amber

  menu/
    menu-option-list.tsx        List of options with active toggle + edit/delete
    menu-option-form.tsx        Create/edit dialog for menu or drink option
    selection-summary.tsx       Option → guest count breakdown (props: options + counts/unassigned from menu.getSelectionCounts)

  media/
    media-grid.tsx              Thumbnail grid with inline rename + delete (exports MediaItem type)
    upload-button.tsx           File input → Convex upload URL → media.register (client-side type/size checks)
    media-picker-dialog.tsx     Pick (or upload) one image from the event library — used by the template editor's image fields

  tables/
    table-grid.tsx              Responsive grid of TableCards
    table-card.tsx              Single table: seats, assign/unassign, edit/delete
    seat-select.tsx             Dropdown to assign unassigned guest to a seat
    add-table-dialog.tsx        Create table dialog

  public-invitation/
    public-invitation-page.tsx  Loads {eventSlug, invitationSlug} via getPublicInvitation; handles loading/not-found, then renders InvitationTemplate with event.templateId + event.layoutBlocks
    types.ts                    Local PublicEvent/PublicInvitation/PublicGuest/PublicInvitationData (incl. mediaUrls) types for the template
    blocks.ts                   Page-builder model: BlockType union, LayoutBlock, ConfigField (input: text | textarea | list | image; list supports itemFields for structured rows), BLOCK_DEFS, BLOCK_PALETTE, createBlock(), defaultLayout(), resolveLayout(), getConfigString(), getConfigList()
    template-theme.tsx          "use client" — TemplateTheme tokens for elegant; TemplateThemeProvider + useTemplateTheme (consumed by the template frame/blocks)
    templates/
      template-registry.ts      Source of truth for templates: TemplateDef ({id,label,description,theme, Frame, blocks (per-BlockType markup), optional defaultLayout, optional defaultBlockConfig used to seed configs of newly added blocks}), TEMPLATES, TEMPLATE_LIST, DEFAULT_TEMPLATE_ID (="elegant"), resolveTemplate()
      types.ts                  Shared template contracts: BlockComponentProps/BlockComponent + FrameProps/FrameComponent (imported by every template's frame + blocks)
      invitation-template.tsx   "use client" — resolves the template, renders its Frame, and for each LayoutBlock its block component (block types the template omits render nothing); layout = saved blocks ?? template.defaultLayout() ?? defaultLayout()
      dummy-data.ts             DUMMY_INVITATION_DATA sample used by the live preview
      elegant/                  The official template (Figma design, node 452:172) — its own markup, not the default sections
        frame.tsx               ElegantFrame — phone-width card, NO global gap (each block owns padding)
        blocks.tsx              "use client" — ELEGANT_BLOCKS: a component per design section (hero/location/rsvp/countdown/itinerary/text/allergies/dressCode/specialInvitation/stayInvite/footer) + primitives (ElegantSection [24px horizontal padding; each block sets its own vertical padding/gap], WeddingButton [renders an `<a>` when given `href` — location "Ver mapa" links to `event.venueMapUrl`], CheckRow [real interactive checkbox/radio], CircularPhoto/ImagePlaceholder render real images from mediaUrls when an "image" config field is set). Hero uses `event.brideName`/`groomName` (stacked on two lines). All copy reads block.config first, falling back to ELEGANT_COPY
        default-copy.ts         ELEGANT_COPY (the design's Spanish copy) + ELEGANT_BLOCK_CONFIG (per-block default configs)
        default-layout.ts       elegantDefaultLayout() — preset blocks in the design's order, configs seeded from ELEGANT_BLOCK_CONFIG
        index.ts                Re-exports ElegantFrame, ELEGANT_BLOCKS, elegantDefaultLayout

  template-selection/
    template-settings.tsx       "use client" — template picker + block page-builder (add via Select with template-seeded config, reorder up/down, duplicate, remove, edit fields) + live InvitationTemplate preview (dummy data + the event's real media URLs); saves via events.setInvitationTemplate. Rendered by /dashboard/[eventSlug]/template
    config-field-input.tsx      "use client" — ConfigFieldInput: renders one block-config field switching on field.input (text / textarea / list with add-remove rows / image via MediaPickerDialog)

src/hooks/
  use-toast-mutation.ts         useToastMutation(ref, {success?, error}) — wraps useMutation with the try/catch + sonner toast convention; returns {run, pending}; run never throws, returns {ok, value} | {ok:false}
```

> **Public template (page builder):** the public invitation is a **page builder** — an ordered list
> of `LayoutBlock`s (`{id, type, config?}`) defined in `blocks.ts`. Block types (hero, text, location,
> countdown, itinerary, dressCode, specialInvitation, rsvp, allergies, menuSelection, drinkSelection,
> stayInvite, footer) may repeat (e.g. several `text` blocks). **All non-derived text is authorable**:
> every block with copy carries it in `config` (incl. `rsvp.body`, `footer.body`, `allergies`
> headline/note/options string-list, `itinerary.items` `{time,label}` list); only derived data (event
> name/bride/groom names/date/venue/map link, guest names — managed in event settings) is not. The
> hero shows the couple via `event.brideName`/`groomName` (falling back to splitting the event name),
> and the location "Ver mapa" button links to `event.venueMapUrl` (falling back to a Google Maps search
> of the address). Image slots are `config` fields of input kind `"image"`
> storing a media id (`hero.heroImage`, `location.mapImage`, `dressCode.photo`, `stayInvite.image`),
> resolved to URLs via `getPublicInvitation.mediaUrls`.
> The owner builds the layout at `/dashboard/[eventSlug]/template` (pick template +
> add/reorder/duplicate/remove/edit + live preview). Layout is stored on `events.layoutBlocks`
> (undefined = the selected template's `defaultLayout()`, then the global `defaultLayout()`).
>
> **Templates own their markup.** A `TemplateDef` (template-registry) supplies its own page `Frame`,
> a per-`BlockType` component map, and an optional preset `defaultLayout`; block types a template
> omits render nothing. There is no shared default markup — the shared `BlockComponentProps`/`FrameProps`
> contracts live in `templates/types.ts`. So templates differ in **markup and structure**, not just theme.
>
> - **`elegant`** is the **only official template** (default), implementing the Figma
>   design (file `heSJxDYKECFLtzVd9F1LyJ`, frame `525:3`) under `templates/elegant/`: its own `Frame`
>   + a component per section, gold/serif styling via the `wedding-*` palette and
>   `font-script`/`font-elegant` (see globals.css + layout.tsx), and a preset Spanish layout (configs
>   seeded from `default-copy.ts`). **Spacing mirrors the Figma frame exactly**: 390px-wide white card
>   on `wedding-soft` (`ElegantFrame`); 24px horizontal padding on every block (`ElegantSection` base
>   `px-6`); and **each block owns its vertical padding + gap** (the frame has no global gap) per the
>   design's per-section values (e.g. hero `py-10`, location `pt-24 pb-6`, rsvp `px-10 py-12`, special
>   invite `px-16 py-40`, footer `py-10`). Palette/fonts already matched the design (gold `#c5a46d`,
>   ink `#3c3c3c`, soft `#ececec`, muted `#d9d9d9`; Fleur De Leah / Gowun Batang). Checkboxes are real
>   interactive controls (`CheckRow` — `checkbox` for food multi-select, `radio` for stay); the form
>   controls are not yet wired to `submitPublicRsvp`. Image slots render the configured media image or
>   a placeholder.
> - Add more templates by giving each its own `Frame`/`blocks` (and optional `defaultLayout`) in its
>   `TemplateDef`; a template implements the markup for every block type it intends to render.

---

## Auth Flow

1. Middleware (`src/middleware.ts`) protects every non-public route: if there's no `userId` it **redirects to `/`** (not `/sign-in`). The marketing landing links to sign-in.
2. After sign-in/sign-up, Clerk redirects to `/dashboard` (via `fallbackRedirectUrl`). `/dashboard` shows the events list — it does **not** auto-redirect into a single event. Clerk issues a JWT with `aud: "convex"` (requires Clerk Convex integration activated at `dashboard.clerk.com/apps/setup/convex`)
3. `ConvexProviderWithClerk` attaches the Clerk JWT to every Convex request
4. `convex/auth.config.ts` validates the JWT against `CLERK_FRONTEND_API_URL`
5. The `(dashboard)/layout.tsx` gates its subtree on Convex auth state via `<AuthLoading>` / `<Authenticated>` / `<Unauthenticated>` (from `convex/react`). This is required: it ensures no query/mutation (`UserSync`, `listMyEvents`, `getEventBySlug`, …) runs before the Clerk token is attached to the Convex client — otherwise `requireUser` throws `Unauthorized` on a hard refresh. `<Unauthenticated>` client-redirects to `/` (`RedirectToHome`).
6. `UserSync` (inside `<Authenticated>`) calls `upsertCurrentUser` on mount → creates/updates the `users` table row
7. All protected Convex functions call `requireUser(ctx)` which reads `ctx.auth.getUserIdentity()` and looks up by `tokenIdentifier`
8. Public routes (`/[eventSlug]/invitations/[invitationSlug]`, matched in middleware as `/:eventSlug/invitations/:invitationSlug`) skip auth entirely — Convex functions for those use no auth checks

## Future: Custom Domains (design only — not implemented)

`events.subdomain` / `events.customDomain` (+ indexes) already exist. The agreed design:
- Middleware reads the `Host` header; non-primary hosts rewrite `https://customdomain.com/invitations/{slug}` → internal route `/_domain/[host]/invitations/[invitationSlug]` which resolves the event server-side.
- New public query `events.getEventByDomain({host})`: exact `by_customDomain` match, else extract the subdomain for `by_subdomain` (wildcard `*.<root>` configured once in Vercel). Must reuse the archived-event gating in `convex/lib/public.ts`.
- Settings page gains a "Custom domain" field → Next.js route handler calling the Vercel Domains API (`POST /v10/projects/{id}/domains` with `VERCEL_TOKEN`), surfacing DNS verification records + a status poll.
- Media URLs are absolute Convex URLs, so they are domain-independent.

## Documentation Rule

**CLAUDE.md (and AGENTS.md) must be updated whenever the app changes.**

This applies to every PR, fix, or feature — no exceptions:

- Added or removed a DB table or field → update the Schema section
- Added, renamed, or deleted a Convex function → update the Convex Modules section
- Added a new route or changed a route path → update the App Routes section
- Added, renamed, or deleted a component → update the Component Map section
- Introduced a new convention or changed an existing one → update Key Conventions
- Changed how auth works → update the Auth Flow section
- Added or changed a Zod schema → update the Zod Validations section

Since AGENTS.md is a copy of CLAUDE.md, both must be kept in sync. Update one, then copy to the other.

## Key Conventions

- **Date fields**: always store as Unix ms timestamp (`number`). Convert HTML `<input type="date">` strings with `new Date(str).getTime()` before sending to Convex.
- **ID types**: use `Id<"tableName">` from `convex/_generated/dataModel`. Cast URL params: `params.eventId as Id<"events">`.
- **Convex imports from Next.js**: use `convex/*` path alias (e.g. `import { api } from "convex/_generated/api"`), not `@/`.
- **Shadcn/app imports**: use `@/*` alias (e.g. `import { Button } from "@/components/ui/button"`).
- **No `.collect()`**: use `.take(n)` for bounded queries per Convex guidelines.
- **No `.filter()`**: always use `.withIndex()`.
- **Mutations always toast**: use `useToastMutation` (`src/hooks/use-toast-mutation.ts`) instead of hand-rolled try/catch — it wraps `useMutation` with the success/error sonner toasts and a `pending` flag; `run()` returns `{ok, value}` for branching.
- **Convex auth guard**: event-scoped functions call `requireEventEditor(ctx, eventId)` (or load the doc first, then guard on `doc.eventId`); public slug-based functions resolve via `convex/lib/public.ts` so archived-event gating stays centralized.
- **Client components**: any file using Convex hooks, Clerk hooks, or browser APIs needs `"use client"` at the top.

## Zod Validations (`src/lib/validations/`)

| File | Schema | Key rules |
|---|---|---|
| `event.ts` | `eventSchema` | name min 2 chars, optional `slug` (`/^[a-z0-9-]+$/`, min 2), date optional string, optional brideName/groomName, optional `venueMapUrl` (valid URL or empty) |
| `invitation.ts` | `invitationSchema` | slug: `/^[a-z0-9-]+$/`, maxGuests 1–10 |
| `guest.ts` | `guestSchema` | firstName/lastName required, email optional |
| `menu.ts` | `menuOptionSchema` | name required, isActive boolean |
| `table.ts` | `tableSchema` | name required, seatsCount 1–20 |
| `public-rsvp.ts` | `publicRsvpSchema` | array of guest updates + optional special event RSVPs |

> **Note:** Do not use `.default()` on Zod booleans — it causes Resolver type mismatches with react-hook-form. Use `defaultValues` in `useForm` instead.
