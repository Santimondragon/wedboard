# Spec Suite Changelog

Suite-level history. Per-file history lives in each spec's §16.

Versioning of the suite as a whole is independent of individual spec versions: a suite
release records that the tree changed shape (epics, foundation docs, conventions), not that
one rule was clarified.

---

## 1.1.0 — 2026-08-09

Dashboard redesign. The logged-in planner surface, `/admin` and the marketing pages were
rebuilt on a warm semantic token system with shared primitives. The public guest invitation
is unchanged — verified twice by computed-style fingerprint diff.

### Changed

- **EP-12-F02 Seat Assignment → 2.0.0.** `DEF-12-01` (P0, seat off-by-one) **fixed**:
  BR-12-F02-05 changed meaning — the UI now generates and stores 0-based seat indices and
  labels them 1-based, so every seat of every table is fillable. Added BR-12-F02-20 (display
  labels) and BR-12-F02-21 (no backfill was run).
- **EP-14-F01 Overview Dashboard → 2.0.0.** BR-14-F01-15 and -19 changed meaning: the
  skeleton count matches the card count, and every metric card is a link. `MetricCard` was
  deleted in favour of the shared `StatCard`.
- **EP-04-F02, EP-13-F01, EP-15-F01, EP-03-F05** and eight other specs → `1.1.0`, recording
  the shared-primitive adoption (`DataTableShell`, `ListRow`, `StateBlock`, `Panel`,
  `PageHeader`) and the cap-disclosure footers.
- **EP-04-F06 and EP-05-F02** moved from `defective` to `partial` — their only `DEF-` closed.

### Fixed (24 backlog entries closed)

`DEF-12-01`, `DEF-04-01`, `DEF-05-02`, `TODO-12-01`, `TODO-14-01`, `TODO-14-02`,
`TODO-14-04`, `TODO-14-09`, `TODO-14-10`, `TODO-04-11`, `TODO-04-15`, `TODO-02-03`,
`TODO-02-06`, `TODO-03-01`, `TODO-03-13`, `TODO-08-18`, `TODO-09-10`, `TODO-11-09`,
`TODO-11-11`, `TODO-13-06`, `TODO-13-07`, `TODO-13-12`, `TODO-15-01`, `TODO-15-06`.

The **swallowed error messages** cross-cutting theme is resolved at the root:
`useToastMutation` now unwraps `ConvexError` payloads across ~35 call sites.

### Added (4 new backlog entries)

- `DEF-12-03` (P1) — legacy 1-based seat rows display one position lower; no backfill was run.
- `DEF-04-04` (P2) — the guest directory's Seat column reads one lower than the Tables page.
- `TODO-07-31` (P2) — the invitation's desktop gutter tint shifts 2–6/255 because the
  translucent backdrop composites against `<body>`, outside the `.invitation-theme` scope.
- `TODO-08-33` (P2) — nothing enforces the `.invitation-theme` contract on a new template.

### Narrowed, not closed

`TODO-01-11` (styled error panel now exists; routing-layer authz and the soft disclosure do
not), `TODO-03-05` (cap disclosed; no pagination or retention), `TODO-07-15` (messages reach
the guest; still English on a Spanish page), `TODO-03-07` (Members is the one capped list
with no disclosure footer), `TODO-13-05` (footer added; truncate-before-sort unchanged).

### Totals

298 → **278** findings (36 defects, 242 gaps); P0 4 → **3**, P1 79 → **73**, P2 215 → **202**.

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
