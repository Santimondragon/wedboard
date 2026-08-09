# Roles & Permissions

**Authoritative capability × role matrix.** Feature specs link here and state only the
specific gate they apply — they never restate this hierarchy.

Source of truth in code: `convex/lib/permissions.ts` (server, enforcing) and
`src/lib/roles.ts` (client mirror, convenience gating only).

---

## 1. Actor model

| Actor                 | Identity                            | Scope                                      |
| --------------------- | ----------------------------------- | ------------------------------------------ |
| **Anonymous visitor** | none                                | Marketing site, sign-in/sign-up            |
| **Public guest**      | none — knows an invitation URL      | One invitation's public page               |
| **User**              | Clerk account mirrored into `users` | Their own events + events shared with them |
| **Superadmin**        | `users.role === "superadmin"`       | Every event, plus `/admin`                 |

A **User** holds a per-event role. There is no global "planner" or "editor" — roles are
always relative to one event.

---

## 2. Event role hierarchy

`convex/lib/permissions.ts:8` and `src/lib/roles.ts:8` define identical ranks:

| Role      | Rank | UI label     | Origin                                                                |
| --------- | ---- | ------------ | --------------------------------------------------------------------- |
| `owner`   | 4    | Owner        | `events.ownerUserId` + an `eventMembers` row created at `createEvent` |
| `planner` | 3    | **Co-owner** | `members.addMember` / `updateMemberRole`                              |
| `editor`  | 2    | Editor       | `members.addMember` / `updateMemberRole`                              |
| `viewer`  | 1    | Viewer       | In schema only — **not offered in the Members UI**                    |

**Superadmin bypass.** `requireEventAccess`, `requireEventMember` and `getEventRole` all
early-return for a superadmin (`convex/lib/permissions.ts:26`, `:113`, `:66`), so a
superadmin passes every event-scoped guard and resolves to an effective role of `owner`.

**Viewer is effectively read-blocked.** `requireEventEditor` defaults to `minRole: "editor"`,
and nearly every content _query_ uses that default — so a viewer cannot even read guests or
invitations. Viewers can only reach `members.listMembers` and `activity.listByEvent`, both of
which pass `"viewer"` explicitly.

---

## 3. Guards

| Guard                                                  | Signature                       | Behavior                                                                         |
| ------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------- |
| `requireUser(ctx)`                                     | `convex/lib/auth.ts`            | Authenticated user doc by `tokenIdentifier`; throws `Unauthorized`               |
| `requireEventAccess(ctx, eventId, userId)`             | `convex/lib/permissions.ts:16`  | **Any** membership or ownership — no role floor                                  |
| `requireEventEditor(ctx, eventId, minRole = "editor")` | `convex/lib/permissions.ts:50`  | The standard guard: `requireUser` + `requireEventMember`; returns the user doc   |
| `requireEventMember(ctx, eventId, userId, minRole?)`   | `convex/lib/permissions.ts:100` | Enforces the rank floor; throws `Insufficient permissions`                       |
| `getEventRole(ctx, eventId, userId)`                   | `convex/lib/permissions.ts:66`  | Effective `EventRole` or `null`; surfaced as `myRole` by `events.getEventBySlug` |
| `requireSuperadmin(ctx)`                               | `convex/lib/permissions.ts:90`  | Guards `convex/admin.ts`                                                         |

Client-side gating uses `hasMinRole(role, min)` (`src/lib/roles.ts:20`) against the `myRole`
returned by `getEventBySlug`. **Server guards are the source of truth**; client gating only
hides controls.

---

## 4. Capability matrix

`✓` = permitted · `—` = blocked · `!` = permitted but see the note.

| Capability                                    | Convex guard                       |      Owner      | Co-owner | Editor | Viewer |
| --------------------------------------------- | ---------------------------------- | :-------------: | :------: | :----: | :----: |
| **Events**                                    |                                    |                 |          |        |        |
| Read event (`getEventBySlug`, `getEventById`) | `requireEventAccess`               |        ✓        |    ✓     |   ✓    |   ✓    |
| Read overview stats                           | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Update event profile / event key              | `requireEventMember(…, "planner")` |        ✓        |    ✓     |   —    |   —    |
| Change event status (incl. archive)           | `requireEventMember(…, "planner")` |        ✓        |    !     |   —    |   —    |
| Archive event (`archiveEvent`)                | `requireEventMember(…, "owner")`   |        ✓        |    —     |   —    |   —    |
| Delete event (cascade)                        | `requireEventMember(…, "owner")`   |        ✓        |    —     |   —    |   —    |
| **Custom domain**                             |                                    |                 |          |        |        |
| Set / remove / mark verified                  | `requireEventMember(…, "planner")` |        ✓        |    ✓     |   —    |   —    |
| **Collaboration**                             |                                    |                 |          |        |        |
| List members                                  | `requireEventEditor(…, "viewer")`  |        ✓        |    ✓     |   ✓    |   ✓    |
| Add member                                    | `requireEventEditor(…, "planner")` |        ✓        |    !     |   —    |   —    |
| Change member role                            | `requireEventEditor(…, "planner")` |        ✓        |    !     |   —    |   —    |
| Remove member                                 | `requireEventEditor(…, "planner")` |        ✓        |    !     |   —    |   —    |
| Read activity log                             | `requireEventEditor(…, "viewer")`  |        ✓        |    ✓     |   ✓    |   ✓    |
| **Content**                                   |                                    |                 |          |        |        |
| Guests — CRUD, +1, special RSVP override      | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Invitations — CRUD, sent flag, slug, access   | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Special invitations — CRUD                    | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Menu & drink options — CRUD                   | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Tables — CRUD, seat capacity                  | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Assign guest to seat                          | `requireEventAccess`               |        ✓        |    ✓     |   ✓    |   !    |
| Unassign guest from seat                      | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Media — upload, rename, delete                | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| Template & layout variants                    | `requireEventEditor(…, "editor")`  |        ✓        |    ✓     |   ✓    |   —    |
| Meta & sharing                                | `requireEventEditor(…, "editor")`  |        ✓        |    ✓     |   ✓    |   —    |
| Read guest messages                           | `requireEventEditor`               |        ✓        |    ✓     |   ✓    |   —    |
| **Platform**                                  |                                    |                 |          |        |        |
| `/admin` console                              | `requireSuperadmin`                | superadmin only |          |        |        |

### Notes

- **Co-owner member management (`!`)** — a co-owner may add/change/remove `editor` and
  `viewer` members, but **only the owner** may promote to, demote from, or remove a
  `planner` (`convex/members.ts`). A co-owner can never modify the owner row or their own
  row.
- **Archiving (`!`)** — the owner-only `events.archiveEvent` has **no callers in `src/`**. The
  Settings Danger Zone archives by calling `events.updateEvent` with `status: "archived"`,
  which is gated at `planner`. In practice a co-owner can archive (and set any status),
  despite the dedicated mutation's owner floor. This is a known defect; see
  [backlog.md](./backlog.md) and `EP-02-F05`.
- **Seat assignment (`!`)** — `tables.assignGuestToSeat` is gated by `requireEventAccess`
  (any membership, including `viewer`), while its sibling `unassignGuestFromSeat` requires
  editor. This asymmetry is a known defect; see [backlog.md](./backlog.md).

---

## 5. UI gating

`NAV_GROUPS` in `src/components/dashboard/dashboard-sidebar.tsx` carries a `minRole` per
link and filters against `useEventRole()`. Links are grouped (Overview / Guests / Event /
Design / Manage); a group whose every item is gated out renders nothing at all, its label
included, so the sidebar never shows an empty heading:

| Sidebar section                                                                                                                | Minimum role |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Overview, Guests, Invitations, Special Invitations, Menu & Drinks, Tables, Messages, Template, Media, Meta & Sharing, Activity | `editor`     |
| Members, Settings                                                                                                              | `planner`    |

Page-level guards repeat the check: `/members` redirects editors, and `/settings` shows an
access notice with the Delete card rendered for the owner only.

---

## 6. Public access

Public routes bypass Clerk entirely (`src/middleware.ts`) and call Convex functions with no
auth check. Their gating is **data-level**, not role-level:

| Rule                                                                                                          | Where                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Archived events are never publicly resolvable (draft is, for preview)                                         | `convex/lib/public.ts:16`             |
| Only `isActive` invitations resolve                                                                           | `convex/lib/public.ts:56`             |
| Custom-domain hosts resolve by `by_customDomain`, never gated on `customDomainVerified`                       | `convex/lib/public.ts:39`             |
| Public mutations validate ownership of every referenced id (menu, drink, special event access) before writing | `convex/guests.ts` `submitPublicRsvp` |

Knowledge of the invitation URL is the only credential a public guest holds. Slugs are
therefore a soft secret — see [backlog.md](./backlog.md) for the enumeration TODO.
