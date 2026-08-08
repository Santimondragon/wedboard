---
id: EP-08-F06
title: Live Preview
epic: EP-08 Invitation Design Studio
version: 1.0.0
status: partial
last_updated: 2026-07-28
depends_on: [EP-08-F02, EP-08-F03, EP-08-F04, EP-09-F01]
---

# EP-08-F06 — Live Preview

## 1. Summary

The live preview is the right-hand half of the [Design Studio](../../glossary.md): a rendered
public invitation that updates on every edit, so a host never has to save-and-open-a-tab to see
what they are building. It renders through exactly the same component the public page uses, so
what appears in the pane is the real template markup, not a mock-up. It is fed a **hybrid** of
data: a fixed sample invitation with sample guests, overlaid with the event's real profile
details and the event's real [Media Library](../../glossary.md) images. Because it is a sample
invitation rather than a real one, the preview carries no invitation identity — and every
interactive control in it is therefore inert by design: a host must never be able to submit an
RSVP or a message to the host from a design tool.

## 2. Actors & Permissions

| Actor                | Access | Notes                                                                                  |
| -------------------- | ------ | -------------------------------------------------------------------------------------- |
| Owner                | Full   |                                                                                        |
| Co-owner (`planner`) | Full   |                                                                                        |
| Editor               | Full   | The preview is rendered client-side from queries already gated at `requireEventEditor` |
| Viewer               | None   | The `editor` floor read-blocks viewers from the Design Studio                          |
| Public guest         | None   | Never sees the preview; sees the same components rendered with real data (EP-07)       |

Role semantics live in [roles-and-permissions.md](../../roles-and-permissions.md). The preview
itself applies no gate of its own — it renders whatever the editor already loaded.

## 3. User Stories

- **US-08-F06-01** — As an Editor, I want to see my layout rendered as I edit it so that I can
  judge the result without saving and opening the public page.
- **US-08-F06-02** — As an Editor, I want the preview to show my own photos and my own event
  details so that it looks like my invitation rather than a generic sample.
- **US-08-F06-03** — As an Editor, I want to switch RSVP variant tabs and see the corresponding
  layout so that I can design all three states in one sitting.
- **US-08-F06-04** — As an Editor, I want to be certain that nothing I click in the preview can
  alter a real guest's RSVP, so that I can explore the page freely.

## 4. Entry Points

| Entry point                                          | Route / control                                                                                    | Actor   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------- |
| Preview pane (always visible, right column)          | `/dashboard/[eventSlug]/template` (`src/components/template-selection/template-settings.tsx:371`)  | Editor+ |
| Variant tabs — change which layout the preview shows | Pending / Accepted / Declined tabs (`src/components/template-selection/template-settings.tsx:234`) | Editor+ |

The preview has no route, no toggle and no full-screen mode; it is a permanent half of the
Design Studio screen.

## 5. UX Flow

### Happy path

1. The Editor opens `/dashboard/[eventSlug]/template`. `TemplateSettings` builds all three
   variants into state and mounts the preview alongside the block list
   (`src/components/template-selection/template-settings.tsx:61`, `:377`).
2. The preview renders `<InvitationTemplate data={previewData} templateId={templateId}
blocks={blocks} rsvpState={activeVariant} />` — the same component the public page uses
   (`template-settings.tsx:377`, compare
   `src/components/public-invitation/public-invitation-page.tsx:45`).
3. The Editor edits a block's config or reorders blocks. `blocks` is the active variant's array
   in component state (`template-settings.tsx:109`), so the pane re-renders synchronously with
   no round trip.
4. The Editor switches to another variant tab. `activeVariant` changes, which swaps both the
   block list and the preview's `blocks` and `rsvpState` in one render
   (`template-settings.tsx:95`, `:109`, `:381`).
5. The Editor picks an image in a config field. The id is looked up in the editor's own media
   map and the picture appears in the pane immediately (`template-settings.tsx:165`).

### Alternate & edge paths

- **A1** — The event's profile fields are blank → the preview falls back to the dummy sample
  per field, so the pane always shows a plausible invitation rather than empty headings
  (`template-settings.tsx:175`).
- **A2** — The media query has not resolved → `previewMediaUrls` is empty and every image slot
  shows the placeholder graphic until it does (`template-settings.tsx:167`,
  `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:176`).
- **A3** — The active variant's block list is empty → `InvitationTemplate` falls back to the
  template's preset layout for that variant, so the pane shows the preset rather than a blank
  card (`src/components/public-invitation/templates/invitation-template.tsx:33`).
- **A4** — A block whose type the template does not implement contributes nothing to the pane
  (`invitation-template.tsx:42`) — see DEF-08-01 in [F05](./F05-block-catalog.md).
- **E1** — Every interactive control that submits — the RSVP submit, the allergies submit, the
  guest-message submit, the special-invitation confirm button — is rendered **disabled**,
  because `data.eventSlug` and `data.invitationSlug` are absent from the preview payload
  (`elegant/blocks/rsvp.tsx:96`, `allergies.tsx:160`, `guest-message.tsx:37`,
  `special-invitation.tsx:40`).
- **E2** — Non-submitting controls (radios, checkboxes, text inputs inside a block) remain
  fully interactive in the preview; they mutate only local component state and are discarded on
  unmount.

## 6. States

| State             | Behavior                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The pane never blocks: `DUMMY_INVITATION_DATA` is a module constant, so a full invitation renders on first paint. Only images fill in later, as `api.media.listByEvent` resolves (`template-settings.tsx:47`)                                                              |
| Empty             | Not reachable — an empty block list falls back to the template preset (`invitation-template.tsx:33`)                                                                                                                                                                       |
| Error             | None. The preview issues no queries of its own and has no error branch                                                                                                                                                                                                     |
| Success           | The pane reflects local state; the pane state and the saved state are indistinguishable to the eye — see TODO-08-29                                                                                                                                                        |
| Disabled / locked | Every submitting control is disabled; the disabled styling is `opacity-50 pointer-events-none` on `WeddingButton` (`elegant/blocks/primitives.tsx:37`)                                                                                                                     |
| Mobile            | Below the `lg` breakpoint the two-column grid stacks, so the pane sits under the block list (`template-settings.tsx:203`). The pane itself is fixed-height with its own vertical scroll (`:375`) and renders the elegant frame's phone-width card (`elegant/frame.tsx:12`) |

## 7. UI Specification

### Screens & components

| Element                                     | Component               | Path                                                                    |
| ------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| Design Studio shell + preview pane          | `TemplateSettings`      | `src/components/template-selection/template-settings.tsx:371`           |
| Renderer (shared with the public page)      | `InvitationTemplate`    | `src/components/public-invitation/templates/invitation-template.tsx:23` |
| Sample invitation data                      | `DUMMY_INVITATION_DATA` | `src/components/public-invitation/templates/dummy-data.ts:4`            |
| Payload type (documents the optional slugs) | `PublicInvitationData`  | `src/components/public-invitation/types.ts:48`                          |
| Page frame rendered in the pane             | `ElegantFrame`          | `src/components/public-invitation/templates/elegant/frame.tsx:9`        |
| Real public page, for comparison            | `PublicInvitationPage`  | `src/components/public-invitation/public-invitation-page.tsx:17`        |

### The preview payload

`previewData` is assembled once per change to the event or the media list
(`template-settings.tsx:175`). Each field is classified below.

| Field                              | Source in the preview                                                               | Source on the live page                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `event.name`                       | The event's real name, falling back to "Ava & Liam"                                 | Real                                                                                                         |
| `event.brideName` / `groomName`    | Real, falling back to "Ava" / "Liam"                                                | Real                                                                                                         |
| `event.date`                       | Real, falling back to now + 120 days                                                | Real                                                                                                         |
| `event.venueName` / `venueAddress` | Real, falling back to "The Grand Hall" / "123 Rosewood Avenue, Springfield"         | Real                                                                                                         |
| `event.venueMapUrl`                | Real, falling back to a sample Maps link                                            | Real                                                                                                         |
| `invitation`                       | **Always** the sample "The Carter Family" / `the-carter-family`                     | The real invitation                                                                                          |
| `guests`                           | **Always** the three sample Carter guests, all `pending`; the first `allowsPlusOne` | The invitation's real guests, incl. materialized +1s                                                         |
| `specialEvents`                    | **Always** the single sample "Welcome Dinner" with empty `guestStatuses`            | Only the special invitations this invitation has access to, with real per-guest statuses                     |
| `mediaUrls`                        | **All** of the event's media, id → URL (`template-settings.tsx:165`)                | Only the ids referenced by the resolved layout, re-validated against the event (`convex/invitations.ts:194`) |
| `eventSlug` / `invitationSlug`     | **Absent**                                                                          | Injected by `PublicInvitationPage` (`public-invitation-page.tsx:51`)                                         |
| `rsvpState` (prop)                 | The active tab                                                                      | The server-derived RSVP State (`convex/invitations.ts:138`)                                                  |

The fallback rule is per field and uses `||` for strings and `??` for the date, so an empty
string falls back but an explicit date of `0` would not (`template-settings.tsx:180`).

### Why interactive controls are disabled

Every public write from a block requires the invitation's address — the pair
(`eventSlug`, `invitationSlug`) — because the public mutations resolve their target by slug,
not by document id. `DUMMY_INVITATION_DATA` deliberately sets neither
(`dummy-data.ts:4`; the type documents the omission at
`src/components/public-invitation/types.ts:56`). Each interactive block therefore computes a
`canSubmit` that is false in the preview, and guards its handler with an early return:

| Block               | Gate                                                                                       | Handler guard                                           | Path                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `rsvp`              | `Boolean(data.eventSlug && data.invitationSlug) && allNamedAnswered`                       | `if (!data.eventSlug \|\| !data.invitationSlug) return` | `elegant/blocks/rsvp.tsx:96`, `:99`                                                            |
| `allergies`         | `Boolean(data.eventSlug && data.invitationSlug)`                                           | same shape                                              | `elegant/blocks/allergies.tsx:160`, `:163`                                                     |
| `guestMessage`      | `Boolean(data.eventSlug && data.invitationSlug)`                                           | same shape                                              | `elegant/blocks/guest-message.tsx:37`, `:40`                                                   |
| `specialInvitation` | `isPreview = !(data.eventSlug && data.invitationSlug)`; `canConfirm` requires `!isPreview` | Modal submit re-checks both slugs                       | `elegant/blocks/special-invitation.tsx:40`, `:49`, `special-invitation-dialog.tsx:119`, `:122` |

This is a **two-layer** guarantee: the control is disabled _and_ the handler refuses. Neither
layer depends on the preview knowing it is a preview — the absence of an address is what makes
a write impossible, which is why a design tool cannot accidentally RSVP for a real guest.

The `specialInvitation` block additionally uses `isPreview` for a positive purpose: on the live
page an unbound block renders nothing, but in the preview it renders the sample sub-event with
its button disabled, so the host can still see and style the card
(`elegant/blocks/special-invitation.tsx:45`).

### Fields & validation

| Field        | Type | Required | Rule                                           | Message |
| ------------ | ---- | -------- | ---------------------------------------------- | ------- |
| Preview pane | —    | —        | Read-only surface; accepts no input of its own | None    |

### Copy deck

| Key                          | Copy                                                                                   | Source                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Pane heading                 | "Live preview"                                                                         | `src/components/template-selection/template-settings.tsx:373`        |
| Save button (idle / pending) | "Save layout" / "Saving…"                                                              | `src/components/template-selection/template-settings.tsx:391`        |
| Sample couple                | "Ava & Liam"                                                                           | `src/components/public-invitation/templates/dummy-data.ts:6`         |
| Sample invitation title      | "The Carter Family"                                                                    | `src/components/public-invitation/templates/dummy-data.ts:17`        |
| Sample venue                 | "The Grand Hall" / "123 Rosewood Avenue, Springfield"                                  | `src/components/public-invitation/templates/dummy-data.ts:11`        |
| Sample sub-event             | "Welcome Dinner" / "The Garden Room"                                                   | `src/components/public-invitation/templates/dummy-data.ts:50`, `:54` |
| Sample sub-event description | "Join us the evening before for an intimate welcome dinner as the celebration begins." | `src/components/public-invitation/templates/dummy-data.ts:52`        |

All guest-facing Spanish copy visible in the pane comes from the block configs and their
template defaults — quoted in [F05 §7.2](./F05-block-catalog.md).

## 8. Data Model

| Table    | Fields                                                                                             | Read / Write                                               | Index        |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------ |
| `events` | `name`, `brideName`, `groomName`, `date`, `venueName`, `venueAddress`, `venueMapUrl`, `templateId` | Read — via `useEvent()`, already loaded by `EventProvider` | `by_slug`    |
| `media`  | `_id`, `url` (resolved)                                                                            | Read — `api.media.listByEvent`                             | `by_eventId` |

The preview **writes nothing**. It issues no query of its own: it reuses the `media` query the
config fields already need (`template-settings.tsx:47`) and the event document the route layout
already resolved. The sample invitation, guests and special event are a compile-time constant
and never touch the database (`dummy-data.ts:4`).

## 9. Backend Contract

| Function                    | Type  | Args        | Returns                     | Guard                | Caps                                                       |
| --------------------------- | ----- | ----------- | --------------------------- | -------------------- | ---------------------------------------------------------- |
| `api.media.listByEvent`     | query | `{eventId}` | media rows + resolved `url` | `requireEventEditor` | Shared with the config fields; supplies `previewMediaUrls` |
| `api.events.getEventBySlug` | query | `{slug}`    | `{...event, myRole}`        | `requireEventAccess` | Read through `useEvent()`; supplies the real event details |

No function exists that renders or serves a preview — it is entirely client-side. The public
queries (`invitations.getPublicInvitation`, `getPublicInvitationByHost`) are **not** called by
the preview.

## 10. Business Rules

- **BR-08-F06-01** `[AS-BUILT]` — The preview renders through `InvitationTemplate`, the same
  component the public page uses, with the same `templateId` / `blocks` / `rsvpState` contract
  (`template-settings.tsx:377`, `public-invitation-page.tsx:45`).
- **BR-08-F06-02** `[AS-BUILT]` — The preview renders the **unsaved** in-memory block list of
  the active variant, so edits appear before and independently of saving
  (`template-settings.tsx:109`, `:380`).
- **BR-08-F06-03** `[AS-BUILT]` — The preview's `rsvpState` is the active variant tab, not any
  guest-derived state (`template-settings.tsx:381`).
- **BR-08-F06-04** `[AS-BUILT]` — Event profile fields are taken from the real event when
  non-empty, and from the dummy sample otherwise, field by field
  (`template-settings.tsx:180`).
- **BR-08-F06-05** `[AS-BUILT]` — The invitation, its guests and its special event are always
  the dummy sample; no real invitation is ever previewed (`template-settings.tsx:177`,
  `dummy-data.ts:15`).
- **BR-08-F06-06** `[AS-BUILT]` — The sample guests are three, all `pending`, with only the
  first allowed a +1 and none being a +1 record (`dummy-data.ts:20`).
- **BR-08-F06-07** `[AS-BUILT]` — `mediaUrls` in the preview is built from **every** media item
  in the event's library, keyed by media id (`template-settings.tsx:165`).
- **BR-08-F06-08** `[AS-BUILT]` — A media item with no resolved `url` is omitted from the
  preview's map, so its block renders the placeholder (`template-settings.tsx:168`).
- **BR-08-F06-09** `[AS-BUILT]` — The preview payload carries no `eventSlug` and no
  `invitationSlug` (`dummy-data.ts:4`, `types.ts:56`).
- **BR-08-F06-10** `[AS-BUILT]` — Every block that performs a public write disables its submit
  control when either slug is absent (`rsvp.tsx:96`, `allergies.tsx:160`,
  `guest-message.tsx:37`, `special-invitation.tsx:49`).
- **BR-08-F06-11** `[AS-BUILT]` — Every such block's submit handler additionally returns early
  when either slug is absent, so no mutation can fire even if the control were enabled
  (`rsvp.tsx:99`, `allergies.tsx:163`, `guest-message.tsx:40`,
  `special-invitation-dialog.tsx:122`).
- **BR-08-F06-12** `[AS-BUILT]` — An unbound `specialInvitation` block renders the sample card
  with a disabled button in the preview, where on the live page it renders nothing
  (`special-invitation.tsx:45`).
- **BR-08-F06-13** `[AS-BUILT]` — The preview pane scrolls independently of the block list, and
  neither scrolls the page (`template-settings.tsx:283`, `:376`).
- **BR-08-F06-14** `[AS-BUILT]` — The preview issues no queries of its own and writes nothing
  to the database.

## 11. Acceptance Criteria

- **AC-08-F06-01** — **Given** the Design Studio **When** the Editor types into a block's
  headline field **Then** the preview shows the new headline without a save or a reload.
- **AC-08-F06-02** — **Given** the Design Studio **When** the Editor moves a block up **Then**
  the preview reorders immediately.
- **AC-08-F06-03** — **Given** the Pending tab is active **When** the Editor switches to
  Declined **Then** the preview renders the declined variant's block list.
- **AC-08-F06-04** — **Given** an event with a bride name, groom name, date and venue set
  **When** the preview renders **Then** those real values appear, not "Ava", "Liam" or "The
  Grand Hall".
- **AC-08-F06-05** — **Given** an event with none of those fields set **When** the preview
  renders **Then** the dummy sample values appear rather than blanks.
- **AC-08-F06-06** — **Given** a hero block with a chosen image **When** the preview renders
  **Then** that image from the event's Media Library appears in the hero.
- **AC-08-F06-07** — **Given** any variant **When** the preview renders an `rsvp` block **Then**
  the guest names shown are "Emma Carter", "Noah Carter" and "Olivia Carter" — the sample
  guests, never real ones.
- **AC-08-F06-08** — **Given** an `rsvp` block in the preview **When** the Editor answers every
  sample guest **Then** the submit button remains disabled.
- **AC-08-F06-09** — **Given** a `guestMessage` block in the preview **When** the Editor fills
  in the name and message **Then** the submit button remains disabled and no `guestMessages`
  row is written.
- **AC-08-F06-10** — **Given** a `specialInvitation` block in the preview **When** the preview
  renders **Then** the sample "Welcome Dinner" card appears with its confirm button disabled,
  even when the event has no special invitations at all.
- **AC-08-F06-11** — **Given** the Editor never presses Save **When** they leave the page and
  return **Then** the preview reflects the last saved layout, not the discarded edits.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                                                               |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC-08-F06-01 | unit        | `DUMMY_INVITATION_DATA` defines neither `eventSlug` nor `invitationSlug` — a regression guard for the disabled-controls guarantee                      |
| TC-08-F06-02 | unit        | The preview payload builder prefers real event fields and falls back per field when they are empty                                                     |
| TC-08-F06-03 | unit        | `previewMediaUrls` maps every media item that has a `url` and omits those that do not                                                                  |
| TC-08-F06-04 | integration | Each interactive block renders its submit control disabled when the data payload has no slugs                                                          |
| TC-08-F06-05 | integration | Each interactive block's submit handler fires no mutation when invoked directly without slugs                                                          |
| TC-08-F06-06 | integration | Switching variant tabs swaps both the block list and the preview's `rsvpState` in one render                                                           |
| TC-08-F06-07 | integration | Editing a config value re-renders the preview without any network request                                                                              |
| TC-08-F06-08 | e2e         | Design a pending layout, save, open the public invitation for an unanswered invitation, and confirm the two render the same sections in the same order |
| TC-08-F06-09 | e2e         | Fill in and submit every control in the preview and confirm no guest record and no guest message changed                                               |

### Manual QA checklist

- [ ] Confirm the sample guest names appear in `rsvp` and `allergies` blocks, never real guests
- [ ] Confirm every submit button in the pane is visibly disabled
- [ ] Confirm the real couple names, date and venue appear once they are set in Settings
- [ ] Confirm a newly uploaded image is selectable and appears in the pane
- [ ] Compare the accepted preview against a real accepted invitation, section by section
- [ ] Compare the declined preview against a real all-declined invitation
- [ ] Resize below the `lg` breakpoint and confirm the pane stacks under the block list

## 13. Non-Functional

| Concern          | Specification                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | None. The pane renders whatever the layout contains, at any length                                                                                                                                                                                                                                                                                  |
| Performance      | Re-renders the whole layout on each keystroke; `previewData` and `previewMediaUrls` are memoized on the event and media list (`template-settings.tsx:165`, `:175`). Each `countdown` instance runs its own interval (`elegant/blocks/primitives.tsx:313`)                                                                                           |
| Security & authz | The pane cannot write. The two-layer guard (disabled control + handler early-return) means no public mutation is reachable from it. Media URLs shown are the event's own, already authorized by `api.media.listByEvent`                                                                                                                             |
| Accessibility    | The pane is a plain scroll container with an `h2` "Live preview" (`template-settings.tsx:373`); the rendered blocks carry the same semantics as the public page. Disabled buttons use `pointer-events-none` with reduced opacity rather than the `disabled` attribute on the anchor variant of `WeddingButton` (`elegant/blocks/primitives.tsx:37`) |
| i18n             | The pane heading is English; the rendered invitation is in whatever language the block configs hold                                                                                                                                                                                                                                                 |
| Analytics        | None                                                                                                                                                                                                                                                                                                                                                |

## 14. TODOs & Open Questions

- **TODO-08-08** `[P2]` `[ADD]` — The preview always uses the same dummy invitation; a real
  invitation cannot be previewed, so a host cannot check how the page reads for a specific
  household.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:177` spreads
    `DUMMY_INVITATION_DATA` and overrides only `event` and `mediaUrls`;
    `src/components/public-invitation/templates/dummy-data.ts:15` is the only invitation the
    editor ever renders.
  - **Rationale:** Guest count drives the shape of the `rsvp` and `allergies` blocks — one
    guest looks very different from six — and the `specialInvitation` block's binding depends
    on which special invitations that invitation may see. A host designing for a real guest
    list is designing blind.
  - **Proposed rule:** Offer an invitation picker above the pane that swaps in a real
    invitation's guests and accessible special invitations, still without slugs so submission
    stays disabled.
- **TODO-08-12** `[P2]` `[ADD]` — The preview cannot be viewed at a non-phone width and has no
  device toggle.
  - **Evidence:** `src/components/public-invitation/templates/elegant/frame.tsx:12` renders a
    `max-w-140` card, and the pane is whatever the `lg:grid-cols-[24rem_1fr]` column gives it
    (`src/components/template-selection/template-settings.tsx:203`); no width control exists in
    `template-settings.tsx`.
  - **Rationale:** Guests open invitations on phones and desktops alike; the host has no way to
    check the wide rendering short of saving and opening the public URL.
  - **Proposed rule:** Add a mobile/desktop toggle that constrains the pane's width.
- **TODO-08-29** `[P1]` `[ADD]` — The preview gives no signal that what it shows is unsaved, so
  the pane looks identical whether or not the layout has been published to live invitations.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:371` renders only
    the heading "Live preview" and a Save button; there is no dirty state anywhere in the
    component. Compare DEF-08-02 in [F03](./F03-block-composition.md), which records that
    navigating away discards edits with no warning.
  - **Rationale:** The preview's fidelity is its own trap — a host who sees their finished
    design in the pane has every reason to believe it is live. It is not.
  - **Proposed rule:** Mark the pane "Unsaved changes" whenever the in-memory variants differ
    from what was loaded, and clear the mark on a successful save.
- **TODO-08-30** `[P1]` `[ADD]` — The preview's sample guests are always three `pending`
  guests, whatever variant is being designed, so the accepted and declined tabs render guest
  state that contradicts the variant they represent.
  - **Evidence:** `src/components/public-invitation/templates/dummy-data.ts:20` — all three
    sample guests are `rsvpStatus: "pending"`; the variant is passed only as
    `rsvpState={activeVariant}` (`template-settings.tsx:381`) and never reflected in
    `previewData.guests`. On the live page the two always agree, because the state is derived
    from the guests (`convex/invitations.ts:138`).
  - **Impact:** On the Declined tab, an `allergies` or `specialInvitation` block filters on
    `rsvpStatus !== "declined"` (`elegant/blocks/special-invitation.tsx:48`) and so shows all
    three guests as eligible — a combination that cannot occur on a real declined invitation.
    The Accepted tab likewise shows unanswered guests on a page only reachable once someone has
    answered.
  - **Proposed rule:** Derive the sample guests' `rsvpStatus` from the active variant, so the
    preview shows a guest set that could actually produce that variant.
- **TODO-08-31** `[P2]` `[CHANGE]` — The preview always renders a sample special invitation,
  even for an event that has none and for a layout with no `specialInvitation` block bound, so
  it overstates what a guest will see.
  - **Evidence:** `src/components/public-invitation/templates/dummy-data.ts:47` always supplies
    one; `src/components/public-invitation/templates/elegant/blocks/special-invitation.tsx:45`
    returns `null` on the live page when nothing is bound, but the `isPreview` branch keeps the
    card. The preview's `specialEvents` are never sourced from
    `api.specialEvents.listByEvent`, though the editor already loads that query for the config
    select (`template-settings.tsx:48`).
  - **Rationale:** A host who has not created a special invitation, or has not granted access
    to it, still sees a polished sub-event card in the pane and reasonably expects guests to
    see one.
  - **Proposed rule:** Feed the preview the event's real special invitations, and show an
    explicit "not shown to guests without access" marker instead of a silent substitution.
- **TODO-08-32** `[P2]` `[CHANGE]` — The preview resolves **all** of the event's media, whereas
  the public page resolves only ids referenced by the chosen layout and re-validates each
  against the event.
  - **Evidence:** `src/components/template-selection/template-settings.tsx:165` versus
    `convex/invitations.ts:194`–`:205`.
  - **Rationale:** The two paths cannot currently diverge in a user-visible way, since only
    referenced ids are ever looked up by a block. It is a latent inconsistency worth closing
    before a second consumer of `mediaUrls` appears.
  - **Proposed rule:** Build the preview map from the ids present in the active layout's config,
    matching the public resolution.

### Open questions

- **Q1** — Should the preview surface a "view as a real guest would" mode that opens the public
  URL for a chosen invitation in a new tab, given that a fully faithful in-editor preview would
  require live slugs and therefore live submission?
- **Q2** — Should the preview be rendered from the _saved_ layout alongside the working one, so
  a host can see before-and-after when redesigning a published invitation?
- **Q3** — Should the sample invitation be configurable per event (guest count, names) rather
  than a global constant, as a cheaper alternative to TODO-08-08?

## 15. Traceability

| Concern                                    | Source                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Route                                      | `src/app/(dashboard)/dashboard/[eventSlug]/template/page.tsx:1`                                               |
| Preview pane markup                        | `src/components/template-selection/template-settings.tsx:371`                                                 |
| Preview render call                        | `src/components/template-selection/template-settings.tsx:377`                                                 |
| Preview payload assembly                   | `src/components/template-selection/template-settings.tsx:175`                                                 |
| Media id → URL map                         | `src/components/template-selection/template-settings.tsx:165`                                                 |
| Active variant drives `rsvpState`          | `src/components/template-selection/template-settings.tsx:381`                                                 |
| Variant tabs                               | `src/components/template-selection/template-settings.tsx:234`                                                 |
| Sample data                                | `src/components/public-invitation/templates/dummy-data.ts:4`                                                  |
| Sample guests                              | `src/components/public-invitation/templates/dummy-data.ts:20`                                                 |
| Sample special event                       | `src/components/public-invitation/templates/dummy-data.ts:47`                                                 |
| Payload type — optional slugs              | `src/components/public-invitation/types.ts:56`                                                                |
| Shared renderer                            | `src/components/public-invitation/templates/invitation-template.tsx:23`                                       |
| Layout fallback in the renderer            | `src/components/public-invitation/templates/invitation-template.tsx:33`                                       |
| Live page (slug injection)                 | `src/components/public-invitation/public-invitation-page.tsx:49`                                              |
| Page frame                                 | `src/components/public-invitation/templates/elegant/frame.tsx:9`                                              |
| Disabled submit — `rsvp`                   | `src/components/public-invitation/templates/elegant/blocks/rsvp.tsx:96`, `:99`, `:203`                        |
| Disabled submit — `allergies`              | `src/components/public-invitation/templates/elegant/blocks/allergies.tsx:160`, `:163`, `:213`                 |
| Disabled submit — `guestMessage`           | `src/components/public-invitation/templates/elegant/blocks/guest-message.tsx:37`, `:40`, `:90`                |
| Disabled submit — `specialInvitation`      | `src/components/public-invitation/templates/elegant/blocks/special-invitation.tsx:40`, `:49`, `:128`          |
| Disabled submit — special-invitation modal | `src/components/public-invitation/templates/elegant/blocks/special-invitation-dialog.tsx:119`, `:122`, `:220` |
| Disabled button styling                    | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:37`                                 |
| Image placeholder fallback                 | `src/components/public-invitation/templates/elegant/blocks/primitives.tsx:176`                                |
| Server-derived RSVP state (live page)      | `convex/invitations.ts:138`                                                                                   |
| Public media resolution (live page)        | `convex/invitations.ts:194`                                                                                   |
| Validation                                 | None — the preview accepts no input                                                                           |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
