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
| slug | string |
| ownerUserId | Id<"users"> |
| date | number? | Unix ms timestamp |
| venueName | string? | |
| venueAddress | string? | |
| subdomain | string? | Future |
| customDomain | string? | Future |
| templateId | string? | Future |
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
Public URL: `/invitations/{slug}`

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
Individual attendees. Always belong to an invitation.

| Field | Type |
|---|---|
| eventId | Id<"events"> |
| invitationId | Id<"invitations"> |
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
- `generateUniqueSlug(ctx, tableName, slug)` — appends -2, -3 etc. until unique

### `convex/users.ts`
| Function | Type | Notes |
|---|---|---|
| `getCurrentUser` | query | Returns user doc or null |
| `upsertCurrentUser` | mutation | Creates/updates user from Clerk JWT — called on every app load |
| `ensureCurrentUser` | internalMutation | Same as upsert, internal use |

### `convex/events.ts`
| Function | Type |
|---|---|
| `listMyEvents` | query — events where user is owner or member |
| `getEventById` | query |
| `getEventSummary` | query — event + counts |
| `createEvent` | mutation — also creates eventMember with owner role |
| `updateEvent` | mutation |
| `archiveEvent` | mutation |

### `convex/invitations.ts`
| Function | Type | Notes |
|---|---|---|
| `listByEvent` | query | Auth required |
| `getById` | query | Auth required |
| `getPublicInvitationBySlug` | query | **Public** — no auth |
| `createInvitation` | mutation | Auto-generates slug from title |
| `updateInvitation` | mutation | |
| `deleteInvitation` | mutation | Cascades to guests |
| `setSpecialEventAccess` | mutation | Adds/removes invitationSpecialEventAccess row |
| `regenerateSlug` | mutation | |

### `convex/guests.ts`
| Function | Type | Notes |
|---|---|---|
| `listByEvent` | query | Auth required |
| `listByInvitation` | query | Auth required |
| `getGuestById` | query | |
| `createGuest` | mutation | |
| `updateGuest` | mutation | |
| `deleteGuest` | mutation | Cascades to guestSpecialEventRsvps |
| `bulkCreateGuestsForInvitation` | mutation | |
| `submitPublicRsvp` | mutation | **Public** — validates ownership via slug only |

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

/dashboard                      Lists all events (or redirects if only one)
/events/[eventId]               Overview — 8 metric cards
/events/[eventId]/invitations   Invitation CRUD + copy public link
/events/[eventId]/guests        Guest table with search/filter + detail sheet
/events/[eventId]/menu          Food & drink option management
/events/[eventId]/tables        Drag-free seat assignment grid
/events/[eventId]/settings      Event metadata + archive

/invitations/[invitationSlug]   Public RSVP page — no auth required
```

Route groups:
- `(auth)` — sign-in/sign-up, no dashboard shell
- `(dashboard)` — all `/dashboard` and `/events` routes, wrapped in `DashboardShell`
- `(marketing)` — landing, pricing

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
    dashboard-shell.tsx         Sidebar + Header + scrollable main
    dashboard-sidebar.tsx       Nav links, event-switcher, user info
    dashboard-header.tsx        Page title, event name, status badge, UserButton
    event-switcher.tsx          Dropdown to switch between events or create new
    metric-card.tsx             Stat card with title/value/icon
    user-sync.tsx               Invisible — calls upsertCurrentUser on mount
    create-event-dialog.tsx     Form dialog to create a new event

  invitations/
    invitation-list.tsx         Renders InvitationCard rows with edit/delete state
    invitation-card.tsx         Single row: title, slug, type, status, actions
    invitation-form.tsx         Create/edit dialog with auto-slug generation
    copy-invitation-link-button.tsx  Copies /invitations/{slug} to clipboard

  guests/
    guest-table.tsx             TanStack Table with search + RSVP filter
    guest-details-sheet.tsx     Right-side sheet — edit all guest fields
    guest-form.tsx              Add guest to invitation form
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
    public-invitation-page.tsx  Loads invitation by slug, renders full page
    public-rsvp-form.tsx        Manages per-guest state, submits submitPublicRsvp
    guest-rsvp-card.tsx         Per-guest attending/declined + food/drink/allergies
    special-event-rsvp-section.tsx  Per-guest special event toggles
```

---

## Auth Flow

1. User visits any `/dashboard` or `/events` route → Clerk middleware redirects to `/sign-in`
2. After sign-in, Clerk issues a JWT with `aud: "convex"` (requires Clerk Convex integration activated at `dashboard.clerk.com/apps/setup/convex`)
3. `ConvexProviderWithClerk` attaches the Clerk JWT to every Convex request
4. `convex/auth.config.ts` validates the JWT against `CLERK_FRONTEND_API_URL`
5. `UserSync` component calls `upsertCurrentUser` on mount → creates/updates the `users` table row
6. All protected Convex functions call `requireUser(ctx)` which reads `ctx.auth.getUserIdentity()` and looks up by `tokenIdentifier`
7. Public routes (`/invitations/[slug]`) skip auth entirely — Convex functions for those use no auth checks

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
| `event.ts` | `eventSchema` | name min 2 chars, date is optional string |
| `invitation.ts` | `invitationSchema` | slug: `/^[a-z0-9-]+$/`, maxGuests 1–10 |
| `guest.ts` | `guestSchema` | firstName/lastName required, email optional |
| `menu.ts` | `menuOptionSchema` | name required, isActive boolean |
| `table.ts` | `tableSchema` | name required, seatsCount 1–20 |
| `public-rsvp.ts` | `publicRsvpSchema` | array of guest updates + optional special event RSVPs |

> **Note:** Do not use `.default()` on Zod booleans — it causes Resolver type mismatches with react-hook-form. Use `defaultValues` in `useForm` instead.
