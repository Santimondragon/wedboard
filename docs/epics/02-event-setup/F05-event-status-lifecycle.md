---
id: EP-02-F05
title: Event Status Lifecycle
epic: EP-02 Event Setup
version: 1.0.0
status: defective
last_updated: 2026-07-27
depends_on: [EP-02-F01, EP-02-F03]
---

# EP-02-F05 — Event Status Lifecycle

## 1. Summary

Every event board carries a lifecycle
[status](../../glossary.md#core-entities) — `draft`, `active` or `archived` — that says
where the board is in its life: still being prepared, live and in use, or retired. The
status is a single field on the event record, shown as a badge everywhere the event is
listed, and it has exactly one product consequence beyond that badge: **an archived event
stops resolving publicly**, so every invitation link for it goes dark. A `draft` event, by
contrast, is deliberately still reachable by anyone holding an invitation URL — that is how
a host previews the real page before announcing it.

## 2. Actors & Permissions

| Actor                | Access                  | Notes                                                                                               |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Owner                | Full                    | The only role `archiveEvent` admits — but that mutation is unreachable from the UI (see TODO-02-13) |
| Co-owner (`planner`) | Full in practice        | Sets any status, including `archived`, through `updateEvent` (DEF-02-03)                            |
| Editor               | Blocked                 | Cannot reach Settings; sees the status badge only                                                   |
| Viewer               | Blocked                 | Same                                                                                                |
| Public guest         | Affected, never sets it | Archived → the invitation URL returns the not-found screen                                          |

Server gates: `requireEventMember(ctx, args.eventId, user._id, "planner")` on `updateEvent`
(`convex/events.ts:167`) and `requireEventMember(ctx, args.eventId, user._id, "owner")` on
`archiveEvent` (`convex/events.ts:292`). See
[roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-02-F05-01** — As an owner, I want a new board to start as a draft so that it is
  obviously not finished yet.
- **US-02-F05-02** — As an owner, I want to mark the board active so that my collaborators can
  see at a glance that it is live.
- **US-02-F05-03** — As an owner, I want to archive a finished wedding so that its public
  invitation links stop working while all of its data is preserved.
- **US-02-F05-04** — As an owner, I want to reverse an archive if I archived too early.
- **US-02-F05-05** — As a host previewing a draft, I want the public invitation URL to render
  the real page so that I can check the design before sending anything.

## 4. Entry Points

| Entry point     | Route / control                                                                                          | Actor              |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| Status select   | `/dashboard/[eventSlug]/settings` → General → "Status" + "Save Changes"                                  | Co-owner+          |
| Archive card    | `/dashboard/[eventSlug]/settings` → Danger Zone → "Archive"                                              | Co-owner+          |
| Set at creation | `createEvent` writes `status: "draft"` (`convex/events.ts:137`)                                          | Any signed-in user |
| Set by seeding  | `seedDemoEvent` writes `status: "active"` (`convex/seed.ts:28`) — see [F07](./F07-demo-event-seeding.md) | Any signed-in user |
| Read-only badge | Dashboard header (`dashboard-header.tsx:42`) and event directory cards (`dashboard/page.tsx:94`)         | Any member         |

## 5. UX Flow

### Happy path — WF-02-05 Archive or reactivate an event

1. A co-owner opens `/dashboard/[eventSlug]/settings`. The General section's **Status**
   select is seeded from `event.status`
   (`src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:80`) and offers exactly
   three items: "Draft", "Active", "Archived" (`:279`–`:281`).
2. They pick a value and press **"Save Changes"** (`:286`).
3. `handleSave` calls `api.events.updateEvent` with the whole General payload, `status`
   included (`:116`–`:126`).
4. The server checks the `planner` floor and patches the event (`convex/events.ts:167`,
   `:192`).
5. A "Settings saved" toast fires (`:127`) and the header badge re-renders from the live
   Convex subscription.

Archiving has a second, dedicated route through the same mutation:

1. In **Danger Zone**, the card reads "Archive this event" / "The event will be marked as
   archived and hidden from active events." (`:380`, `:381`).
2. Pressing **"Archive"** opens an `AlertDialog` titled "Archive Event" (`:398`) whose body
   reads "Are you sure you want to archive &ldquo;{event.name}&rdquo;? The event and its data
   will be preserved but it will be marked as archived." (`:399`–`:403`).
3. Confirming runs `handleArchive`, which calls `updateEvent({eventId, status: "archived"})`
   — **not** `archiveEvent` (`:138`).
4. Local state is set to `archived` so the General select stays in sync (`:139`), and an
   "Event archived" toast fires (`:140`).

Reactivating is the ordinary path: set the Status select back to "Active" (or "Draft") and
press "Save Changes". There is no dedicated un-archive control.

### Alternate & edge paths

- **A1** — A `draft` event's public invitation URL resolves normally; `resolvePublicEvent`
  only rejects `archived` (`convex/lib/public.ts:20`).
- **A2** — Archiving an event that has a live custom domain also takes the custom-domain
  routes down: `resolvePublicEventByHost` applies the same gate
  (`convex/lib/public.ts:42`), so the countdown landing and every host-addressed invitation
  return not-found. The domain stays attached to the event and to Vercel.
- **A3** — An archived event is fully editable: every dashboard route, query and mutation
  works exactly as before, because no guard anywhere reads `status` (see TODO-02-12).
- **A4** — An archived event still appears in `/dashboard` and in the sidebar event switcher;
  `listMyEvents` applies no status filter (`convex/events.ts:22`). "Hidden from active
  events", promised by the Danger Zone copy, is not implemented anywhere.
- **A5** — The status only ever changes because a person changed it. Nothing derives it from
  the event date, RSVP completion or any other signal.
- **E1** — Any `updateEvent` failure (including the role rejection) produces the generic
  toast "Failed to save settings" (`:129`); the server message is discarded on this path.
- **E2** — An archive failure produces "Failed to archive event" (`:141`) and the select
  keeps its previous value.

## 6. States

| State             | Behavior                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Loading           | Settings renders four `Skeleton` rows while the event resolves (`:183`)                                                      |
| Empty             | Not applicable — `status` is a required schema field with no empty value                                                     |
| Error             | sonner error toast; generic copy, no server message                                                                          |
| Success           | "Settings saved" or "Event archived" toast; badge updates live                                                               |
| Disabled / locked | "Save Changes" reads "Saving..." while `saving`; the Archive confirm reads "Archiving..." while `archiving` (`:287`, `:412`) |
| Mobile            | Single-column form; the Danger Zone cards keep their horizontal label/button split                                           |

## 7. UI Specification

### Screens & components

| Element               | Component            | Path                                                              |
| --------------------- | -------------------- | ----------------------------------------------------------------- |
| Status select         | shadcn `Select`      | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:269` |
| Save handler          | `handleSave`         | `:108`                                                            |
| Archive card + dialog | shadcn `AlertDialog` | `:378`                                                            |
| Archive handler       | `handleArchive`      | `:135`                                                            |
| Header badge          | `EventStatusBadge`   | `src/components/dashboard/event-status-badge.tsx:12`              |
| Badge rendering       | `StatusBadge`        | `src/components/app/status-badge.tsx:38`                          |
| Directory badge       | `StatusBadge`        | `src/app/(dashboard)/dashboard/page.tsx:94`                       |

### Fields & validation

| Field  | Type   | Required | Rule                                                                                                                                           | Message                                                         |
| ------ | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Status | select | Yes      | One of `draft` · `active` · `archived`; enforced by the Convex validator (`convex/events.ts:162`) and the schema union (`convex/schema.ts:72`) | — (unreachable from the UI, which only offers the three values) |

`eventSchema` (`src/lib/validations/event.ts`) does not cover `status`, and the Settings page
does not use react-hook-form, so there is no client-side schema validation on this field.

### Copy deck

None. All status copy is English dashboard chrome; the status is never rendered on a
guest-facing page. The badge labels are "Draft", "Active" and "Archived"
(`src/components/app/status-badge.tsx:11`).

## 8. Data Model

| Table          | Fields   | Read / Write                                                                                            | Index                                                                 |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `events`       | `status` | Write (`updateEvent`, `archiveEvent`, `createEvent`, `seedDemoEvent`) + Read (public resolvers, badges) | `by_slug`, `by_customDomain` (the read paths that then test `status`) |
| `eventMembers` | `role`   | Read (guard)                                                                                            | `by_eventId_and_userId`                                               |

`status` is a required `v.union` of three literals (`convex/schema.ts:72`) with no default in
the schema — every insert path supplies it explicitly.

There is **no cascade**. Archiving writes one field and touches nothing else: guests,
invitations, RSVPs, media and members are untouched, and the custom domain stays claimed in
Convex and attached at Vercel. The only side effect is that both public resolvers begin
returning `null` for the event, which the public routes render as the branded "Invitation Not
Found" screen. Archiving is therefore fully reversible by writing the status back — it is a
visibility switch, not a deletion. Permanent removal is [F06](./F06-delete-event.md).

## 9. Backend Contract

| Function                  | Type     | Args                    | Returns           | Guard                                              | Caps                                    |
| ------------------------- | -------- | ----------------------- | ----------------- | -------------------------------------------------- | --------------------------------------- |
| `api.events.updateEvent`  | mutation | `{eventId, status?, …}` | `void`            | `requireUser` + `requireEventMember(…, "planner")` | —                                       |
| `api.events.archiveEvent` | mutation | `{eventId}`             | `void`            | `requireUser` + `requireEventMember(…, "owner")`   | Never called by any client (TODO-02-13) |
| `api.events.createEvent`  | mutation | `{name, …}`             | `{eventId, slug}` | `requireUser`                                      | Writes `status: "draft"`                |
| `api.events.listMyEvents` | query    | `{}`                    | `Doc<"events">[]` | `requireUser`                                      | `take(100)`; no status filter           |

Public resolution helpers (not Convex functions): `resolvePublicEvent`
(`convex/lib/public.ts:11`) and `resolvePublicEventByHost` (`convex/lib/public.ts:30`).

## 10. Business Rules

- **BR-02-F05-01** `[AS-BUILT]` — An event's status is exactly one of `draft`, `active`,
  `archived`; the schema rejects any other value (`convex/schema.ts:72`).
- **BR-02-F05-02** `[AS-BUILT]` — A newly created event starts as `draft`
  (`convex/events.ts:137`).
- **BR-02-F05-03** `[AS-BUILT]` — A demo-seeded event starts as `active`, not `draft`
  (`convex/seed.ts:28`).
- **BR-02-F05-04** `[AS-BUILT]` — The status only changes when a user explicitly writes it;
  no code path derives it from the event date, RSVP progress or any other signal (the only
  writers of `status` are `createEvent`, `seedDemoEvent`, `updateEvent` and `archiveEvent`).
- **BR-02-F05-05** `[AS-BUILT]` — Setting any status through Settings requires an event role
  of at least `planner` (`convex/events.ts:167`).
- **BR-02-F05-06** `[AS-BUILT]` — `archiveEvent` requires the `owner` role
  (`convex/events.ts:292`).
- **BR-02-F05-07** `[AS-BUILT]` — An `archived` event is not resolvable by event key for
  public access; `resolvePublicEvent` returns `null` (`convex/lib/public.ts:20`).
- **BR-02-F05-08** `[AS-BUILT]` — An `archived` event is not resolvable by custom-domain host
  either (`convex/lib/public.ts:42`).
- **BR-02-F05-09** `[AS-BUILT]` — A `draft` event **is** publicly resolvable by both
  resolvers, so a host can preview the live invitation page before going active
  (`convex/lib/public.ts:20`, `:42`).
- **BR-02-F05-10** `[AS-BUILT]` — Archiving is reversible: writing `status` back to `active`
  or `draft` through the Settings select restores public resolution immediately, because the
  resolvers test the current value on every request (`convex/lib/public.ts:20`).
- **BR-02-F05-11** `[AS-BUILT]` — Archiving preserves all event data; the mutation patches
  one field and performs no cascade (`convex/events.ts:293`,
  `settings/page.tsx:138`).
- **BR-02-F05-12** `[AS-BUILT]` — No dashboard query or mutation is gated on status, so an
  archived event remains fully readable and writable by its members (no `status` check exists
  outside `convex/lib/public.ts`).
- **BR-02-F05-13** `[AS-BUILT]` — Archived events remain listed in the event directory and
  the sidebar switcher; `listMyEvents` does not filter by status (`convex/events.ts:22`).
- **BR-02-F05-14** `[AS-BUILT]` — Status changes are not written to the activity log
  (`updateEvent` calls no `logActivity`, `convex/events.ts:150`).

## 11. Acceptance Criteria

- **AC-02-F05-01** — **Given** a user creates an event **When** the board opens **Then** the
  header badge reads "Draft".
- **AC-02-F05-02** — **Given** a `draft` event with an active invitation **When** a public
  guest opens `/{event-key}/invitations/{slug}` **Then** the invitation page renders.
- **AC-02-F05-03** — **Given** that event is set to `archived` **When** the same guest reloads
  the URL **Then** the "Invitation Not Found" screen renders.
- **AC-02-F05-04** — **Given** an archived event with a live custom domain **When** a guest
  opens the domain root **Then** the countdown landing does not render and the not-found
  screen appears instead.
- **AC-02-F05-05** — **Given** an archived event **When** the owner sets Status back to
  "Active" and saves **Then** the invitation URL resolves again with no further action.
- **AC-02-F05-06** — **Given** an archived event **When** a co-owner opens the Guests page
  **Then** the guest list loads and a guest can still be edited.
- **AC-02-F05-07** — **Given** an archived event **When** the owner opens `/dashboard`
  **Then** the event is still listed, badged "Archived".
- **AC-02-F05-08** — **Given** an editor **When** they call `updateEvent` with a `status`
  **Then** the mutation throws before the patch.
- **AC-02-F05-09** — **Given** a co-owner (not the owner) **When** they confirm the Danger
  Zone archive dialog **Then** the event becomes `archived` — the owner-only gate on
  `archiveEvent` is not applied on this path (DEF-02-03).
- **AC-02-F05-10** — **Given** any status change **When** the Activity page is opened **Then**
  no entry for it appears.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                             |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------- |
| TC-02-F05-01 | unit        | `resolvePublicEvent` returns `null` for `archived` and the event doc for `draft` and `active`        |
| TC-02-F05-02 | unit        | `resolvePublicEventByHost` applies the identical archived gate                                       |
| TC-02-F05-03 | integration | `createEvent` inserts `status: "draft"`                                                              |
| TC-02-F05-04 | integration | `updateEvent` with `status` as an `editor` throws; as a `planner` succeeds                           |
| TC-02-F05-05 | integration | `archiveEvent` throws for a `planner` and succeeds for the `owner`                                   |
| TC-02-F05-06 | integration | Archiving then reactivating leaves guest, invitation and media row counts unchanged                  |
| TC-02-F05-07 | integration | `listMyEvents` includes archived events                                                              |
| TC-02-F05-08 | e2e         | Archiving from the Danger Zone makes a previously working invitation URL render the not-found screen |
| TC-02-F05-09 | e2e         | Reactivating from the Status select restores the invitation URL                                      |

### Manual QA checklist

- [ ] Create an event and confirm the header badge reads "Draft".
- [ ] Open a draft event's public invitation link and confirm it renders.
- [ ] Archive from the Danger Zone and confirm the confirmation copy names the event.
- [ ] Reload the public invitation link and confirm the not-found screen.
- [ ] Confirm the archived event is still listed on `/dashboard` and still editable.
- [ ] Set the status back to "Active" and confirm the public link works again.

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Limits & caps    | None; the status is a single enum field                                                                                                                                                                                  |
| Performance      | One patch on write; on read the status test is in-memory after an indexed lookup that already had to happen                                                                                                              |
| Security & authz | `planner` floor in practice (`updateEvent`), `owner` on the unused `archiveEvent`. Archiving is the only product-level "unpublish" control, so the gap in DEF-02-03 is an authorization concern, not just a tidiness one |
| Accessibility    | The status `Select` has a bound `Label`; the badge conveys state by text, not colour alone                                                                                                                               |
| i18n             | English chrome only                                                                                                                                                                                                      |
| Analytics        | Not logged — see BR-02-F05-14 and TODO-02-14                                                                                                                                                                             |

## 14. TODOs & Open Questions

- **DEF-02-03** `[P1]` — Archiving is reachable by a co-owner, bypassing the owner-only
  `archiveEvent` mutation. The Danger Zone archive button calls
  `updateEvent({eventId, status: "archived"})`, which is gated at `planner`, while the
  purpose-built `archiveEvent` requires `owner` and is never called.
  - **Evidence:** `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:138` calls
    `updateEvent`; `convex/events.ts:167` gates it at `planner`;
    `convex/events.ts:292` gates `archiveEvent` at `owner`. `updateEvent`'s `status` arg is
    declared at `convex/events.ts:161`.
  - **Impact:** A co-owner can take every public invitation link for the event offline, an
    action the codebase explicitly reserved for the owner. The
    [capability matrix](../../roles-and-permissions.md) documents archive as owner-only, which
    is therefore inaccurate in practice.
  - **Proposed fix:** Remove `status` from `updateEvent`'s args and route every status
    transition through dedicated mutations — `archiveEvent` (owner) plus a matching
    `setEventStatus`/`unarchiveEvent` — so one guard governs the field. The Settings page
    calls those instead.
- **TODO-02-12** `[P1]` `[ADD]` — Nothing prevents editing an archived event. No query or
  mutation outside `convex/lib/public.ts` reads `status`, so guests, invitations, the
  template and the custom domain remain fully writable on an archived board.
  - **Rationale:** "Archived" reads as a terminal, read-only state to a user, and the
    Danger Zone copy reinforces it ("hidden from active events"). Silent writability makes
    accidental edits to a closed event possible and makes the status meaningless as a
    freeze.
  - **Proposed rule:** `requireEventEditor` rejects writes on an event whose status is
    `archived`, with a message directing the user to reactivate first; reads stay permitted.
- **TODO-02-13** `[P2]` `[REMOVE]` — `archiveEvent` is dead code. It is exported at
  `convex/events.ts:288` and referenced by nothing in `src/`.
  - **Rationale:** A stricter, unused guard sitting next to the looser one that is actually
    used is exactly how DEF-02-03 stayed invisible.
  - **Proposed rule:** Either delete `archiveEvent`, or make it the sole archive path as
    part of the DEF-02-03 fix. It must not remain both correct and unreachable.
- **TODO-02-14** `[P2]` `[ADD]` — Status transitions are not activity-logged, so the
  Activity page cannot answer "who took the invitations offline, and when".
  - **Rationale:** Archiving is the highest-impact reversible action in the epic and the one
    most likely to be questioned after the fact. Template and meta updates are logged; this
    is not.
  - **Proposed rule:** `logActivity(ctx, {…, entity: "event", action: "update"})` on every
    status change, which requires adding `"event"` to the `activityLogs.entity` union.
- **TODO-02-15** `[P2]` `[CHANGE]` — The Danger Zone promises that archiving hides the event
  "from active events", but `listMyEvents` (`convex/events.ts:22`) applies no filter and the
  directory and switcher both keep showing it.
  - **Rationale:** The copy describes behavior that does not exist.
  - **Proposed rule:** Either the event directory collapses archived events into a separate,
    secondary group, or the copy is corrected to describe what archiving actually does —
    taking the public links offline.
- **TODO-02-16** `[P2]` `[ADD]` — The Status select gives no indication that choosing
  "Archived" takes every public invitation link offline; the consequence is only described in
  the separate Danger Zone card, which does not mention public links either.
  - **Rationale:** The two controls that write the same field carry different (and
    incomplete) explanations of what it does.
  - **Proposed rule:** Both controls state the public consequence explicitly: archiving stops
    all invitation links from resolving; draft keeps them working for preview.

### Open questions

- **Q1** — Should `active` be set automatically the first time an invitation is marked sent,
  rather than left as a purely manual flag most hosts will never touch?
- **Q2** — Should a `draft` event's public page carry a visible "preview" marker, given that
  the URL is fully live and shareable and nothing distinguishes it from an active event?
- **Q3** — Should archiving offer to release the custom domain, since an archived event holds
  a globally unique hostname that nothing can then resolve? (See
  [EP-02-F10](./custom-domain/F10-remove-domain.md).)

## 15. Traceability

| Concern                   | Source                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| Schema                    | `convex/schema.ts:72`                                             |
| Backend (update path)     | `convex/events.ts:161`                                            |
| Backend (guard)           | `convex/events.ts:167`                                            |
| Backend (archiveEvent)    | `convex/events.ts:288`                                            |
| Backend (create default)  | `convex/events.ts:137`                                            |
| Backend (seed default)    | `convex/seed.ts:28`                                               |
| Backend (directory query) | `convex/events.ts:22`                                             |
| Public gate by key        | `convex/lib/public.ts:20`                                         |
| Public gate by host       | `convex/lib/public.ts:42`                                         |
| UI (status select)        | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:267` |
| UI (save handler)         | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:108` |
| UI (archive card)         | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:376` |
| UI (archive handler)      | `src/app/(dashboard)/dashboard/[eventSlug]/settings/page.tsx:135` |
| UI (header badge)         | `src/components/dashboard/dashboard-header.tsx:42`                |
| UI (badge component)      | `src/components/app/status-badge.tsx:11`                          |
| UI (directory badge)      | `src/app/(dashboard)/dashboard/page.tsx:94`                       |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |

</content>
</invoke>
