# EP-10 — Sharing & SEO

A Wedboard invitation is not discovered. It is **sent** — pasted into a WhatsApp thread, an iMessage
group, a Facebook message. What the recipient sees first is not the invitation: it is the link
preview card their messaging app unfurls. This epic owns that card.

---

## 1. Purpose

The whole distribution model of the product runs through a pasted URL. A guest receiving
`https://ana-y-luis.com/invitations/familia-perez` sees, before deciding whether to tap:

- a **title** — is this for me?
- a **description** — what is this?
- an **image** — is this real, or is it spam?

A bare link with no metadata renders as a naked URL with a grey placeholder, which in a WhatsApp
thread reads as suspicious. So the social card is, functionally, the invitation's envelope.

This epic covers two features:

- **Social-card metadata (F01)** — per-event title and description **templates** containing
  [meta variables](../../glossary.md#design--publishing) that resolve _per invitation_ at request
  time, plus an OG image chosen from the [Media Library](../../glossary.md#design--publishing).
  The templates live on `events.meta`; the resolution happens in `meta.getPublicInvitationMeta` and
  is converted to Open Graph and Twitter tags by `buildInvitationMetadata`.
- **Favicon (F02)** — the browser-tab icon on the public invitation pages, uploaded through a
  favicon-specific uploader into the same media library.

The "SEO" half of the epic's name is aspirational: the product emits Open Graph, Twitter and icon
tags, but no canonical URL, no `robots` directive and no sitemap. Whether these pages should be
crawlable at all is an open product question — see TODO-10-01.

## 2. Actors

| Actor                    | Involvement                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| **Owner**                | Authors the templates, picks the image and favicon                       |
| **Co-owner** (`planner`) | Same                                                                     |
| **Editor**               | Same — meta is treated as content-adjacent, gated at `editor`            |
| **Viewer**               | Blocked (`updateEventMeta` requires `editor`; the page's queries do too) |
| **Public guest**         | Never edits; receives the resolved card when the link is unfurled        |
| **Link-preview crawler** | Anonymous, unauthenticated; fetches the page and reads its meta tags     |
| **Superadmin**           | Bypasses the guard like every other event-scoped function                |

Role semantics are defined once in [roles-and-permissions.md](../../roles-and-permissions.md).
The only gate this epic applies is `requireEventEditor(ctx, eventId, "editor")`
(`convex/meta.ts:107`); the public read path has no auth at all.

## 3. Features

| ID                                         | Feature              | Status      | Summary                                                                                                                                                      |
| ------------------------------------------ | -------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [EP-10-F01](./F01-social-card-metadata.md) | Social Card Metadata | partial     | Title/description templates with seven `{variables}`, OG image, live preview, `updateEventMeta` wholesale replace, `getPublicInvitationMeta` by slug or host |
| [EP-10-F02](./F02-favicon.md)              | Favicon              | implemented | `.ico`/`.svg`/`.png` upload with an extension fallback, validated on save, emitted as `icons.icon`                                                           |

## 4. Workflows

| ID       | Workflow                          | Spec                                 |
| -------- | --------------------------------- | ------------------------------------ |
| WF-10-01 | Author the social card copy       | [F01](./F01-social-card-metadata.md) |
| WF-10-02 | Choose the social preview image   | [F01](./F01-social-card-metadata.md) |
| WF-10-03 | Preview the card before sharing   | [F01](./F01-social-card-metadata.md) |
| WF-10-04 | Share an invitation link publicly | [F01](./F01-social-card-metadata.md) |
| WF-10-05 | Upload a browser-tab favicon      | [F02](./F02-favicon.md)              |

## 5. Dependencies

| Depends on                            | Why                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EP-02 Event Setup**                 | `event.name`, `brideName`, `groomName` feed the variable values and the defaults; the custom domain (EP-02-F08…F11) is the `host` half of the public query's resolution |
| **EP-03 Collaboration & Permissions** | `requireEventEditor(…, "editor")` guards the write; the save is activity-logged as entity `meta` (EP-03-F05)                                                            |
| **EP-04 Guest Management**            | `{guest-name}` and `{guest-names}` resolve from the invitation's non-`isPlusOne` guests                                                                                 |
| **EP-05 Invitations**                 | Metadata is resolved _per invitation_; the preview samples the event's first invitation                                                                                 |
| **EP-09 Media Library**               | The OG image and the favicon are both `Id<"media">` rows; `MediaPickerDialog` (EP-09-F03) picks the image                                                               |

| Depended on by             | Why                                                              |
| -------------------------- | ---------------------------------------------------------------- |
| **EP-07 Guest Experience** | The card is what a guest sees before opening the invitation page |

## 6. Cross-cutting notes

- **One event, many invitations.** `events.meta` is stored once per event, but resolves differently
  for every invitation URL, because the variables are bound at request time from that invitation's
  title and guests (`convex/meta.ts:60`). Hosts author once; guests each receive a card addressed to
  them.
- **Two routes, one payload.** `generateMetadata` on the primary-domain route passes `eventSlug`,
  the custom-domain route passes a decoded `host`, and both feed the same
  `buildInvitationMetadata` (`src/lib/invitation-metadata.ts:15`).
- **Server-rendered.** Metadata is produced by Next.js `generateMetadata` with `fetchQuery`, not by
  the client component that renders the invitation — which matters because link-preview crawlers do
  not execute JavaScript.
- **Failure is silent by design.** Both `generateMetadata` calls `.catch(() => null)`, and a `null`
  yields the bare title "Invitation Not Found" rather than an error page.

## 7. Epic-level defects & gaps

Full detail lives in each feature's §14; the index is here.

| ID         | Priority | Where                                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TODO-10-01 | P1       | [F01](./F01-social-card-metadata.md) — no `robots` directive anywhere; semi-private invitation URLs are fully indexable                    |
| TODO-10-02 | P1       | [F01](./F01-social-card-metadata.md) — `{guest-name}` puts a named guest into a card that any recipient of the forwarded link can see      |
| TODO-10-03 | P2       | [F01](./F01-social-card-metadata.md) — the in-app preview does not resolve guest variables, so it can differ materially from the real card |
| TODO-10-04 | P2       | [F01](./F01-social-card-metadata.md) — no OG image dimension or `og:url`/`canonical` output                                                |
| TODO-10-05 | P2       | [F01](./F01-social-card-metadata.md) — `updateEventMeta` replaces `events.meta` wholesale, so a partial call silently clears fields        |
| TODO-10-06 | P2       | [F02](./F02-favicon.md) — the favicon reaches only the invitation routes, not the custom-domain landing page                               |
| TODO-10-07 | P2       | [F01](./F01-social-card-metadata.md) — the card is unreachable for the custom-domain root and for the `/[eventSlug]` level                 |
| TODO-10-08 | P2       | [F02](./F02-favicon.md) — an image already in the library cannot be chosen as the favicon                                                  |
| TODO-10-09 | P2       | [F02](./F02-favicon.md) — no apple-touch-icon or multi-size icon set                                                                       |
