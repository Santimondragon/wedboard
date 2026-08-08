---
id: EP-02-F04
title: Event Key
epic: EP-02 Event Setup
version: 1.0.0
status: partial
last_updated: 2026-07-27
depends_on: [EP-02-F01, EP-02-F03]
---

# EP-02-F04 — Event Key

## 1. Summary

The [Event Key](../../glossary.md#core-entities) (`events.slug`) is the event's handle: a
globally unique, lowercase, hyphenated string that appears in every public invitation URL on
the primary domain — `/{event-key}/invitations/{invitation-slug}`. It is derived from the
event name at creation and can be edited afterwards in Settings, in its own form with its own
save button. Because it addresses every public link, changing it silently invalidates every
link already shared with guests.

## 2. Actors & Permissions

| Actor                | Access            | Notes                                          |
| -------------------- | ----------------- | ---------------------------------------------- |
| Owner                | Full              |                                                |
| Co-owner (`planner`) | Full              | Same power as the owner over the key           |
| Editor               | Blocked           | Cannot reach the Settings page at all          |
| Viewer               | Blocked           | Same                                           |
| Public guest         | Read (implicitly) | Consumes the key as part of the invitation URL |

Server gate: `requireEventMember(ctx, args.eventId, user._id, "planner")` — the key travels on
`updateEvent` (`convex/events.ts:167`). See
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F04-01** — As an owner, I want to change the event key so that my public links read
  the way I want them to.
- **US-02-F04-02** — As an owner, I want to see the resulting public URL shape while I type so
  that I know what I am committing to.
- **US-02-F04-03** — As an owner, I want a clear rejection when the key I want is taken or
  reserved so that I can pick another.
- **US-02-F04-04** — As a guest holding an already-shared link, I want it to keep working.
  _(Not satisfied today — see TODO-02-10.)_

## 4. Entry Points

| Entry point         | Route / control                                            | Actor              |
| ------------------- | ---------------------------------------------------------- | ------------------ |
| "Event Key" section | `/dashboard/[eventSlug]/settings` → Key input + "Save Key" | Co-owner+          |
| Derived at creation | `createEvent` (see [F01](./F01-create-event.md))           | Any signed-in user |

## 5. UX Flow

### Happy path — WF-02-04 Change the event key

1. A co-owner scrolls to the **Event Key** section of Settings. The explanatory copy reads
   "Your public invitation links use this key, like a handle. It must be unique across all
   events." (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:295`).
2. The input is monospaced and seeded with the current key; below it a live preview renders
   `/{slug}/invitations/...`, falling back to `your-event` when empty (`:308`).
3. "Save Key" first runs a client-side `/^[a-z0-9-]+$/` test (`:85`).
4. `api.events.updateEvent` is called with `{eventId, slug}` only (`:93`).
5. The server re-derives the key with `generateSlug(slug)`, rejects an empty result, rejects a
   reserved key, then rejects a key already held by a _different_ event
   (`convex/events.ts:171`–`:190`).
6. On success the event is patched, a "Event key updated" toast fires, and the router
   **replaces** the current URL with `/dashboard/{newSlug}/settings` (`:96`).

### Alternate & edge paths

- **A1** — The typed key contains uppercase letters, spaces or accents → the client regex
  rejects it _before_ the server would silently normalize it, so `generateSlug`'s normalization
  is unreachable from the UI (`:85` vs `convex/events.ts:173`).
- **A2** — The key is unchanged → the uniqueness query finds this same event and the
  `existing._id !== eventId` check passes; the patch is a no-op rewrite
  (`convex/events.ts:186`).
- **A3** — After the rename, the browser sits on the new Settings URL; the previous URL
  `/dashboard/{oldSlug}/settings` now resolves to nothing and would render "Event not found".
- **E1** — Invalid characters → local toast "Event key may only contain lowercase letters,
  numbers, and hyphens"; no mutation (`:86`).
- **E2** — Key reduces to empty → `ConvexError("Event key cannot be empty")`, surfaced verbatim
  because `handleSaveSlug` unwraps `err.data` (`convex/events.ts:175`,
  `settings/page.tsx:99`).
- **E3** — Reserved key → `ConvexError('"{key}" is a reserved key')`
  (`convex/events.ts:178`).
- **E4** — Key taken by another event → `ConvexError('"{key}" is already taken')` — the update
  path **rejects** rather than silently suffixing, unlike creation
  (`convex/events.ts:187`).

## 6. States

| State             | Behavior                                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Loading           | Shares the Settings page skeleton                                                    |
| Empty             | Preview falls back to `/your-event/invitations/...`                                  |
| Error             | sonner error toast carrying the server's message; the input keeps the rejected value |
| Success           | "Event key updated" toast, then a URL replace to the new slug                        |
| Disabled / locked | "Save Key" is disabled while `savingSlug` and reads "Saving..."                      |
| Mobile            | Single-column, monospace input at `text-sm`                                          |

## 7. UI Specification

### Screens & components

| Element               | Component                             | Path                                                              |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Event Key section     | inline `<section>`                    | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:293` |
| Key input             | shadcn `Input` (`font-mono`)          | `:301`                                                            |
| URL preview           | inline `<p>`                          | `:308`                                                            |
| Save handler          | `handleSaveSlug`                      | `:84`                                                             |
| Subdomain placeholder | disabled section badged "Coming soon" | `:323`                                                            |

### Fields & validation

| Field | Type | Required | Rule                                    | Message                                                              |
| ----- | ---- | -------- | --------------------------------------- | -------------------------------------------------------------------- |
| Key   | text | Yes      | Client: `/^[a-z0-9-]+$/` (`:85`)        | "Event key may only contain lowercase letters, numbers, and hyphens" |
| Key   | —    | —        | Server: non-empty after `generateSlug`  | "Event key cannot be empty"                                          |
| Key   | —    | —        | Server: not in `RESERVED_EVENT_SLUGS`   | `"{key}" is a reserved key`                                          |
| Key   | —    | —        | Server: globally unique across `events` | `"{key}" is already taken`                                           |

`eventSchema.slug` additionally requires a minimum of 2 characters
(`src/lib/validations/event.ts:5`), but the Settings page does not use the schema, so a
one-character key is accepted end to end.

**Reserved keys** (`convex/lib/slug.ts:8`): `events`, `dashboard`, `admin`, `pricing`,
`sign-in`, `sign-up`, `api`, `invitations`, `_next`, `favicon`.

### Copy deck

None — the Event Key UI is English dashboard chrome. The key itself appears inside
guest-facing URLs but is not display copy.

## 8. Data Model

| Table          | Fields | Read / Write                            | Index                   |
| -------------- | ------ | --------------------------------------- | ----------------------- |
| `events`       | `slug` | Read (uniqueness probe) + Write (patch) | `by_slug`               |
| `eventMembers` | `role` | Read                                    | `by_eventId_and_userId` |

The key is the join point between the public URL space and the event record: every public
resolution on the primary domain goes through `resolvePublicEvent(ctx, eventSlug)` reading
`by_slug` (`convex/lib/public.ts:15`), and every dashboard route resolves through
`getEventBySlug` on the same index (`convex/events.ts:52`). Both use `.unique()`, so the index
must hold at most one row per key — the invariant DEF-02-01 breaks (see
[F07](./F07-demo-event-seeding.md)).

Changing the key writes one field. Nothing else is rewritten: invitation slugs are unique
_per event_ and are unaffected, and no redirect record is created.

## 9. Backend Contract

| Function                 | Type     | Args                  | Returns | Guard                                              | Caps |
| ------------------------ | -------- | --------------------- | ------- | -------------------------------------------------- | ---- |
| `api.events.updateEvent` | mutation | `{eventId, slug?, …}` | `void`  | `requireUser` + `requireEventMember(…, "planner")` | —    |

Source: `convex/events.ts:150`. Helpers: `generateSlug` (`convex/lib/slug.ts:21`),
`RESERVED_EVENT_SLUGS` (`convex/lib/slug.ts:8`). Note that `generateUniqueSlug` is **not**
used on this path — the update rejects collisions instead of resolving them.

## 10. Business Rules

- **BR-02-F04-01** `[AS-BUILT]` — Changing the event key requires an event role of at least
  `planner` (`convex/events.ts:167`).
- **BR-02-F04-02** `[AS-BUILT]` — The submitted key is normalized server-side by
  `generateSlug` before any check or write (`convex/events.ts:173`).
- **BR-02-F04-03** `[AS-BUILT]` — A key that normalizes to the empty string is rejected with
  "Event key cannot be empty" (`convex/events.ts:174`).
- **BR-02-F04-04** `[AS-BUILT]` — A key in `RESERVED_EVENT_SLUGS` is rejected so it cannot
  shadow a top-level Next.js route (`convex/events.ts:177`).
- **BR-02-F04-05** `[AS-BUILT]` — A key already held by a different event is rejected outright;
  no suffix is appended on the update path (`convex/events.ts:182`).
- **BR-02-F04-06** `[AS-BUILT]` — Re-saving the event's own current key succeeds
  (`convex/events.ts:186`).
- **BR-02-F04-07** `[AS-BUILT]` — The client rejects any key not matching `/^[a-z0-9-]+$/`
  before calling the server (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:85`).
- **BR-02-F04-08** `[AS-BUILT]` — After a successful change the dashboard URL is replaced with
  the new key so the current page keeps resolving (`:96`).
- **BR-02-F04-09** `[AS-BUILT]` — Server rejections are surfaced verbatim to the user because
  `handleSaveSlug` unwraps `ConvexError.data` (`:99`).
- **BR-02-F04-10** `[AS-BUILT]` — Changing the key changes every public invitation URL on the
  primary domain immediately, and no redirect, alias or history of former keys is kept
  (`convex/lib/public.ts:15` resolves only the current `slug`).
- **BR-02-F04-11** `[AS-BUILT]` — Invitations addressed through a custom domain are unaffected
  by an event-key change, because that route resolves by host, not by key
  (`convex/lib/public.ts:30`).

## 11. Acceptance Criteria

- **AC-02-F04-01** — **Given** a co-owner on Settings **When** they save the key
  `smith-wedding` **Then** the event's slug becomes `smith-wedding` and the browser URL becomes
  `/dashboard/smith-wedding/settings`.
- **AC-02-F04-02** — **Given** the key `Smith Wedding` is typed **When** the user saves
  **Then** the local error toast appears and no mutation is sent.
- **AC-02-F04-03** — **Given** another event already uses `smith-wedding` **When** the user
  saves that key **Then** the toast reads `"smith-wedding" is already taken` and the event's
  slug is unchanged.
- **AC-02-F04-04** — **Given** the key `dashboard` **When** the user saves **Then** the toast
  reads `"dashboard" is a reserved key`.
- **AC-02-F04-05** — **Given** a public link `/{oldKey}/invitations/{inv}` was shared **When**
  the key changes to `newKey` **Then** the old link no longer resolves and
  `/{newKey}/invitations/{inv}` does.
- **AC-02-F04-06** — **Given** the event has a live custom domain **When** the key changes
  **Then** `https://{customDomain}/invitations/{inv}` continues to resolve unchanged.
- **AC-02-F04-07** — **Given** an editor **When** they attempt `updateEvent` with a `slug`
  **Then** the mutation throws before any uniqueness check runs.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                           |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| TC-02-F04-01 | unit        | `RESERVED_EVENT_SLUGS` contains every top-level route segment shipped in `src/app`                                 |
| TC-02-F04-02 | integration | `updateEvent` rejects a reserved key, a taken key and an empty-normalizing key with the documented messages        |
| TC-02-F04-03 | integration | `updateEvent` accepts the event's own current key as a no-op                                                       |
| TC-02-F04-04 | integration | After a key change, `resolvePublicEvent(oldKey)` returns `null` and `resolvePublicEvent(newKey)` returns the event |
| TC-02-F04-05 | integration | `updateEvent` with a `slug` as an `editor` throws                                                                  |
| TC-02-F04-06 | e2e         | Renaming the key from Settings lands the browser on the new dashboard URL                                          |
| TC-02-F04-07 | e2e         | A previously copied invitation link 404s after the key changes                                                     |

### Manual QA checklist

- [ ] Type an uppercase key and confirm the client-side rejection.
- [ ] Save a taken key and confirm the server message reaches the toast verbatim.
- [ ] Confirm the live URL preview updates as you type.
- [ ] After renaming, refresh the page and confirm the board still loads.
- [ ] After renaming, open a previously copied invitation link and confirm it fails.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No length cap on the key beyond the hostname-agnostic regex; no minimum enforced on this path                                                      |
| Performance      | One indexed `by_slug` read plus one patch                                                                                                          |
| Security & authz | `planner` floor. The key is a soft secret in combination with invitation slugs — see [roles-and-permissions.md](../../roles-and-permissions.md) §6 |
| Accessibility    | Input has a bound label; the URL preview is decorative text                                                                                        |
| i18n             | English chrome                                                                                                                                     |
| Analytics        | Key changes are not activity-logged                                                                                                                |

## 14. TODOs & Open Questions

- **TODO-02-10** `[P1]` `[ADD]` — Changing the event key breaks every previously shared public
  link and there is no redirect, alias or former-key history
  (`convex/lib/public.ts:15` resolves only the current slug; nothing writes a redirect record).
  - **Rationale:** Invitation links are shared by WhatsApp and print. A host who tidies their
    key after sending invitations silently breaks every guest's link, with no way to recover
    and no warning at the point of change.
  - **Proposed rule:** The event retains its former keys (e.g. a `previousSlugs` array or a
    `slugAliases` table); `resolvePublicEvent` falls back to an alias and the public route
    issues a redirect to the current key. Until that exists, the Settings UI warns before
    saving a key change on an event that has any invitation with `isSent: true`.
- **TODO-02-11** `[P2]` `[CHANGE]` — The client regex rejects the exact inputs the server was
  built to normalize, so a user typing `Smith Wedding` is told off instead of being offered
  `smith-wedding` (`settings/page.tsx:85` vs `convex/events.ts:173`).
  - **Rationale:** The normalization already exists; the UI hides it.
  - **Proposed rule:** The input normalizes as the user types and shows the resulting key,
    reserving hard errors for reserved and taken keys.

### Open questions

- **Q1** — Should the event key be immutable once any invitation has been marked sent
  (`invitations.isSent`), given the link-breaking consequence?
- **Q2** — Should keys have a minimum length? `eventSchema` says 2 characters but that rule is
  unreachable from the Settings page.

## 15. Traceability

| Concern                     | Source                                                            |
| --------------------------- | ----------------------------------------------------------------- |
| Route                       | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:293` |
| UI (save handler)           | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:84`  |
| UI (URL preview)            | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:308` |
| Backend                     | `convex/events.ts:171`                                            |
| Reserved keys               | `convex/lib/slug.ts:8`                                            |
| Normalization               | `convex/lib/slug.ts:21`                                           |
| Public resolution by key    | `convex/lib/public.ts:11`                                         |
| Dashboard resolution by key | `convex/events.ts:48`                                             |
| Schema index                | `convex/schema.ts:79`                                             |
| Validation (unused here)    | `src/lib/validations/event.ts:5`                                  |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
