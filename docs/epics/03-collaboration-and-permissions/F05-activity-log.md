---
id: EP-03-F05
title: Activity Log
epic: EP-03 Collaboration & Permissions
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: [EP-03-F01]
---

# EP-03-F05 — Activity Log

## 1. Summary

A shared event board raises a question no single-user tool has to answer: _who changed this?_
The Activity Log is Wedboard's answer — an append-only feed, one line per dashboard change,
readable by every member of the event at `/dashboard/[eventSlug]/activity`. Each entry records
the actor, what they did (created / modified / removed), what kind of record it was, its name
at the time, and when. It is deliberately narrow: only **dashboard** changes to guests,
invitations, special invitations, the invitation template and the meta settings are recorded.
Actions taken by public guests on an invitation page, per-toggle flags, and seat assignments
are not — a product decision, not an oversight, taken so the feed reads as "what my
collaborators did to the plan" rather than a raw change stream. This is workflow **WF-03-04**.

## 2. Actors & Permissions

| Actor                | Access                        | Notes                                                                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner                | Read                          | Same feed as everyone else; no privileged view                                                          |
| Co-owner (`planner`) | Read                          | Same feed                                                                                               |
| Editor               | Read                          | Same feed; the sidebar link is gated at `editor` (`src/components/dashboard/dashboard-sidebar.tsx:62`)  |
| Viewer               | Read (permitted by the query) | `listByEvent` passes `"viewer"` explicitly, but the sidebar hides the link at `editor` — see TODO-03-08 |
| Superadmin           | Read                          | Bypasses the guard via `requireEventMember`                                                             |
| Public guest         | None                          | Not authenticated; public mutations write no entries at all                                             |

Gate: `requireEventEditor(ctx, args.eventId, "viewer")` (`convex/activity.ts:9`) — one of only
two functions in the product that lower the floor to `viewer`. Role semantics live in
[roles-and-permissions.md](../../roles-and-permissions.md); "Activity Log" is defined in
[glossary.md](../../glossary.md).

There is **no write endpoint**. Entries are appended only as a side effect of the mutations
listed in §9, through the internal helper `logActivity` (`convex/lib/activity.ts:26`).

## 3. User Stories

- **US-03-F05-01** — As an Owner, I want to see what my collaborators changed so that I can
  keep track of the plan without asking them.
- **US-03-F05-02** — As a Co-owner, I want a record of when a guest or invitation was removed
  so that an unexpected disappearance can be explained.
- **US-03-F05-03** — As an Editor, I want to confirm that my own change was saved so that I do
  not repeat it.
- **US-03-F05-04** — As an Owner, I want the log to still name the person who made a change
  after they have been removed from the event so that history stays readable.

## 4. Entry Points

| Entry point   | Route / control                          | Actor                              |
| ------------- | ---------------------------------------- | ---------------------------------- |
| Activity page | `/dashboard/[eventSlug]/activity`        | Editor+ (sidebar), Viewer+ (query) |
| Sidebar link  | "Activity" nav item, `minRole: "editor"` | Editor+                            |

There is no deep link to an individual entry, no per-entity "history" panel, and no entry
point from the guests, invitations or template pages.

## 5. UX Flow

### Happy path

1. A member opens `/dashboard/{eventSlug}/activity`. `EventProvider` has already resolved the
   event, and the page reads `useEvent()._id`
   (`src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:12`).
2. The page calls `api.activity.listByEvent` with `{eventId}`
   (`.../activity/page.tsx:13`).
3. The server guards at `viewer`, queries `activityLogs` on `by_eventId`, orders `desc` and
   takes at most 200 rows (`convex/activity.ts:9`–`:15`).
4. The heading renders "Activity" followed by the returned count in parentheses
   (`.../activity/page.tsx:20`–`:24`).
5. `ActivityList` renders one bordered row per entry: the actor's name in bold, then a
   sentence built from the action verb, the entity label and the entity name, with a relative
   timestamp on the right (`src/components/activity/activity-list.tsx:43`–`:51`).
6. Because `useQuery` is reactive, a change made by a collaborator in another session appears
   at the top of the list without a reload.

### Alternate & edge paths

- **A1** — The event has no entries → an `EmptyState` with the `History` icon, "No activity
  yet" and "Changes to your event will show up here as they happen."
  (`.../activity/page.tsx:35`–`:39`).
- **A2** — An entry carries no `entityName` (template and meta always do) → the sentence ends
  at the entity label: "modified the invitation template"
  (`src/components/activity/activity-list.tsx:31`–`:32`).
- **A3** — The event has more than 200 entries → only the newest 200 are returned and the
  count in the heading reads "(200)". There is no "load more" control and older entries are
  unreachable through the product. See TODO-03-05.
- **A4** — The actor has since been removed from the event → their entries still render with
  their name, because `actorName` was denormalized at write time
  (`convex/lib/activity.ts:39`; [EP-03-F04](./F04-remove-member.md)).
- **A5** — The actor has since changed their name in Clerk → **old entries keep the old
  name**. `actorName` is a snapshot, never backfilled, so one person can appear in the same
  feed under two names. See TODO-03-15.
- **A6** — The record an entry names has since been deleted → the entry survives and still
  names it, because `entityName` is a plain string, not a reference. The feed can therefore
  name a guest who no longer exists. See TODO-03-16.
- **A7** — A guest is deleted who hosts a +1 → `deleteGuest` cascades the +1 away but writes a
  single entry naming the host only (`convex/guests.ts:334`). The +1's removal is not
  separately recorded.
- **A8** — `bulkCreateGuestsForInvitation` adds several guests at once → **one** aggregate
  entry is written, named `"{n} guests"`, or the single guest's name when `n` is 1
  (`convex/guests.ts:451`–`:459`). If no guest was inserted, no entry is written at all
  (`convex/guests.ts:450`).
- **A9** — A member is added, has their role changed, or is removed → nothing is logged. See
  TODO-03-02.
- **E1** — The caller is not a member → the query throws `ConvexError` from
  `requireEventMember`; the page has no error boundary of its own, so it never renders. In
  practice `EventProvider` has already failed for the same caller.
- **E2** — The underlying mutation succeeds but the log insert fails → both run in the same
  Convex transaction, so the write is rolled back with it; a logged action cannot be missing
  its entry, and an entry cannot exist for an action that did not happen.

## 6. States

| State             | Behavior                                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `LoadingState message="Loading activity…"` while the query is `undefined`; the heading count is hidden (`.../activity/page.tsx:33`)                                                                                                                   |
| Empty             | `EmptyState` with the `History` icon: "No activity yet" / "Changes to your event will show up here as they happen." (`.../activity/page.tsx:35`)                                                                                                      |
| Error             | No dedicated error state. A rejected query is not caught by this page                                                                                                                                                                                 |
| Success           | A vertical list of bordered rows, newest first, with the entry count in the heading                                                                                                                                                                   |
| Disabled / locked | None. The feed is read-only by construction — no control on the page mutates anything                                                                                                                                                                 |
| Mobile            | Each row is a flex line with the description on the left (`min-w-0`) and the relative timestamp on the right (`shrink-0`), so long names truncate rather than pushing the timestamp off-screen (`src/components/activity/activity-list.tsx:41`–`:47`) |

## 7. UI Specification

### Screens & components

| Element          | Component          | Path                                                             |
| ---------------- | ------------------ | ---------------------------------------------------------------- |
| Page host        | `ActivityPage`     | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:11` |
| Feed             | `ActivityList`     | `src/components/activity/activity-list.tsx:35`                   |
| Sentence builder | `describe(item)`   | `src/components/activity/activity-list.tsx:26`                   |
| Empty state      | `EmptyState`       | `src/components/app/empty-state.tsx`                             |
| Loading state    | `LoadingState`     | `src/components/app/loading-state.tsx`                           |
| Sidebar link     | `NAV_GROUPS` entry | `src/components/dashboard/dashboard-sidebar.tsx:62`              |
| Write helper     | `logActivity`      | `convex/lib/activity.ts:26`                                      |

### Fields & validation

The page accepts no input. The only argument is derived from the route.

| Field     | Type           | Required | Rule                                                                | Message                    |
| --------- | -------------- | -------- | ------------------------------------------------------------------- | -------------------------- |
| `eventId` | `Id<"events">` | yes      | Supplied by `useEvent()._id`; the caller must hold ≥ `viewer` on it | `Insufficient permissions` |

There is no Zod schema — no form exists.

### Copy deck

All copy on this page is English app chrome; no guest-facing Spanish string is involved.

| Key                   | Copy                                                                                                                  | Source                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Heading               | `Activity`                                                                                                            | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:19` |
| Subtitle              | `A log of changes made to guests, invitations, special events, the template, and meta by you and your collaborators.` | `.../activity/page.tsx:27`–`:29`                                 |
| Loading               | `Loading activity…`                                                                                                   | `.../activity/page.tsx:33`                                       |
| Empty title           | `No activity yet`                                                                                                     | `.../activity/page.tsx:37`                                       |
| Empty body            | `Changes to your event will show up here as they happen.`                                                             | `.../activity/page.tsx:38`                                       |
| Verb — create         | `created`                                                                                                             | `src/components/activity/activity-list.tsx:13`                   |
| Verb — update         | `modified`                                                                                                            | `src/components/activity/activity-list.tsx:14`                   |
| Verb — delete         | `removed`                                                                                                             | `src/components/activity/activity-list.tsx:15`                   |
| Entity — guest        | `guest`                                                                                                               | `src/components/activity/activity-list.tsx:19`                   |
| Entity — invitation   | `invitation`                                                                                                          | `src/components/activity/activity-list.tsx:20`                   |
| Entity — specialEvent | `special event`                                                                                                       | `src/components/activity/activity-list.tsx:21`                   |
| Entity — template     | `the invitation template`                                                                                             | `src/components/activity/activity-list.tsx:22`                   |
| Entity — meta         | `meta & sharing`                                                                                                      | `src/components/activity/activity-list.tsx:23`                   |
| Sidebar link          | `Activity`                                                                                                            | `src/components/dashboard/dashboard-sidebar.tsx:62`              |

The entity labels for `specialEvent` ("special event") and `template` are code-side names;
the product term elsewhere is "special invitation" (see [glossary.md](../../glossary.md)).

## 8. Data Model

| Table          | Fields                                                                   | Read / Write                                                                      | Index                                 |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------- |
| `activityLogs` | `eventId`, `actorUserId`, `actorName`, `action`, `entity`, `entityName?` | **Insert** by `logActivity`; **read** by `listByEvent`                            | `by_eventId` (`convex/schema.ts:261`) |
| `users`        | `firstName`, `lastName`, `email`, `_id`                                  | Read — the actor doc returned by `requireEventEditor`, used to derive `actorName` | direct                                |

**Append-only.** `logActivity` performs exactly one `ctx.db.insert` and nothing else
(`convex/lib/activity.ts:36`). No code path patches or deletes an `activityLogs` row except
the event cascade: `cascadeDeleteEvent` includes `activityLogs` in `EVENT_SCOPED_TABLES`, so
deleting an event removes its whole log along with everything else
(`convex/lib/events.ts:11`).

**Denormalized actor name.** `actorName` is written as `"First Last"`, falling back to the
actor's email when both name parts are empty (`convex/lib/activity.ts:13`–`:19`). The schema
comment states the reason plainly: the list must render without joining `users`
(`convex/schema.ts:245`). The cost of that choice is staleness — the stored string is a
snapshot of the actor's name at write time, so a later rename in Clerk
([EP-01-F03](../01-account-and-access/F03-identity-sync.md)) leaves old entries showing the
old name. `actorUserId` is stored alongside it and would support a join, but nothing reads it.

**Denormalized entity name.** `entityName` is likewise a plain string, not an id, so an entry
outlives the record it names and never dangles — at the cost of never updating when that
record is renamed, and of naming records that have since been deleted.

**Timestamps.** No `createdAt` field exists. Ordering and display both use Convex's built-in
`_creationTime` (`convex/activity.ts:14`, `src/components/activity/activity-list.tsx:48`).

## 9. Backend Contract

| Function                   | Type  | Args                      | Returns                               | Guard                                                                 | Caps         |
| -------------------------- | ----- | ------------------------- | ------------------------------------- | --------------------------------------------------------------------- | ------------ |
| `api.activity.listByEvent` | query | `{eventId: Id<"events">}` | `Doc<"activityLogs">[]`, newest first | `requireEventEditor(ctx, eventId, "viewer")` (`convex/activity.ts:9`) | `.take(200)` |

`logActivity` is a plain TypeScript helper, **not** a Convex function
(`convex/lib/activity.ts:26`): it takes `{eventId, actor, action, entity, entityName?}` and is
called from inside other mutations, reusing the user doc that `requireEventEditor` already
returned. It is unreachable from a client.

### Writers — exhaustive

Every `logActivity` call site in `convex/`, in full:

| #   | Mutation                               | Call site                     | `action` | `entity`       | `entityName`                                                                                                                                    |
| --- | -------------------------------------- | ----------------------------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `guests.createGuest`                   | `convex/guests.ts:179`        | `create` | `guest`        | `"{firstName} {lastName}"` trimmed                                                                                                              |
| 2   | `guests.updateGuest`                   | `convex/guests.ts:219`        | `update` | `guest`        | Post-update name (`updates.firstName ?? guest.firstName`, same for last)                                                                        |
| 3   | `guests.deleteGuest`                   | `convex/guests.ts:334`        | `delete` | `guest`        | The deleted guest's name                                                                                                                        |
| 4   | `guests.addPlusOne`                    | `convex/guests.ts:382`        | `create` | `guest`        | The +1's name                                                                                                                                   |
| 5   | `guests.removePlusOne`                 | `convex/guests.ts:407`        | `delete` | `guest`        | The removed +1's name — **only when a +1 existed** (`convex/guests.ts:404`)                                                                     |
| 6   | `guests.bulkCreateGuestsForInvitation` | `convex/guests.ts:451`        | `create` | `guest`        | One aggregate entry: the single name when one guest was inserted, else `"{n} guests"` — **only when `ids.length > 0`** (`convex/guests.ts:450`) |
| 7   | `invitations.createInvitation`         | `convex/invitations.ts:326`   | `create` | `invitation`   | `args.title`                                                                                                                                    |
| 8   | `invitations.updateInvitation`         | `convex/invitations.ts:437`   | `update` | `invitation`   | Post-update title (`rest.title ?? invitation.title`)                                                                                            |
| 9   | `invitations.deleteInvitation`         | `convex/invitations.ts:475`   | `delete` | `invitation`   | The deleted invitation's title                                                                                                                  |
| 10  | `specialEvents.createSpecialEvent`     | `convex/specialEvents.ts:104` | `create` | `specialEvent` | `args.name`                                                                                                                                     |
| 11  | `specialEvents.updateSpecialEvent`     | `convex/specialEvents.ts:131` | `update` | `specialEvent` | Post-update name (`updates.name ?? specialEvent.name`)                                                                                          |
| 12  | `specialEvents.deleteSpecialEvent`     | `convex/specialEvents.ts:167` | `delete` | `specialEvent` | The deleted special invitation's name                                                                                                           |
| 13  | `events.setInvitationTemplate`         | `convex/events.ts:220`        | `update` | `template`     | _(none)_                                                                                                                                        |
| 14  | `meta.updateEventMeta`                 | `convex/meta.ts:144`          | `update` | `meta`         | _(none)_                                                                                                                                        |

Fourteen call sites, five entity values, three action values. `template` and `meta` are only
ever written with `action: "update"` — there is no create or delete path for either.

### Non-writers — deliberate

These mutations complete successfully and write **nothing** to `activityLogs`:

| Mutation                                                              | Path                                 | Why it is excluded                                      |
| --------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `guests.submitPublicRsvp`                                             | `convex/guests.ts:466`               | Public guest action, not a collaborator change          |
| `messages.submitGuestMessage`                                         | `convex/messages.ts`                 | Public guest action; messages have their own page       |
| `guests.setSpecialEventRsvp`                                          | `convex/guests.ts:248`               | Per-toggle status change, saved on every select         |
| `guests.removeSpecialEventRsvp`                                       | `convex/guests.ts:292`               | Same                                                    |
| `invitations.setInvitationSent`                                       | `convex/invitations.ts:487`          | Per-toggle informational flag                           |
| `invitations.setSpecialEventAccess`                                   | `convex/invitations.ts:497`          | Per-checkbox visibility toggle                          |
| `invitations.regenerateSlug`                                          | `convex/invitations.ts:534`          | —                                                       |
| `tables.*` (create/update/delete, seat assign/unassign)               | `convex/tables.ts`                   | Seating is iterative; every drag would produce an entry |
| `menu.*` / `drinks.*`                                                 | `convex/menu.ts`, `convex/drinks.ts` | —                                                       |
| `media.*`                                                             | `convex/media.ts`                    | —                                                       |
| `members.addMember` / `updateMemberRole` / `removeMember`             | `convex/members.ts`                  | **Not deliberate** — see TODO-03-02                     |
| `events.updateEvent`, `archiveEvent`, `deleteEvent`, domain mutations | `convex/events.ts`                   | —                                                       |

The first five rows are the ones stated as an explicit product decision in `AGENTS.md`: public
guest actions and per-toggle flags are outside the feed's purpose, which is to show what a
**collaborator** changed about the plan. Their exclusion keeps a single RSVP submission from
producing a dozen lines and keeps the feed from being dominated by checkbox noise. The member
mutations are the one exclusion with no such rationale.

## 10. Business Rules

- **BR-03-F05-01** `[AS-BUILT]` — The activity log is append-only: `logActivity` performs a
  single insert, and no code path patches or deletes an `activityLogs` row
  (`convex/lib/activity.ts:36`).
- **BR-03-F05-02** `[AS-BUILT]` — The only exception is the event cascade: deleting an event
  deletes its entire activity log along with every other event-scoped row
  (`convex/lib/events.ts:11`).
- **BR-03-F05-03** `[AS-BUILT]` — There is no client-callable write path; entries are produced
  only as a side effect of the fourteen mutations enumerated in §9
  (`convex/lib/activity.ts:26` is a helper, not a Convex function).
- **BR-03-F05-04** `[AS-BUILT]` — The log is readable by any member of the event, `viewer`
  included: `listByEvent` passes `"viewer"` as the `minRole`
  (`convex/activity.ts:9`).
- **BR-03-F05-05** `[AS-BUILT]` — Entries are returned newest first, ordered by Convex's
  `_creationTime` via `.order("desc")` on the `by_eventId` index; no explicit timestamp field
  exists (`convex/activity.ts:13`–`:14`).
- **BR-03-F05-06** `[AS-BUILT]` — At most 200 entries are returned per call, with no cursor,
  offset or "load more" (`convex/activity.ts:15`).
- **BR-03-F05-07** `[AS-BUILT]` — `actorName` is denormalized at write time as
  `"{firstName} {lastName}"`, falling back to the actor's email when that string is empty, so
  the feed renders without joining `users` (`convex/lib/activity.ts:13`–`:19`,
  `convex/schema.ts:245`).
- **BR-03-F05-08** `[AS-BUILT]` — `actorName` is never backfilled: an entry keeps the name the
  actor had when the action occurred (no writer of `activityLogs` exists other than the insert
  at `convex/lib/activity.ts:36`).
- **BR-03-F05-09** `[AS-BUILT]` — The actor is always the user doc returned by the calling
  mutation's own `requireEventEditor` guard, so an entry can only name a caller who was
  authorized for that action (`convex/lib/activity.ts:38`).
- **BR-03-F05-10** `[AS-BUILT]` — `entityName` is a denormalized string, not a reference; it is
  omitted for `template` and `meta` entries (`convex/schema.ts:260`, `convex/events.ts:220`,
  `convex/meta.ts:144`).
- **BR-03-F05-11** `[AS-BUILT]` — `entity` is one of exactly five values — `guest`,
  `invitation`, `specialEvent`, `template`, `meta` — and `action` one of exactly three —
  `create`, `update`, `delete` (`convex/schema.ts:248`–`:259`,
  `convex/lib/activity.ts:4`–`:10`).
- **BR-03-F05-12** `[AS-BUILT]` — `template` and `meta` entries are only ever written with
  `action: "update"` (`convex/events.ts:223`, `convex/meta.ts:147`).
- **BR-03-F05-13** `[AS-BUILT]` — A bulk guest creation writes exactly one aggregate entry,
  named `"{n} guests"` when more than one guest was inserted and the single guest's name when
  one was, and no entry at all when none was (`convex/guests.ts:450`–`:459`).
- **BR-03-F05-14** `[AS-BUILT]` — `removePlusOne` writes an entry only when a +1 actually
  existed to remove (`convex/guests.ts:404`–`:413`).
- **BR-03-F05-15** `[AS-BUILT]` — Deleting a guest who hosts a +1 writes one entry naming the
  host; the cascaded removal of the +1 is not separately recorded
  (`convex/guests.ts:334`).
- **BR-03-F05-16** `[AS-BUILT]` — Public mutations write no entries: neither
  `guests.submitPublicRsvp` nor `messages.submitGuestMessage` calls `logActivity`.
- **BR-03-F05-17** `[AS-BUILT]` — Per-guest special-invitation RSVP toggles
  (`guests.setSpecialEventRsvp`, `guests.removeSpecialEventRsvp`), the invitation sent flag
  (`invitations.setInvitationSent`), special-invitation access toggles
  (`invitations.setSpecialEventAccess`) and all seating mutations (`convex/tables.ts`) write no
  entries.
- **BR-03-F05-18** `[AS-BUILT]` — The log entry is written inside the same mutation, and
  therefore the same transaction, as the change it describes, so the two cannot diverge
  (every call site awaits `logActivity` in its handler; see §9).
- **BR-03-F05-19** `[AS-BUILT]` — Each row renders as
  `{actorName} {verb} {entity label} {entityName}`, dropping the trailing name when
  `entityName` is absent (`src/components/activity/activity-list.tsx:26`–`:33`).
- **BR-03-F05-20** `[AS-BUILT]` — Timestamps are displayed as relative distances with a suffix
  ("2 hours ago") via `formatDistanceToNow`, never as absolute dates
  (`src/components/activity/activity-list.tsx:48`).
- **BR-03-F05-21** `[AS-BUILT]` — The heading shows the number of entries currently returned,
  which is the number rendered and not the total ever recorded
  (`src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:20`–`:24`).

## 11. Acceptance Criteria

- **AC-03-F05-01** — **Given** an Editor **When** they create a guest named "Ana Pérez"
  **Then** the Activity page's top row reads "{their name} created guest Ana Pérez".
  _(BR-03-F05-03, BR-03-F05-19)_
- **AC-03-F05-02** — **Given** an event with no changes yet **When** a member opens the
  Activity page **Then** "No activity yet" is shown. _(§6 Empty)_
- **AC-03-F05-03** — **Given** three changes made in sequence **When** the page renders
  **Then** the most recent appears first. _(BR-03-F05-05)_
- **AC-03-F05-04** — **Given** 250 recorded entries **When** the page loads **Then** exactly
  200 rows render, the heading reads "(200)", and no control loads the remaining 50.
  _(BR-03-F05-06)_
- **AC-03-F05-05** — **Given** a Viewer **When** they call `api.activity.listByEvent`
  **Then** the query succeeds. _(BR-03-F05-04)_
- **AC-03-F05-06** — **Given** a user who is not a member **When** they call
  `api.activity.listByEvent` **Then** it throws and no entry is returned.
  _(BR-03-F05-04)_
- **AC-03-F05-07** — **Given** an actor who made a change and then changed their Clerk display
  name **When** the Activity page is reloaded **Then** the old entry still shows the old name.
  _(BR-03-F05-08)_
- **AC-03-F05-08** — **Given** an actor who has since been removed from the event **When** the
  Activity page is opened **Then** their entries still render with their name.
  _(BR-03-F05-07)_
- **AC-03-F05-09** — **Given** a guest created and then deleted **When** the Activity page is
  opened **Then** both a "created guest {name}" and a "removed guest {name}" row are present.
  _(BR-03-F05-01, BR-03-F05-10)_
- **AC-03-F05-10** — **Given** a template layout saved in the Design Studio **When** the
  Activity page is opened **Then** a row reads "{actor} modified the invitation template" with
  no trailing name. _(BR-03-F05-12, BR-03-F05-19)_
- **AC-03-F05-11** — **Given** meta settings saved **When** the Activity page is opened
  **Then** a row reads "{actor} modified meta & sharing". _(BR-03-F05-12)_
- **AC-03-F05-12** — **Given** five guests added in one bulk operation **When** the Activity
  page is opened **Then** exactly one new row reading "created guest 5 guests" is present.
  _(BR-03-F05-13)_
- **AC-03-F05-13** — **Given** a host guest with no +1 **When** `removePlusOne` is called
  **Then** no new entry is written. _(BR-03-F05-14)_
- **AC-03-F05-14** — **Given** a public guest submitting an RSVP **When** the Activity page is
  opened **Then** no entry corresponds to that submission. _(BR-03-F05-16)_
- **AC-03-F05-15** — **Given** a collaborator toggling an invitation's Sent checkbox and a
  guest's special-invitation status **When** the Activity page is opened **Then** neither
  action produced an entry. _(BR-03-F05-17)_
- **AC-03-F05-16** — **Given** a member added, promoted and removed **When** the Activity page
  is opened **Then** none of the three produced an entry. _(TODO-03-02)_
- **AC-03-F05-17** — **Given** an event that is deleted **When** its `activityLogs` rows are
  inspected **Then** none remain. _(BR-03-F05-02)_
- **AC-03-F05-18** — **Given** a mutation that throws after its write **When** the transaction
  rolls back **Then** no orphaned activity entry exists. _(BR-03-F05-18)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| TC-03-F05-01 | unit        | `actorDisplayName` returns "First Last", falls back to email when both name parts are empty, and trims (`convex/lib/activity.ts:13`)    |
| TC-03-F05-02 | unit        | `describe()` builds "created guest Ana" and "modified the invitation template" (`src/components/activity/activity-list.tsx:26`)         |
| TC-03-F05-03 | unit        | All three verbs and all five entity labels are mapped with no fallthrough                                                               |
| TC-03-F05-04 | integration | Each of the fourteen writers in §9 inserts exactly one row with the stated `action`/`entity`                                            |
| TC-03-F05-05 | integration | `bulkCreateGuestsForInvitation` with 5 guests inserts one row named "5 guests"; with 1 guest, that guest's name; with 0, none           |
| TC-03-F05-06 | integration | `removePlusOne` on a host without a +1 inserts nothing                                                                                  |
| TC-03-F05-07 | integration | `deleteGuest` on a host with a +1 inserts one row, not two                                                                              |
| TC-03-F05-08 | integration | `listByEvent` orders `_creationTime` descending and caps at 200                                                                         |
| TC-03-F05-09 | integration | `listByEvent` succeeds for `viewer` and throws for a non-member                                                                         |
| TC-03-F05-10 | integration | `submitPublicRsvp` and `submitGuestMessage` insert no `activityLogs` row                                                                |
| TC-03-F05-11 | integration | `setInvitationSent`, `setSpecialEventRsvp`, `removeSpecialEventRsvp`, `setSpecialEventAccess` and every `tables.*` mutation insert none |
| TC-03-F05-12 | integration | `cascadeDeleteEvent` removes every `activityLogs` row for the event                                                                     |
| TC-03-F05-13 | integration | Renaming a user does not alter existing `actorName` values                                                                              |
| TC-03-F05-14 | e2e         | Two browser sessions: a change made in one appears at the top of the other's Activity page without a reload                             |
| TC-03-F05-15 | e2e         | Empty event → "No activity yet"; after one guest creation → one row                                                                     |

### Manual QA checklist

- [ ] Create, rename and delete a guest — three rows appear in that order, newest first
- [ ] Save the template and the meta settings — two rows with no trailing entity name
- [ ] Bulk-add guests to an invitation — one row, not one per guest
- [ ] Submit an RSVP from the public invitation page — no new row
- [ ] Toggle an invitation's Sent checkbox — no new row
- [ ] Assign a guest to a seat — no new row
- [ ] Add and then remove a collaborator — no new row (expected today; see TODO-03-02)
- [ ] Remove a collaborator who made changes — their past rows still show their name
- [ ] Confirm relative timestamps update on a reload

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `.take(200)` per query (`convex/activity.ts:15`). No cap on how many rows the table accumulates and no retention policy — see TODO-03-05                                                                                                                                         |
| Performance      | One indexed range read per page load, bounded at 200 rows. Writes add exactly one insert to each of the fourteen mutations, with no extra read: the actor doc is reused from `requireEventEditor` (`convex/lib/activity.ts:38`), which is the reason `actorName` is denormalized |
| Security & authz | Read is guarded server-side at `viewer`. There is no client-callable write, so an entry cannot be forged, and no client-callable delete, so history cannot be tampered with from the product. The feed exposes only names already visible on the Members page                    |
| Accessibility    | A plain `<ul>` of `<li>` rows; no landmark, no live region, so a reactive update is not announced. Timestamps are relative text only, with no `<time datetime>` or absolute value in a `title` attribute                                                                         |
| i18n             | English only, with the verb and entity labels hardcoded as two `Record` maps (`src/components/activity/activity-list.tsx:12`, `:18`). Relative times come from `date-fns` with the default locale                                                                                |
| Analytics        | None. The feed is the product's only audit surface and is not itself instrumented                                                                                                                                                                                                |

## 14. TODOs & Open Questions

- **TODO-03-02** `[P1]` `[ADD]` — Membership changes are not logged. `members.addMember`,
  `members.updateMemberRole` and `members.removeMember` all complete without calling
  `logActivity`, and `member` is not a value of the `entity` union
  (`convex/schema.ts:253`–`:259`).
  - **Evidence:** no `logActivity(` occurrence in `convex/members.ts`; the fourteen call sites
    in §9 are exhaustive.
  - **Rationale:** granting and revoking access is the highest-consequence action in this
    epic and the only category of change with no record at all. An owner returning to the
    board cannot tell that a collaborator was added, promoted to Co-owner, or removed — the
    Members page shows the current state and nothing else. Every content change is audited;
    the access changes that permit those content changes are not.
  - **Proposed rule:** the three member mutations each write an `activityLogs` entry with a
    new `member` entity and the affected member's display name.
- **TODO-03-05** `[P2]` `[CHANGE]` — The log has no retention policy and no pagination beyond
  the fixed cap. _(Partially addressed: the page now renders a footer disclosing the 200-row
  cap once it is reached, so the truncation is no longer silent. Neither pagination nor
  retention exists.)_ `activityLogs` grows without bound for the life of the event, while
  `listByEvent` returns only the newest 200 rows with no cursor.
  - **Evidence:** `convex/activity.ts:15` (`.take(200)`, no `paginate`), `convex/schema.ts:242`
    (no TTL or archival field), and the page renders `items` directly with no "load more"
    control (`src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:41`).
  - **Rationale:** two consequences, opposite in direction. Product-side, a busy event crosses
    200 entries well before the wedding, at which point the earliest history — including
    every deletion made in the first weeks of planning — becomes permanently unreachable
    through the product, silently: the count reads "(200)" with nothing indicating truncation.
    Storage-side, nothing ever prunes the table, so rows accumulate for events that are long
    finished and are only ever removed by deleting the event outright.
  - **Proposed rule:** `listByEvent` paginates with a cursor so the full history is
    reachable, and either the UI states that the view is truncated, or entries older than a
    stated retention window are pruned.
- **TODO-03-08** `[P2]` `[CHANGE]` — The sidebar gates the Activity link at `editor` while the
  query permits `viewer`, so a viewer is authorized to read the feed but has no way to
  navigate to it.
  - **Evidence:** `src/components/dashboard/dashboard-sidebar.tsx:62`
    (`minRole: "editor"`) vs. `convex/activity.ts:9` (`"viewer"`).
  - **Rationale:** the mismatch is invisible today because `viewer` is never assignable in the
    Members UI (TODO-03-04), but the two declarations disagree about the same decision, and
    whichever is corrected later should be corrected deliberately.
  - **Proposed rule:** the sidebar `minRole` for Activity matches the query's floor, or the
    query is raised to `editor` and the viewer allowance dropped.
- **TODO-03-15** `[P2]` `[CHANGE]` — `actorName` goes stale. It is a snapshot taken at write
  time and is never backfilled, so a collaborator who changes their name in Clerk appears
  under two different names in the same feed, with nothing indicating they are one person.
  - **Evidence:** `convex/lib/activity.ts:39` (the only writer), `convex/schema.ts:245`–`:247`
    (the denormalization and its stated reason). `actorUserId` is stored
    (`convex/lib/activity.ts:38`) but no reader uses it.
  - **Rationale:** the denormalization is the right call for read performance — it is exactly
    why the list needs no join — but the feed presents the stored string as the person's
    identity, and it is not. Names change: a marriage during a wedding-planning cycle is not a
    hypothetical.
  - **Proposed rule:** the display name resolves through `actorUserId` when that user still
    exists, falling back to the stored `actorName` snapshot otherwise; or the UI groups
    entries by `actorUserId` rather than by name.
- **TODO-03-16** `[P2]` `[CHANGE]` — Entries are not reconciled when the record they name is
  deleted or renamed. `entityName` is a denormalized string with no id alongside it, so the
  feed can name a guest who no longer exists, and a rename leaves earlier entries showing the
  former name with no way to connect the two.
  - **Evidence:** `convex/schema.ts:260` (`entityName: v.optional(v.string())` — no
    `entityId`), `convex/guests.ts:334` and `convex/invitations.ts:475` (delete paths write an
    entry and remove the record, touching no earlier entries).
  - **Rationale:** this is the correct behavior for an append-only audit trail — history must
    not be rewritten when the present changes — but it is undocumented in the UI, so a reader
    of the feed cannot distinguish "guest Ana Pérez" who still exists from one who was deleted
    two rows later, and cannot click through to either.
  - **Proposed fix:** store `entityId` alongside `entityName` so the feed can link to a record
    that still exists and visually mark one that does not, while keeping the name snapshot as
    the fallback label.
- **TODO-03-17** `[P2]` `[ADD]` — The feed cannot be filtered or searched. There is no filter
  by actor, by entity type, by action or by date range, and no text search.
  - **Evidence:** `convex/activity.ts:6`–`:16` (the query takes only `eventId`);
    `src/components/activity/activity-list.tsx:35` (the component renders `items` directly with
    no controls).
  - **Rationale:** "who changed this guest?" is the question the feed exists to answer, and
    answering it today means visually scanning up to 200 undifferentiated rows. Combined with
    the 200-row cap (TODO-03-05), a specific past change is effectively unfindable on a busy
    event.
  - **Proposed rule:** the Activity page offers at least an actor filter and an entity-type
    filter, applied server-side so filtering is not limited to the 200 rows already fetched.

### Open questions

- **Q1** — Should the deliberate exclusions (public RSVPs, guest messages, per-toggle flags,
  seating) remain permanent, or should there be a second, opt-in "all changes" view for hosts
  who want the raw stream?
- **Q2** — Should a guest's RSVP arriving be surfaced _somewhere_ in the dashboard as an
  event? It is currently visible only as a changed status on the guests page and, for
  declines, as a message on the Messages page.
- **Q3** — Should the log record _what_ changed on an update (old → new values), or is
  "modified guest X" the intended level of detail?
- **Q4** — Is the log an audit trail (immutable, exportable, retained) or a convenience feed
  (recent, disposable)? TODO-03-05 and TODO-03-16 resolve differently depending on the answer.
- **Q5** — Should the Owner be able to export the log when the event is over, given that
  deleting the event destroys it?

## 15. Traceability

| Concern                             | Source                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Route                               | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:11`       |
| Query call                          | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:13`       |
| Heading + count                     | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:20`       |
| Loading / empty states              | `src/app/(dashboard)/dashboard/[eventSlug]/activity/page.tsx:32`–`:39` |
| Feed component                      | `src/components/activity/activity-list.tsx:35`                         |
| Verb + entity label maps            | `src/components/activity/activity-list.tsx:12`, `:18`                  |
| Sentence builder                    | `src/components/activity/activity-list.tsx:26`                         |
| Relative timestamp                  | `src/components/activity/activity-list.tsx:48`                         |
| Sidebar gating                      | `src/components/dashboard/dashboard-sidebar.tsx:62`                    |
| Backend — query + guard             | `convex/activity.ts:6`–`:9`                                            |
| Backend — index, order, cap         | `convex/activity.ts:13`–`:15`                                          |
| Write helper                        | `convex/lib/activity.ts:26`                                            |
| Actor-name derivation               | `convex/lib/activity.ts:13`–`:19`                                      |
| Insert                              | `convex/lib/activity.ts:36`                                            |
| Action / entity unions              | `convex/lib/activity.ts:4`–`:10`                                       |
| Schema                              | `convex/schema.ts:242`–`:261`                                          |
| Denormalization rationale (comment) | `convex/schema.ts:245`                                                 |
| Writer — guest create               | `convex/guests.ts:179`                                                 |
| Writer — guest update               | `convex/guests.ts:219`                                                 |
| Writer — guest delete               | `convex/guests.ts:334`                                                 |
| Writer — add +1                     | `convex/guests.ts:382`                                                 |
| Writer — remove +1 (conditional)    | `convex/guests.ts:404`–`:413`                                          |
| Writer — bulk create (aggregate)    | `convex/guests.ts:450`–`:459`                                          |
| Writer — invitation create          | `convex/invitations.ts:326`                                            |
| Writer — invitation update          | `convex/invitations.ts:437`                                            |
| Writer — invitation delete          | `convex/invitations.ts:475`                                            |
| Writer — special invitation create  | `convex/specialEvents.ts:104`                                          |
| Writer — special invitation update  | `convex/specialEvents.ts:131`                                          |
| Writer — special invitation delete  | `convex/specialEvents.ts:167`                                          |
| Writer — template                   | `convex/events.ts:220`                                                 |
| Writer — meta                       | `convex/meta.ts:144`                                                   |
| Non-writer — public RSVP            | `convex/guests.ts:466`                                                 |
| Non-writer — special RSVP toggles   | `convex/guests.ts:248`, `convex/guests.ts:292`                         |
| Non-writer — sent flag              | `convex/invitations.ts:487`                                            |
| Cascade on event delete             | `convex/lib/events.ts:11`                                              |
| Guard definition                    | `convex/lib/permissions.ts:50`                                         |
| Validation                          | None — the page accepts no input                                       |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                                                                                |
| ------- | ---------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-08-09 | Dashboard redesign | TODO-03-05 narrowed: the Activity page discloses the 200-row cap in a footer. Pagination and retention remain open. Page restyled onto `PageHeader`/`Panel`/`ListRow` |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                                                                                        |
