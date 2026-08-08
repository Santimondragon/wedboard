# EP-06 — Special Invitations

Mini sub-events attached to an event — a welcome dinner, a rehearsal dinner, an after-party —
that only _some_ invitations are shown, and that individual guests answer separately from the
main RSVP.

This epic covers the **dashboard side**: creating and editing special invitations, choosing
which invitations may see each one, and overriding a guest's response from the guest details
dialog. The public-facing `specialInvitation` block a guest actually interacts with belongs to
[EP-07 (Guest Experience)](../07-guest-experience/) and [EP-08 (Invitation Design Studio)](../08-invitation-design-studio/)
and is referenced, never specified, here.

Domain terms: [Special Invitation](../../glossary.md), [RSVP Status](../../glossary.md),
[Decline effects](../../glossary.md).

> **Naming.** The code calls this a "special event" (`specialEvents`, `setSpecialEventAccess`,
> `setSpecialEventRsvp`); the product calls it a **special invitation**. Specs use the product
> term in prose and the code identifiers verbatim when citing functions or tables.

---

## 1. Purpose

A wedding is rarely one gathering. Hosts need a second, smaller occasion that:

- is described independently (its own name, description, date, location),
- is offered to **a subset** of the invitations they send,
- collects a **per-person** yes/no, because a household may split (the parents come to the
  welcome dinner, the kids do not).

Special invitations exist to satisfy those three needs without forcing the host to build and
send a second event.

---

## 2. Actors

| Actor                | Involvement                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Owner                | Full — create, edit, delete, assign visibility, override responses                                    |
| Co-owner (`planner`) | Same as Owner for this epic                                                                           |
| Editor               | Same as Owner for this epic — every mutation here is gated at `requireEventEditor` default (`editor`) |
| Viewer               | No access — the content queries default to `minRole: "editor"`                                        |
| Public guest         | Responds from their invitation page (EP-07/EP-08), never from these screens                           |

Role semantics live in [roles-and-permissions.md](../../roles-and-permissions.md).

---

## 3. The three-table model

This is the part that confuses people. Three tables cooperate, and each answers a different
question.

| Table                          | Question it answers             | Grain                                            |
| ------------------------------ | ------------------------------- | ------------------------------------------------ |
| `specialEvents`                | _What is the sub-event?_        | one row per special invitation (max 2 per event) |
| `invitationSpecialEventAccess` | _Which invitations may see it?_ | one row per (invitation × special invitation)    |
| `guestSpecialEventRsvps`       | _Who is actually coming?_       | one row per (guest × special invitation)         |

```
events ──< specialEvents ──< invitationSpecialEventAccess >── invitations
                │                                                 │
                └──< guestSpecialEventRsvps >── guests ───────────┘
```

**Access is per-invitation. Response is per-guest.** Nothing links the two tables directly.
An access row does not create RSVP rows, and an RSVP row does not create access. The
consequences follow from that gap:

- An invitation with no access row **never renders** the special invitation on its public page
  — `invitations.getPublicInvitation` only returns special invitations reachable through
  `invitationSpecialEventAccess` (`convex/invitations.ts:149`). See EP-06-F02.
- The dashboard override (`guests.setSpecialEventRsvp`) writes an **RSVP row only**. It adds a
  guest to a special invitation _regardless of whether their invitation has access_ — the
  guest is counted as attending, but still cannot see or change it on their own page. See
  EP-06-F03.
- The guests table therefore derives "invited" from **either** source: the guest's invitation
  has access, **or** an explicit RSVP row exists
  (`src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:98`).

---

## 4. Features

| ID                                               | Feature                    | Status      | Scope                                                                                 |
| ------------------------------------------------ | -------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| [EP-06-F01](./F01-manage-special-invitations.md) | Manage special invitations | implemented | Create / edit / delete, the 2-per-event cap, the delete cascade                       |
| [EP-06-F02](./F02-visibility-assignment.md)      | Visibility assignment      | implemented | `invitations.setSpecialEventAccess` and the per-invitation checkboxes                 |
| [EP-06-F03](./F03-dashboard-rsvp-override.md)    | Dashboard RSVP override    | implemented | `guests.setSpecialEventRsvp` / `removeSpecialEventRsvp` from the guest details dialog |

---

## 5. Workflows

| ID       | Workflow                            | Spec      |
| -------- | ----------------------------------- | --------- |
| WF-06-01 | Create a special invitation         | EP-06-F01 |
| WF-06-02 | Edit a special invitation's details | EP-06-F01 |
| WF-06-03 | Delete a special invitation         | EP-06-F01 |
| WF-06-04 | Choose which invitations see it     | EP-06-F02 |
| WF-06-05 | Override one guest's response       | EP-06-F03 |

---

## 6. Surfaces

| Surface                                      | Path                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Special Events page                          | `src/app/(dashboard)/dashboard/[eventSlug]/special-events/page.tsx`            |
| List rows                                    | `src/components/special-events/special-event-list.tsx`                         |
| Create / edit dialog + visibility checkboxes | `src/components/special-events/special-event-form.tsx`                         |
| Guest details dialog (RSVP override)         | `src/components/guests/guest-details-sheet.tsx:202`                            |
| Backend                                      | `convex/specialEvents.ts`, `convex/invitations.ts:497`, `convex/guests.ts:248` |
| Validation                                   | `src/lib/validations/special-event.ts`                                         |

---

## 7. Dependencies

| Depends on               | Why                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EP-02 (Event Setup)      | A special invitation is scoped to an event; `requireEventEditor(ctx, eventId)` gates everything                                                        |
| EP-05 (Invitations)      | Visibility is granted to invitations; `invitations.createInvitation` / `updateInvitation` also write access rows (`convex/invitations.ts:313`, `:412`) |
| EP-04 (Guest Management) | Responses are per guest; declining the main event destroys a guest's special-invitation RSVP rows (`convex/lib/guests.ts:51`)                          |
| EP-03-F05 (Activity Log) | Special-invitation create/update/delete are logged; access toggles and RSVP overrides deliberately are not                                             |

## 8. Consumed by

| Consumer                         | Why                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| EP-07 (Guest Experience)         | The public invitation renders the special invitation card + confirm modal and writes `guestSpecialEventRsvps` through `submitPublicRsvp` |
| EP-08 (Invitation Design Studio) | The `specialInvitation` block binds to a special invitation by `specialEventId`                                                          |

---

## 9. Epic-level defects & gaps

Full detail lives in each feature's §14.

| ID         | Priority | Summary                                                                                 | Spec |
| ---------- | -------- | --------------------------------------------------------------------------------------- | ---- |
| DEF-06-01  | P2       | The cap `ConvexError` is swallowed by `useToastMutation` and shown as a generic failure | F01  |
| TODO-06-01 | P2       | `specialEvents.listForInvitation` has no callers — dead code                            | F01  |
| TODO-06-02 | P1       | No per-special-invitation attendance summary for the host                               | F01  |
| TODO-06-03 | P1       | Decline effects destroy special-invitation RSVP rows irreversibly                       | F03  |
| TODO-06-04 | P2       | Visibility cannot be assigned while creating — only after saving                        | F02  |
| TODO-06-05 | P2       | Access toggles and RSVP overrides are not activity-logged                               | F03  |
| TODO-06-06 | P2       | An unset date renders as nothing, with no "date TBA" affordance                         | F01  |
| TODO-06-07 | P2       | The `isActive` toggle never explains that it hides the special invitation publicly      | F01  |
| TODO-06-08 | P2       | The visibility checklist shows only invitation titles, no guest counts                  | F02  |
| TODO-06-09 | P1       | Nothing warns that a response override does not grant invitation access                 | F03  |
