---
id: EP-03-F04
title: Remove a member
epic: EP-03 Collaboration & Permissions
version: 1.1.0
status: implemented
last_updated: 2026-08-09
depends_on: [EP-03-F01, EP-03-F02]
---

# EP-03-F04 — Remove a member

## 1. Summary

Access granted has to be revocable. An Owner or Co-owner removes a collaborator from the
Members page behind a confirmation dialog; the member loses all access to the event
immediately. The same three protections that guard role changes apply: the owner's row is
immovable, nobody removes themselves, and only the Owner may remove a Co-owner. Removal deletes
the membership only — the collaborator's user account and every change they made to the event
are untouched. This is workflow **WF-03-03**.

## 2. Actors & Permissions

| Actor                | Access           | Notes                                                            |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| Owner                | Full             | The only actor who may remove a Co-owner.                        |
| Co-owner (`planner`) | Editor rows only | Blocked from the owner row, their own row and any `planner` row. |
| Editor               | None             | Cannot reach the Members page; mutation throws.                  |
| Viewer               | None             | Same as Editor.                                                  |
| Public guest         | None             | Not authenticated.                                               |

Gate: `requireEventEditor(ctx, member.eventId, "planner")` (`convex/members.ts:137`) plus three
explicit checks. Role semantics live in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-03-F04-01** — As an Owner, I want to revoke a collaborator's access when their
  involvement ends so that my guest data stops being visible to them.
- **US-03-F04-02** — As a Co-owner, I want to remove an Editor who was added by mistake.
- **US-03-F04-03** — As an Owner, I want removal to require a deliberate confirmation so that a
  mis-click cannot cut off my planner mid-event.
- **US-03-F04-04** — As an Owner, I want to be the only one who can remove a Co-owner so that
  two Co-owners cannot remove each other behind my back.

## 4. Entry Points

| Entry point                       | Route / control                  | Actor                            |
| --------------------------------- | -------------------------------- | -------------------------------- |
| Members page                      | `/dashboard/[eventSlug]/members` | Co-owner+                        |
| Trash icon button on a member row | `MemberList` → `AlertDialog`     | Co-owner+, on editable rows only |

## 5. UX Flow

### Happy path

1. A Co-owner+ opens `/dashboard/{eventSlug}/members`.
2. Each row computes `canEdit` — the same expression that governs the role select
   (`member-list.tsx:62`–`:63`). The trash button renders only when `canEdit` is true
   (`member-list.tsx:115`).
3. The user clicks the trash icon → an `AlertDialog` opens titled "Remove member" with a body
   naming the member (`member-list.tsx:126`–`:133`).
4. They confirm → `api.members.removeMember` is called with `{memberId}`
   (`member-list.tsx:137`).
5. The server loads the row, guards `planner` on its event, resolves the caller's role, applies
   the three protections, then deletes the row (`convex/members.ts:134`–`:150`).
6. `toast.success("Member removed")` fires and the row disappears reactively.

### Alternate & edge paths

- **A1** — Cancelling the dialog closes it with no mutation (`member-list.tsx:135`).
- **A2** — Owner row, self row, or a `planner` row viewed by a non-owner Co-owner → the trash
  button is not rendered at all; only a read-only role `Badge` appears.
- **A3** — The removed member is the one currently viewing the event elsewhere → their next
  query throws `Unauthorized` from `requireEventAccess`, so `EventProvider` shows "Event not
  found"; the event also disappears from `listMyEvents`.
- **E1** — The row was already deleted → `ConvexError("Member not found")`
  (`convex/members.ts:135`).
- **E2** — Target is the owner row → `ConvexError("The owner cannot be removed")`
  (`convex/members.ts:141`).
- **E3** — Target is the caller's own row → `ConvexError("You cannot remove yourself")`
  (`convex/members.ts:144`).
- **E4** — A non-owner targets a `planner` row → `ConvexError("Only the owner can remove
co-owners")` (`convex/members.ts:147`).
- **E5** — Caller is below `planner` → `ConvexError("Insufficient permissions")`.
- **E6** — All errors surface as the single toast "Failed to remove member"
  (`member-list.tsx:52`) because `useToastMutation` discards the `ConvexError` message — see
  TODO-03-01 in [EP-03-F02](./F02-add-member.md).

## 6. States

| State             | Behavior                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Page-level `Skeleton` while `listMembers` is undefined. The remove action itself shows no per-row spinner; `removeMember.pending` is not bound to any control. |
| Empty             | Page-level `EmptyState`; `MemberList` is not rendered.                                                                                                         |
| Error             | `toast.error("Failed to remove member")`; the row stays in the list.                                                                                           |
| Success           | `toast.success("Member removed")`; the row disappears reactively.                                                                                              |
| Disabled / locked | The trash button is **absent** (not disabled) on the owner row, the self row and — for non-owner callers — Co-owner rows.                                      |
| Mobile            | The trash button is a 32×32 icon button inside the row's right-hand flex cluster (`member-list.tsx:118`–`:123`).                                               |

## 7. UI Specification

### Screens & components

| Element                     | Component          | Path                                                         |
| --------------------------- | ------------------ | ------------------------------------------------------------ |
| Member row + remove control | `MemberList`       | `src/components/members/member-list.tsx`                     |
| Confirmation                | `AlertDialog`      | `src/components/ui/alert-dialog.tsx`                         |
| Mutation wrapper            | `useToastMutation` | `src/hooks/use-toast-mutation.ts`                            |
| Page host                   | `MembersPage`      | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx` |

### Fields & validation

| Field      | Type                 | Required | Rule                            | Message            |
| ---------- | -------------------- | -------- | ------------------------------- | ------------------ |
| `memberId` | `Id<"eventMembers">` | yes      | Must resolve to an existing row | `Member not found` |

The mutation takes no other input; there is no free-text confirmation.

### Copy deck

| Key                | Copy                                                                | Source                                              |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Dialog title       | `Remove member`                                                     | `src/components/members/member-list.tsx:128`        |
| Dialog body        | `Remove {name} from this event? They will lose access immediately.` | `src/components/members/member-list.tsx:129`–`:132` |
| Cancel             | `Cancel`                                                            | `src/components/members/member-list.tsx:135`        |
| Confirm            | `Remove`                                                            | `src/components/members/member-list.tsx:140`        |
| Success toast      | `Member removed`                                                    | `src/components/members/member-list.tsx:51`         |
| Error toast        | `Failed to remove member`                                           | `src/components/members/member-list.tsx:52`         |
| Server — owner row | `The owner cannot be removed`                                       | `convex/members.ts:141`                             |
| Server — self row  | `You cannot remove yourself`                                        | `convex/members.ts:144`                             |
| Server — co-owner  | `Only the owner can remove co-owners`                               | `convex/members.ts:147`                             |

The dialog body substitutes the member's display name, falling back to their email
(`member-list.tsx:58`, `:130`). English only.

## 8. Data Model

| Table          | Fields        | Read / Write                     | Index                      |
| -------------- | ------------- | -------------------------------- | -------------------------- |
| `eventMembers` | whole row     | Read then **delete**             | direct `get` by `memberId` |
| `events`       | `ownerUserId` | Read — guards and `getEventRole` | direct `get`               |
| `users`        | `role`        | Read — superadmin bypass         | direct `get`               |

**Cascade behavior — deliberately none.** `removeMember` deletes exactly one `eventMembers`
row (`convex/members.ts:150`). Nothing else is touched: guests, invitations, media and every
other record the removed collaborator created stay with the event, and their `activityLogs`
entries remain (with `actorName` denormalized, so the feed still reads correctly after their
membership is gone — see [EP-03-F05](./F05-activity-log.md)). The user's account and their
memberships on other events are unaffected. Access ends on the member's very next query, since
each guard re-reads the row live. **No activity-log entry is written** (TODO-03-02).

## 9. Backend Contract

| Function                   | Type     | Args                             | Returns | Guard                                                                                          | Caps |
| -------------------------- | -------- | -------------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ---- |
| `api.members.removeMember` | mutation | `{memberId: Id<"eventMembers">}` | `void`  | `requireEventEditor(ctx, member.eventId, "planner")` + owner-row, self-row and co-owner checks | —    |

As with `updateMemberRole`, the args carry no `eventId`; the event is derived from the row.

## 10. Business Rules

- **BR-03-F04-01** `[AS-BUILT]` — Removing a member requires at least `planner` on the event that
  owns the member row (`convex/members.ts:137`).
- **BR-03-F04-02** `[AS-BUILT]` — A `memberId` that does not resolve is rejected with
  `ConvexError("Member not found")` (`convex/members.ts:135`).
- **BR-03-F04-03** `[AS-BUILT]` — The `owner` row can never be removed, by anyone
  (`convex/members.ts:140`–`:142`).
- **BR-03-F04-04** `[AS-BUILT]` — No caller may remove their own row
  (`convex/members.ts:143`–`:145`).
- **BR-03-F04-05** `[AS-BUILT]` — Only a caller whose effective role is `owner` may remove a row
  whose role is `planner` (`convex/members.ts:146`–`:148`).
- **BR-03-F04-06** `[AS-BUILT]` — The caller's role comes from `getEventRole`, so a superadmin
  resolves to `owner` and may remove a Co-owner (`convex/members.ts:138`).
- **BR-03-F04-07** `[AS-BUILT]` — Removal deletes only the `eventMembers` row; no content the
  member authored is deleted or reassigned (`convex/members.ts:150`).
- **BR-03-F04-08** `[AS-BUILT]` — The client renders the remove control only on rows where
  `canEdit` is true — not the owner row, not the caller's own row, and not a `planner` row unless
  the caller is the owner (`member-list.tsx:62`–`:63`, `:115`).
- **BR-03-F04-09** `[AS-BUILT]` — Removal is confirmed through an `AlertDialog` before the
  mutation runs (`member-list.tsx:116`–`:144`).
- **BR-03-F04-10** `[AS-BUILT]` — The confirmation body names the member by display name, falling
  back to their email (`member-list.tsx:58`, `:130`).
- **BR-03-F04-11** `[AS-BUILT]` — Removing a member writes no activity-log entry.
- **BR-03-F04-12** `[AS-BUILT]` — There is no mutation by which a member can remove themselves; the
  self-row protection blocks the only available path (`convex/members.ts:143`).

## 11. Acceptance Criteria

- **AC-03-F04-01** — **Given** an Owner and an Editor member **When** the Owner clicks the trash
  icon **Then** an "Remove member" confirmation dialog appears and no mutation has run yet.
- **AC-03-F04-02** — **Given** that dialog **When** the Owner cancels **Then** the row remains
  and no toast appears.
- **AC-03-F04-03** — **Given** that dialog **When** the Owner confirms **Then** the toast "Member
  removed" appears and the row disappears from the list.
- **AC-03-F04-04** — **Given** a removed collaborator **When** they reload the event dashboard
  **Then** the "Event not found" screen renders and the event is absent from their event list.
- **AC-03-F04-05** — **Given** a removed collaborator who had created guests **When** the owner
  opens the guests page **Then** all of those guests are still present.
- **AC-03-F04-06** — **Given** a removed collaborator who appears in the activity log **When**
  the owner opens the Activity page **Then** their entries still render with their name.
- **AC-03-F04-07** — **Given** a Co-owner **When** they view a peer Co-owner's row **Then** no
  trash button is rendered.
- **AC-03-F04-08** — **Given** a Co-owner **When** they call `removeMember` on a `planner` row
  directly **Then** the server throws "Only the owner can remove co-owners".
- **AC-03-F04-09** — **Given** any caller **When** they call `removeMember` on the owner row
  **Then** the server throws "The owner cannot be removed".
- **AC-03-F04-10** — **Given** any caller **When** they call `removeMember` on their own row
  **Then** the server throws "You cannot remove yourself" and they remain a member.
- **AC-03-F04-11** — **Given** an Editor **When** they call `removeMember` **Then** the server
  throws `Insufficient permissions`.
- **AC-03-F04-12** — **Given** a removed collaborator **When** they are added again by email
  **Then** the add succeeds, because the duplicate check finds no surviving row.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                            |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| TC-03-F04-01 | unit        | The trash button renders only when `canEdit` is true.                                               |
| TC-03-F04-02 | unit        | Confirming the `AlertDialog` calls `removeMember` with the row's `_id`; cancelling calls nothing.   |
| TC-03-F04-03 | integration | Owner removes an `editor` row; the row is deleted and no other table changes.                       |
| TC-03-F04-04 | integration | Owner removes a `planner` row successfully.                                                         |
| TC-03-F04-05 | integration | `planner` caller removing a `planner` row throws.                                                   |
| TC-03-F04-06 | integration | Any caller removing the owner row throws.                                                           |
| TC-03-F04-07 | integration | Any caller removing their own row throws.                                                           |
| TC-03-F04-08 | integration | Unknown `memberId` throws "Member not found".                                                       |
| TC-03-F04-09 | integration | After removal, `requireEventAccess` throws for the removed user and `listMyEvents` omits the event. |
| TC-03-F04-10 | integration | After removal, guests/invitations created by that user and their `activityLogs` rows still exist.   |
| TC-03-F04-11 | e2e         | Remove a member in one session; their open session loses access on its next navigation.             |

### Manual QA checklist

- [ ] Remove an Editor and confirm the dialog copy names them correctly.
- [ ] Cancel the dialog and confirm nothing happens.
- [ ] Confirm the owner row and your own row have no trash button.
- [ ] As a Co-owner, confirm a peer Co-owner row has no trash button.
- [ ] Confirm the removed member's activity entries are still visible on the Activity page.
- [ ] Re-add the removed member and confirm it succeeds.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None.                                                                                                                                                           |
| Performance      | One `eventMembers` get, one guard, one `getEventRole`, one delete.                                                                                              |
| Security & authz | All three protections are server-enforced. Access revocation is immediate because every guard reads the membership row live — there is no cached session role.  |
| Accessibility    | Destructive action behind a shadcn `AlertDialog` with an explicit Cancel; the trash trigger is an icon-only `Button` with no accessible label (see TODO-03-13). |
| i18n             | English only.                                                                                                                                                   |
| Analytics        | None; removals are neither logged nor tracked.                                                                                                                  |

## 14. TODOs & Open Questions

- **TODO-03-06** `[P2]` `[ADD]` — A collaborator cannot leave an event on their own. The
  self-row protection blocks the only removal path, and no "leave event" affordance exists, so a
  member added to an event they want nothing to do with must ask an Owner or Co-owner to remove
  them.
  - **Evidence:** `convex/members.ts:143`–`:145`; no leave control in
    `src/components/members/member-list.tsx`
  - **Rationale:** the self-row protection exists to stop an owner or last co-owner from
    accidentally orphaning their own access, but it also removes a legitimate exit.
  - **Proposed rule:** a non-owner member may remove their own membership through an explicit
    "Leave event" action with its own confirmation, while `removeMember` keeps blocking implicit
    self-removal.
- See **TODO-03-02** — defined in [EP-03-F05 §14](./F05-activity-log.md#14-todos--open-questions).
  Removals are not recorded: `convex/members.ts:150` deletes without calling `logActivity`.
  Revocation is an access-control event the owner has no way to audit after the fact.
- **TODO-03-14** `[P2]` `[CHANGE]` — `removeMember.pending` is computed but never bound to a
  control, so the confirm button is clickable during the in-flight request and a double
  confirmation issues a second mutation (which then fails with the unreadable "Member not found").
  - **Evidence:** `src/components/members/member-list.tsx:50`–`:53`, `:136`–`:141`
  - **Proposed rule:** the confirm action is disabled while the removal is pending.

### Open questions

- **Q1** — Should the removed collaborator be notified that their access ended?
- **Q2** — Should removing a member offer to reassign or flag the content they authored, or is
  "content stays with the event" the intended permanent stance?
- **Q3** — Should an Owner be able to remove **all** collaborators in one action when wrapping up
  an event, or is per-row removal sufficient?

## 15. Traceability

| Concern                         | Source                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| Route                           | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:16` |
| Mutation hookup + toasts        | `src/components/members/member-list.tsx:50`–`:53`               |
| Editability rule                | `src/components/members/member-list.tsx:62`–`:63`               |
| Remove button gating            | `src/components/members/member-list.tsx:115`                    |
| Confirmation dialog             | `src/components/members/member-list.tsx:116`–`:144`             |
| Confirm action                  | `src/components/members/member-list.tsx:137`                    |
| Backend — member load           | `convex/members.ts:134`–`:135`                                  |
| Backend — guard + caller role   | `convex/members.ts:137`–`:138`                                  |
| Backend — owner-row protection  | `convex/members.ts:140`–`:142`                                  |
| Backend — self-row protection   | `convex/members.ts:143`–`:145`                                  |
| Backend — co-owner protection   | `convex/members.ts:146`–`:148`                                  |
| Backend — delete                | `convex/members.ts:150`                                         |
| Access revocation on next query | `convex/lib/permissions.ts:32`–`:40`                            |
| Shared events list              | `convex/events.ts:27`–`:35`                                     |
| Schema                          | `convex/schema.ts:83`–`:95`                                     |
| Toast convention                | `src/hooks/use-toast-mutation.ts:30`–`:47`                      |

## 16. Changelog

| Version | Date       | Author             | Change                                                                                                |
| ------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| 1.1.0   | 2026-08-09 | Dashboard redesign | **TODO-03-13 closed.** The remove trigger carries an `aria-label` naming the member, plus a `Tooltip` |
| 1.0.0   | 2026-07-27 | Spec suite v1      | Initial as-built specification                                                                        |
