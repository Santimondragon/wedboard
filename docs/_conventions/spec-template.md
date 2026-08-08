# Feature Spec Template

Copy this skeleton verbatim for every feature spec. **Every numbered section below is
mandatory** — if a section has nothing to say, write `None.` rather than deleting the
heading. Section order never changes.

Replace `NN` with your epic number and `FNN` with the feature number throughout.

---

```markdown
---
id: EP-NN-FNN
title: <Feature Name>
epic: EP-NN <Epic Name>
version: 1.0.0
status: implemented | partial | defective | proposed | deprecated
last_updated: 2026-07-27
depends_on: [EP-NN-FNN, ...] # other feature spec ids, or []
---

# EP-NN-FNN — <Feature Name>

## 1. Summary

One paragraph: what this feature is, who it serves, and why it exists. No implementation
detail here — a product stakeholder should understand it.

## 2. Actors & Permissions

| Actor                | Access | Notes |
| -------------------- | ------ | ----- |
| Owner                | Full   |       |
| Co-owner (`planner`) | ...    |       |
| Editor               | ...    |       |
| Viewer               | ...    |       |
| Public guest         | ...    |       |

Role semantics are defined once in `roles-and-permissions.md` — link to it with the depth
your file actually sits at (`../../roles-and-permissions.md` from `docs/epics/<epic>/`,
`../../../` from a sub-epic folder).
**Link to it — never restate the hierarchy here.** Only state the specific gate this
feature applies (e.g. "`requireEventEditor(ctx, eventId, "planner")`").

## 3. User Stories

- **US-NN-FNN-01** — As a `<role>`, I want `<capability>` so that `<outcome>`.
- **US-NN-FNN-02** — ...

## 4. Entry Points

| Entry point | Route / control              | Actor   |
| ----------- | ---------------------------- | ------- |
| ...         | `/dashboard/[eventSlug]/...` | Editor+ |

Include URL shape, the UI control that starts the flow, and any deep links.

## 5. UX Flow

### Happy path

1. User does X → `component.tsx` calls `api.module.functionName`
2. ...

### Alternate & edge paths

- **A1** — `<condition>` → `<behavior>`
- **E1** — `<error condition>` → `<behavior>`

## 6. States

| State             | Behavior |
| ----------------- | -------- |
| Loading           |          |
| Empty             |          |
| Error             |          |
| Success           |          |
| Disabled / locked |          |
| Mobile            |          |

## 7. UI Specification

### Screens & components

| Element | Component | Path                 |
| ------- | --------- | -------------------- |
| ...     | `<Name>`  | `src/components/...` |

### Fields & validation

| Field | Type | Required | Rule | Message |
| ----- | ---- | -------- | ---- | ------- |

### Copy deck

Guest-facing Spanish strings are quoted **verbatim** with their source path.

| Key | Copy | Source |
| --- | ---- | ------ |

## 8. Data Model

Tables and fields touched, relations, indexes used, cascade behavior.

| Table | Fields | Read / Write | Index |
| ----- | ------ | ------------ | ----- |

Cascades and lifecycle side effects get their own prose paragraph.

## 9. Backend Contract

| Function        | Type                               | Args    | Returns | Guard                     | Caps |
| --------------- | ---------------------------------- | ------- | ------- | ------------------------- | ---- |
| `api.module.fn` | query / mutation / public mutation | `{...}` | `{...}` | `requireEventEditor(...)` |      |

**Never invent function names.** Every row must exist in `convex/`.

## 10. Business Rules

Each rule is atomic, testable, and tagged. `[AS-BUILT]` means it is enforced in code today
(cite where in §15). A rule that is _not_ enforced today is not a business rule — file it in
§14 as a TODO instead.

- **BR-NN-FNN-01** `[AS-BUILT]` — <rule>.
- **BR-NN-FNN-02** `[AS-BUILT]` — <rule>.

## 11. Acceptance Criteria

- **AC-NN-FNN-01** — **Given** <context> **When** <action> **Then** <observable outcome>.
- **AC-NN-FNN-02** — ...

Every `[AS-BUILT]` business rule needs at least one AC that would fail if the rule broke.

## 12. Testing Criteria

| ID           | Level       | Scenario |
| ------------ | ----------- | -------- |
| TC-NN-FNN-01 | unit        |          |
| TC-NN-FNN-02 | integration |          |
| TC-NN-FNN-03 | e2e         |          |

### Manual QA checklist

- [ ] ...

## 13. Non-Functional

| Concern          | Specification |
| ---------------- | ------------- |
| Limits & caps    |               |
| Performance      |               |
| Security & authz |               |
| Accessibility    |               |
| i18n             |               |
| Analytics        |               |

## 14. TODOs & Open Questions

Defects (`DEF-`) are things that are broken today. TODOs (`TODO-`) are gaps or proposed
changes. Both carry a priority and, for TODOs, a change kind.

- **DEF-NN-01** `[P0]` — <what is broken>.
  - **Evidence:** `path/to/file.ts:123`
  - **Impact:** <user-visible consequence>
  - **Proposed fix:** <rule that should hold instead>
- **TODO-NN-01** `[P1]` `[ADD]` — <gap>.
  - **Rationale:** <why it matters>
  - **Proposed rule:** <the business rule that would be added>

### Open questions

- **Q1** — <question needing a product decision>

## 15. Traceability

| Concern    | Source                         |
| ---------- | ------------------------------ |
| Route      | `src/app/...:1`                |
| UI         | `src/components/...:42`        |
| Backend    | `convex/module.ts:88`          |
| Validation | `src/lib/validations/....ts:1` |

Line numbers are required and must be verified against the file at authoring time.

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-27 | Spec suite v1 | Initial as-built specification |
```
