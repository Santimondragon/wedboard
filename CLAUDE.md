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
| date | number? | Unix ms timestamp |
| venueName | string? | |
| venueAddress | string? | |
| subdomain | string? | Future |
| customDomain | string? | Future |
| templateId | string? | Public invitation template id (`"classic" \| "modern" \| "romantic"`); defaults to classic when unset |
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

Indexes: `by_eventId`, `by_invitationId`, `by_tableId`, `by_tableId_and_seatNumber`, `by_eventId_and_rsvpStatus`

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
- `requireEventMember(ctx, eventId, userId, minRole?)` — enforces role hierarchy

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
| `getPublicInvitation` | query | **Public** — args `{eventSlug, invitationSlug}`; returns `{event (incl. templateId, layoutBlocks), invitation, guests:[{firstName,lastName}]}` |
| `createInvitation` | mutation | Per-event-unique slug; optional `guestIds` links selected un-invited guests |
| `updateInvitation` | mutation | |
| `deleteInvitation` | mutation | **Unassigns** its guests (sets invitationId undefined), does not delete them |
| `setSpecialEventAccess` | mutation | Adds/removes invitationSpecialEventAccess row |
| `regenerateSlug` | mutation | |

### `convex/guests.ts`
| Function | Type | Notes |
|---|---|---|
| `listByEvent` | query | Auth required |
| `listByInvitation` | query | Auth required |
| `listUnassignedByEvent` | query | Auth required — event guests with no `invitationId` |
| `getGuestById` | query | |
| `createGuest` | mutation | Requires `eventId`; optional `invitationId` (creates un-invited guest if omitted) |
| `updateGuest` | mutation | |
| `deleteGuest` | mutation | Cascades to guestSpecialEventRsvps |
| `bulkCreateGuestsForInvitation` | mutation | |
| `submitPublicRsvp` | mutation | **Public** — resolves via `{eventSlug, invitationSlug}` (RSVP UI currently deferred) |

### `convex/specialEvents.ts`
`listByEvent` (auth), `listForInvitation` (**public**), `createSpecialEvent`, `updateSpecialEvent`, `deleteSpecialEvent` (cascades access + RSVPs)

### `convex/menu.ts`
`listMenuOptionsByEvent` (**public**), `listMenuOptionsByEventAdmin` (auth), `createMenuOption`, `updateMenuOption`, `deleteMenuOption`

### `convex/drinks.ts`
Same shape as `menu.ts`.

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
`seedDemoEventForCurrentUser` (**public mutation**) — creates a full demo event (5 invitations, 15 guests, 2 special events, 3 menu options, 3 drink options, 6 tables) and returns the new `eventId`.

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
/dashboard/[eventSlug]/template       Template picker + block page-builder (add/reorder/duplicate/remove/edit) + live preview (dummy data)
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
    selection-summary.tsx       Option → guest count breakdown

  tables/
    table-grid.tsx              Responsive grid of TableCards
    table-card.tsx              Single table: seats, assign/unassign, edit/delete
    seat-select.tsx             Dropdown to assign unassigned guest to a seat
    add-table-dialog.tsx        Create table dialog

  public-invitation/
    public-invitation-page.tsx  Loads {eventSlug, invitationSlug} via getPublicInvitation; handles loading/not-found, then renders InvitationTemplate with event.templateId + event.layoutBlocks
    types.ts                    Local PublicEvent/PublicInvitation/PublicGuest/PublicInvitationData types for the template
    blocks.ts                   Page-builder model: BlockType union, LayoutBlock, BLOCK_DEFS (label + editable config fields per type), BLOCK_PALETTE, createBlock(), defaultLayout(), resolveLayout(), getConfigString()
    template-theme.tsx          "use client" — TemplateTheme tokens for classic/modern/romantic; TemplateThemeProvider + useTemplateTheme (consumed by the default frame/blocks)
    templates/
      template-registry.ts      Source of truth for templates: TemplateDef ({id,label,description,theme, optional Frame, per-block overrides, optional defaultLayout}), TEMPLATES, TEMPLATE_LIST, DEFAULT_TEMPLATE_ID (="elegant"), resolveTemplate()
      default-blocks.tsx        "use client" — DefaultFrame (themed divided card) + DEFAULT_BLOCKS (BlockType→component); the shared fallback markup. Defines BlockComponentProps/FrameProps
      invitation-template.tsx   "use client" — resolves the template, renders its Frame (or DefaultFrame), and for each LayoutBlock its override component (or DEFAULT_BLOCKS); layout = saved blocks ?? template.defaultLayout() ?? defaultLayout()
      dummy-data.ts             DUMMY_INVITATION_DATA sample used by the live preview
      elegant/                  First official template (Figma "Xoom cargo" design, node 452:172) — its own markup, not the default sections
        frame.tsx               ElegantFrame — phone-width card, NO global gap (each block owns padding)
        blocks.tsx              "use client" — ELEGANT_BLOCKS: a component per design section (hero/location/rsvp/countdown/itinerary/text/allergies/dressCode/specialInvitation/stayInvite/footer) + primitives (ElegantSection, WeddingButton, CheckRow, seal/photo placeholders). Spanish copy from the design
        default-layout.ts       elegantDefaultLayout() — preset blocks in the design's order
        index.ts                Re-exports ElegantFrame, ELEGANT_BLOCKS, elegantDefaultLayout
    sections/
      section.tsx               Shared eyebrow/heading/spacing wrapper; pulls colors/fonts from useTemplateTheme
      hero-section.tsx          Event name, date, "Dear {invitation.title}" (themed)
      location-section.tsx      Venue name + address (placeholder if absent)
      message-section.tsx       Optional headline + body — backs the "text" block
      countdown-section.tsx     "use client" — live ticking countdown to event date (themed)
      itinerary-section.tsx     Time/title schedule (placeholder items — no backend model yet)
      dress-code-section.tsx    Dress code + note (from block config)
      special-invitation-section.tsx  Eyebrow/title/description/date/location from block config (placeholder defaults)
      rsvp-section.tsx          Per-guest attending/declines radios (draft — not wired)
      allergies-section.tsx     Per-guest allergies text input (draft — not wired)
      menu-selection-section.tsx   Per-guest menu select (placeholder options — not wired)
      drink-selection-section.tsx  Per-guest drink select (placeholder options — not wired)
      footer-section.tsx        Event name + closing line (themed)

  template-selection/
    template-settings.tsx       "use client" — template picker + block page-builder (add via Select, reorder up/down, duplicate, remove, edit text fields) + live InvitationTemplate preview (dummy data); saves via events.setInvitationTemplate. Rendered by /dashboard/[eventSlug]/template
```

> **Public template (page builder):** the public invitation is a **page builder** — an ordered list
> of `LayoutBlock`s (`{id, type, config?}`) defined in `blocks.ts`. Block types (hero, text, location,
> countdown, itinerary, dressCode, specialInvitation, rsvp, allergies, menuSelection, drinkSelection,
> stayInvite, footer) may repeat (e.g. several `text` blocks). `hero`, `text`, `dressCode`,
> `specialInvitation` and `stayInvite` carry editable content in `config`; the rest are data-driven.
> The owner builds the layout at `/dashboard/[eventSlug]/template` (pick template +
> add/reorder/duplicate/remove/edit + live preview). Layout is stored on `events.layoutBlocks`
> (undefined = the selected template's `defaultLayout()`, then the global `defaultLayout()`).
>
> **Templates own their markup.** A `TemplateDef` (template-registry) can supply its own page `Frame`,
> a per-`BlockType` component map, and a preset `defaultLayout`; the renderer falls back to
> `DefaultFrame` / `DEFAULT_BLOCKS` for anything a template doesn't override. So templates differ in
> **markup and structure**, not just theme.
>
> - **`elegant`** is the **first official template** (default), implementing the Figma "Xoom cargo"
>   design under `templates/elegant/`: its own `Frame` + a component per section, gold/serif styling
>   via the `wedding-*` palette and `font-script`/`font-elegant` (see globals.css + layout.tsx), and a
>   preset Spanish layout. Per the design, **each block owns its vertical padding** (`ElegantSection`)
>   — the frame has no global gap. Images are placeholders and the form controls (RSVP/food/stay) are
>   not yet wired to `submitPublicRsvp`.
> - **`classic` / `modern` / `romantic`** remain theme-only over the default sections (plain-text
>   drafts); give one its own markup by adding a `Frame`/`blocks` to its `TemplateDef`.

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
- **Mutations always toast**: success with `toast.success(...)`, failure with `toast.error(...)` inside try/catch.
- **Client components**: any file using Convex hooks, Clerk hooks, or browser APIs needs `"use client"` at the top.

## Zod Validations (`src/lib/validations/`)

| File | Schema | Key rules |
|---|---|---|
| `event.ts` | `eventSchema` | name min 2 chars, optional `slug` (`/^[a-z0-9-]+$/`, min 2), date optional string |
| `invitation.ts` | `invitationSchema` | slug: `/^[a-z0-9-]+$/`, maxGuests 1–10 |
| `guest.ts` | `guestSchema` | firstName/lastName required, email optional |
| `menu.ts` | `menuOptionSchema` | name required, isActive boolean |
| `table.ts` | `tableSchema` | name required, seatsCount 1–20 |
| `public-rsvp.ts` | `publicRsvpSchema` | array of guest updates + optional special event RSVPs |

> **Note:** Do not use `.default()` on Zod booleans — it causes Resolver type mismatches with react-hook-form. Use `defaultValues` in `useForm` instead.
