---
id: EP-05-F01
title: Create an Invitation
epic: EP-05 Invitations
version: 1.0.0
status: defective
last_updated: 2026-07-28
depends_on: [EP-04-F01, EP-06-F01, EP-02-F04]
---

# EP-05-F01 — Create an Invitation

## 1. Summary

Creating an invitation is how a host turns a list of individual guests into the household-sized
unit they will actually send a link to. The host names the invitation (`"The Smith Family"`),
gets a URL-safe slug proposed from that name, optionally ticks which currently un-invited guests
belong to it, and optionally ticks which special invitations that household may see. On save the
invitation exists, the chosen guests are linked to it, and the chosen special invitations become
visible to it. Nothing is sent — the invitation is a link the host shares by hand
([EP-05-F04](./F04-sent-tracking.md)).

This is workflow **WF-05-01 — Create invitation for a household**.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                        |
| -------------------- | ------ | ------------------------------------------------------------ |
| Owner                | Full   |                                                              |
| Co-owner (`planner`) | Full   | No planner-specific gate applies                             |
| Editor               | Full   | Invitations are content                                      |
| Viewer               | None   | The default `minRole: "editor"` blocks even reading the list |
| Public guest         | None   |                                                              |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
The only gate applied here is `requireEventEditor(ctx, args.eventId)` with its default `minRole`
(`convex/invitations.ts:279`).

## 3. User Stories

- **US-05-F01-01** — As an Editor, I want to create a named invitation so that I have one
  shareable link per household rather than per person.
- **US-05-F01-02** — As an Editor, I want the slug proposed from the title so that I do not have
  to invent URL-safe text.
- **US-05-F01-03** — As an Editor, I want to pick the guests that belong to the invitation while
  creating it so that composition is a single step.
- **US-05-F01-04** — As an Editor, I want to grant the new invitation access to specific special
  invitations so that only the right households see the after-party.
- **US-05-F01-05** — As an Editor, I want two households with similar names to get distinct URLs
  automatically so that I never have to resolve a collision by hand.

## 4. Entry Points

| Entry point                         | Route / control                                                                                            | Actor   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------- |
| "New Invitation" header button      | `/dashboard/[eventSlug]/invitations` (`src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:41`) | Editor+ |
| "New Invitation" empty-state action | Same route, `EmptyState` action (`.../page.tsx:51`)                                                        | Editor+ |

Both open `InvitationForm` in `mode="create"` (`.../page.tsx:68`). There is no deep link to the
create dialog.

## 5. UX Flow

### Happy path

1. The Editor opens `/dashboard/[eventSlug]/invitations`; the page loads
   `api.invitations.getInvitationsPageData` for the current event
   (`src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:19`).
2. They press "New Invitation" → `InvitationForm` opens with `mode="create"`.
3. The dialog fetches the un-invited pool via `api.guests.listUnassignedByEvent` and the event's
   special invitations via `api.specialEvents.listByEvent`, both skipped while closed
   (`src/components/invitations/invitation-form.tsx:91`, `:95`).
4. The Editor types a **Title**. Each keystroke rewrites the **Slug** field from the title via the
   client `slugify` helper (`invitation-form.tsx:198`, helper at `:31`).
5. They optionally tick special invitations (`invitation-form.tsx:397`) and guests
   (`invitation-form.tsx:432`). In create mode the guest checklist contains **only the un-invited
   pool** — `candidateGuests` prepends current guests only when `mode === "edit"`
   (`invitation-form.tsx:112`).
6. They press "Create Invitation" → `createInvitation.run({eventId, title, slug, notes, guestIds,
specialEventIds})` (`invitation-form.tsx:221`).
7. The server slugifies the submitted slug again, makes it unique within the event, inserts the
   invitation with `isActive: true`, links the eligible guests, inserts the access rows, and logs
   an `invitation` / `create` activity entry (`convex/invitations.ts:281`–`:334`).
8. A success toast `"Invitation created"` fires and the dialog closes
   (`invitation-form.tsx:74`, `:244`).

### Alternate & edge paths

- **A1** — Slug field left as generated: the server derives the slug from the submitted slug
  string; if `args.slug` is absent it derives it from the title instead
  (`convex/invitations.ts:281`). The form always submits a slug, so the title fallback is
  reachable only by an API caller.
- **A2** — Slug already used in this event: `generateUniqueInvitationSlug` appends `-2`, `-3`, …
  until free (`convex/lib/slug.ts:82`). The Editor is not told the slug changed.
- **A3** — Same slug already used in a **different** event: accepted unchanged; uniqueness is
  scoped per event (`convex/lib/slug.ts:73`).
- **A4** — A submitted `guestId` belongs to another event, or already has an `invitationId`: it is
  **silently skipped** (`convex/invitations.ts:306`). See TODO-05-03.
- **A5** — A submitted `specialEventId` belongs to another event: silently skipped
  (`convex/invitations.ts:316`).
- **A6** — No special invitations exist: the dialog shows `"No special invitations yet
(optional)."` with a link to create one (`invitation-form.tsx:374`).
- **E1** — More than 20 `guestIds`: the server throws `ConvexError("Cannot link more than 20
guests at once")` (`convex/invitations.ts:301`) and the whole mutation rolls back. The Editor
  sees only the generic `"Failed to create invitation"` toast, because `useToastMutation`
  discards the error (`src/hooks/use-toast-mutation.ts:39`). The dialog cannot produce this case —
  the checklist is unbounded but the pool would have to exceed 20 selections.
- **E2** — Title shorter than 2 characters, or slug containing anything outside `[a-z0-9-]`: zod
  blocks submission client-side (`src/lib/validations/invitation.ts:4`, `:5`). The server applies
  no equivalent check.
- **E3** — The un-invited pool is empty: the dialog replaces the entire form with an empty state
  and the Editor **cannot create an invitation at all**. See DEF-05-03.

## 6. States

| State             | Behavior                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The page renders four `Skeleton` rows while `getInvitationsPageData` is `undefined` (`.../page.tsx:23`). Inside the dialog, the special-invitation list shows `"Loading…"` (`invitation-form.tsx:371`)    |
| Empty             | Zero invitations → `EmptyState` "No invitations yet" (`.../page.tsx:47`). Zero un-invited guests → the create dialog shows "No guests to invite yet" instead of the form (`invitation-form.tsx:255`)      |
| Error             | Generic sonner error toast `"Failed to create invitation"`; the dialog stays open and selections are preserved (`invitation-form.tsx:74`, `:244`)                                                         |
| Success           | Toast `"Invitation created"`; dialog closes; the reactive list query re-renders with the new row                                                                                                          |
| Disabled / locked | The submit button is disabled while `isSubmitting` and shows "Creating..." (`invitation-form.tsx:465`). No composition lock applies in create mode (`invitation-form.tsx:107` requires `mode === "edit"`) |
| Mobile            | The dialog is `sm:max-w-lg max-h-[90vh] overflow-y-auto`; the guest checklist scrolls independently at `max-h-48` (`invitation-form.tsx:249`, `:431`)                                                     |

## 7. UI Specification

### Screens & components

| Element                    | Component                          | Path                                                                |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Invitations page           | `InvitationsPage`                  | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14` |
| Create dialog              | `InvitationForm` (`mode="create"`) | `src/components/invitations/invitation-form.tsx:64`                 |
| Empty state                | `EmptyState`                       | `src/components/app/empty-state.tsx`                                |
| Guest / special checklists | `Checkbox`                         | `src/components/invitations/invitation-form.tsx:407`, `:442`        |

### Fields & validation

| Field               | Type          | Required | Rule                                                        | Message                                                                          |
| ------------------- | ------------- | -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Title               | text          | Yes      | `min(2)` (`src/lib/validations/invitation.ts:4`)            | `"Title must be at least 2 characters"`                                          |
| Slug                | text          | Yes      | `/^[a-z0-9-]+$/` (`src/lib/validations/invitation.ts:5`)    | `"Slug must only contain lowercase letters, numbers, and hyphens"`               |
| Notes               | textarea      | No       | none                                                        | —                                                                                |
| Special invitations | checkbox list | No       | Ids must belong to the event (server-side, silent)          | —                                                                                |
| Guests              | checkbox list | No       | ≤20 server-side; ids must be un-invited guests of the event | `"Cannot link more than 20 guests at once"` (never surfaced — DEF-05-02 pattern) |

### Copy deck

All strings on this surface are English (the dashboard is English; only the public invitation is
Spanish).

| Key               | Copy                                                                                          | Source                            |
| ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| Dialog title      | `"New Invitation"`                                                                            | `invitation-form.tsx:252`         |
| Title placeholder | `"Smith Family"`                                                                              | `invitation-form.tsx:317`         |
| Slug placeholder  | `"smith-family"`                                                                              | `invitation-form.tsx:331`         |
| Notes placeholder | `"Optional notes about this invitation..."`                                                   | `invitation-form.tsx:353`         |
| Guests hint       | `"Select the guests included in this invitation."`                                            | `invitation-form.tsx:429`         |
| Special hint      | `"Choose which special invitations this group can see."`                                      | `invitation-form.tsx:394`         |
| No-pool title     | `"No guests to invite yet"`                                                                   | `invitation-form.tsx:264`         |
| No-pool body      | `"Add guests to this event first, then group them into an invitation."`                       | `invitation-form.tsx:267`         |
| No specials       | `"No special invitations yet (optional)."`                                                    | `invitation-form.tsx:375`         |
| Submit            | `"Create Invitation"` / `"Creating..."`                                                       | `invitation-form.tsx:471`, `:468` |
| Page empty state  | `"No invitations yet"` / `"Create an invitation link for a person, couple, family, or group"` | `.../page.tsx:48`, `:49`          |
| Success toast     | `"Invitation created"`                                                                        | `invitation-form.tsx:74`          |
| Error toast       | `"Failed to create invitation"`                                                               | `invitation-form.tsx:75`          |

## 8. Data Model

| Table                          | Fields                                                                  | Read / Write   | Index                                          |
| ------------------------------ | ----------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| `invitations`                  | `eventId`, `title`, `slug`, `isActive`, `notes`                         | Write (insert) | `by_eventId_and_slug` for the uniqueness probe |
| `guests`                       | `invitationId`                                                          | Write (patch)  | `guests` read by id (`ctx.db.get`)             |
| `specialEvents`                | —                                                                       | Read by id     | —                                              |
| `invitationSpecialEventAccess` | `eventId`, `invitationId`, `specialEventId`                             | Write (insert) | —                                              |
| `activityLogs`                 | `eventId`, `actorUserId`, `actorName`, `action`, `entity`, `entityName` | Write (insert) | —                                              |

`isActive` is hard-coded to `true` on insert (`convex/invitations.ts:295`); `isSent` is left
unset, which reads as "not sent" ([F04](./F04-sent-tracking.md)). The deprecated columns `type`,
`maxGuests` and `allowPlusOne` remain in the schema (`convex/schema.ts:103`, `:108`, `:111`) but
are never written here — see TODO-05-01.

**Ordering.** The invitation row is inserted _before_ the ≤20 guest cap is checked
(`convex/invitations.ts:291` then `:300`). Convex mutations are transactional, so a throw rolls
the insert back and no orphan invitation is left behind.

**Slug scoping.** Invitation slugs are unique **per event**
(`generateUniqueInvitationSlug`, `convex/lib/slug.ts:61`, probing `by_eventId_and_slug`). This is
deliberately unlike the [Event Key](../../glossary.md), which is globally unique via
`generateUniqueSlug` over `by_slug` (`convex/lib/slug.ts:32`). Two different weddings may both
have an invitation at `/…/invitations/smith-family` without colliding, because the event key
disambiguates the path.

## 9. Backend Contract

| Function                                 | Type     | Args                                                           | Returns                                                     | Guard                                   | Caps                                                                                                |
| ---------------------------------------- | -------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `api.invitations.createInvitation`       | mutation | `{eventId, title, slug?, notes?, guestIds?, specialEventIds?}` | `Id<"invitations">`                                         | `requireEventEditor(ctx, args.eventId)` | `guestIds.length ≤ 20`                                                                              |
| `api.invitations.getInvitationsPageData` | query    | `{eventId}`                                                    | invitation rows + `{guestCount, guests[], specialEvents[]}` | `requireEventEditor(ctx, args.eventId)` | `.take(500)` invitations, `.take(2000)` guests, `.take(10)` special events, `.take(50)` access rows |
| `api.guests.listUnassignedByEvent`       | query    | `{eventId}`                                                    | un-invited guests                                           | `requireEventEditor` (EP-04)            | —                                                                                                   |
| `api.specialEvents.listByEvent`          | query    | `{eventId}`                                                    | special invitations                                         | `requireEventEditor` (EP-06)            | —                                                                                                   |

## 10. Business Rules

- **BR-05-F01-01** `[AS-BUILT]` — Creating an invitation requires at least the `editor` role on the
  event (`convex/invitations.ts:279`).
- **BR-05-F01-02** `[AS-BUILT]` — The stored slug is `generateSlug(args.slug)` when a slug is
  supplied, otherwise `generateSlug(args.title)` (`convex/invitations.ts:281`).
- **BR-05-F01-03** `[AS-BUILT]` — The stored slug is unique within the event; collisions are
  resolved by appending `-2`, `-3`, … (`convex/lib/slug.ts:70`–`:83`).
- **BR-05-F01-04** `[AS-BUILT]` — Invitation slug uniqueness is scoped to the event, not global —
  the probe is `by_eventId_and_slug` (`convex/lib/slug.ts:73`).
- **BR-05-F01-05** `[AS-BUILT]` — A new invitation is created active (`isActive: true`)
  (`convex/invitations.ts:295`).
- **BR-05-F01-06** `[AS-BUILT]` — At most 20 guest ids may be linked in one create call; more
  throws `"Cannot link more than 20 guests at once"` (`convex/invitations.ts:300`).
- **BR-05-F01-07** `[AS-BUILT]` — A guest id is linked only when the guest exists, belongs to the
  same event, and has no `invitationId`; otherwise it is skipped without error
  (`convex/invitations.ts:306`).
- **BR-05-F01-08** `[AS-BUILT]` — A special-invitation id grants access only when the special
  event exists and belongs to the same event; otherwise it is skipped without error
  (`convex/invitations.ts:316`).
- **BR-05-F01-09** `[AS-BUILT]` — Creating an invitation writes an `activityLogs` row with
  `entity: "invitation"`, `action: "create"`, `entityName` = the submitted title
  (`convex/invitations.ts:326`).
- **BR-05-F01-10** `[AS-BUILT]` — In create mode the guest checklist offers only un-invited guests;
  already-linked guests are not selectable (`src/components/invitations/invitation-form.tsx:112`).
- **BR-05-F01-11** `[AS-BUILT]` — While the title is being typed in create mode, the slug field is
  overwritten from the title on every change (`invitation-form.tsx:198`).
- **BR-05-F01-12** `[AS-BUILT]` — The client rejects a title under 2 characters and a slug outside
  `/^[a-z0-9-]+$/` before submitting (`src/lib/validations/invitation.ts:4`, `:5`).

## 11. Acceptance Criteria

- **AC-05-F01-01** — **Given** a signed-in Editor on an event **When** they create an invitation
  titled `"The Smith Family"` with no slug edits **Then** an invitation exists with slug
  `the-smith-family` and `isActive: true`.
- **AC-05-F01-02** — **Given** an event already containing an invitation with slug `smith-family`
  **When** an Editor creates another one that slugifies to `smith-family` **Then** the new one is
  stored as `smith-family-2` and creation succeeds.
- **AC-05-F01-03** — **Given** two different events **When** each gets an invitation slugifying to
  `smith-family` **Then** both store exactly `smith-family`.
- **AC-05-F01-04** — **Given** three un-invited guests are ticked **When** the invitation is
  created **Then** all three have `invitationId` set to the new invitation and no longer appear in
  `listUnassignedByEvent`.
- **AC-05-F01-05** — **Given** a `guestIds` array of 21 ids **When** `createInvitation` is called
  **Then** it throws `"Cannot link more than 20 guests at once"` and **no** invitation row exists
  afterwards.
- **AC-05-F01-06** — **Given** a guest already linked to another invitation is passed in
  `guestIds` **When** the invitation is created **Then** the invitation is created, the guest keeps
  its original `invitationId`, and no error is raised.
- **AC-05-F01-07** — **Given** a special invitation of a _different_ event is passed in
  `specialEventIds` **When** the invitation is created **Then** no `invitationSpecialEventAccess`
  row is written for it.
- **AC-05-F01-08** — **Given** an invitation is created **When** the Activity page is opened
  **Then** it shows a `create` entry for entity `invitation` naming the title.
- **AC-05-F01-09** — **Given** a Viewer on the event **When** they call `createInvitation` **Then**
  it throws `Insufficient permissions`.
- **AC-05-F01-10** — **Given** the create dialog is open **When** a title of one character is
  submitted **Then** the client shows `"Title must be at least 2 characters"` and no mutation runs.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                               |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| TC-05-F01-01 | unit        | `generateSlug` strips accents, punctuation and collapses whitespace to hyphens                                                         |
| TC-05-F01-02 | unit        | `generateUniqueInvitationSlug` returns `slug-2` when the base exists in the same event and `slug` when it exists only in another event |
| TC-05-F01-03 | unit        | `invitationSchema` rejects a 1-char title and an uppercase slug                                                                        |
| TC-05-F01-04 | integration | `createInvitation` links only un-invited same-event guests and skips the rest                                                          |
| TC-05-F01-05 | integration | `createInvitation` with 21 guest ids throws and leaves no invitation row                                                               |
| TC-05-F01-06 | integration | `createInvitation` inserts one `invitationSpecialEventAccess` row per valid special-event id                                           |
| TC-05-F01-07 | integration | `createInvitation` writes exactly one `activityLogs` row                                                                               |
| TC-05-F01-08 | integration | A Viewer calling `createInvitation` is rejected                                                                                        |
| TC-05-F01-09 | e2e         | Create an invitation from the dashboard; the new row appears with its guest chips and Active badge                                     |
| TC-05-F01-10 | e2e         | The slug field tracks the title while typing in create mode                                                                            |

### Manual QA checklist

- [ ] Slug auto-fills from the title and stops auto-filling once the dialog is in edit mode.
- [ ] Creating with zero guests ticked succeeds when the un-invited pool is non-empty.
- [ ] A second invitation with the same title lands on `-2` without an error toast.
- [ ] The un-invited pool visibly shrinks after creating an invitation that consumes guests.
- [ ] The special-invitation section links out to `/dashboard/[eventSlug]/special-events` when empty.
- [ ] Reproduce DEF-05-03: assign every guest to an invitation, then reopen the create dialog.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | ≤20 guests linked per create call (`convex/invitations.ts:300`); the page query reads ≤500 invitations, ≤2000 guests, ≤10 special events, ≤50 access rows per invitation |
| Performance      | The list is one round trip (`getInvitationsPageData`); access rows are fetched per invitation in a `Promise.all` fan-out (`convex/invitations.ts:92`)                    |
| Security & authz | `requireEventEditor` on every function; every referenced guest and special-event id is re-checked against `invitation.eventId` before use                                |
| Accessibility    | Checklists are `<label>`-wrapped `Checkbox`es; the submit button carries a textual pending state. The auto-generated slug change is not announced                        |
| i18n             | Dashboard copy is English only; no translation layer exists                                                                                                              |
| Analytics        | None beyond the activity log entry                                                                                                                                       |

## 14. TODOs & Open Questions

- **DEF-05-03** `[P1]` — The create dialog is unusable once every guest is already linked to an
  invitation, so a host cannot create an empty invitation to fill later.
  - **Evidence:** `src/components/invitations/invitation-form.tsx:255` — when
    `mode === "create" && unassignedGuests.length === 0`, the whole `<form>` is replaced by the
    "No guests to invite yet" empty state, which offers only a link to the guests page.
  - **Impact:** Guests are optional on the server (`guestIds` is `v.optional`), yet the UI hard
    blocks creation. A host who has assigned all guests and then wants a placeholder invitation
    (or wants to create the invitation first and add guests later) has no path forward.
  - **Proposed fix:** Show the empty state as an inline notice above the guest checklist rather
    than instead of the form, keeping Title/Slug/Notes and Create enabled.
- **TODO-05-01** `[P2]` `[REMOVE]` — Delete the dead `invitations` columns `type`, `maxGuests` and
  `allowPlusOne`.
  - **Rationale:** All three are declared optional "for back-compat" (`convex/schema.ts:101`–`:111`)
    and a repo-wide search finds no other reference: `maxGuests` and `allowPlusOne` appear only at
    `convex/schema.ts:108` and `:111`, and `type` is never read or written by
    `convex/invitations.ts`. They are absent from `invitationSchema`
    (`src/lib/validations/invitation.ts:3`) and from every invitation component. +1 is now the
    per-guest `guests.allowsPlusOne` ([EP-04](../04-guest-management/)).
  - **Proposed rule:** The `invitations` table carries no invitation-type or capacity concept; a
    migration drops the three columns after backfilling nothing.
- **TODO-05-03** `[P2]` `[CHANGE]` — Report, rather than silently drop, guest ids that cannot be
  linked.
  - **Rationale:** `convex/invitations.ts:306` skips any guest that belongs to another event or
    already has an `invitationId`. An API caller (or a stale dialog whose pool has been consumed by
    a collaborator in another tab) gets a success toast while some selections were ignored.
  - **Proposed rule:** `createInvitation` returns the set of skipped guest ids, or throws when a
    supplied id belongs to another event.
- **TODO-05-10** `[P2]` `[ADD]` — Enforce server-side length limits on `title` and `notes`.
  - **Rationale:** `createInvitation` accepts `v.string()` with no bound
    (`convex/invitations.ts:272`, `:274`); only the client enforces a 2-character floor on title
    and nothing at all on notes. Compare `messages.submitGuestMessage`, which trims and bounds.
  - **Proposed rule:** `title` is trimmed and must be 2–200 characters; `notes` is trimmed and
    capped at 1000 characters, both enforced in the mutation.

### Open questions

- **Q1** — Should an invitation be creatable with zero guests as a deliberate product state
  (placeholder households), or is DEF-05-03 encoding an intentional "guests first" policy that
  should instead be enforced on the server?
- **Q2** — When `generateUniqueInvitationSlug` silently renames a slug to `-2`, should the Editor
  be told, given the slug is the shareable URL?

## 15. Traceability

| Concern                                        | Source                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Route                                          | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14`    |
| Create entry point                             | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:41`    |
| Dialog                                         | `src/components/invitations/invitation-form.tsx:64`                    |
| Create submit                                  | `src/components/invitations/invitation-form.tsx:221`                   |
| Candidate-guest pool                           | `src/components/invitations/invitation-form.tsx:112`                   |
| Empty-pool block                               | `src/components/invitations/invitation-form.tsx:255`                   |
| Backend                                        | `convex/invitations.ts:269`                                            |
| Guest-cap rule                                 | `convex/invitations.ts:300`                                            |
| Guest link rule                                | `convex/invitations.ts:306`                                            |
| Special-access rule                            | `convex/invitations.ts:316`                                            |
| Activity log                                   | `convex/invitations.ts:326`                                            |
| Slug uniqueness (per event)                    | `convex/lib/slug.ts:61`                                                |
| Slug uniqueness (global, event key — contrast) | `convex/lib/slug.ts:32`                                                |
| List query                                     | `convex/invitations.ts:39`                                             |
| Schema                                         | `convex/schema.ts:97`                                                  |
| Deprecated columns                             | `convex/schema.ts:103`, `convex/schema.ts:108`, `convex/schema.ts:111` |
| Validation                                     | `src/lib/validations/invitation.ts:3`                                  |
| Toast wrapper                                  | `src/hooks/use-toast-mutation.ts:22`                                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
