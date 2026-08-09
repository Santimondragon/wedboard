---
id: EP-06-F01
title: Manage Special Invitations
epic: EP-06 Special Invitations
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F01, EP-03-F05]
---

# EP-06-F01 — Manage Special Invitations

## 1. Summary

A host can attach up to two **[special invitations](../../glossary.md)** to an event — mini
sub-events such as a welcome dinner or an after-party — each with its own name, description,
date, location and active flag. This feature covers creating, editing, deactivating and
deleting them from the Special Events dashboard page. Who may _see_ a special invitation is
EP-06-F02; who _responds_ to it is EP-06-F03 and EP-07.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                                          |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Owner                | Full   |                                                                                                |
| Co-owner (`planner`) | Full   | No additional gate beyond editor                                                               |
| Editor               | Full   | Every function here uses `requireEventEditor(ctx, eventId)` at its default `minRole: "editor"` |
| Viewer               | None   | The default editor floor read-blocks viewers from `listByEvent` and `getSpecialEventsPageData` |
| Public guest         | None   | Never reaches these functions                                                                  |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
Gate applied: `requireEventEditor(ctx, eventId)` for the event-scoped functions
(`convex/specialEvents.ts:9`, `:24`, `:83`) and `requireEventEditor(ctx, specialEvent.eventId)`
for the id-scoped ones, after loading the doc (`convex/specialEvents.ts:127`, `:146`).

## 3. User Stories

- **US-06-F01-01** — As an Editor, I want to create a special invitation with a name, date and
  location so that guests can be told about a second gathering.
- **US-06-F01-02** — As an Editor, I want to edit a special invitation's details so that a
  change of venue or time reaches guests without recreating it.
- **US-06-F01-03** — As an Editor, I want to deactivate a special invitation so that it stops
  appearing on public invitation pages without losing its data.
- **US-06-F01-04** — As an Editor, I want to delete a special invitation and be told that its
  guest responses go with it so that I am not surprised by the data loss.
- **US-06-F01-05** — As an Editor, I want to see how many of my two slots are used so that the
  cap is not a surprise.

## 4. Entry Points

| Entry point                        | Route / control                                | Actor   |
| ---------------------------------- | ---------------------------------------------- | ------- |
| Special Events page                | `/dashboard/[eventSlug]/special-events`        | Editor+ |
| Sidebar link "Special Invitations" | `NAV_GROUPS` (Guests group), `minRole: editor` | Editor+ |
| "Add special invitation" button    | Page header, disabled at cap                   | Editor+ |
| Pencil icon on a row               | Opens the edit dialog                          | Editor+ |
| Trash icon on a row                | Opens the delete confirmation                  | Editor+ |
| Active switch on a row             | Immediate `updateSpecialEvent`                 | Editor+ |

## 5. UX Flow

### Happy path — create (WF-06-01)

1. The Editor opens `/dashboard/[eventSlug]/special-events`. The page loads everything in one
   round trip via `api.specialEvents.getSpecialEventsPageData`
   (`.../special-events/page.tsx:23`).
2. The header reads "Mini sub-events (welcome dinner, after-party…) guests RSVP to from their
   invitation. Up to 2 per event." and a counter shows "0 of 2"
   (`.../special-events/page.tsx:72`, `:80`).
3. The Editor clicks "Add special invitation" → `SpecialEventForm` opens in `create` mode.
4. The Editor fills Name (required), Description, Date & time, Location and submits.
5. The form converts the `datetime-local` string with `new Date(data.date).getTime()`
   (`special-event-form.tsx:118`) and calls `api.specialEvents.createSpecialEvent`.
6. The server checks the cap, inserts the row with `isActive: true`, logs a
   `specialEvent`/`create` activity entry, and returns the new id
   (`convex/specialEvents.ts:90`, `:96`, `:104`).
7. Toast "Special invitation created"; the dialog closes; the list re-renders reactively.

### Happy path — edit (WF-06-02)

1. The Editor clicks the pencil on a row → the dialog opens in `edit` mode, reset from the
   live row, with the date rendered back through `toDateTimeLocal`
   (`special-event-form.tsx:44`, `:99`).
2. Submitting calls `api.specialEvents.updateSpecialEvent` with name, description, date,
   location and `isActive`; the server patches and logs `specialEvent`/`update`.
3. Toast "Special invitation updated".

### Happy path — delete (WF-06-03)

1. The Editor clicks the trash icon → an `AlertDialog` warns: "Are you sure you want to delete
   "{name}"? This also removes its guest responses and invitation access. This action cannot
   be undone." (`special-event-list.tsx:112`).
2. Confirming calls `api.specialEvents.deleteSpecialEvent`, which deletes every
   `invitationSpecialEventAccess` row, then every `guestSpecialEventRsvps` row, then the
   special invitation itself, then logs `specialEvent`/`delete`
   (`convex/specialEvents.ts:149`, `:158`, `:166`, `:167`).
3. Toast "Special invitation deleted".

### Alternate & edge paths

- **A1** — Two special invitations already exist → "Add special invitation" renders disabled
  with `title="Limit of 2 reached"` (`.../special-events/page.tsx:86`), so the server cap is
  normally unreachable from this UI.
- **A2** — The Active switch on a row toggles `isActive` immediately through a bare
  `useMutation`, not `useToastMutation`; there is no success toast, only an error toast
  "Failed to update special invitation" (`special-event-list.tsx:41`).
- **A3** — Date left blank → `date` is sent as `undefined` and the row renders **no date
  element at all** (`special-event-list.tsx:71`). See TODO-06-06.
- **A4** — In `create` mode the visibility panel shows "Save first, then reopen to choose which
  invitations can see this." (`special-event-form.tsx:212`). Covered by EP-06-F02.
- **E1** — Name blank → the Zod resolver blocks submit and renders "Name is required"
  (`src/lib/validations/special-event.ts:4`).
- **E2** — The cap is hit anyway (a second tab, or a direct client call) →
  `createSpecialEvent` throws `ConvexError("An event can have at most 2 special
invitations")`, but `useToastMutation` catches without inspecting the error and shows
  "Failed to create special invitation" (`src/hooks/use-toast-mutation.ts:39`). See DEF-06-01.
- **E3** — The special invitation was deleted in another session → `updateSpecialEvent` /
  `deleteSpecialEvent` throw `ConvexError("Special event not found")`; the user sees the
  generic failure toast.

## 6. States

| State             | Behavior                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `pageData === undefined` → a `Skeleton h-32` replaces the list; the "N of 2" counter renders empty; the Add button is disabled (`.../special-events/page.tsx:78`, `:86`, `:93`)         |
| Empty             | `EmptyState` with the `Sparkles` icon, title "No special invitations yet", description "Create a mini sub-event your guests can RSVP to separately." (`.../special-events/page.tsx:96`) |
| Error             | No dedicated error state; mutation failures surface only as sonner toasts                                                                                                               |
| Success           | The list re-renders from the live Convex query; no manual refetch                                                                                                                       |
| Disabled / locked | Add button disabled at the cap or while loading; the dialog's submit button disabled while `isSubmitting`, its label becoming "Saving..." (`special-event-form.tsx:245`)                |
| Mobile            | The dialog is `max-h-[90vh] overflow-y-auto`; the date/location pair stays a two-column grid at every breakpoint (`special-event-form.tsx:159`, `:182`)                                 |

## 7. UI Specification

### Screens & components

| Element                                 | Component           | Path                                                                |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| Page shell, counter, Add button         | `SpecialEventsPage` | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx` |
| Row list, active switch, delete confirm | `SpecialEventList`  | `src/components/special-events/special-event-list.tsx`              |
| Create / edit dialog                    | `SpecialEventForm`  | `src/components/special-events/special-event-form.tsx`              |
| Empty state                             | `EmptyState`        | `src/components/app/empty-state.tsx`                                |

### Fields & validation

| Field         | Type              | Required       | Rule                                                              | Message            |
| ------------- | ----------------- | -------------- | ----------------------------------------------------------------- | ------------------ |
| `name`        | text              | Yes            | `z.string().min(1)`                                               | "Name is required" |
| `description` | textarea (3 rows) | No             | `z.string().optional()`; empty string sent as `undefined`         | —                  |
| `date`        | `datetime-local`  | No             | `z.string().optional()`; converted with `new Date(str).getTime()` | —                  |
| `location`    | text              | No             | `z.string().optional()`; empty string sent as `undefined`         | —                  |
| `isActive`    | switch            | Edit mode only | `z.boolean()`; create always inserts `true` server-side           | —                  |

### Copy deck

All copy on this surface is English (dashboard-facing); no guest-facing Spanish strings.

| Key                   | Copy                                                                                                                                                                                                               | Source                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Page title            | "Special Events"                                                                                                                                                                                                   | `.../special-events/page.tsx:67`                                     |
| Page description      | "Mini sub-events (welcome dinner, after-party…) guests RSVP to from their invitation. Up to 2 per event."                                                                                                          | `.../special-events/page.tsx:71`                                     |
| Counter               | "{n} of 2"                                                                                                                                                                                                         | `.../special-events/page.tsx:80`                                     |
| Add button            | "Add special invitation"                                                                                                                                                                                           | `.../special-events/page.tsx:89`                                     |
| Cap tooltip           | "Limit of 2 reached"                                                                                                                                                                                               | `.../special-events/page.tsx:86`                                     |
| Empty title           | "No special invitations yet"                                                                                                                                                                                       | `.../special-events/page.tsx:98`                                     |
| Empty description     | "Create a mini sub-event your guests can RSVP to separately."                                                                                                                                                      | `.../special-events/page.tsx:99`                                     |
| Visibility count      | "Visible to {n} invitation(s)"                                                                                                                                                                                     | `special-event-list.tsx:83`                                          |
| Delete title          | "Delete special invitation"                                                                                                                                                                                        | `special-event-list.tsx:111`                                         |
| Delete body           | "Are you sure you want to delete "{name}"? This also removes its guest responses and invitation access. This action cannot be undone."                                                                             | `special-event-list.tsx:112`                                         |
| Dialog title (create) | "Add special invitation"                                                                                                                                                                                           | `special-event-form.tsx:163`                                         |
| Dialog title (edit)   | "Edit special invitation"                                                                                                                                                                                          | `special-event-form.tsx:165`                                         |
| Toasts                | "Special invitation created" / "Failed to create special invitation" / "Special invitation updated" / "Failed to update special invitation" / "Special invitation deleted" / "Failed to delete special invitation" | `special-event-form.tsx:62`, `:69`; `.../special-events/page.tsx:30` |

## 8. Data Model

| Table                          | Fields                                                        | Read / Write                    | Index               |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------- | ------------------- |
| `specialEvents`                | `eventId, name, description?, date?, location?, isActive`     | Read + write                    | `by_eventId`        |
| `invitationSpecialEventAccess` | all                                                           | Delete on cascade               | `by_specialEventId` |
| `guestSpecialEventRsvps`       | all                                                           | Delete on cascade               | `by_specialEventId` |
| `invitations`                  | `_id, title`                                                  | Read (for the visibility panel) | `by_eventId`        |
| `activityLogs`                 | `eventId, actorUserId, actorName, action, entity, entityName` | Write                           | —                   |

Schema: `convex/schema.ts:158`, `:167`, `:182`.

**Cascade.** `deleteSpecialEvent` is a hard delete with two cleanup passes before the row
itself: up to 500 `invitationSpecialEventAccess` rows by `by_specialEventId`, then up to 500
`guestSpecialEventRsvps` rows by `by_specialEventId` (`convex/specialEvents.ts:149`, `:158`).
Nothing on `guests` or `invitations` is modified — a guest that had answered simply loses the
answer. There is no soft-delete and no undo; the `isActive` flag is the reversible alternative.

**Date.** Stored as Unix ms (`v.optional(v.number())`), converted on the way in from the
`datetime-local` string and on the way out with `format(new Date(ms), "yyyy-MM-dd'T'HH:mm")`
(`special-event-form.tsx:44`).

## 9. Backend Contract

| Function                                     | Type     | Args                                                     | Returns                                       | Guard                                              | Caps                                                                   |
| -------------------------------------------- | -------- | -------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `api.specialEvents.listByEvent`              | query    | `{eventId}`                                              | `Doc<"specialEvents">[]`                      | `requireEventEditor`                               | `.take(100)`                                                           |
| `api.specialEvents.getSpecialEventsPageData` | query    | `{eventId}`                                              | `{specialEvents, invitations, accessByEvent}` | `requireEventEditor`                               | 100 special events, 500 invitations, 500 access rows per special event |
| `api.specialEvents.listForInvitation`        | query    | `{invitationId}`                                         | active `Doc<"specialEvents">[]`               | **none — public**                                  | `.take(100)`; no callers (TODO-06-01)                                  |
| `api.specialEvents.createSpecialEvent`       | mutation | `{eventId, name, description?, date?, location?}`        | `Id<"specialEvents">`                         | `requireEventEditor`                               | `MAX_SPECIAL_EVENTS = 2`                                               |
| `api.specialEvents.updateSpecialEvent`       | mutation | `{id, name?, description?, date?, location?, isActive?}` | `void`                                        | `requireEventEditor` on the loaded doc's `eventId` | —                                                                      |
| `api.specialEvents.deleteSpecialEvent`       | mutation | `{id}`                                                   | `void`                                        | `requireEventEditor` on the loaded doc's `eventId` | 500 access + 500 RSVP rows cleaned                                     |

`MAX_SPECIAL_EVENTS` is exported from `convex/specialEvents.ts:72`; the client repeats the
literal `2` as a local constant (`.../special-events/page.tsx:18`).

## 10. Business Rules

- **BR-06-F01-01** `[AS-BUILT]` — An event holds at most `MAX_SPECIAL_EVENTS` (2) special
  invitations; `createSpecialEvent` throws `ConvexError("An event can have at most 2 special
invitations")` when the event already has 2 or more (`convex/specialEvents.ts:90`).
- **BR-06-F01-02** `[AS-BUILT]` — The cap is enforced only on create; `updateSpecialEvent`
  never re-checks it.
- **BR-06-F01-03** `[AS-BUILT]` — A newly created special invitation is always `isActive: true`;
  the create form offers no active control (`convex/specialEvents.ts:102`,
  `special-event-form.tsx:193`).
- **BR-06-F01-04** `[AS-BUILT]` — `name` is the only required field; description, date and
  location are optional at both the validator and the Convex arg level.
- **BR-06-F01-05** `[AS-BUILT]` — The date is stored as a Unix ms timestamp derived from the
  `datetime-local` input; a blank input stores no date at all
  (`special-event-form.tsx:118`).
- **BR-06-F01-06** `[AS-BUILT]` — Only an inactive special invitation is withheld from the
  public payload: `buildPublicInvitationPayload` filters `se.isActive` before returning
  special invitations (`convex/invitations.ts:155`), and `listForInvitation` applies the same
  filter (`convex/specialEvents.ts:67`). Deactivating hides it publicly without deleting data.
- **BR-06-F01-07** `[AS-BUILT]` — Deleting a special invitation deletes every
  `invitationSpecialEventAccess` row that references it (`convex/specialEvents.ts:149`).
- **BR-06-F01-08** `[AS-BUILT]` — Deleting a special invitation deletes every
  `guestSpecialEventRsvps` row that references it (`convex/specialEvents.ts:158`).
- **BR-06-F01-09** `[AS-BUILT]` — `updateSpecialEvent` and `deleteSpecialEvent` resolve the
  event from the loaded document, so a caller cannot act on a special invitation belonging to
  an event they do not have editor access to (`convex/specialEvents.ts:125`, `:145`).
- **BR-06-F01-10** `[AS-BUILT]` — Create, update and delete each append one `activityLogs` row
  with `entity: "specialEvent"` and `entityName` set to the special invitation's name; on
  update the _new_ name is logged when supplied, else the previous one
  (`convex/specialEvents.ts:104`, `:131`, `:167`). See [EP-03-F05](../03-collaboration-and-permissions/).
- **BR-06-F01-11** `[AS-BUILT]` — `updateSpecialEvent` patches with the raw arg object minus
  `id`, so an omitted optional field is left untouched rather than cleared
  (`convex/specialEvents.ts:129`).

## 11. Acceptance Criteria

- **AC-06-F01-01** — **Given** an event with 0 special invitations **When** an Editor submits
  the create form with name "Welcome dinner" **Then** a `specialEvents` row exists with
  `isActive: true` and the counter reads "1 of 2".
- **AC-06-F01-02** — **Given** an event with 2 special invitations **When** the page loads
  **Then** "Add special invitation" is disabled and its tooltip reads "Limit of 2 reached".
- **AC-06-F01-03** — **Given** an event with 2 special invitations **When** `createSpecialEvent`
  is called directly **Then** it throws `ConvexError("An event can have at most 2 special
invitations")` and no row is inserted.
- **AC-06-F01-04** — **Given** the create form with an empty Name **When** the Editor submits
  **Then** "Name is required" is shown and no mutation fires.
- **AC-06-F01-05** — **Given** a date & time of `2026-09-12T19:30` **When** the form is saved
  **Then** `specialEvents.date` equals `new Date("2026-09-12T19:30").getTime()`, and reopening
  the dialog shows `2026-09-12T19:30` in the input.
- **AC-06-F01-06** — **Given** a special invitation with no date **When** the list renders
  **Then** no calendar row appears and the row still shows its visibility count.
- **AC-06-F01-07** — **Given** an active special invitation visible to an invitation **When**
  the Editor turns its Active switch off **Then** `getPublicInvitation` for that invitation no
  longer returns it, while its access and RSVP rows remain in the database.
- **AC-06-F01-08** — **Given** a special invitation with 3 access rows and 5 guest responses
  **When** the Editor confirms deletion **Then** all 3 access rows, all 5 RSVP rows and the
  special invitation itself are gone, and no `guests` or `invitations` row is modified.
- **AC-06-F01-09** — **Given** any create, update or delete on this surface **When** it
  succeeds **Then** exactly one `activityLogs` row with `entity: "specialEvent"` is appended.
- **AC-06-F01-10** — **Given** a Viewer on the event **When** `getSpecialEventsPageData` is
  called **Then** it throws `Insufficient permissions`.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                             |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| TC-06-F01-01 | unit        | `specialEventSchema` rejects an empty name and accepts a payload with only a name                                    |
| TC-06-F01-02 | unit        | `toDateTimeLocal(ms)` round-trips with `new Date(str).getTime()`                                                     |
| TC-06-F01-03 | integration | `createSpecialEvent` succeeds twice and throws the cap `ConvexError` on the third call                               |
| TC-06-F01-04 | integration | `createSpecialEvent` inserts `isActive: true` regardless of args                                                     |
| TC-06-F01-05 | integration | `updateSpecialEvent` with only `{id, isActive:false}` leaves name/date/location intact                               |
| TC-06-F01-06 | integration | `deleteSpecialEvent` removes matching access rows and RSVP rows and leaves other special invitations' rows untouched |
| TC-06-F01-07 | integration | `getPublicInvitation` omits an inactive special invitation the invitation has access to                              |
| TC-06-F01-08 | integration | Each of create/update/delete appends exactly one `activityLogs` row                                                  |
| TC-06-F01-09 | integration | A Viewer calling `getSpecialEventsPageData` is rejected                                                              |
| TC-06-F01-10 | e2e         | Create → edit → deactivate → delete a special invitation and confirm the counter and toasts at each step             |

### Manual QA checklist

- [ ] Counter reads "0 of 2", "1 of 2", "2 of 2" as rows are added
- [ ] Add button disables at the cap and its tooltip appears on hover
- [ ] Blank name blocks submit with the inline message
- [ ] Saved date reopens in the dialog with the same wall-clock value
- [ ] A special invitation with no date shows no date row
- [ ] Active switch turns the card off on the public invitation page
- [ ] Delete confirmation text mentions guest responses and invitation access
- [ ] After delete, the guests table's column for that special invitation disappears
- [ ] Activity page shows a created / modified / removed entry with the special invitation name

## 13. Non-Functional

| Concern          | Specification                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 2 special invitations per event; queries bounded at 100 special events / 500 invitations / 500 access rows; delete cleans up to 500 access + 500 RSVP rows |
| Performance      | The page is a single `getSpecialEventsPageData` round trip; the access map costs one indexed query per special event (≤2)                                  |
| Security & authz | Every function except `listForInvitation` is behind `requireEventEditor`; id-scoped mutations re-derive the event from the document                        |
| Accessibility    | The active switch carries `aria-label="Active"`; delete is behind a confirming `AlertDialog`; every input has a matching `Label`                           |
| i18n             | Dashboard copy is English-only and hard-coded; no i18n layer exists                                                                                        |
| Analytics        | None beyond the activity log                                                                                                                               |

## 14. TODOs & Open Questions

- **DEF-06-01** `[P2]` — The cap `ConvexError` message never reaches the user.
  - **Evidence:** thrown at `convex/specialEvents.ts:91`, swallowed by the bare `catch` in
    `src/hooks/use-toast-mutation.ts:39`
  - **Impact:** in the rare path where the cap is hit (a second tab, a stale client, a direct
    API call) the Editor sees only "Failed to create special invitation" and cannot tell why.
    The primary UI path is protected — the Add button is disabled at the cap
    (`.../special-events/page.tsx:86`) — so this is a fallback-quality issue, not a blocked
    workflow.
  - **Proposed fix:** `useToastMutation` surfaces `error.data` when the caught error is a
    `ConvexError`, falling back to the generic message otherwise.
- **TODO-06-01** `[P2]` `[REMOVE]` — `specialEvents.listForInvitation` is dead code.
  - **Rationale:** it has no callers anywhere in `src/` or `convex/`; the public page gets its
    special invitations from `invitations.getPublicInvitation`. It is also the only
    unauthenticated function in the module, so it is dead surface area as well as dead code.
  - **Proposed rule:** the module exposes no unauthenticated query; public reads go through
    `invitations.getPublicInvitation`.
- **TODO-06-02** `[P1]` `[ADD]` — No per-special-invitation attendance summary exists.
  - **Rationale:** `convex/dashboard.ts` `getOverviewStats` counts only main-event RSVP
    buckets; nothing aggregates `guestSpecialEventRsvps`. The host can only eyeball the
    per-special-invitation columns in the guests table, one guest at a time — impractical for
    catering a welcome dinner.
  - **Proposed rule:** each special invitation row shows attending / declined / pending /
    not-invited counts, sourced from a bounded aggregate query over
    `guestSpecialEventRsvps.by_specialEventId`.
- **TODO-06-06** `[P2]` `[ADD]` — A special invitation with no date renders nothing where the
  date would be.
  - **Rationale:** `special-event-list.tsx:71` renders the calendar row only when
    `specialEvent.date` is truthy, so an undated special invitation is silently indistinguishable
    from one whose date the Editor forgot to fill in. The public card has the same gap.
  - **Proposed rule:** the list shows a muted "Date to be announced" placeholder when `date`
    is unset.
- **TODO-06-07** `[P2]` `[CHANGE]` — The `isActive` control never explains its effect.
  - **Rationale:** the row switch is labelled only `aria-label="Active"` and the dialog label
    is "Active" (`special-event-list.tsx:94`, `special-event-form.tsx:201`). Its actual effect
    — removing the special invitation from every public invitation page while keeping its data
    (BR-06-F01-06) — is documented nowhere in the UI.
  - **Proposed rule:** the toggle carries helper copy stating that inactive special invitations
    are hidden from guests but keep their responses.

### Open questions

- **Q1** — Is 2 the intended long-term product cap, or a temporary guard? The public
  `specialInvitation` block binds to one special invitation at a time, so raising the cap is a
  Design Studio question as much as a data one.
- **Q2** — Should deactivating a special invitation that already has responses warn the
  Editor, given that guests who answered can no longer see it?
- **Q3** — Should delete be a soft delete, so a mis-click does not destroy collected responses?

## 15. Traceability

| Concern                           | Source                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| Route                             | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:20` |
| Page data query                   | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:23` |
| Client cap constant               | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:18` |
| Cap UI (counter, disabled button) | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:80` |
| Empty state                       | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx:96` |
| List row + active toggle          | `src/components/special-events/special-event-list.tsx:41`              |
| Date rendering                    | `src/components/special-events/special-event-list.tsx:71`              |
| Delete confirmation copy          | `src/components/special-events/special-event-list.tsx:112`             |
| Create/edit dialog                | `src/components/special-events/special-event-form.tsx:50`              |
| datetime-local conversion         | `src/components/special-events/special-event-form.tsx:44`, `:118`      |
| Validation                        | `src/lib/validations/special-event.ts:3`                               |
| `MAX_SPECIAL_EVENTS`              | `convex/specialEvents.ts:72`                                           |
| `createSpecialEvent` + cap throw  | `convex/specialEvents.ts:74`, `:90`                                    |
| `updateSpecialEvent`              | `convex/specialEvents.ts:115`                                          |
| `deleteSpecialEvent` cascade      | `convex/specialEvents.ts:141`, `:149`, `:158`                          |
| `getSpecialEventsPageData`        | `convex/specialEvents.ts:21`                                           |
| `listForInvitation` (dead)        | `convex/specialEvents.ts:51`                                           |
| `isActive` honored publicly       | `convex/invitations.ts:155`                                            |
| Schema                            | `convex/schema.ts:158`                                                 |
| Toast wrapper swallowing errors   | `src/hooks/use-toast-mutation.ts:39`                                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
