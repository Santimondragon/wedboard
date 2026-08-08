# EP-07 — Guest Experience

Everything a **public guest** — a person with no account, holding nothing but a URL — sees and
does on an invitation page.

This epic covers the _live_ public surface: how an invitation resolves, which of the three
layouts is chosen, and every interaction a guest can complete (main RSVP, +1 declaration,
dietary answers, special-invitation response, message to the hosts). The host-side page
builder that authors those layouts belongs to
[EP-08 (Invitation Design Studio)](../08-invitation-design-studio/) and is referenced here,
never specified.

Domain terms: [Public guest](../../roles-and-permissions.md), [RSVP State](../../glossary.md),
[RSVP Variant](../../glossary.md), [+1](../../glossary.md),
[Decline effects](../../glossary.md), [Block](../../glossary.md).

---

## 1. The guest as an actor

| Property      | Value                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Identity      | None. No Clerk account, no session, no cookie.                                                                         |
| Credential    | **Knowledge of the invitation URL.** Nothing else.                                                                     |
| Scope         | Exactly one invitation, and only the guests linked to it                                                               |
| Middleware    | Public routes bypass Clerk entirely (`src/middleware.ts:9`, `:11`)                                                     |
| Server gating | Data-level, not role-level (`convex/lib/public.ts`); see [roles-and-permissions.md §6](../../roles-and-permissions.md) |

Two URL shapes address the same page:

| Domain  | URL                                                    | Resolver                                |
| ------- | ------------------------------------------------------ | --------------------------------------- |
| Primary | `/{event-key}/invitations/{invitation-slug}`           | `invitations.getPublicInvitation`       |
| Custom  | `https://{customDomain}/invitations/{invitation-slug}` | `invitations.getPublicInvitationByHost` |

On a custom domain the event key never appears in the URL. The payload carries
`event.slug` (`convex/invitations.ts:215`) so the slug-based public **mutations** still work —
this is the seam that makes the whole epic domain-independent.

---

## 2. The three RSVP states

The invitation's aggregate state is **derived, never stored**
(`convex/invitations.ts:138`):

| Condition (evaluated in order)                    | RSVP State | Layout variant rendered                                    |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| Any linked guest is `attending`                   | `accepted` | `layoutVariants.accepted` (legacy `layoutBlocks` fallback) |
| Else: no guests at all, or any guest is `pending` | `pending`  | `layoutVariants.pending`                                   |
| Else (every guest `declined`)                     | `declined` | `layoutVariants.declined`                                  |

The state changes as a consequence of what the guest submits, so **the page a guest sees after
responding is not the page they responded on**. That single fact explains most of this epic's
behavior and most of its defects.

---

## 3. Features

| ID                                                 | Feature                              | Status        | Scope                                                                  |
| -------------------------------------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------------- |
| [EP-07-F01](./F01-invitation-access-and-states.md) | Invitation access & state resolution | implemented   | Slug/host resolution, gating, `rsvpState` derivation, layout selection |
| [EP-07-F02](./F02-rsvp-submission.md)              | Main RSVP submission                 | partial       | The `rsvp` block and `guests.submitPublicRsvp`                         |
| [EP-07-F03](./F03-plus-one-declaration.md)         | +1 declaration                       | implemented   | Per-host "bring a +1" question and `plusOneUpdates`                    |
| [EP-07-F04](./F04-dietary-preferences.md)          | Dietary preferences                  | **defective** | The `allergies` block — carries `DEF-07-01` `[P0]`                     |
| [EP-07-F05](./F05-special-invitation-rsvp.md)      | Special-invitation response          | implemented   | The `specialInvitation` card + confirm modal                           |
| [EP-07-F06](./F06-guest-message.md)                | Message to the hosts                 | implemented   | The `guestMessage` block and `messages.submitGuestMessage`             |
| [EP-07-F07](./F07-custom-domain-landing.md)        | Custom-domain landing (guest view)   | implemented   | Guest's view of the countdown root; mechanism in EP-02-F11             |
| [EP-07-F08](./F08-error-and-not-found-states.md)   | Error & not-found states             | implemented   | The branded "Invitation Not Found" screen                              |

---

## 4. Workflows

| ID       | Workflow                        | Spec      |
| -------- | ------------------------------- | --------- |
| WF-07-01 | Open an invitation link         | EP-07-F01 |
| WF-07-02 | Submit the main RSVP            | EP-07-F02 |
| WF-07-03 | Declare a plus-one companion    | EP-07-F03 |
| WF-07-04 | Report dietary restrictions     | EP-07-F04 |
| WF-07-05 | Respond to a special invitation | EP-07-F05 |
| WF-07-06 | Leave the hosts a message       | EP-07-F06 |
| WF-07-07 | Visit the custom-domain root    | EP-07-F07 |
| WF-07-08 | Follow a broken invitation link | EP-07-F08 |

---

## 5. Surfaces

| Surface                           | Path                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| Primary-domain route              | `src/app/[eventSlug]/invitations/[invitationSlug]/page.tsx`          |
| Custom-domain invitation route    | `src/app/%5Fdomain/[host]/invitations/[invitationSlug]/page.tsx`     |
| Custom-domain catch-all + landing | `src/app/%5Fdomain/[host]/[[...rest]]/page.tsx`                      |
| Page shell                        | `src/components/public-invitation/public-invitation-page.tsx`        |
| Not-found screen                  | `src/components/public-invitation/invitation-not-found.tsx`          |
| Interactive blocks                | `src/components/public-invitation/templates/elegant/blocks/`         |
| Public queries                    | `convex/invitations.ts:245`, `:258`                                  |
| Public mutations                  | `convex/guests.ts:466`, `convex/messages.ts:37`                      |
| Public resolvers                  | `convex/lib/public.ts`                                               |
| Copy deck                         | `src/components/public-invitation/templates/elegant/default-copy.ts` |

---

## 6. Language

The guest-facing product is **Spanish only**. Every string a guest reads on a rendered
invitation comes from `ELEGANT_COPY` or an authored block config
(`.../elegant/default-copy.ts:5`). The one exception is the "Invitation Not Found" screen,
which is English — see `TODO-07-06` in EP-07-F08.

Each feature spec's §7 copy deck quotes its strings verbatim; together the eight specs are the
**copy deck of record** for the public product.

---

## 7. Dependencies

| Depends on                    | Why                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| EP-02 (Event Setup)           | The event key, status and couple/venue fields the page renders; archived events stop resolving |
| EP-02-F08…F11 (Custom domain) | Host-based resolution and the countdown landing                                                |
| EP-04 (Guest Management)      | Guests, `allowsPlusOne`, and the decline cascade (`convex/lib/guests.ts:51`)                   |
| EP-05 (Invitations)           | The invitation, its slug and its `isActive` flag                                               |
| EP-06 (Special Invitations)   | `invitationSpecialEventAccess` decides whether the card renders at all                         |
| EP-08 (Design Studio)         | Authors the three layout variants and every block's copy                                       |
| EP-09 (Media Library)         | `mediaUrls` resolves image block configs                                                       |
| EP-10 (Sharing & SEO)         | `meta.getPublicInvitationMeta` feeds `generateMetadata`                                        |
| EP-13 (Host Inbox)            | Guest messages surface to the host                                                             |

## 8. Consumed by

| Consumer                 | Why                                                |
| ------------------------ | -------------------------------------------------- |
| EP-04 (Guest Management) | The guest table reads statuses written here        |
| EP-11 (Catering)         | Menu/drink selections and the allergies field      |
| EP-13 (Host Inbox)       | `guestMessages` rows are created here              |
| EP-14 (Insights)         | Overview counts derive from RSVP statuses set here |

---

## 9. Epic-level defects & gaps

Full detail lives in each feature's §14.

| ID         | Priority | Summary                                                                                                | Spec |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------ | ---- |
| DEF-07-01  | **P0**   | The dietary block flips **every** guest — including declined ones — to `attending`                     | F04  |
| DEF-07-02  | P1       | The dietary block also writes `+1` records it should not address                                       | F04  |
| TODO-07-01 | P1       | No edit-after-submit: the elegant `accepted`/`declined` layouts contain no `rsvp` block                | F02  |
| TODO-07-02 | P1       | Nothing rate-limits the public mutations; invitation slugs are derived from titles                     | F02  |
| TODO-07-03 | P1       | The `rsvp` block never prefills a guest's already-stored choice                                        | F02  |
| TODO-07-04 | P2       | No RSVP receipt beyond a toast; the product sends no email at all                                      | F02  |
| TODO-07-05 | P1       | Dietary answers are never prefilled from the stored `guests.allergies`                                 | F04  |
| TODO-07-06 | P2       | The not-found screen is English in an otherwise Spanish guest product                                  | F08  |
| TODO-07-07 | P2       | Radio/checkbox groups have no `fieldset`/`legend` and no visible focus ring                            | F02  |
| TODO-07-08 | P2       | The special-invitation modal counts `+1` records as answerable rows; the main RSVP block excludes them | F05  |
| TODO-07-09 | P2       | The message form enforces no client-side length limits and never surfaces the 20-message cap           | F06  |
| TODO-07-10 | P2       | Unresolvable invitations return HTTP 200, not 404                                                      | F08  |
| TODO-07-11 | P2       | The custom-domain landing offers a guest no route to their own invitation                              | F07  |
| TODO-07-12 | P2       | `submitPublicRsvp` accepts `menuOptionId`/`drinkOptionId` but no guest-facing block sends them         | F04  |
| TODO-07-13 | P2       | The loading spinner has no accessible label                                                            | F01  |
| TODO-07-14 | P2       | No invitation open/view tracking exists                                                                | F01  |
| TODO-07-15 | P2       | Server validation messages are English and swallowed by a generic toast                                | F02  |
| TODO-07-16 | P2       | The +1 companion name has no length cap at any layer                                                   | F03  |
| TODO-07-17 | P2       | The +1 question and placeholder are not host-authorable                                                | F03  |
| TODO-07-18 | P2       | The +1 name input has a placeholder but no label                                                       | F03  |
| TODO-07-19 | P2       | The dietary "has restrictions" control is buttons, not a radio group                                   | F04  |
| TODO-07-20 | P2       | "Ver detalles" implies read-only but the modal is still submittable                                    | F05  |
| TODO-07-21 | P2       | `ELEGANT_COPY.dinnerModalTitle` is dead copy                                                           | F05  |
| TODO-07-22 | P2       | An unresolvable `specialEventId` silently binds to a different sub-event                               | F05  |
| TODO-07-23 | P2       | The special-invitation modal's copy is not host-authorable                                             | F05  |
| TODO-07-24 | P2       | A submitted message has no receipt or read-back                                                        | F06  |
| TODO-07-25 | P2       | Messages are attributed by free text, not linked to a guest                                            | F06  |
| TODO-07-26 | P2       | Messages cannot be deleted or moderated                                                                | F06  |
| TODO-07-27 | P2       | The countdown digits are not associated with their unit labels                                         | F07  |
| TODO-07-28 | P2       | The not-found screen offers no recovery path                                                           | F08  |
| TODO-07-29 | P2       | No error boundary wraps the public page                                                                | F08  |
| TODO-07-30 | P2       | Failed invitation lookups are not counted or throttled                                                 | F08  |
