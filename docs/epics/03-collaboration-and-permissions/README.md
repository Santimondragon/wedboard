# EP-03 — Collaboration & Permissions

Wedboard events are shared boards. This epic covers **who may act on an event**, **how that
access is granted and revoked**, and **how the team sees what everyone did**.

Everything here is scoped to a single event. There is no global "planner" or "editor" — a
user's authority is always relative to one event, expressed as an `eventMembers` row. The one
global role, `superadmin`, sits outside the hierarchy and bypasses it (see
[EP-15](../15-platform-administration/)).

---

## Purpose

An owner rarely plans a wedding alone. The partner, a professional planner, or a family member
needs to work in the same board without being handed the owner's account. EP-03 gives the owner
a way to hand out scoped access by email, adjust or revoke it later, and audit what
collaborators changed.

## Actors

| Actor                    | Role in this epic                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**                | The only actor who can grant, change or revoke the Co-owner role, and the only one who can delete the event. Their membership row can never be edited or removed. |
| **Co-owner** (`planner`) | Manages Editor members and reads the full activity log. Cannot touch the owner row or their own row.                                                              |
| **Editor**               | Subject of the permissions; reads the activity log; has no access to the Members page.                                                                            |
| **Viewer**               | Exists in the schema and in the rank hierarchy but is not offered anywhere in the UI, and is read-blocked from nearly every query (see TODO-03-04).               |
| **Superadmin**           | Bypasses every event guard, so all of the above applies to them as if they were the owner.                                                                        |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
Domain terms (Member, Activity Log, Superadmin) are defined in
[glossary.md](../../glossary.md).

## Features

| ID                                       | Title                   | Status      |
| ---------------------------------------- | ----------------------- | ----------- |
| [EP-03-F01](./F01-role-model.md)         | Per-event role model    | implemented |
| [EP-03-F02](./F02-add-member.md)         | Share an event by email | defective   |
| [EP-03-F03](./F03-change-member-role.md) | Change a member's role  | implemented |
| [EP-03-F04](./F04-remove-member.md)      | Remove a member         | implemented |
| [EP-03-F05](./F05-activity-log.md)       | Event activity log      | implemented |

## Workflows

| ID       | Workflow                                     | Spec                                     |
| -------- | -------------------------------------------- | ---------------------------------------- |
| WF-03-01 | Share an event with a collaborator by email  | [EP-03-F02](./F02-add-member.md)         |
| WF-03-02 | Change an existing collaborator's event role | [EP-03-F03](./F03-change-member-role.md) |
| WF-03-03 | Revoke a collaborator's access to the event  | [EP-03-F04](./F04-remove-member.md)      |
| WF-03-04 | Review recent changes made by collaborators  | [EP-03-F05](./F05-activity-log.md)       |

## Cross-epic dependencies

| Depends on                          | Why                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EP-01** — Account & access        | A member must already exist as a `users` row (mirrored from Clerk) before they can be added; `requireUser` resolves the caller by `tokenIdentifier` (`convex/lib/auth.ts:15`).         |
| **EP-02** — Event setup             | `createEvent` writes the owner's `eventMembers` row (`convex/events.ts:140`); deleting an event cascades away all member rows and activity entries (`convex/lib/events.ts:11`, `:18`). |
| **EP-15** — Platform administration | Defines `users.role === "superadmin"`, whose bypass is baked into every guard in this epic (`convex/lib/permissions.ts:26`, `:72`, `:118`).                                            |

## Depended on by

Every content epic — **EP-04** (guests), **EP-05** (invitations), **EP-06**, **EP-08** through
**EP-14** — applies the guards specified in [EP-03-F01](./F01-role-model.md), and the mutations
of **EP-04**, **EP-05**, **EP-06**, **EP-08** and **EP-10** are the sole writers of the activity
log specified in [EP-03-F05](./F05-activity-log.md).

## Epic-level defects & TODOs

Full detail lives in each feature's §14; the index is here.

| ID         | Priority | Spec | Summary                                                                                                                                                 |
| ---------- | :------: | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-03-01  |    P1    | F02  | Owner-only Co-owner grant is enforced client-side only in `addMember`.                                                                                  |
| TODO-03-01 |    P1    | F02  | `useToastMutation` swallows `ConvexError` messages; rejections show a generic toast.                                                                    |
| TODO-03-02 |    P1    | F05  | Member add/role-change/removal is not written to the activity log.                                                                                      |
| TODO-03-03 |    P1    | F02  | No notification is sent to a user who is added to an event.                                                                                             |
| TODO-03-04 |    P2    | F01  | `viewer` has no product definition: unreachable in the UI, read-blocked in code.                                                                        |
| TODO-03-05 |    P2    | F05  | Activity log has no retention policy and no pagination beyond `take(200)`.                                                                              |
| TODO-03-06 |    P2    | F04  | A member cannot leave an event on their own.                                                                                                            |
| TODO-03-07 |    P2    | F02  | `listMembers` silently truncates at 50 rows.                                                                                                            |
| TODO-03-08 |    P2    | F05  | Sidebar gates Activity at `editor` while the query permits `viewer`.                                                                                    |
| TODO-03-09 |    P2    | F02  | `addMember` performs no email-format validation.                                                                                                        |
| TODO-03-10 |    P2    | F01  | Ownership cannot be transferred. No mutation writes `events.ownerUserId` after `createEvent` (`convex/events.ts:127`), so an owner who leaves the …     |
| TODO-03-11 |    P2    | F03  | A single shared `useToastMutation` instance backs every row, so one in-flight role change disables **all** role selects in the list, not just the row … |
| TODO-03-12 |    P2    | F03  | A role change is applied on select with no confirmation, while a removal requires an `AlertDialog`. Demoting the only other Co-owner is a comparably …  |
| TODO-03-13 |    P2    | F04  | The remove trigger is an icon-only button with no `aria-label` or visually hidden text, so assistive technology announces it only as "button".          |
| TODO-03-14 |    P2    | F04  | `removeMember.pending` is computed but never bound to a control, so the confirm button is clickable during the in-flight request and a double …         |
| TODO-03-15 |    P2    | F05  | `actorName` goes stale. It is a snapshot taken at write time and is never backfilled, so a collaborator who changes their name in Clerk appears under … |
| TODO-03-16 |    P2    | F05  | Entries are not reconciled when the record they name is deleted or renamed. `entityName` is a denormalized string with no id alongside it, so the …     |
| TODO-03-17 |    P2    | F05  | The feed cannot be filtered or searched. There is no filter by actor, by entity type, by action or by date range, and no text search.                   |
