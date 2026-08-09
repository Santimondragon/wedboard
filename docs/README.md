# Wedboard — Product Specification Suite

The source of truth for **what Wedboard does**: the workflows a user performs, the rules
that govern them, and the criteria by which we judge them correct.

This is the product counterpart to [`AGENTS.md`](../AGENTS.md), which remains the source of
truth for the **system**: schema, Convex module inventory, route list and component map.
When the two overlap, `AGENTS.md` describes the machinery and these specs describe the
behavior. When either disagrees with the code, **the code wins** and the discrepancy is
filed as a defect.

---

## How to read a spec

Every feature spec follows the same 16-section skeleton
([`_conventions/spec-template.md`](./_conventions/spec-template.md)). The sections you most
likely want:

| If you are…                                | Read                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Understanding a feature for the first time | §1 Summary, §3 User Stories, §5 UX Flow                                  |
| Implementing or changing it                | §8 Data Model, §9 Backend Contract, §10 Business Rules, §15 Traceability |
| Testing it                                 | §11 Acceptance Criteria, §12 Testing Criteria, §6 States                 |
| Planning work                              | §14 TODOs & Open Questions, plus [backlog.md](./backlog.md)              |
| Writing copy or design                     | §7 UI Specification (includes the verbatim Spanish copy deck)            |

Business rules are tagged `[AS-BUILT]` — meaning they are enforced in code today and cited
in §15. Anything not yet true of the code appears in §14 as a numbered `TODO-` or `DEF-`,
never as a rule.

---

## Status legend

| Status        | Meaning                                                 |
| ------------- | ------------------------------------------------------- |
| `implemented` | Built and behaving as specified                         |
| `partial`     | Built, but a documented part of the workflow is missing |
| `defective`   | Built, but a `DEF-` in §14 makes it behave incorrectly  |
| `proposed`    | Not built; the spec describes intended behavior         |
| `deprecated`  | Superseded; kept for history                            |

Priorities: **P0** data loss, corruption, authz hole, or a blocked core workflow · **P1**
materially wrong or missing capability · **P2** polish and future enhancements.

---

## Foundation documents

| Document                                                              | Purpose                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [glossary.md](./glossary.md)                                          | Domain language — Event, Invitation, +1, RSVP Variant, Block, Event Key…         |
| [roles-and-permissions.md](./roles-and-permissions.md)                | Authoritative capability × role matrix; specs link here rather than restating it |
| [workflow-catalog.md](./workflow-catalog.md)                          | Every end-user workflow → epic, feature, route, actor, status                    |
| [backlog.md](./backlog.md)                                            | All defects and TODOs across the suite, issue-ready, by priority                 |
| [CHANGELOG.md](./CHANGELOG.md)                                        | Suite-level history                                                              |
| [\_conventions/spec-template.md](./_conventions/spec-template.md)     | The canonical skeleton every feature spec follows                                |
| [\_conventions/authoring-guide.md](./_conventions/authoring-guide.md) | ID scheme, semver rules, changelog format, writing rules                         |

---

## Epic map

| ID     | Epic                                                                     | Primary actor    | Specs |
| ------ | ------------------------------------------------------------------------ | ---------------- | ----- |
| EP-01  | [Account & Access](./epics/01-account-and-access/)                       | Anonymous → User | 4     |
| EP-02  | [Event Setup](./epics/02-event-setup/)                                   | Owner / Co-owner | 7     |
| EP-02a | ↳ [Custom Domain](./epics/02-event-setup/custom-domain/)                 | Co-owner+        | 4     |
| EP-03  | [Collaboration & Permissions](./epics/03-collaboration-and-permissions/) | Owner / Co-owner | 5     |
| EP-04  | [Guest Management](./epics/04-guest-management/)                         | Editor+          | 6     |
| EP-05  | [Invitations](./epics/05-invitations/)                                   | Editor+          | 5     |
| EP-06  | [Special Invitations](./epics/06-special-invitations/)                   | Editor+          | 3     |
| EP-07  | [Guest Experience](./epics/07-guest-experience/)                         | Public guest     | 8     |
| EP-08  | [Invitation Design Studio](./epics/08-invitation-design-studio/)         | Editor+          | 6     |
| EP-09  | [Media Library](./epics/09-media-library/)                               | Editor+          | 3     |
| EP-10  | [Sharing & SEO](./epics/10-sharing-and-seo/)                             | Editor+          | 2     |
| EP-11  | [Catering](./epics/11-catering/)                                         | Editor+          | 3     |
| EP-12  | [Seating](./epics/12-seating/)                                           | Editor+          | 2     |
| EP-13  | [Host Inbox](./epics/13-host-inbox/)                                     | Editor+          | 1     |
| EP-14  | [Insights](./epics/14-insights/)                                         | Editor+          | 1     |
| EP-15  | [Platform Administration](./epics/15-platform-administration/)           | Superadmin       | 2     |
| EP-16  | [Marketing & Monetization](./epics/16-marketing-and-monetization/)       | Anonymous        | 2     |

64 feature specs, 86 catalogued workflows, 5 actors.

**Where things stand.** The suite is an as-built baseline, so it records the product as it
is rather than as intended. Of the 86 workflows, 33 are `implemented`, 33 `defective`, 18
`partial` and 2 `proposed`. [backlog.md](./backlog.md) consolidates the 278 findings — start
with the 3 P0 entries.

**Sub-epics.** A feature cluster gets its own subfolder when it has its own lifecycle, an
external dependency, or ≥4 features. Only **Custom Domain** qualifies today — it has a DNS
state machine, a third-party API (Vercel) and its own public routing — so it nests under
Event Setup. Guest Experience and Design Studio are large but cohesive, and stay top-level.

---

## Contributing

1. Read [`_conventions/authoring-guide.md`](./_conventions/authoring-guide.md) first.
2. Never write a business rule you have not verified in source, and cite it in §15 with
   `path:line`.
3. A change to product behavior must bump the affected spec's `version`, add a §16 changelog
   row, and — if it adds or resolves a gap — update [backlog.md](./backlog.md) in the same
   change.
