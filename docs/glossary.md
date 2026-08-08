# Glossary

The domain language of Wedboard. Specs use these terms exactly as defined here; when a term
appears in a spec for the first time, link back to this file.

Terms are grouped by concept, not alphabetized, so related ideas read together.

---

## Core entities

**Event** — one wedding or occasion; the top-level board everything else hangs off. Backed
by `events`. An event has exactly one Owner, a lifecycle status, and its own guests,
invitations, menu, tables and design. Every dashboard route below `/dashboard/[eventSlug]`
is scoped to a single event.

**Event Key** — the event's globally unique, handle-style slug (`events.slug`), editable in
Settings. It appears in every public URL on the primary domain
(`/{event-key}/invitations/{invitation-slug}`). Reserved top-level route names cannot be
used (`convex/lib/slug.ts` `RESERVED_EVENT_SLUGS`). Changing it breaks previously shared
links.

**Event Status** — `draft` · `active` · `archived`. Archived events are invisible to the
public resolvers; draft events remain publicly reachable so the host can preview before
going live.

**Invitation** — a shareable link representing one household or party: a person, a couple, a
family, or a group. Backed by `invitations`. It is the unit that is _sent_, and it is what a
public guest opens. Its slug is unique **per event**, not globally.

**Guest** — one individual attendee, backed by `guests`. A guest belongs to an event and is
optionally linked to an invitation.

**Un-invited guest** — a guest with no `invitationId`. They exist in the event's directory
but have no way to RSVP until they are linked to an invitation. They form the pool offered
when composing a new invitation.

**+1** — a companion a guest may bring. This is a **per-guest** permission
(`guests.allowsPlusOne`), not a per-invitation one. When the host RSVPs attending _and_
declares they are bringing someone, the +1 is **materialized** as its own fully-manageable
guest record (`isPlusOne: true`, `plusOneOfGuestId` → host) sharing the host's invitation. It
is torn down if the host declines, loses the permission, or is deleted.

**Host guest** — a guest that a +1 record points at via `plusOneOfGuestId`.

**Special Invitation** — an optional mini sub-event (rehearsal dinner, after-party…), backed
by `specialEvents`, capped at **2 per event**. Visibility is granted per invitation via
`invitationSpecialEventAccess`; per-guest responses live in `guestSpecialEventRsvps`.
Referred to as "special event" in code and "special invitation" in the product UI — specs
prefer the product term.

---

## RSVP concepts

**RSVP Status** — a guest's response to the main event: `pending` · `attending` ·
`declined` (`guests.rsvpStatus`). Set publicly by the guest, or overridden by an Editor+ in
the dashboard.

**Decline effects** — the cascade run when a guest becomes `declined`
(`convex/lib/guests.ts` `applyDeclineEffects`): their special-invitation RSVP rows are
deleted and their +1 is removed. The guest itself **stays linked** to its invitation, so the
declined public layout still resolves.

**RSVP State** (of an invitation) — the derived aggregate used to pick which public layout to
render: any guest attending → `accepted`; else any pending or no guests → `pending`; else
(all declined) → `declined`. Derived in `invitations.getPublicInvitation`; never stored.

**RSVP Variant** — the authoring-side name for the same three values (`pending` ·
`accepted` · `declined`). The host designs one layout per variant in the Design Studio.

---

## Design & publishing

**Template** — a complete visual implementation of the public invitation: its own page
`Frame`, a component per block type, and optional preset layouts. Selected via
`events.templateId`. `elegant` is the only official template today and the default.

**Block** — one section of a public invitation page (`hero`, `location`, `rsvp`,
`countdown`, `itinerary`, `text`, `dressCode`, `allergies`, `specialInvitation`,
`guestMessage`, `footer`, …). A `LayoutBlock` is `{id, type, config?}`. Blocks may repeat.

**Block Config** — the authorable content of a block, a key/value map described by the block
type's `ConfigField[]`. Field input kinds: `text` · `textarea` · `list` · `image` · `toggle`
· `select`. All non-derived copy is authorable through config; derived data (event name,
couple names, date, venue, guest names) is not.

**Layout** — the ordered `LayoutBlock[]` for one RSVP variant.

**Layout Variants** — `events.layoutVariants` = `{pending?, accepted?, declined?}`. An unset
variant falls back to the template's `defaultLayouts[variant]()`, then to the global
`defaultLayout(variant)`. The legacy single `events.layoutBlocks` is read as the `accepted`
fallback.

**Design Studio** — the host-facing page builder at `/dashboard/[eventSlug]/template`:
template picker, per-variant tabs, block add/reorder/duplicate/remove/configure, and a live
preview rendered with dummy data plus the event's real media.

**Media Library** — the per-event image catalog (`media`), blobs in Convex file storage.
Image mime types only, ≤5 MB each, ≤50 per event. Image block config fields store a media id
resolved to a URL by the public query's `mediaUrls`.

**Meta / Social Card** — the per-event social-sharing metadata (`events.meta`): title and
description **templates** that may contain `{variables}`, an OG image, and a favicon.

**Meta Variable** — a `{token}` resolved at render time against the invitation being shared:
`{invitation-title}`, `{guest-name}`, `{guest-names}`, `{event-name}`, `{bride-name}`,
`{groom-name}`, `{couple-names}` (`convex/lib/meta.ts`). Unknown tokens are left intact.

---

## Access & collaboration

**Owner · Co-owner · Editor · Viewer** — the per-event roles. `planner` in code is labeled
**Co-owner** in the UI. Defined authoritatively in
[roles-and-permissions.md](./roles-and-permissions.md).

**Superadmin** — a global role (`users.role`) auto-granted to emails listed in the
`SUPERADMIN_EMAILS` Convex env var. Bypasses every event guard and lands on `/admin`.

**Member** — an `eventMembers` row linking a user to an event with a role. The owner's row is
created at event creation.

**Activity Log** — the append-only audit trail (`activityLogs`) of dashboard create/update/
delete actions on guests, invitations, special invitations, the template and meta. Public
guest actions and per-toggle flags are deliberately not logged.

---

## Domains & routing

**Primary domain** — the host Wedboard itself runs on (`NEXT_PUBLIC_PRIMARY_DOMAIN`). Public
invitations here are addressed by event key.

**Custom Domain** — a host's own domain (`events.customDomain`, normalized bare hostname,
globally unique) serving that event's invitations. Non-primary hosts are rewritten by
middleware to `/_domain/{host}{path}` **before any Clerk logic**, so the event key never
appears in the URL.

**Domain Verification** — `events.customDomainVerified` caches Vercel's live verified +
configured state for the Settings wizard. **Public routing never gates on it** — a claimed
domain serves as soon as DNS points at it.

**Countdown Landing** — the page served at the root of a custom domain: couple names, date,
live countdown and venue. Any other unknown path on a custom domain renders the branded
"Invitation Not Found" screen.

---

## Cross-cutting mechanics

**Workflow** — an end-user goal completed in one sitting, identified `WF-NN-NN` and listed in
[workflow-catalog.md](./workflow-catalog.md). Each workflow is described in exactly one
feature spec.

**Composition Lock** — the rule that an invitation's linked guests and special-invitation
access may only be reconciled while **every** linked guest is still `pending`. Enforced in
`invitations.updateInvitation` and mirrored by a disabled state in the edit dialog.

**Toast mutation** — the project convention that every mutation reports through sonner via
`useToastMutation` (`src/hooks/use-toast-mutation.ts`), returning `{ok, value}` rather than
throwing.

**Cascade delete** — deleting an event removes every row in all event-scoped tables plus
media rows _and_ their storage blobs. Deleting an invitation, by contrast, **unassigns** its
guests rather than deleting them.
