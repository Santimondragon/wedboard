---
id: EP-03-F03
title: Change a member's role
epic: EP-03 Collaboration & Permissions
version: 1.0.0
status: implemented
last_updated: 2026-07-27
depends_on: [EP-03-F01, EP-03-F02]
---

# EP-03-F03 — Change a member's role

## 1. Summary

Collaboration needs change mid-planning: a data-entry helper becomes a full partner, or a
Co-owner steps back to content-only. An Owner or Co-owner changes an existing member's role
inline on the Members page. Two invariants protect the board: the owner's row can never be
edited, and nobody can edit their own row — so authority is always granted downward by someone
else. Promotions to and demotions from Co-owner are reserved for the Owner. This is workflow
**WF-03-02**.

## 2. Actors & Permissions

| Actor                | Access           | Notes                                                                                                                                     |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full             | The only actor who may promote to, or demote from, Co-owner.                                                                              |
| Co-owner (`planner`) | Editor rows only | May change an `editor` (or `viewer`) row to another non-`planner` role. Blocked from the owner row, their own row, and any `planner` row. |
| Editor               | None             | Cannot reach the Members page; mutation throws.                                                                                           |
| Viewer               | None             | Same as Editor.                                                                                                                           |
| Public guest         | None             | Not authenticated.                                                                                                                        |

Gate: `requireEventEditor(ctx, member.eventId, "planner")` (`convex/members.ts:110`), followed
by three explicit checks. Role semantics live in
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-03-F03-01** — As an Owner, I want to promote a trusted Editor to Co-owner so that they can
  manage settings and other collaborators.
- **US-03-F03-02** — As an Owner, I want to demote a Co-owner back to Editor when their role in
  the wedding changes.
- **US-03-F03-03** — As a Co-owner, I want to adjust an Editor's role without being able to
  create or unmake other Co-owners.
- **US-03-F03-04** — As an Owner, I want it to be impossible for anyone — including me — to
  change my own or the owner's role, so the event always has an unambiguous owner.

## 4. Entry Points

| Entry point                   | Route / control                  | Actor                            |
| ----------------------------- | -------------------------------- | -------------------------------- |
| Members page                  | `/dashboard/[eventSlug]/members` | Co-owner+                        |
| Role `Select` on a member row | `MemberList`                     | Co-owner+, on editable rows only |

There is no separate dialog: the role select **is** the control, and changing its value saves
immediately.

## 5. UX Flow

### Happy path

1. A Co-owner+ opens `/dashboard/{eventSlug}/members`; `MemberList` receives the rows plus
   `isOwner` (`members/page.tsx:68`).
2. For each row the component computes editability:
   `canEdit = !isOwnerRow && !m.isSelf && (isOwner || m.role !== "planner")`
   (`member-list.tsx:62`–`:63`).
3. Editable rows render a `Select` whose options are `["planner", "editor"]` for the owner and
   `["editor"]` otherwise (`member-list.tsx:65`–`:67`, `:90`–`:110`).
4. The user picks a role → `onValueChange` immediately calls `api.members.updateMemberRole` with
   `{memberId, role}` (`member-list.tsx:92`–`:97`). There is no confirmation step and no save
   button.
5. The server loads the member row, guards `planner` on that row's event, resolves the caller's
   own role with `getEventRole`, applies the three protections, then patches the row
   (`convex/members.ts:108`–`:127`).
6. `toast.success("Role updated")` fires and the list re-renders reactively with the new label.

### Alternate & edge paths

- **A1** — The owner's row → `canEdit` is false; the row renders a static `Badge` reading
  "Owner" with no remove button (`member-list.tsx:59`, `:111`–`:113`).
- **A2** — The caller's own row → `canEdit` is false; a static badge renders and the name is
  suffixed with "(you)" (`member-list.tsx:77`–`:81`).
- **A3** — A `planner` row viewed by a non-owner Co-owner → `canEdit` is false; static badge.
- **A4** — While the mutation is in flight, **every** select in the list is disabled, because all
  rows share one `useToastMutation` instance and therefore one `pending` flag
  (`member-list.tsx:98`).
- **E1** — The member row was deleted concurrently → `ConvexError("Member not found")`
  (`convex/members.ts:109`).
- **E2** — Target is the owner row → `ConvexError("The owner's role cannot be changed")`
  (`convex/members.ts:114`).
- **E3** — Target is the caller's own row → `ConvexError("You cannot change your own role")`
  (`convex/members.ts:117`).
- **E4** — A non-owner attempts a transition **to** or **from** `planner` →
  `ConvexError("Only the owner can manage co-owners")` (`convex/members.ts:124`).
- **E5** — Caller is below `planner` → `ConvexError("Insufficient permissions")`.
- **E6** — Every error above surfaces as the same toast "Failed to update role"
  (`member-list.tsx:48`), because `useToastMutation` discards the `ConvexError` message — see
  TODO-03-01 in [EP-03-F02](./F02-add-member.md). The `Select` reverts to the stored value on
  the next reactive update.

## 6. States

| State             | Behavior                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Handled by the page: `Skeleton` while `listMembers` is undefined (`members/page.tsx:59`).                                                                       |
| Empty             | Page-level `EmptyState`; `MemberList` is not rendered.                                                                                                          |
| Error             | `toast.error("Failed to update role")`; the row's select snaps back to the stored role.                                                                         |
| Success           | `toast.success("Role updated")`; the row's label updates reactively.                                                                                            |
| Disabled / locked | All selects disabled while any role update is pending. Owner rows, self rows and (for non-owners) Co-owner rows render a read-only `Badge` instead of a select. |
| Mobile            | Row is a flex layout with a `w-32` select and a truncating name column (`member-list.tsx:71`–`:100`).                                                           |

## 7. UI Specification

### Screens & components

| Element                  | Component          | Path                                                         |
| ------------------------ | ------------------ | ------------------------------------------------------------ |
| Member row + role select | `MemberList`       | `src/components/members/member-list.tsx`                     |
| Read-only role display   | `Badge`            | `src/components/ui/badge.tsx`                                |
| Mutation wrapper         | `useToastMutation` | `src/hooks/use-toast-mutation.ts`                            |
| Page host                | `MembersPage`      | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx` |

### Fields & validation

| Field      | Type                 | Required | Rule                                                                                                                                                                | Message                |
| ---------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Role       | `Select`             | yes      | Value must be in `ASSIGNABLE_ROLE` = `planner` \| `editor` \| `viewer` (`convex/members.ts:11`); UI offers `planner`/`editor` to the owner, `editor` only otherwise | Convex validator error |
| `memberId` | `Id<"eventMembers">` | yes      | Must resolve to an existing row                                                                                                                                     | `Member not found`     |

No Zod schema participates; validation is the union validator plus the server checks.

### Copy deck

| Key                          | Copy                                       | Source                                      |
| ---------------------------- | ------------------------------------------ | ------------------------------------------- |
| Success toast                | `Role updated`                             | `src/components/members/member-list.tsx:47` |
| Error toast                  | `Failed to update role`                    | `src/components/members/member-list.tsx:48` |
| Self marker                  | `(you)`                                    | `src/components/members/member-list.tsx:79` |
| Role labels                  | `Owner` / `Co-owner` / `Editor` / `Viewer` | `src/lib/roles.ts:23`–`:28`                 |
| Server — owner row           | `The owner's role cannot be changed`       | `convex/members.ts:114`                     |
| Server — self row            | `You cannot change your own role`          | `convex/members.ts:117`                     |
| Server — co-owner transition | `Only the owner can manage co-owners`      | `convex/members.ts:124`                     |

English only; no guest-facing Spanish copy.

## 8. Data Model

| Table          | Fields              | Read / Write                                     | Index                      |
| -------------- | ------------------- | ------------------------------------------------ | -------------------------- |
| `eventMembers` | `role`              | **Write** — `ctx.db.patch`                       | direct `get` by `memberId` |
| `eventMembers` | `eventId`, `userId` | Read — resolve the event and detect the self row | direct `get`               |
| `events`       | `ownerUserId`       | Read — via `getEventRole` / `requireEventMember` | direct `get`               |
| `users`        | `role`              | Read — superadmin bypass in the guards           | direct `get`               |

**Side effects.** The patch is the only write; the change takes effect on the member's very next
query, with no session invalidation needed because every guard reads the row live. A demotion
therefore removes sidebar entries and blocks mutations immediately. **No activity-log entry is
written** (TODO-03-02).

## 9. Backend Contract

| Function                       | Type     | Args                                                                      | Returns | Guard                                                                                                     | Caps |
| ------------------------------ | -------- | ------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- | ---- |
| `api.members.updateMemberRole` | mutation | `{memberId: Id<"eventMembers">, role: "planner" \| "editor" \| "viewer"}` | `void`  | `requireEventEditor(ctx, member.eventId, "planner")` + owner-row, self-row and co-owner-transition checks | —    |

Note the args carry **no `eventId`** — the event is derived from the member row, which is why
the row is loaded before the guard runs.

## 10. Business Rules

- **BR-03-F03-01** `[AS-BUILT]` — Changing a role requires at least `planner` on the event that
  owns the member row (`convex/members.ts:110`).
- **BR-03-F03-02** `[AS-BUILT]` — A member row that does not exist is rejected with
  `ConvexError("Member not found")` before any guard runs (`convex/members.ts:109`).
- **BR-03-F03-03** `[AS-BUILT]` — The `owner` row's role can never be changed, by anyone,
  including the owner themselves (`convex/members.ts:113`–`:115`).
- **BR-03-F03-04** `[AS-BUILT]` — No caller may change their own row's role
  (`convex/members.ts:116`–`:118`).
- **BR-03-F03-05** `[AS-BUILT]` — Only a caller whose effective role is `owner` may set a role
  **to** `planner` (`convex/members.ts:120`–`:125`).
- **BR-03-F03-06** `[AS-BUILT]` — Only a caller whose effective role is `owner` may change a row
  whose **current** role is `planner`, whatever the target role
  (`convex/members.ts:120`–`:125`).
- **BR-03-F03-07** `[AS-BUILT]` — The caller's role for these checks comes from `getEventRole`,
  so a superadmin resolves to `owner` and passes the co-owner checks
  (`convex/members.ts:111`; `convex/lib/permissions.ts:72`).
- **BR-03-F03-08** `[AS-BUILT]` — `owner` is not an assignable value, so the mutation can never
  create a second owner row (`convex/members.ts:11`–`:15`).
- **BR-03-F03-09** `[AS-BUILT]` — The client renders a role select only when the row is not the
  owner row, not the caller's own row, and either the caller is the owner or the row is not a
  `planner` row (`member-list.tsx:62`–`:63`).
- **BR-03-F03-10** `[AS-BUILT]` — The client offers the Co-owner option only to the owner
  (`member-list.tsx:65`–`:67`), mirroring BR-03-F03-05 server-side.
- **BR-03-F03-11** `[AS-BUILT]` — A role change saves immediately on select, with no confirmation
  dialog (`member-list.tsx:92`–`:97`).
- **BR-03-F03-12** `[AS-BUILT]` — Non-editable rows display the role as a read-only `Badge`
  (`member-list.tsx:111`–`:113`).
- **BR-03-F03-13** `[AS-BUILT]` — Changing a role writes no activity-log entry.

## 11. Acceptance Criteria

- **AC-03-F03-01** — **Given** an Owner and an Editor member **When** the Owner selects
  "Co-owner" on that row **Then** the toast "Role updated" appears and the row's stored role is
  `planner`.
- **AC-03-F03-02** — **Given** a promoted Co-owner **When** they reload the dashboard **Then**
  the Members and Settings sidebar entries appear.
- **AC-03-F03-03** — **Given** a Co-owner (not the owner) **When** they view the member list
  **Then** the role select on their peers' `planner` rows is replaced by a read-only badge.
- **AC-03-F03-04** — **Given** a Co-owner **When** they call `updateMemberRole` with
  `role: "planner"` directly **Then** the server throws "Only the owner can manage co-owners".
- **AC-03-F03-05** — **Given** a Co-owner **When** they call `updateMemberRole` on an existing
  `planner` row **Then** the server throws "Only the owner can manage co-owners".
- **AC-03-F03-06** — **Given** any caller **When** they call `updateMemberRole` for the owner's
  row **Then** the server throws "The owner's role cannot be changed" and the row is unchanged.
- **AC-03-F03-07** — **Given** any caller **When** they call `updateMemberRole` for their own row
  **Then** the server throws "You cannot change your own role".
- **AC-03-F03-08** — **Given** an Editor **When** they call `updateMemberRole` **Then** the
  server throws `Insufficient permissions`.
- **AC-03-F03-09** — **Given** a member demoted from Co-owner to Editor **When** they next open
  the Members page **Then** they see the access notice instead of the member list.
- **AC-03-F03-10** — **Given** a role update in flight **When** the user looks at the list
  **Then** every role select is disabled until it settles.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                         |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| TC-03-F03-01 | unit        | `canEdit` is false for the owner row, the self row, and a `planner` row when `isOwner` is false. |
| TC-03-F03-02 | unit        | `roleOptions` excludes `planner` when `isOwner` is false.                                        |
| TC-03-F03-03 | integration | Owner promotes an `editor` to `planner`; the row is patched.                                     |
| TC-03-F03-04 | integration | Owner demotes a `planner` to `editor`; the row is patched.                                       |
| TC-03-F03-05 | integration | `planner` caller setting `role: "planner"` throws.                                               |
| TC-03-F03-06 | integration | `planner` caller modifying an existing `planner` row throws.                                     |
| TC-03-F03-07 | integration | Any caller targeting the owner row throws.                                                       |
| TC-03-F03-08 | integration | Any caller targeting their own row throws.                                                       |
| TC-03-F03-09 | integration | Superadmin (no membership) may perform a `planner` transition.                                   |
| TC-03-F03-10 | integration | Unknown `memberId` throws "Member not found".                                                    |
| TC-03-F03-11 | e2e         | Promote an Editor to Co-owner; their session gains Members and Settings navigation.              |
| TC-03-F03-12 | e2e         | Demote a Co-owner to Editor; their Members page becomes the access notice.                       |

### Manual QA checklist

- [ ] As Owner, promote an Editor to Co-owner and confirm the label and the toast.
- [ ] As that new Co-owner, confirm the owner row and your own row are read-only badges.
- [ ] As that Co-owner, confirm another Co-owner's row offers no select.
- [ ] As Owner, demote the Co-owner back to Editor and confirm their access narrows.
- [ ] Confirm no confirmation dialog appears for a role change.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None beyond the list's `take(50)`.                                                                                                                                                        |
| Performance      | One `eventMembers` get, one guard (event get + user get + membership lookup), one `getEventRole` (repeating those reads), one patch.                                                      |
| Security & authz | All three protections are server-enforced; the client mirrors them for UX only. Unlike `addMember`, the co-owner rule here is genuinely enforced (contrast DEF-03-01).                    |
| Accessibility    | The select is a shadcn `Select` with keyboard support; the read-only state is a `Badge` with no interactive affordance. Saving on change gives no explicit confirmation beyond the toast. |
| i18n             | English only.                                                                                                                                                                             |
| Analytics        | None; role changes are neither logged nor tracked.                                                                                                                                        |

## 14. TODOs & Open Questions

- See **TODO-03-02** — defined in [EP-03-F05 §14](./F05-activity-log.md#14-todos--open-questions).
  Role changes are not recorded anywhere: `convex/members.ts:127` patches without calling
  `logActivity`, and the entity union at `convex/schema.ts:253`–`:259` has no `member` value.
  This is the most sensitive unrecorded action in the epic — a Co-owner's authority can change
  with no trace for the owner to review.
- **TODO-03-11** `[P2]` `[CHANGE]` — A single shared `useToastMutation` instance backs every row,
  so one in-flight role change disables **all** role selects in the list, not just the row being
  edited.
  - **Evidence:** `src/components/members/member-list.tsx:46`–`:49`, `:98`
  - **Rationale:** on a long member list the whole control surface freezes for an action scoped
    to one row.
  - **Proposed rule:** pending state is tracked per member row.
- **TODO-03-12** `[P2]` `[CHANGE]` — A role change is applied on select with no confirmation,
  while a removal requires an `AlertDialog`. Demoting the only other Co-owner is a comparably
  consequential action performed by a single click.
  - **Evidence:** `src/components/members/member-list.tsx:92`–`:97` versus `:116`–`:144`
  - **Proposed rule:** transitions **into or out of** Co-owner require the same confirmation
    treatment as removal.

### Open questions

- **Q1** — Should the affected member be notified when their role changes (mirrors TODO-03-03)?
- **Q2** — Should an Owner be able to demote themselves as part of an ownership transfer
  (currently impossible; see TODO-03-10 in [EP-03-F01](./F01-role-model.md))?
- **Q3** — Should a Co-owner be able to see, but not edit, that another member is a Co-owner —
  or is the read-only badge already the intended behavior?

## 15. Traceability

| Concern                            | Source                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| Route                              | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:16` |
| List host + `isOwner` prop         | `src/app/(dashboard)/dashboard/[eventSlug]/members/page.tsx:68` |
| Mutation hookup + toasts           | `src/components/members/member-list.tsx:46`–`:49`               |
| Editability rule                   | `src/components/members/member-list.tsx:62`–`:63`               |
| Client role options                | `src/components/members/member-list.tsx:65`–`:67`               |
| Role select + save on change       | `src/components/members/member-list.tsx:89`–`:110`              |
| Read-only badge                    | `src/components/members/member-list.tsx:111`–`:113`             |
| Backend — member load              | `convex/members.ts:108`–`:109`                                  |
| Backend — guard + caller role      | `convex/members.ts:110`–`:111`                                  |
| Backend — owner-row protection     | `convex/members.ts:113`–`:115`                                  |
| Backend — self-row protection      | `convex/members.ts:116`–`:118`                                  |
| Backend — co-owner transition rule | `convex/members.ts:120`–`:125`                                  |
| Backend — patch                    | `convex/members.ts:127`                                         |
| Assignable roles                   | `convex/members.ts:11`–`:15`                                    |
| Role rank + superadmin resolution  | `convex/lib/permissions.ts:8`, `:72`                            |
| Schema                             | `convex/schema.ts:83`–`:95`                                     |
| Role labels                        | `src/lib/roles.ts:23`                                           |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
