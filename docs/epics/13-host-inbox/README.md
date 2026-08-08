---
id: EP-13
title: Host Inbox
version: 1.0.0
status: partial
last_updated: 2026-07-28
---

# EP-13 — Host Inbox

## Purpose

The Host Inbox is where the couple and their collaborators read the notes guests left them.
When a guest cannot attend, the public invitation's `guestMessage` block offers a short form —
a name and a message — and everything submitted through it lands on one dashboard page,
`/dashboard/[eventSlug]/messages`, newest first.

The epic is deliberately small: it is a **read-only reading surface**. There is no reply, no
read/unread state, no notification, no archive, no delete and no export. A message is written
once by a guest and read as many times as the host likes; nothing about the host's reading
changes the stored record.

## Primary actor

**Editor+** (see [roles-and-permissions.md](../../roles-and-permissions.md)). The single query
`messages.listMessagesByEvent` is guarded by `requireEventEditor(ctx, eventId)` with its
default `minRole` of `"editor"` (`convex/messages.ts:13`), so a `viewer` cannot read the inbox
even though a viewer can read the activity log and member list.

| Actor                | Access                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Owner                | Read                                                                                                                |
| Co-owner (`planner`) | Read                                                                                                                |
| Editor               | Read                                                                                                                |
| Viewer               | No access — the query's editor floor rejects them                                                                   |
| Public guest         | Write-only, via `messages.submitGuestMessage` on their own invitation (EP-07-F06). A guest can never read the inbox |

## Scope boundary with EP-07

| Side                                                            | Owner         | Where                                                                                       |
| --------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Submission — the public form, its validation and its caps       | **EP-07-F06** | `convex/messages.ts:37` (`submitGuestMessage`), the elegant `guestMessage` block            |
| Reading — the dashboard page, ordering, enrichment, empty state | **EP-13-F01** | `convex/messages.ts:10` (`listMessagesByEvent`), `src/components/messages/message-list.tsx` |

This epic documents the caps only insofar as they shape _what can arrive in the inbox_; the
submission workflow itself is specified in EP-07-F06.

## Data model

One table, `guestMessages` (`convex/schema.ts:230-238`):

| Field          | Type                | Meaning                                                    |
| -------------- | ------------------- | ---------------------------------------------------------- |
| `eventId`      | `Id<"events">`      | Owning event; backs the inbox query                        |
| `invitationId` | `Id<"invitations">` | The invitation the message was sent from                   |
| `name`         | `string`            | Free text supplied by the anonymous sender; may be empty   |
| `message`      | `string`            | The note body                                              |
| `createdAt`    | `number`            | Unix ms, written by the mutation (`convex/messages.ts:88`) |

Indexes: `by_eventId`, `by_invitationId`.

Two consequences the specs below document as behavior:

1. **A message is attributable to an invitation, never to a guest.** There is no `guestId`.
   The sender's `name` is unvalidated free text and is not matched against the invitation's
   guest list, so "who exactly wrote this" is a human inference, not data.
2. **Only the event cascade removes messages.** `guestMessages` is in `EVENT_SCOPED_TABLES`
   (`convex/lib/events.ts:10`), so deleting the event deletes them. Deleting the _invitation_
   does not — `invitations.deleteInvitation` has no `guestMessages` cleanup — and the orphaned
   row then renders with the fallback title `"—"` (`convex/messages.ts:30`). Tracked as
   **DEF-13-02**.

## Features

| ID        | Feature              | Status  | File                                             |
| --------- | -------------------- | ------- | ------------------------------------------------ |
| EP-13-F01 | Guest messages inbox | partial | [F01-guest-messages.md](./F01-guest-messages.md) |

## Workflows

| ID       | Workflow                                     | Feature   |
| -------- | -------------------------------------------- | --------- |
| WF-13-01 | Host reads the guest message inbox           | EP-13-F01 |
| WF-13-02 | Host traces a message back to its invitation | EP-13-F01 |

## Backend surface

| Function                           | Type            | Feature                |
| ---------------------------------- | --------------- | ---------------------- |
| `api.messages.listMessagesByEvent` | query           | EP-13-F01              |
| `api.messages.submitGuestMessage`  | public mutation | EP-07-F06 (write side) |

There are no other message functions — no update, no delete, no mark-read.

## Dependencies

| Depends on                                     | Why                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| EP-01 (Account & access)                       | Dashboard routes require an authenticated Clerk session            |
| EP-02 (Event setup)                            | The page resolves its event through `useEvent()`                   |
| EP-03 (Collaboration & permissions)            | The editor floor is enforced by `requireEventEditor`               |
| EP-05 (Invitations)                            | Every message carries an `invitationId`; the inbox shows its title |
| EP-07-F06 (Guest experience — leave a message) | The only writer of `guestMessages`                                 |

Nothing depends on this epic: no metric card, template block, export or public query reads
`guestMessages` outside it. In particular the Insights overview (EP-14-F01) has **no** message
count.

## Known defects

| ID        | Priority | Summary                                                                                                                                          | Documented in |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| DEF-13-01 | P2       | The per-invitation cap admits 21 messages, not the intended 20 — the guard compares `existing.length > MAX_PER_INVITATION` after reading 21 rows | EP-13-F01 §14 |
| DEF-13-02 | P2       | Deleting an invitation orphans its messages; they stay in the inbox with the title `"—"`                                                         | EP-13-F01 §14 |

## Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built epic overview |
