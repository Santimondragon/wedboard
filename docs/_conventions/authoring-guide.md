# Authoring Guide

How to write and maintain a Wedboard product specification. Read this together with
[spec-template.md](./spec-template.md) before writing any spec.

---

## 1. What a spec is

A spec describes **product behavior**: the workflow a user performs, the rules that govern
it, and how we know it works. It is not an architecture document — `AGENTS.md` already
covers schema, module inventory and component map, and specs should link to that rather
than duplicating it.

The test for a sentence belonging in a spec: _would a QA engineer or a new product hire need
it to decide whether the app is behaving correctly?_ If not, cut it.

### The as-built rule

**A spec documents what the code does today, not what it should do.** Every business rule
must be traceable to a line of source. If you believe behavior _should_ differ, that belief
belongs in §14 as a `TODO-` or `DEF-` — never silently in §10 as if it were implemented.

Never write a rule you have not read in the source. Never cite a Convex function name you
have not seen in `convex/`. When source and `AGENTS.md` disagree, **source wins** and the
discrepancy becomes a TODO.

---

## 2. ID scheme

| Prefix         | Shape         | Meaning                                         |
| -------------- | ------------- | ----------------------------------------------- |
| `EP-NN`        | `EP-07`       | Epic                                            |
| `EP-NN-FNN`    | `EP-07-F02`   | Feature spec                                    |
| `WF-NN-NN`     | `WF-07-02`    | End-user workflow                               |
| `US-NN-FNN-NN` | `US-07-02-01` | User story                                      |
| `BR-NN-FNN-NN` | `BR-07-02-01` | Business rule                                   |
| `AC-NN-FNN-NN` | `AC-07-02-01` | Acceptance criterion                            |
| `TC-NN-FNN-NN` | `TC-07-02-01` | Test case                                       |
| `TODO-NN-NN`   | `TODO-07-04`  | Gap / proposed change (epic-scoped, sequential) |
| `DEF-NN-NN`    | `DEF-07-01`   | Defect (epic-scoped, sequential)                |

`NN` is always zero-padded to two digits. **Each epic owns its `NN` range exclusively**, so
IDs can never collide between specs written in parallel. `TODO-`/`DEF-` numbering is
sequential _across the whole epic_ (not per feature), so `TODO-07-01` and `TODO-07-02` may
live in different feature files.

An ID, once published, is permanent. To retire a rule, mark it `[REMOVED in vX.Y.Z]` rather
than reusing or renumbering the ID.

---

## 3. Status values

| Status        | Meaning                                                 |
| ------------- | ------------------------------------------------------- |
| `implemented` | Built and behaving as specified                         |
| `partial`     | Built, but a documented part of the workflow is missing |
| `defective`   | Built, but a `DEF-` in §14 makes it behave incorrectly  |
| `proposed`    | Not built; the spec describes intended behavior         |
| `deprecated`  | Superseded; kept for history                            |

A spec carrying a `P0` defect is `defective`, not `implemented`.

---

## 4. Versioning

Semver, per file, in the frontmatter `version:`.

| Bump    | When                                                                                         |
| ------- | -------------------------------------------------------------------------------------------- |
| `MAJOR` | A business rule or backend contract **changes meaning** — existing behavior is now different |
| `MINOR` | New AC, rule, TODO, test case or section content added; nothing existing changed meaning     |
| `PATCH` | Clarification, typo, traceability line-number refresh, formatting                            |

As-built specs start at `1.0.0`. Not-yet-built features start at `0.1.0` with
`status: proposed`.

Every version bump adds a row to §16 and updates `last_updated`.

---

## 5. Priorities

| Priority | Bar                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------- |
| `P0`     | Data loss, silent data corruption, security/authz hole, or a core workflow that cannot complete |
| `P1`     | Workflow completes but is materially wrong, confusing, or missing an expected capability        |
| `P2`     | Polish, nice-to-have, or a future-facing enhancement                                            |

TODO change kinds: `[ADD]` (new capability), `[CHANGE]` (alter existing behavior),
`[REMOVE]` (delete behavior or dead code).

---

## 6. Writing rules

1. **Second-person-free.** Write about actors ("the owner", "a public guest"), not "you".
2. **Present tense, active voice.** "The server rejects the request", not "the request will
   be rejected".
3. **One rule per rule.** If a `BR-` contains "and", consider splitting it.
4. **Quote guest-facing copy verbatim**, in Spanish, with its source path. Do not translate
   it in the copy deck — translation belongs in surrounding prose if needed.
5. **Path-reference everything.** Components, routes, Convex functions and validators are
   cited as `path/to/file.ts:123`. Traceability line numbers must be verified, not guessed.
6. **Link, don't restate.** Role semantics live in `roles-and-permissions.md`; domain terms
   live in `glossary.md`; schema detail lives in `AGENTS.md`. Cross-link with relative
   markdown links.
7. **Cross-epic references use IDs** (`EP-05-F02`), plus a relative link where useful.
8. **Tables over prose** for anything enumerable.
9. **No hedging.** "May", "should probably", "presumably" mean you have not read the source
   yet.

---

## 7. Changelog format

Suite-level changes go in [CHANGELOG.md](../CHANGELOG.md). Per-file changes go in the
spec's own §16:

| Version | Date       | Author        | Change                                              |
| ------- | ---------- | ------------- | --------------------------------------------------- |
| 1.1.0   | 2026-08-02 | @santi        | Added BR-07-02-07 (+1 name required when attending) |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification                      |

Newest first. One row per version — never amend a published row.

---

## 8. Keeping specs alive

The project's _Documentation Rule_ (see `AGENTS.md`) extends to this suite: **a change to
product behavior must bump the affected spec's version and add a changelog row in the same
change** that touches the code. A PR that changes a business rule without touching its spec
is incomplete.

New defects and gaps found in the course of other work are added both to the owning spec's
§14 **and** to [backlog.md](../backlog.md) — the two must stay in parity.
