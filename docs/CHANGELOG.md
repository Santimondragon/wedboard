# Spec Suite Changelog

Suite-level history. Per-file history lives in each spec's §16.

Versioning of the suite as a whole is independent of individual spec versions: a suite
release records that the tree changed shape (epics, foundation docs, conventions), not that
one rule was clarified.

---

## 1.0.0 — 2026-07-28

Initial as-built specification of Wedboard.

### Added

- **Foundation** — `README.md` (index, how to read a spec, status legend, epic map),
  `glossary.md` (domain language), `roles-and-permissions.md` (authoritative capability ×
  role matrix), `workflow-catalog.md`, `backlog.md`, and this changelog.
- **Conventions** — `_conventions/spec-template.md` (the 16-section skeleton every feature
  spec follows) and `_conventions/authoring-guide.md` (ID scheme, semver rules, status
  values, priorities, writing rules).
- **16 epics / 64 feature specs**, covering every end-user workflow across five actors:

  | Epic                              | Specs | Epic                           | Specs |
  | --------------------------------- | ----: | ------------------------------ | ----: |
  | EP-01 Account & Access            |     4 | EP-09 Media Library            |     3 |
  | EP-02 Event Setup                 |     7 | EP-10 Sharing & SEO            |     2 |
  | EP-02a ↳ Custom Domain            |     4 | EP-11 Catering                 |     3 |
  | EP-03 Collaboration & Permissions |     5 | EP-12 Seating                  |     2 |
  | EP-04 Guest Management            |     6 | EP-13 Host Inbox               |     1 |
  | EP-05 Invitations                 |     5 | EP-14 Insights                 |     1 |
  | EP-06 Special Invitations         |     3 | EP-15 Platform Administration  |     2 |
  | EP-07 Guest Experience            |     8 | EP-16 Marketing & Monetization |     2 |
  | EP-08 Invitation Design Studio    |     6 |                                |       |

- **86 workflows** catalogued and mapped to their owning spec.
- **298 backlog entries** (37 defects, 261 gaps), of which 4 are P0 and 79 are P1.

### Baseline

Every business rule in this release is tagged `[AS-BUILT]` and traced to `path:line` in the
implementation as of commit `6263ec3`. Where `AGENTS.md` and the code disagreed, the code
was taken as authoritative and the discrepancy filed as a defect or TODO.

`EP-16-F02 Pricing & Billing` is the sole `proposed` spec (`0.1.0`) — it describes intended
behavior for a capability that does not exist yet.

### Notable corrections to prior documentation

- `events.archiveEvent` (owner-only) has **no callers**; the Settings Danger Zone archives
  via `updateEvent`, which is planner-gated. `roles-and-permissions.md` records the real
  behavior, and the discrepancy is filed against EP-02-F05.
- The overview dashboard renders **7** metric cards, not the 8 `AGENTS.md` describes;
  `allergyCount` is computed and returned but never displayed.
- The event delete cascade lives in `convex/lib/events.ts` (`cascadeDeleteEvent`), not
  inline in `deleteEvent`.

---

## Maintaining this suite

Per the _Documentation Rule_ in [`AGENTS.md`](../AGENTS.md), a change to product behavior
must bump the affected spec's `version`, add a row to its §16, and update
[backlog.md](./backlog.md) if it opens or closes a gap — in the same change as the code.
