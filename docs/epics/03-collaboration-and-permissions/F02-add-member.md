---
id: EP-03-F02
title: Share an event by email
epic: EP-03 Collaboration & Permissions
version: 1.0.0
status: defective
last_updated: 2026-07-27
depends_on: [EP-03-F01, EP-01, EP-02]
---

# EP-03-F02 — Share an event by email

## 1. Summary

An Owner or Co-owner shares their event with a collaborator by entering that person's email
address and picking the role they should hold. The collaborator must already have a Wedboard
account — sharing links an existing user to the event, it does not send an invitation to sign
up. From that moment the event appears in the collaborator's event list with the granted
authority. This is workflow **WF-03-01**.

## 2. Actors & Permissions

| Actor                | Access      | Notes                                                                                     |
| -------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| Owner                | Full        | May grant Co-owner or Editor.                                                             |
| Co-owner (`planner`) | Add members | The UI offers only Editor; the **server accepts Co-owner from them too** — see DEF-03-01. |
| Editor               | None        | The Members page renders an access notice; the mutation throws.                           |
| Viewer               | None        | Same as Editor.                                                                           |
| Public guest         | None        | Not authenticated.                                                                        |

Gate: `requireEventEditor(ctx, args.eventId, "planner")` (`convex/members.ts:65`). Role
semantics are defined in [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-03-F02-01** — As an Owner, I want to share my event with my partner by email so that we
  plan from one board instead of one account.
- **US-03-F02-02** — As an Owner, I want to grant a professional planner Co-owner access so that
  they can run the event without being able to delete it.
- **US-03-F02-03** — As a Co-owner, I want to bring in an Editor to enter guests so that data
  entry is not bottlenecked on me.
- **US-03-F02-04** — As an Owner, I want the system to reject a duplicate or an email that owns
  the event so that the member list cannot contain contradictions.
- **US-03-F02-05** — As an Owner, I want to be told when the email has no Wedboard account so
  that I know to ask them to sign up first.

## 4. Entry Points

| Entry point            | Route / control                             | Actor     |
| ---------------------- | ------------------------------------------- | --------- |
| Members page           | `/dashboard/[eventSlug]/members`            | Co-owner+ |
| Sidebar link "Members" | `NAV_ITEMS` entry with `minRole: "planner"` | Co-owner+ |
| "Add member" button    | Opens `AddMemberDialog`                     | Co-owner+ |

## 5. UX Flow

### Happy path

1. A Co-owner+ opens `/dashboard/{eventSlug}/members`; the page computes
   `canManage = hasMinRole(event.myRole, "planner")` and `isOwner = event.myRole === "owner"`
   (`members/page.tsx:18`–`:19`).
2. The page queries `api.members.listMembers` for the current member list
   (`members/page.tsx:20`–`:23`).
3. The user clicks **Add member** → `AddMemberDialog` opens with `email: ""` and
   `role: "editor"` (`add-member-dialog.tsx:37`–`:38`).
4. They type an email and pick a role. The role `Select` offers `["planner", "editor"]` to the
   owner and `["editor"]` to everyone else (`add-member-dialog.tsx:45`–`:47`).
5. They submit → `handleAdd` trims the email and calls `api.members.addMember` through
   `useToastMutation` (`add-member-dialog.tsx:49`–`:53`).
6. The server guards `planner`, normalizes the email to trimmed lowercase, resolves the `users`
   row by `by_email`, checks the event owner and existing membership, then inserts the
   `eventMembers` row (`convex/members.ts:65`–`:100`).
7. On success the toast "Member added" fires, the form resets to an empty email and `editor`,
   and the dialog closes (`add-member-dialog.tsx:54`–`:57`).
8. `listMembers` re-renders reactively with the new row.

### Alternate & edge paths

- **A1** — Empty or whitespace-only email → the submit button is disabled
  (`add-member-dialog.tsx:117`) and `handleAdd` returns before calling the mutation
  (`add-member-dialog.tsx:51`).
- **A2** — The caller is not the owner → the role select contains only "Editor", so Co-owner
  cannot be chosen through the UI (`add-member-dialog.tsx:45`).
- **A3** — The member list is empty apart from the owner row — not reachable, since
  `listMembers` always includes the owner row created at `createEvent`. The page's `EmptyState`
  ("No members yet") therefore only appears if the owner row is missing
  (`members/page.tsx:61`–`:66`).
- **E1** — No `users` row matches the email → `ConvexError("No account exists with that email —
ask them to sign up first")` (`convex/members.ts:75`).
- **E2** — The email belongs to the event owner → `ConvexError("That user already owns this
event")` (`convex/members.ts:83`).
- **E3** — The user is already a member → `ConvexError("That user is already a member of this
event")` (`convex/members.ts:93`).
- **E4** — The event no longer exists → `ConvexError("Event not found")` (`convex/members.ts:81`).
- **E5** — The caller is below `planner` → `ConvexError("Insufficient permissions")` from
  `requireEventMember`.
- **E6** — **Every** error above reaches the user as the same generic toast "Failed to add
  member", because `useToastMutation` catches without reading the error
  (`src/hooks/use-toast-mutation.ts:39`–`:42`). See TODO-03-01. On failure the dialog stays
  open with the typed email intact (`add-member-dialog.tsx:53`–`:57`).

## 6. States

| State             | Behavior                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `members === undefined` → `Skeleton` of height 32 (`members/page.tsx:59`–`:60`). While the mutation runs, the submit button reads "Adding..." and is disabled (`add-member-dialog.tsx:117`–`:119`). |
| Empty             | `EmptyState` icon `Users2`, title "No members yet", description "Add a co-owner or editor to collaborate on this event." (`members/page.tsx:61`–`:66`).                                             |
| Error             | Generic `toast.error("Failed to add member")`; dialog remains open, email preserved.                                                                                                                |
| Success           | `toast.success("Member added")`, dialog closes, form resets, list updates reactively.                                                                                                               |
| Disabled / locked | Submit disabled while pending or when the email is blank. For a non-owner the role select has a single option.                                                                                      |
| Mobile            | Standard shadcn `Dialog`; the members page is `max-w-2xl` with `p-6` (`members/page.tsx:42`).                                                                                                       |

## 7. UI Specification

### Screens & components

| Element          | Component          | Path                                                         |
| ---------------- | ------------------ | ------------------------------------------------------------ |
| Members page     | `MembersPage`      | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx` |
| Add dialog       | `AddMemberDialog`  | `src/components/members/add-member-dialog.tsx`               |
| Member list      | `MemberList`       | `src/components/members/member-list.tsx`                     |
| Empty state      | `EmptyState`       | `src/components/app/empty-state.tsx`                         |
| Mutation wrapper | `useToastMutation` | `src/hooks/use-toast-mutation.ts`                            |

### Fields & validation

| Field | Type                | Required | Rule                                                                                                                                                   | Message                                                         |
| ----- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Email | `input[type=email]` | yes      | Non-blank after trim (client, disables submit); trimmed + lowercased server-side; must match an existing `users.email`                                 | `No account exists with that email — ask them to sign up first` |
| Role  | `Select`            | yes      | One of `planner` \| `editor` \| `viewer` per `ASSIGNABLE_ROLE` (`convex/members.ts:11`); UI offers `planner`/`editor` to the owner, `editor` otherwise | Convex validator error                                          |

There is **no Zod schema** for this form — validation is the disabled-submit check plus the
server's `ConvexError`s.

### Copy deck

| Key              | Copy                                                                                                                                                | Source                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Page title       | `Members`                                                                                                                                           | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:44` |
| Page description | `Share this event with co-owners (full access except deleting the event) and editors (content only). Members must already have a Wedboard account.` | `members/page.tsx:45`–`:49`                                     |
| Access notice    | `You don't have permission to manage this event's members. Ask an owner or co-owner for access.`                                                    | `members/page.tsx:29`–`:32`                                     |
| Add button       | `Add member`                                                                                                                                        | `members/page.tsx:55`                                           |
| Dialog title     | `Add member`                                                                                                                                        | `add-member-dialog.tsx:63`                                      |
| Email hint       | `They must already have a Wedboard account.`                                                                                                        | `add-member-dialog.tsx:78`                                      |
| Role hint        | `Co-owners get full access except deleting the event. Editors manage content only.`                                                                 | `add-member-dialog.tsx:100`–`:101`                              |
| Submit / pending | `Add member` / `Adding...`                                                                                                                          | `add-member-dialog.tsx:119`                                     |
| Success toast    | `Member added`                                                                                                                                      | `add-member-dialog.tsx:40`                                      |
| Error toast      | `Failed to add member`                                                                                                                              | `add-member-dialog.tsx:41`                                      |
| Empty state      | `No members yet` / `Add a co-owner or editor to collaborate on this event.`                                                                         | `members/page.tsx:64`–`:65`                                     |

All copy in this feature is English; no guest-facing Spanish strings are involved.

## 8. Data Model

| Table          | Fields                      | Read / Write                                | Index                                           |
| -------------- | --------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `users`        | `email`, `_id`              | Read — resolve the invitee                  | `by_email` (`convex/schema.ts:26`)              |
| `events`       | `ownerUserId`               | Read — reject the owner's own email         | direct `get`                                    |
| `eventMembers` | `eventId`, `userId`, `role` | Read (duplicate check) + **Write** (insert) | `by_eventId_and_userId` (`convex/schema.ts:95`) |
| `eventMembers` | all                         | Read — member list                          | `by_eventId` (`convex/schema.ts:93`)            |

**Side effects.** The insert is the only write. Nothing else is created: no notification, no
email, and **no activity-log entry** (see TODO-03-02 and [EP-03-F05](./F05-activity-log.md)).
The new member gains access immediately and reactively — `events.listMyEvents` reads
`eventMembers.by_userId`, so the event appears in their switcher on the next query without any
further action.

## 9. Backend Contract

| Function                  | Type     | Args                                                                              | Returns                                                                           | Guard                                         | Caps       |
| ------------------------- | -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| `api.members.addMember`   | mutation | `{eventId: Id<"events">, email: string, role: "planner" \| "editor" \| "viewer"}` | `Id<"eventMembers">`                                                              | `requireEventEditor(ctx, eventId, "planner")` | —          |
| `api.members.listMembers` | query    | `{eventId: Id<"events">}`                                                         | `{_id, userId, role, firstName?, lastName?, email, isSelf}[]` sorted owner→viewer | `requireEventEditor(ctx, eventId, "viewer")`  | `take(50)` |

## 10. Business Rules

- **BR-03-F02-01** `[AS-BUILT]` — Adding a member requires at least the `planner` role on the
  event (`convex/members.ts:65`).
- **BR-03-F02-02** `[AS-BUILT]` — The submitted email is trimmed and lowercased before lookup
  (`convex/members.ts:67`).
- **BR-03-F02-03** `[AS-BUILT]` — An empty email after trimming is rejected with
  `ConvexError("Email is required")` (`convex/members.ts:68`).
- **BR-03-F02-04** `[AS-BUILT]` — The invitee must already have a `users` row matching that
  email exactly; no invitation-to-sign-up flow exists (`convex/members.ts:70`–`:78`).
- **BR-03-F02-05** `[AS-BUILT]` — The event's owner cannot be added as a member
  (`convex/members.ts:82`).
- **BR-03-F02-06** `[AS-BUILT]` — A user who already has an `eventMembers` row for the event
  cannot be added again (`convex/members.ts:86`–`:94`).
- **BR-03-F02-07** `[AS-BUILT]` — The assignable roles are exactly `planner`, `editor` and
  `viewer`; `owner` can never be assigned through this mutation (`convex/members.ts:11`–`:15`).
- **BR-03-F02-08** `[AS-BUILT]` — The Add dialog offers the Co-owner option only when the caller
  is the owner (`add-member-dialog.tsx:45`–`:47`). **Client-side only** — see DEF-03-01.
- **BR-03-F02-09** `[AS-BUILT]` — The Add dialog defaults the role to `editor` and resets to
  `editor` after a successful add (`add-member-dialog.tsx:38`, `:56`).
- **BR-03-F02-10** `[AS-BUILT]` — The dialog closes only on success; on failure it stays open
  with the entered email (`add-member-dialog.tsx:53`–`:57`).
- **BR-03-F02-11** `[AS-BUILT]` — `listMembers` is readable by any member (`minRole: "viewer"`),
  but the Members page only issues it for `planner`+ callers
  (`convex/members.ts:24`; `members/page.tsx:20`–`:23`).
- **BR-03-F02-12** `[AS-BUILT]` — `listMembers` returns rows sorted owner → planner → editor →
  viewer (`convex/members.ts:47`–`:53`).
- **BR-03-F02-13** `[AS-BUILT]` — Each returned row carries `isSelf`, true when the row's
  `userId` matches the caller (`convex/members.ts:41`).
- **BR-03-F02-14** `[AS-BUILT]` — A member row whose `users` document is missing still renders,
  with an empty email and no name (`convex/members.ts:36`–`:40`).
- **BR-03-F02-15** `[AS-BUILT]` — Adding a member writes no activity-log entry.

## 11. Acceptance Criteria

- **AC-03-F02-01** — **Given** an Owner on the Members page **When** they add the email of an
  existing account as Editor **Then** a toast "Member added" appears, the dialog closes and the
  new row appears in the list with the "Editor" label.
- **AC-03-F02-02** — **Given** the added collaborator **When** they open `/dashboard` **Then**
  the shared event is listed and opens with editor-level navigation.
- **AC-03-F02-03** — **Given** an email with no Wedboard account **When** the owner submits
  **Then** no `eventMembers` row is created and the dialog stays open.
- **AC-03-F02-04** — **Given** the owner's own email **When** it is submitted **Then** the server
  rejects it with "That user already owns this event" and no row is created.
- **AC-03-F02-05** — **Given** an email already on the member list **When** it is submitted
  **Then** the server rejects it and the list still contains exactly one row for that user.
- **AC-03-F02-06** — **Given** an email typed with surrounding spaces and mixed case **When** it
  is submitted **Then** it resolves to the same account as the canonical lowercase form.
- **AC-03-F02-07** — **Given** a Co-owner on the Members page **When** they open the Add dialog
  **Then** the role select offers "Editor" only.
- **AC-03-F02-08** — **Given** an Editor **When** they call `addMember` directly **Then** the
  server throws `Insufficient permissions`.
- **AC-03-F02-09** — **Given** a blank email field **When** the user looks at the dialog **Then**
  the submit button is disabled.
- **AC-03-F02-10** — **Given** any member is added **When** the Activity page is opened **Then**
  no entry for the addition exists (documents current behavior; see TODO-03-02).

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                          |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-03-F02-01 | unit        | `handleAdd` returns without calling the mutation for a whitespace-only email.                                                                     |
| TC-03-F02-02 | unit        | `roleOptions` is `["planner","editor"]` for `isOwner`, `["editor"]` otherwise.                                                                    |
| TC-03-F02-03 | integration | `addMember` inserts an `eventMembers` row with the requested role.                                                                                |
| TC-03-F02-04 | integration | `addMember` throws for an unknown email, the owner's email and a duplicate member.                                                                |
| TC-03-F02-05 | integration | `addMember` normalizes `"  Foo@Bar.COM "` to `foo@bar.com` before lookup.                                                                         |
| TC-03-F02-06 | integration | `addMember` throws `Insufficient permissions` for an `editor` caller.                                                                             |
| TC-03-F02-07 | integration | `addMember` called by a `planner` with `role: "planner"` — currently succeeds; the test asserting rejection is the regression test for DEF-03-01. |
| TC-03-F02-08 | integration | `listMembers` returns rows ordered owner → planner → editor → viewer with correct `isSelf`.                                                       |
| TC-03-F02-09 | e2e         | Owner adds an editor; a second browser session for that account sees the event in its switcher.                                                   |
| TC-03-F02-10 | e2e         | Failed add keeps the dialog open with the entered email.                                                                                          |

### Manual QA checklist

- [ ] Add an existing account as Editor and confirm the row appears immediately.
- [ ] Add an unknown email and confirm no row is created.
- [ ] Add the owner's own email and confirm rejection.
- [ ] Add the same person twice and confirm the second attempt fails.
- [ ] As a Co-owner, confirm the role select shows Editor only.
- [ ] Confirm the added collaborator sees the event in their dashboard.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | `listMembers` reads `take(50)` member rows (`convex/members.ts:29`) — a 51st member is invisible in the UI (TODO-03-07). No cap on `addMember` itself.                                      |
| Performance      | `addMember` performs one indexed `users` lookup, one event get and one indexed membership lookup. `listMembers` fans out one `users` get per member row, bounded by 50.                     |
| Security & authz | The `planner` floor is server-enforced. The owner-only Co-owner grant is **not** (DEF-03-01). Membership is by user id, so changing a Clerk email later does not detach an existing member. |
| Accessibility    | Email and Role inputs are labeled via `Label`/`htmlFor`; the dialog is a shadcn `Dialog` with focus trapping.                                                                               |
| i18n             | English only.                                                                                                                                                                               |
| Analytics        | None; the add is not logged or tracked.                                                                                                                                                     |

## 14. TODOs & Open Questions

- **DEF-03-01** `[P1]` — The rule "only the owner may grant Co-owner" is enforced **client-side
  only** for adding a member. `members.addMember` guards `planner` and then accepts any value in
  `ASSIGNABLE_ROLE`, with no check of the caller's own role — unlike `updateMemberRole`, which
  compares `callerRole !== "owner"` before allowing a `planner` transition.
  - **Evidence:** `convex/members.ts:58`–`:101` (no caller-role check) versus
    `convex/members.ts:120`–`:125` (the check that exists for role changes); client-only
    restriction at `src/components/members/add-member-dialog.tsx:45`–`:47`.
  - **Impact:** a Co-owner calling the mutation directly can grant Co-owner to anyone with an
    account, escalating a peer to a role they cannot themselves revoke (`removeMember` blocks a
    non-owner from removing a `planner`, `convex/members.ts:146`). The owner is not notified,
    because member changes are not activity-logged.
  - **Proposed fix:** `addMember` rejects `role === "planner"` unless
    `getEventRole(ctx, args.eventId, caller._id) === "owner"`, with the message already used by
    `updateMemberRole`: "Only the owner can manage co-owners".
- **TODO-03-01** `[P1]` `[CHANGE]` — Server rejection messages never reach the user.
  `useToastMutation` catches with a bare `catch {}` and toasts the fixed `options.error` string,
  discarding the `ConvexError` payload. All five distinct `addMember` failures ("ask them to sign
  up first", "already owns this event", "already a member", "Event not found", "Insufficient
  permissions") render identically as "Failed to add member".
  - **Evidence:** `src/hooks/use-toast-mutation.ts:39`–`:42`
  - **Rationale:** the "ask them to sign up first" message is the single most actionable error in
    this workflow and is currently unreachable, leaving the owner with no idea why the add failed.
  - **Proposed rule:** when the caught value is a `ConvexError` with a string `data`, the toast
    shows that message; otherwise it falls back to `options.error`.
- **TODO-03-03** `[P1]` `[ADD]` — A user added to an event receives no notification of any kind:
  no email, no in-app signal, no badge. They discover the shared event only by returning to
  `/dashboard`.
  - **Rationale:** sharing is a two-party action, but only the sharer knows it happened.
  - **Proposed rule:** on a successful `addMember`, the new member is notified by email with the
    event name, the granting user's name and a direct link to `/dashboard/{eventSlug}`.
- **TODO-03-07** `[P2]` `[CHANGE]` — `listMembers` is capped at `take(50)` with no total count
  and no pagination, so members beyond the 50th are silently invisible and appear addable again
  (the duplicate check would then reject them with an error the user cannot read, per TODO-03-01).
  - **Evidence:** `convex/members.ts:29`
  - **Proposed rule:** the member list is paginated, or the cap is surfaced with an explicit
    "showing first 50 members" notice.
- **TODO-03-09** `[P2]` `[ADD]` — `addMember` performs no email-format validation; it only trims,
  lowercases and requires non-empty. A malformed address simply fails the account lookup and
  produces the "no account exists" error, which is misleading for a typo like `foo@@bar`.
  - **Evidence:** `convex/members.ts:67`–`:78`
  - **Proposed rule:** the email is validated against the project's standard email rule (a Zod
    schema under `src/lib/validations/`) before the lookup, with a distinct message.

### Open questions

- **Q1** — Should sharing with a **non-existing** account be supported (a pending invitation
  row that resolves on sign-up), or is "they must sign up first" the intended product stance?
- **Q2** — Should the person being added have to accept, or is unilateral addition by the owner
  acceptable?
- **Q3** — Is there a maximum number of collaborators per event that the product wants to
  enforce (today: none, beyond the display cap of 50)?

## 15. Traceability

| Concern                               | Source                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| Route                                 | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:16`       |
| Role gate (page)                      | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:18`–`:23` |
| Access notice                         | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:26`–`:39` |
| Loading / empty states                | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:59`–`:69` |
| Add dialog                            | `src/components/members/add-member-dialog.tsx:26`                     |
| Role options (client-only owner rule) | `src/components/members/add-member-dialog.tsx:45`–`:47`               |
| Submit handler                        | `src/components/members/add-member-dialog.tsx:49`–`:58`               |
| Backend — assignable roles            | `convex/members.ts:11`–`:15`                                          |
| Backend — `listMembers`               | `convex/members.ts:21`–`:55`                                          |
| Backend — `addMember` guard           | `convex/members.ts:65`                                                |
| Backend — email normalization         | `convex/members.ts:67`–`:68`                                          |
| Backend — account lookup              | `convex/members.ts:70`–`:78`                                          |
| Backend — owner rejection             | `convex/members.ts:80`–`:84`                                          |
| Backend — duplicate rejection         | `convex/members.ts:86`–`:94`                                          |
| Backend — insert                      | `convex/members.ts:96`–`:100`                                         |
| Schema                                | `convex/schema.ts:83`–`:95`, `convex/schema.ts:26` (`users.by_email`) |
| Toast convention                      | `src/hooks/use-toast-mutation.ts:30`–`:47`                            |
| Sidebar entry                         | `src/components/dashboard/dashboard-sidebar.tsx:71`                   |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
