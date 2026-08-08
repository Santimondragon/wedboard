---
id: EP-13-F01
title: Guest Messages Inbox
epic: EP-13 Host Inbox
version: 1.0.0
status: partial
last_updated: 2026-07-28
depends_on: [EP-01-F01, EP-02-F01, EP-03-F01, EP-05-F01, EP-07-F06]
---

# EP-13-F01 — Guest Messages Inbox

## 1. Summary

The guest messages inbox is the host's reading surface for the notes guests leave from their
invitation page — typically an apology and good wishes from someone who cannot attend. Every
message is listed on one dashboard page, newest first, showing the sender's self-declared
name, the invitation it came from, how long ago it arrived, and the message body. The host
reads; nothing else is possible. The feature is marked `partial` because the workflow a host
would reasonably expect around an inbox — knowing a message arrived, marking it handled,
replying, removing spam — does not exist (see §14).

## 2. Actors & Permissions

| Actor                | Access      | Notes                                                                                   |
| -------------------- | ----------- | --------------------------------------------------------------------------------------- |
| Owner                | Read        | Via the standard editor floor                                                           |
| Co-owner (`planner`) | Read        |                                                                                         |
| Editor               | Read        | The minimum role that can open the page                                                 |
| Viewer               | None        | `requireEventEditor` defaults to `minRole: "editor"`, so the query throws for a viewer  |
| Public guest         | None (read) | A guest can only _write_, through EP-07-F06; there is no public read of `guestMessages` |

Role semantics are defined once in
[roles-and-permissions.md](../../roles-and-permissions.md). The gate this feature applies is
`requireEventEditor(ctx, args.eventId)` (`convex/messages.ts:13`).

## 3. User Stories

- **US-13-F01-01** — As an editor, I want to read every message guests left for the couple so
  that no note goes unseen.
- **US-13-F01-02** — As an editor, I want each message labelled with the invitation it came
  from so that I can tell which household wrote it.
- **US-13-F01-03** — As an editor, I want messages ordered newest first so that the most
  recent responses are at the top without scrolling.
- **US-13-F01-04** — As an editor, I want a relative timestamp on each message so that I can
  see at a glance whether it is fresh.
- **US-13-F01-05** — As an editor opening an event that has received nothing, I want to be
  told why the page is empty rather than seeing a blank screen.

## 4. Entry Points

| Entry point                                    | Route / control                   | Actor                                                                                                            |
| ---------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sidebar link "Messages" (`MessageSquare` icon) | `/dashboard/[eventSlug]/messages` | Editor+ — `NAV_ITEMS` entry carries `minRole: "editor"` (`src/components/dashboard/dashboard-sidebar.tsx:56-61`) |
| Direct URL                                     | `/dashboard/[eventSlug]/messages` | Any authenticated user; a non-member's query throws                                                              |

There are no deep links to an individual message: messages have no own route, no anchor and
no detail view.

## 5. UX Flow

### Happy path

1. Editor clicks **Messages** in the event sidebar → Next.js renders
   `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx`.
2. The page reads the current event id from `useEvent()._id`
   (`.../messages/page.tsx:12`) and issues
   `useQuery(api.messages.listMessagesByEvent, { eventId })` (`:13`).
3. The Convex handler guards on `requireEventEditor`, reads up to 500 rows through
   `by_eventId`, sorts them descending by `createdAt`, and resolves each row's invitation to
   attach `invitationTitle` (`convex/messages.ts:13-33`).
4. The heading renders as `Messages` followed by the count in parentheses
   (`.../messages/page.tsx:17-24`).
5. `MessageList` renders one card per message: name (or the fallback), invitation title,
   relative time via `formatDistanceToNow(..., { addSuffix: true })`, and the body with
   `whitespace-pre-wrap` so the guest's line breaks survive
   (`src/components/messages/message-list.tsx:11-38`).

### Alternate & edge paths

- **A1** — Query still resolving (`messages === undefined`) → `LoadingState` with
  `"Loading messages…"`; the count in the heading is suppressed
  (`.../messages/page.tsx:19, 26-27`).
- **A2** — Zero messages → `EmptyState` with the `MessageSquare` icon and explanatory copy
  (`.../messages/page.tsx:28-33`).
- **A3** — A message was submitted with an empty `name` → the card shows `"Anónimo"`
  (`src/components/messages/message-list.tsx:22`).
- **A4** — The message's invitation no longer exists → `invitationTitle` falls back to `"—"`
  (`convex/messages.ts:30`). See DEF-13-02.
- **A5** — A new message is submitted while the page is open → Convex reactivity re-runs the
  query and the card appears at the top with no host action. There is no toast, badge, sound
  or count highlight (see TODO-13-03).
- **E1** — The caller is not a member, or is a `viewer` → `requireEventEditor` throws
  (`Unauthorized` / `Insufficient permissions`); the page renders no error UI of its own and
  the Convex error surfaces uncaught. There is no `ErrorState` on this page.
- **E2** — More than 500 messages exist for the event → the query returns only the first 500
  rows the index yields, and the sort happens _after_ the truncation, so the newest messages
  are not guaranteed to be among them. See TODO-13-05.

## 6. States

| State             | Behavior                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | `LoadingState message="Loading messages…"`; heading count hidden                                                                                                                 |
| Empty             | `EmptyState` — icon `MessageSquare`, title "No messages yet", description explaining guests leave messages from their invitation                                                 |
| Error             | None implemented. A thrown guard error is not caught by the page (E1)                                                                                                            |
| Success           | Heading `Messages (N)` plus a vertical list (`ul.space-y-4`) of bordered message cards                                                                                           |
| Disabled / locked | Not applicable — the page has no controls to disable. Editors and above see it; the sidebar hides it below `editor`                                                              |
| Mobile            | The list is a single-column stack; name and invitation title `truncate`, the timestamp is `shrink-0`, so a long name never pushes the date off-screen (`message-list.tsx:19-30`) |

## 7. UI Specification

### Screens & components

| Element           | Component              | Path                                                             |
| ----------------- | ---------------------- | ---------------------------------------------------------------- |
| Messages page     | `MessagesPage`         | `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:11` |
| Message list      | `MessageList`          | `src/components/messages/message-list.tsx:11`                    |
| Message item type | `GuestMessageItem`     | `src/components/messages/message-list.tsx:3`                     |
| Loading indicator | `LoadingState`         | `src/components/app/loading-state.tsx`                           |
| Empty placeholder | `EmptyState`           | `src/components/app/empty-state.tsx`                             |
| Sidebar entry     | `NAV_ITEMS` "Messages" | `src/components/dashboard/dashboard-sidebar.tsx:56`              |

### Fields & validation

The inbox is read-only and has **no input fields**. The validation that governs what can
reach it is applied on the submission side and is specified in EP-07-F06; it is reproduced
here only as the shape of arriving data:

| Field                 | Type   | Required | Rule                                                | Message                                                             |
| --------------------- | ------ | -------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `message`             | string | Yes      | Trimmed, length ≥ 1                                 | `"Message cannot be empty"` (`convex/messages.ts:49`)               |
| `message`             | string | Yes      | Trimmed, length ≤ 1000                              | `"Message is too long"` (`convex/messages.ts:52`)                   |
| `name`                | string | No       | Trimmed, length ≤ 200; empty allowed                | `"Name is too long"` (`convex/messages.ts:55`)                      |
| per-invitation volume | —      | —        | Capped at `MAX_PER_INVITATION = 20` (see DEF-13-01) | `"Too many messages for this invitation"` (`convex/messages.ts:80`) |
| `createdAt`           | number | Yes      | Set server-side to `Date.now()`                     | —                                                                   |

The client mirror of the same limits is `guestMessageSchema`
(`src/lib/validations/guest-message.ts:3-9`): `name` optional `max(200)`, `message`
`min(1).max(1000)`.

### Copy deck

The inbox is host-facing and its copy is in English; the only Spanish string is the anonymous
fallback rendered on a message card.

| Key                              | Copy                                                                                           | Source                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Page heading                     | `Messages`                                                                                     | `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:18` |
| Loading                          | `Loading messages…`                                                                            | `.../messages/page.tsx:27`                                       |
| Empty title                      | `No messages yet`                                                                              | `.../messages/page.tsx:31`                                       |
| Empty description                | `Guests who can't attend can leave you a message from their invitation. They'll show up here.` | `.../messages/page.tsx:32`                                       |
| Anonymous sender fallback        | `Anónimo`                                                                                      | `src/components/messages/message-list.tsx:22`                    |
| Missing invitation fallback      | `—`                                                                                            | `convex/messages.ts:30`                                          |
| Client validation — empty        | `Message cannot be empty`                                                                      | `src/lib/validations/guest-message.ts:7`                         |
| Client validation — long message | `Message is too long`                                                                          | `src/lib/validations/guest-message.ts:8`                         |
| Client validation — long name    | `Name is too long`                                                                             | `src/lib/validations/guest-message.ts:4`                         |

## 8. Data Model

| Table           | Fields                                                    | Read / Write                                       | Index                                                        |
| --------------- | --------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| `guestMessages` | `eventId`, `invitationId`, `name`, `message`, `createdAt` | Read (this feature)                                | `by_eventId` (`convex/schema.ts:237`)                        |
| `guestMessages` | same                                                      | Write (EP-07-F06)                                  | `by_invitationId` for the cap check (`convex/schema.ts:238`) |
| `invitations`   | `title`                                                   | Read — one `ctx.db.get` per message for enrichment | direct id lookup (`convex/messages.ts:24`)                   |

`createdAt` is an explicit stored field (`convex/schema.ts:235`), written by
`submitGuestMessage` as `Date.now()` (`convex/messages.ts:88`). The inbox sorts and formats
on this field rather than on Convex's `_creationTime`, unlike `activityLogs` which uses
`_creationTime`. The two are written in the same transaction and do not diverge in practice,
but `createdAt` is the field the product reads.

**Cascades and lifecycle.** `guestMessages` is listed in `EVENT_SCOPED_TABLES`
(`convex/lib/events.ts:10`), so `cascadeDeleteEvent` removes every message when the event is
permanently deleted (bounded at 5000 rows per table, `convex/lib/events.ts:32`). There is no
cascade the other way: deleting an invitation leaves its messages in place, and the enrichment
then renders `"—"` where the title would be (DEF-13-02). Deleting a guest has no effect at
all, since a message is never linked to a guest.

**Attribution.** A message can be traced to an **invitation**, never to an individual guest.
The stored `name` is whatever the sender typed; it is not compared against the invitation's
guests and is not required. A household invitation with four guests produces messages whose
authorship is only as reliable as the free-text name.

## 9. Backend Contract

| Function                           | Type            | Args                                           | Returns                                                     | Guard                                                                            | Caps                                                                            |
| ---------------------------------- | --------------- | ---------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `api.messages.listMessagesByEvent` | query           | `{ eventId: Id<"events"> }`                    | `Array<{ _id, name, message, createdAt, invitationTitle }>` | `requireEventEditor(ctx, eventId)` — default `minRole: "editor"`                 | `.take(500)` on `by_eventId`, sorted `createdAt` descending after the read      |
| `api.messages.submitGuestMessage`  | public mutation | `{ eventSlug, invitationSlug, name, message }` | `void`                                                      | None (public); resolves through `resolvePublicEvent` / `resolvePublicInvitation` | `message` 1–1000 after trim, `name` ≤ 200 after trim, per-invitation volume cap |

`submitGuestMessage` is listed for completeness of the table's data lifecycle; its workflow,
UI and acceptance criteria belong to **EP-07-F06** and are not restated here.

## 10. Business Rules

- **BR-13-F01-01** `[AS-BUILT]` — Reading the inbox requires event membership of at least
  `editor`; a `viewer` is rejected (`convex/messages.ts:13`).
- **BR-13-F01-02** `[AS-BUILT]` — The inbox returns only messages belonging to the requested
  `eventId`, resolved through the `by_eventId` index (`convex/messages.ts:16-18`).
- **BR-13-F01-03** `[AS-BUILT]` — Messages are presented newest first, ordered by descending
  `createdAt` (`convex/messages.ts:21`).
- **BR-13-F01-04** `[AS-BUILT]` — Each returned message carries the title of its originating
  invitation (`convex/messages.ts:24-30`).
- **BR-13-F01-05** `[AS-BUILT]` — When the originating invitation no longer exists, the
  message is still returned, with `invitationTitle` set to `"—"` (`convex/messages.ts:30`).
- **BR-13-F01-06** `[AS-BUILT]` — At most 500 messages are read per event per query
  (`convex/messages.ts:18`).
- **BR-13-F01-07** `[AS-BUILT]` — The query exposes only `_id`, `name`, `message`,
  `createdAt` and `invitationTitle`; `eventId` and `invitationId` are not returned, so the
  client cannot link a message to its invitation record (`convex/messages.ts:25-31`).
- **BR-13-F01-08** `[AS-BUILT]` — A message with an empty `name` is displayed as `"Anónimo"`
  (`src/components/messages/message-list.tsx:22`).
- **BR-13-F01-09** `[AS-BUILT]` — Message bodies render with preserved line breaks
  (`whitespace-pre-wrap`) and are never truncated (`src/components/messages/message-list.tsx:32`).
- **BR-13-F01-10** `[AS-BUILT]` — The page heading shows the number of returned messages once
  the query resolves (`src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:19-23`).
- **BR-13-F01-11** `[AS-BUILT]` — When the event has no messages, the page renders the empty
  state instead of an empty list (`.../messages/page.tsx:28-33`).
- **BR-13-F01-12** `[AS-BUILT]` — The inbox is read-only: no Convex function updates or
  deletes a `guestMessages` row outside the event cascade (`convex/messages.ts` defines only
  `listMessagesByEvent` and `submitGuestMessage`).
- **BR-13-F01-13** `[AS-BUILT]` — A message stores no guest reference; attribution is limited
  to the invitation plus the sender's free-text name (`convex/schema.ts:230-236`).
- **BR-13-F01-14** `[AS-BUILT]` — Permanently deleting the event deletes all of its messages
  (`convex/lib/events.ts:10, 28-36`).

## 11. Acceptance Criteria

- **AC-13-F01-01** — **Given** a user whose event role is `viewer` **When** they open
  `/dashboard/[eventSlug]/messages` **Then** `listMessagesByEvent` throws and no message
  content is returned. _(BR-13-F01-01)_
- **AC-13-F01-02** — **Given** two events each holding messages **When** an editor of event A
  loads the inbox **Then** only event A's messages are returned. _(BR-13-F01-02)_
- **AC-13-F01-03** — **Given** three messages created at t1 < t2 < t3 **When** the inbox loads
  **Then** they appear in the order t3, t2, t1. _(BR-13-F01-03)_
- **AC-13-F01-04** — **Given** a message sent from the invitation titled "The Smith Family"
  **When** the inbox loads **Then** the card's secondary line reads `The Smith Family`.
  _(BR-13-F01-04)_
- **AC-13-F01-05** — **Given** a message whose invitation has been deleted **When** the inbox
  loads **Then** the message is still listed and its secondary line reads `—`.
  _(BR-13-F01-05)_
- **AC-13-F01-06** — **Given** an event with 620 messages **When** the inbox loads **Then**
  exactly 500 are returned. _(BR-13-F01-06)_
- **AC-13-F01-07** — **Given** any returned message **When** the query payload is inspected
  **Then** it contains no `invitationId` and no `eventId`. _(BR-13-F01-07)_
- **AC-13-F01-08** — **Given** a message submitted with a blank name **When** the inbox loads
  **Then** the card's primary line reads `Anónimo`. _(BR-13-F01-08)_
- **AC-13-F01-09** — **Given** a message body containing two newline characters **When** the
  card renders **Then** the text displays on three lines in full. _(BR-13-F01-09)_
- **AC-13-F01-10** — **Given** an event with 4 messages **When** the query resolves **Then**
  the heading reads `Messages (4)`. _(BR-13-F01-10)_
- **AC-13-F01-11** — **Given** an event with no messages **When** the page loads **Then** the
  text "No messages yet" is shown and no list element is rendered. _(BR-13-F01-11)_
- **AC-13-F01-12** — **Given** the deployed Convex API **When** the `messages` module is
  enumerated **Then** it exposes exactly `listMessagesByEvent` and `submitGuestMessage`.
  _(BR-13-F01-12)_
- **AC-13-F01-13** — **Given** a stored message row **When** its fields are inspected **Then**
  no field references a `guests` document. _(BR-13-F01-13)_
- **AC-13-F01-14** — **Given** an event holding messages **When** the owner permanently
  deletes the event **Then** no `guestMessages` row for that event remains.
  _(BR-13-F01-14)_

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                   |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| TC-13-F01-01 | unit        | `guestMessageSchema` rejects a 1001-character message and accepts a 1000-character one                                     |
| TC-13-F01-02 | unit        | `guestMessageSchema` rejects a 201-character name and accepts an omitted name                                              |
| TC-13-F01-03 | integration | `listMessagesByEvent` throws for a `viewer` and succeeds for an `editor`                                                   |
| TC-13-F01-04 | integration | `listMessagesByEvent` returns rows sorted descending by `createdAt`                                                        |
| TC-13-F01-05 | integration | Enrichment sets `invitationTitle` from the invitation, and `"—"` when the invitation row is absent                         |
| TC-13-F01-06 | integration | With 501 seeded messages the query returns 500 rows                                                                        |
| TC-13-F01-07 | integration | `cascadeDeleteEvent` removes all `guestMessages` for the event                                                             |
| TC-13-F01-08 | e2e         | Editor opens the Messages page on an event with no messages and sees "No messages yet"                                     |
| TC-13-F01-09 | e2e         | A guest submits a message from a declined invitation; the editor's open Messages page shows it at the top without a reload |
| TC-13-F01-10 | e2e         | A blank-name submission renders as "Anónimo" on the host's card                                                            |

### Manual QA checklist

- [ ] Sidebar shows "Messages" for an editor and hides it for a viewer.
- [ ] Heading count matches the number of visible cards.
- [ ] Relative timestamps read sensibly for a message sent minutes ago and one sent weeks ago.
- [ ] A long single-word sender name truncates without pushing the timestamp off-screen.
- [ ] A multi-paragraph message keeps its line breaks.
- [ ] Page is legible at a 375px viewport width.
- [ ] Deleting the invitation a message came from leaves the message visible with `—`.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | 500 messages read per event per query (`convex/messages.ts:18`); 1000-character message body; 200-character sender name; per-invitation volume cap of `MAX_PER_INVITATION = 20` (see DEF-13-01). Practical ceiling per event = invitations × cap      |
| Performance      | One indexed read plus **one `ctx.db.get` per message** for invitation titles (`convex/messages.ts:22-32`) — up to 501 document reads for a full page. There is no invitation-title memoization, so N messages from the same invitation cost N lookups |
| Security & authz | Read gated at `editor` by `requireEventEditor`; the query never accepts a slug, only an `eventId`, so cross-event reads are impossible. The write path is fully anonymous — see the abuse assessment below                                            |
| Accessibility    | Semantic `ul`/`li` list; no interactive controls, so no keyboard trap. Timestamps are relative text only, with no `title`/`datetime` attribute carrying the absolute time (TODO-13-06)                                                                |
| i18n             | Host UI is English; the anonymous fallback `"Anónimo"` is Spanish, inconsistent with the surrounding page (TODO-13-07). Message bodies are whatever the guest wrote                                                                                   |
| Analytics        | None. No event is emitted when the inbox is opened or when a message arrives                                                                                                                                                                          |

### Abuse surface assessment

`submitGuestMessage` requires no authentication and no proof of identity. Anyone holding an
invitation URL — which is a soft secret, shared over WhatsApp and email — can post up to the
per-invitation cap, with an arbitrary 200-character `name` that is neither validated nor
matched against the invitation's guests. There is no rate limit, no IP or session throttle,
no content filtering and no host-side delete. The mitigations present today are exactly two:
the per-invitation volume cap (`convex/messages.ts:73-81`) and the length bounds. The
consequences a host can experience:

- **Impersonation.** A sender can type any guest's name; the host has no way to tell.
- **Burst spam within the cap.** Nothing spaces submissions in time; the cap is reached in one
  scripted second and then permanently blocks that invitation's _legitimate_ guests from
  writing (the cap is total, not per-sender and not per-window).
- **Unremovable content.** Offensive text sits in the inbox for the life of the event, because
  no delete exists (BR-13-F01-12). Deleting the whole event is the only removal path.

Each of these is filed as a TODO in §14 rather than a business rule, because no code addresses
them today.

## 14. TODOs & Open Questions

- **DEF-13-01** `[P2]` — The per-invitation cap admits **21** messages, not the documented 20.
  - **Evidence:** `convex/messages.ts:78-81` — the query takes `MAX_PER_INVITATION + 1` rows
    and rejects only when `existing.length > MAX_PER_INVITATION`, so an invitation already
    holding 20 messages passes the check and inserts a 21st.
  - **Impact:** Cosmetic overshoot of a spam guard; the 22nd submission is correctly rejected.
  - **Proposed fix:** Reject when `existing.length >= MAX_PER_INVITATION`.
- **DEF-13-02** `[P2]` — Deleting an invitation orphans its messages.
  - **Evidence:** `convex/invitations.ts` `deleteInvitation` unassigns guests but performs no
    `guestMessages` cleanup; `guestMessages` appears in no cascade other than
    `convex/lib/events.ts:10`.
  - **Impact:** The inbox keeps showing the message with the fallback title `"—"`, and the
    host loses the only attribution the message ever had.
  - **Proposed fix:** Either cascade-delete the invitation's messages, or denormalize the
    invitation title onto the message row at insert time so history survives deletion.
- **TODO-13-01** `[P1]` `[ADD]` — No read/unread state.
  - **Rationale:** A host returning to the page cannot tell which messages are new; with
    dozens of messages, tracking "where I left off" is manual. This is the single most
    expected inbox affordance and it does not exist — the schema carries no `readAt` or
    `isRead` field (`convex/schema.ts:230-236`) and no mutation could set one.
  - **Proposed rule:** A message carries a per-event read flag; the sidebar shows a count of
    unread messages; opening the page does not silently mark everything read.
- **TODO-13-02** `[P2]` `[ADD]` — No reply capability.
  - **Rationale:** A message often deserves a thank-you, but the product stores no contact
    detail for the sender: `guestMessages` has no email or phone, and the message is not
    linked to a guest row whose `email`/`phone` could be used. Replying is impossible without
    first solving attribution.
  - **Proposed rule:** Out of scope until messages are attributable to a guest; the host
    replies through their own channel.
- **TODO-13-03** `[P1]` `[ADD]` — The host is never told a message arrived.
  - **Rationale:** The product sends **no email of any kind** — there is no mail provider,
    template or send path anywhere in `convex/` or `src/`. A new message is visible only to a
    host who happens to be on the Messages page, or who opens it later. A guest's apology can
    sit unread for months.
  - **Proposed rule:** At minimum an in-app unread badge on the sidebar entry (pairs with
    TODO-13-01); an email or push notification requires introducing a delivery channel the
    product does not have.
- **TODO-13-04** `[P1]` `[ADD]` — No delete, hide or archive.
  - **Rationale:** Anonymous, unfiltered, unremovable content is a moderation dead end (see
    §13). A host who receives abuse has no remedy short of deleting the event.
  - **Proposed rule:** Editor+ may delete a message; deletion is activity-logged.
- **TODO-13-05** `[P2]` `[CHANGE]` — The 500-row cap truncates before sorting.
  - **Rationale:** `.take(500)` runs on the index, then the sort is applied in memory
    (`convex/messages.ts:15-21`). Past 500 messages the page silently drops rows, and which
    rows survive depends on index order rather than recency — so the _newest_ messages can be
    the ones missing, which is the opposite of the intent.
  - **Proposed rule:** Page the inbox, or index on `(eventId, createdAt)` and take from the
    descending end.
- **TODO-13-06** `[P2]` `[ADD]` — Only relative timestamps are shown.
  - **Rationale:** `formatDistanceToNow` gives "3 months ago"
    (`src/components/messages/message-list.tsx:29`); the absolute date is never rendered or
    exposed as a tooltip/`<time datetime>`, so the host cannot cite when a message arrived.
  - **Proposed rule:** Render the exact timestamp as a `title`/`<time>` attribute alongside
    the relative string.
- **TODO-13-07** `[P2]` `[CHANGE]` — Mixed-language fallback.
  - **Rationale:** The host dashboard is English but an unnamed sender renders as `"Anónimo"`
    (`src/components/messages/message-list.tsx:22`).
  - **Proposed rule:** Use the host UI's language for host-facing fallbacks.
- **TODO-13-08** `[P2]` `[ADD]` — No export.
  - **Rationale:** Couples commonly want to keep these notes after the event, but the only way
    to retain them is a screenshot; deleting the event destroys them permanently
    (BR-13-F01-14).
  - **Proposed rule:** Editor+ can export the inbox as CSV or a printable page.
- **TODO-13-09** `[P2]` `[ADD]` — No search, filter or per-invitation grouping.
  - **Rationale:** The list is flat and unfiltered; finding a particular household's note in
    a long list is a manual scroll.
  - **Proposed rule:** Filter by invitation and free-text search over the body.
- **TODO-13-10** `[P1]` `[ADD]` — No rate limiting on the public submission path.
  - **Rationale:** See §13. The per-invitation cap is the only throttle, and reaching it
    denies the invitation's real guests their message slot.
  - **Proposed rule:** Time-windowed rate limiting per invitation, in addition to the total
    cap. Owned jointly with EP-07-F06.
- **TODO-13-11** `[P2]` `[CHANGE]` — Enrichment does one document read per message.
  - **Rationale:** `convex/messages.ts:22-32` resolves the invitation for every row
    independently; a full page of 500 messages from 30 invitations performs 500 gets instead
    of 30.
  - **Proposed rule:** Resolve the distinct invitation ids once and map titles from that.
- **TODO-13-12** `[P2]` `[ADD]` — No error state on the page.
  - **Rationale:** The page handles `undefined` (loading) and empty, but a thrown query error
    has no UI (`.../messages/page.tsx:26-36`), while `ErrorState` exists in
    `src/components/app/error-state.tsx`.
  - **Proposed rule:** Render `ErrorState` with a retry when the query fails.

### Open questions

- **Q1** — Should a message be attributable to a **guest** rather than an invitation — for
  example by letting the guest pick their name from the invitation's roster instead of typing
  it? That would enable replies (TODO-13-02) and defeat casual impersonation, at the cost of
  the current anonymity.
- **Q2** — Should the `guestMessage` block be authorable on the `pending` and `accepted`
  layouts too, not only `declined`? Today the inbox's entire input is "people who declined",
  which shapes what the empty-state copy promises.
- **Q3** — Is the per-invitation cap meant to be a spam guard or a product limit? If a
  ten-person family invitation legitimately wants to leave ten notes, 20 total is tight and a
  per-sender window would serve better.
- **Q4** — Should messages survive event deletion (e.g. exported to the owner) rather than
  being cascaded away, given they are keepsakes rather than operational data?

## 15. Traceability

| Concern                         | Source                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| Route                           | `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:11`    |
| Query call                      | `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:13`    |
| Loading / empty states          | `src/app/(dashboard)/dashboard/[eventSlug]/messages/page.tsx:26-33` |
| UI list                         | `src/components/messages/message-list.tsx:11`                       |
| Anonymous fallback              | `src/components/messages/message-list.tsx:22`                       |
| Relative timestamp              | `src/components/messages/message-list.tsx:29`                       |
| Backend — read                  | `convex/messages.ts:10`                                             |
| Backend — guard                 | `convex/messages.ts:13`                                             |
| Backend — take bound            | `convex/messages.ts:18`                                             |
| Backend — sort                  | `convex/messages.ts:21`                                             |
| Backend — enrichment & fallback | `convex/messages.ts:24-31`                                          |
| Backend — write (EP-07-F06)     | `convex/messages.ts:37`                                             |
| Backend — caps                  | `convex/messages.ts:6-8, 48-56, 73-81`                              |
| Schema                          | `convex/schema.ts:230-238`                                          |
| Event cascade                   | `convex/lib/events.ts:10, 28-36`                                    |
| Validation                      | `src/lib/validations/guest-message.ts:3-9`                          |
| Sidebar entry                   | `src/components/dashboard/dashboard-sidebar.tsx:56-61`              |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
