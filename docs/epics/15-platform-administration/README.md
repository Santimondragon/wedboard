# EP-15 — Platform Administration

**Primary actor:** Superadmin · **Status:** partial · **Last updated:** 2026-07-27

The operator-facing surface of Wedboard: a global console at `/admin` that lists every event
and every user on the platform, and the mechanism by which a person becomes a Superadmin at
all. This epic exists so the people running the platform can answer support and health
questions — "does this customer's event exist?", "who owns it?", "how many guests does it
have?", "did their custom domain get attached?" — without asking the customer for access.

Everything in this epic is **global**, not event-scoped. Every other epic operates inside one
event and is governed by the per-event role hierarchy; EP-15 sits above that hierarchy and
deliberately steps around it.

---

## 1. The Superadmin actor

**Superadmin** is a _global_ role stored on the user record (`users.role === "superadmin"`,
`convex/schema.ts:22`). It is not an event role, and it is not assignable from anywhere in the
product UI. It is granted by configuration: an email listed in the `SUPERADMIN_EMAILS` Convex
environment variable is promoted on their next login (`convex/users.ts:9`).

See [glossary.md](../../glossary.md) ("Superadmin") and
[roles-and-permissions.md](../../roles-and-permissions.md) §1–§3 for the authoritative actor
model and guard inventory. This epic never restates the event-role hierarchy.

---

## 2. Trust model

**A Superadmin can read and write every event's data.** This is the defining property of the
epic and must be understood before reading either feature spec.

| Guard                | Superadmin behavior                                               | Source                          |
| -------------------- | ----------------------------------------------------------------- | ------------------------------- |
| `requireEventAccess` | early-returns before any ownership or membership check            | `convex/lib/permissions.ts:26`  |
| `requireEventMember` | early-returns before the role-rank comparison                     | `convex/lib/permissions.ts:118` |
| `getEventRole`       | resolves to `"owner"` for any event, even one they have no row on | `convex/lib/permissions.ts:72`  |
| `requireSuperadmin`  | the only guard that _requires_ the role                           | `convex/lib/permissions.ts:95`  |

Because `requireEventEditor` is built on `requireEventMember`, and because nearly every
event-scoped query and mutation in the codebase uses `requireEventEditor`, a Superadmin who
opens `/dashboard/{any-event-slug}` gets the full host experience of a customer's event: their
guest list with emails, phones and allergies, their invitations, their messages, their
settings, their custom domain, and the ability to change or delete any of it.

Three consequences follow, and all three are open gaps rather than implemented controls:

1. **No consent step.** Nothing tells the event owner that a platform operator opened their
   event, and nothing asks first.
2. **No audit trail.** `activityLogs` records the acting user's name for dashboard mutations,
   but there is no record of a Superadmin _reading_ an event, and no separate platform-level
   audit stream. Filed as `TODO-15-09` in [F02](./F02-superadmin-provisioning.md).
3. **No revocation path.** Promotion is promote-only and there is no in-app way to remove the
   role. Filed as `TODO-15-08` in [F02](./F02-superadmin-provisioning.md).

The role should therefore be treated as a production credential: granted to as few emails as
the operation needs, and managed entirely through the Convex environment configuration.

---

## 3. Features

| ID                                            | Feature                 | Status    | Summary                                                                          |
| --------------------------------------------- | ----------------------- | --------- | -------------------------------------------------------------------------------- |
| [EP-15-F01](./F01-admin-console.md)           | Admin Console           | `partial` | `/admin` — read-only tables of every event and every user on the platform        |
| [EP-15-F02](./F02-superadmin-provisioning.md) | Superadmin Provisioning | `partial` | How the global role is granted, what it unlocks, and why it cannot be taken away |

Both are `partial`: the read surface works, but the console has no administrative _actions_
(no suspend, no delete, no impersonation, no role management) and the role has no lifecycle
beyond grant.

---

## 4. Workflows

| ID       | Workflow                           | Feature   | Route                          | Actor      |
| -------- | ---------------------------------- | --------- | ------------------------------ | ---------- |
| WF-15-01 | Review every event on the platform | EP-15-F01 | `/admin`                       | Superadmin |
| WF-15-02 | Review every user on the platform  | EP-15-F01 | `/admin`                       | Superadmin |
| WF-15-03 | Open a customer event for support  | EP-15-F01 | `/admin` → `/dashboard/{slug}` | Superadmin |
| WF-15-04 | Grant the superadmin role by email | EP-15-F02 | Convex env var + next login    | Operator   |

---

## 5. Dependencies

| Depends on                                                                  | Why                                                                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [EP-01](../01-account-and-access/) — Account & Access                       | The role is written by `users.upsertCurrentUser`, the same login-time upsert that mirrors the Clerk identity into `users`. No login, no promotion |
| [EP-03](../03-collaboration-and-permissions/) — Collaboration & Permissions | The guards this epic bypasses are defined there; the bypass is only meaningful relative to that hierarchy                                         |
| [EP-02](../02-event-setup/) — Event Setup                                   | The console reads `events.status`, `events.slug` and `events.customDomain`, all owned by event setup                                              |

Nothing depends on EP-15. Removing the admin console would not break any other workflow.

---

## 6. What this epic explicitly does not cover

Stated here so no one goes looking for it:

- **Impersonation** — there is no "sign in as this user". A Superadmin browses a customer
  event as _themselves_, with an effective role of `owner`.
- **Suspension or account lifecycle** — no way to disable a user or freeze an event.
- **Role management from the UI** — the users table renders `users.role` as a read-only badge.
- **Billing, plans or quotas** — see [EP-16](../16-marketing-and-monetization/).
- **Deleting another customer's data from the console** — possible only by opening the event
  and using the event's own Danger Zone, which is EP-02 behavior.

---

## 7. Traceability

| Concern           | Source                                        |
| ----------------- | --------------------------------------------- |
| Global role field | `convex/schema.ts:22`                         |
| Promotion         | `convex/users.ts:9`, `convex/users.ts:53`     |
| Superadmin guard  | `convex/lib/permissions.ts:95`                |
| Guard bypasses    | `convex/lib/permissions.ts:26`, `:72`, `:118` |
| Console queries   | `convex/admin.ts:12`, `convex/admin.ts:55`    |
| Console route     | `src/app/(dashboard)/admin/page.tsx:26`       |
