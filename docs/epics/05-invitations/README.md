# EP-05 — Invitations

> The dashboard-side management of invitations. The public page a guest opens is
> [EP-07 — Guest Experience](../07-guest-experience/); it is deliberately out of scope here.

---

## 1. Purpose

An **[Invitation](../../glossary.md)** is the unit that gets _sent_. A **Guest** is an individual
person. That distinction is the central product idea of this epic, and almost every rule below
follows from it:

- A wedding is not sent to 180 people; it is sent to ~70 **households** — a couple, a family, a
  group of friends sharing a car. The invitation is that household.
- An invitation is therefore a **shareable link with a title** (`invitations.title`, e.g.
  `"The Smith Family"`), not a person. It has no email address, no phone number, no RSVP status
  of its own.
- Guests are attached to it. The invitation's aggregate **[RSVP State](../../glossary.md)** is
  _derived_ from its guests at read time, never stored.
- Because the invitation is the sendable unit, everything about _sending_ lives on it: the slug
  that forms the public URL ([F03](./F03-invitation-link-and-slug.md)), the copy-link control, the
  `isSent` bookkeeping flag ([F04](./F04-sent-tracking.md)), and the on/off switch `isActive`
  ([F05](./F05-edit-deactivate-delete.md)).
- Because the guests are the people, everything about _attending_ lives on them: RSVP status,
  menu and drink choice, allergies, +1, seat. Those belong to [EP-04](../04-guest-management/).

Two consequences are worth stating up front because they surprise people:

1. **Deleting an invitation does not delete its guests.** The guests are unassigned
   (`invitationId` cleared) and return to the un-invited pool
   (`convex/invitations.ts:461`). The household was cancelled; the people still exist.
2. **An invitation's composition freezes once anyone in it responds.** This is the
   [Composition Lock](../../glossary.md) — the trickiest rule in the app, specified in
   [F02](./F02-invitation-composition-and-lock.md).

---

## 2. Actors

| Actor                | Relationship to this epic                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                | Full access to every invitation capability                                                                                                                                    |
| Co-owner (`planner`) | Same as Owner for this epic — no invitation capability is planner-gated                                                                                                       |
| Editor               | Same as Owner for this epic — invitations are _content_                                                                                                                       |
| Viewer               | Blocked. Every function in `convex/invitations.ts` guards with the default `requireEventEditor(ctx, eventId)` (`minRole: "editor"`), so a viewer cannot even list invitations |
| Public guest         | Never reaches this epic. They only read the resolved public page (EP-07)                                                                                                      |

Authoritative matrix: [roles-and-permissions.md](../../roles-and-permissions.md). The only gate
this epic applies is `requireEventEditor(ctx, eventId)` with its default `minRole`, plus the
superadmin bypass inherited from `convex/lib/permissions.ts`.

---

## 3. Features

| ID                                                    | Feature                                       | Status        | Summary                                                                                                                             |
| ----------------------------------------------------- | --------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [EP-05-F01](./F01-create-invitation.md)               | Create an invitation                          | `defective`   | `createInvitation`: title, per-event-unique slug, optional linking of ≤20 un-invited guests, optional special-invitation access     |
| [EP-05-F02](./F02-invitation-composition-and-lock.md) | Invitation composition & the Composition Lock | `defective`   | `updateInvitation` reconciles linked guests + special-invitation access, but only while **every** linked guest is `pending`         |
| [EP-05-F03](./F03-invitation-link-and-slug.md)        | Invitation link & slug                        | `defective`   | Public URL shape on the primary domain vs a custom domain, the copy-link control, and `regenerateSlug`                              |
| [EP-05-F04](./F04-sent-tracking.md)                   | Sent tracking                                 | `implemented` | The informational `isSent` flag — toggled from the list checkbox and the edit dialog switch, saved immediately, not activity-logged |
| [EP-05-F05](./F05-edit-deactivate-delete.md)          | Edit, deactivate & delete                     | `partial`     | Title/slug/notes/`isActive` edits; deactivation makes the public page unresolvable; deletion **unassigns** guests                   |

---

## 4. Workflows

| ID       | Workflow                                 | Specified in                                    |
| -------- | ---------------------------------------- | ----------------------------------------------- |
| WF-05-01 | Create invitation for a household        | [F01](./F01-create-invitation.md)               |
| WF-05-02 | Adjust an invitation's guest composition | [F02](./F02-invitation-composition-and-lock.md) |
| WF-05-03 | Copy and share an invitation link        | [F03](./F03-invitation-link-and-slug.md)        |
| WF-05-04 | Track which invitations were sent        | [F04](./F04-sent-tracking.md)                   |
| WF-05-05 | Edit, deactivate or delete an invitation | [F05](./F05-edit-deactivate-delete.md)          |

---

## 5. Surface area

| Concern            | Source                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Route              | `src/app/(dashboard)/dashboard/[eventSlug]/invitations/page.tsx:14`                            |
| List UI            | `src/components/invitations/invitation-list.tsx:59`                                            |
| Create/edit dialog | `src/components/invitations/invitation-form.tsx:64`                                            |
| Copy-link control  | `src/components/invitations/copy-invitation-link-button.tsx:13`                                |
| Backend            | `convex/invitations.ts:1`                                                                      |
| Slug uniqueness    | `convex/lib/slug.ts:61`                                                                        |
| Public resolution  | `convex/lib/public.ts:49`                                                                      |
| Schema             | `convex/schema.ts:97` (`invitations`), `convex/schema.ts:182` (`invitationSpecialEventAccess`) |
| Form validation    | `src/lib/validations/invitation.ts:3`                                                          |

---

## 6. Dependencies

| Depends on                                                                        | Why                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [EP-02-F04](../02-event-setup/) — Event Key                                       | The event key is the first path segment of the public URL on the primary domain                                           |
| [EP-02-F08](../02-event-setup/) / [EP-02-F09](../02-event-setup/) — Custom domain | The copy-link control switches URL shape when the event has a verified custom domain                                      |
| [EP-04](../04-guest-management/) — Guests                                         | Supplies the un-invited pool, the RSVP statuses the Composition Lock reads, and the +1 lifecycle the reconcile tears down |
| [EP-06](../06-special-invitations/) — Special invitations                         | Supplies the `specialEvents` rows whose per-invitation access this epic grants                                            |
| [EP-03-F05](../03-collaboration-and-permissions/) — Activity log                  | Invitation create/update/delete are logged; `setInvitationSent` deliberately is not                                       |

### Depended on by

| Consumer                                            | Why                                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [EP-07](../07-guest-experience/) — Guest experience | Resolves the public page from `{event, invitationSlug}` and derives the RSVP State from the invitation's guests |
| [EP-06](../06-special-invitations/)                 | `invitationSpecialEventAccess` written here decides which invitations see a special invitation                  |
| [EP-10](../10-sharing-and-seo/)                     | Social metadata is resolved against an invitation's guests                                                      |

---

## 7. Not in scope

- The rendered public invitation page, its blocks and its RSVP form → EP-07.
- Guest CRUD, +1 permission, RSVP override, menu/drink/seat → EP-04.
- Special-invitation CRUD and the ≤2-per-event cap → EP-06.
- Event key editing and custom-domain connection → EP-02.
- There is **no email or messaging capability in the product**. "Sending" an invitation means a
  human copies the link and shares it themselves; see [F04](./F04-sent-tracking.md).

---

## 8. Epic-level defects & TODOs

Full detail lives in each feature's §14. Index:

| ID         | Priority      | Owning spec                                                                                     |
| ---------- | ------------- | ----------------------------------------------------------------------------------------------- |
| DEF-05-01  | P1            | [F03](./F03-invitation-link-and-slug.md) — `regenerateSlug` writes before Save                  |
| DEF-05-02  | P1            | [F02](./F02-invitation-composition-and-lock.md) — lock rejection surfaces as a generic toast    |
| DEF-05-03  | P1            | [F01](./F01-create-invitation.md) — create dialog is unusable when the un-invited pool is empty |
| TODO-05-01 | P2 `[REMOVE]` | [F01](./F01-create-invitation.md) — dead schema fields                                          |
| TODO-05-02 | P1 `[ADD]`    | [F02](./F02-invitation-composition-and-lock.md) — no ≤20 cap on update                          |
| TODO-05-03 | P2 `[CHANGE]` | [F01](./F01-create-invitation.md) — already-linked guests silently ignored                      |
| TODO-05-04 | P2 `[ADD]`    | [F03](./F03-invitation-link-and-slug.md) — no bulk share / QR / print                           |
| TODO-05-05 | P1 `[ADD]`    | [F05](./F05-edit-deactivate-delete.md) — no UI to set `isActive`                                |
| TODO-05-06 | P2 `[CHANGE]` | [F05](./F05-edit-deactivate-delete.md) — delete dialog copy omits the unassign rule             |
| TODO-05-07 | P2 `[CHANGE]` | [F03](./F03-invitation-link-and-slug.md) — client slugify diverges from server                  |
| TODO-05-08 | P2 `[ADD]`    | [F05](./F05-edit-deactivate-delete.md) — no warning that deactivating breaks live links         |
| TODO-05-09 | P2 `[ADD]`    | [F04](./F04-sent-tracking.md) — no sent timestamp or history                                    |
| TODO-05-10 | P2 `[ADD]`    | [F01](./F01-create-invitation.md) — no server-side length caps on title/notes                   |

---

## 9. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built epic overview |
