---
id: EP-04-F01
title: Add a Guest
epic: EP-04 Guest Management
version: 1.0.0
status: implemented
last_updated: 2026-07-28
depends_on: [EP-02-F01, EP-03-F01]
---

# EP-04-F01 — Add a Guest

## 1. Summary

The single-guest entry point of the directory. An Editor+ opens a dialog from the Guests page,
types a first and last name, optionally an email, a phone number and a "+1 allowed" permission,
and the person joins the event's guest list. The guest starts `pending` and — unless the form
was opened with an invitation already in context — starts as an
**[Un-invited guest](../../glossary.md)**: present in the directory but with no invitation
through which to answer. Grouping guests into invitations is a separate act, owned by
[EP-05](../05-invitations/).

## 2. Actors & Permissions

| Actor                | Access | Notes                                                           |
| -------------------- | ------ | --------------------------------------------------------------- |
| Owner                | Full   |                                                                 |
| Co-owner (`planner`) | Full   |                                                                 |
| Editor               | Full   | Guest content is editor-level                                   |
| Viewer               | None   | Blocked by the default `minRole`                                |
| Public guest         | None   | Guests are never self-created; EP-07 only updates existing rows |

Gate: `requireEventEditor(ctx, args.eventId)` (`convex/guests.ts:159`), default
`minRole: "editor"`. See [roles-and-permissions.md](../../roles-and-permissions.md).

## 3. User Stories

- **US-04-F01-01** — As an Editor, I want to add a guest by name alone so that I can build the
  list before I know anyone's contact details.
- **US-04-F01-02** — As an Editor, I want to add a guest without picking an invitation so that
  I can collect names first and group them into households later.
- **US-04-F01-03** — As an Editor, I want to mark at entry time that a guest may bring a
  companion so that the public RSVP form offers them the +1 question.
- **US-04-F01-04** — As an Editor, I want an obvious way to add the first guest from an empty
  directory so that a new event is not a dead end.

## 4. Entry Points

| Entry point                                   | Route / control                                                                                   | Actor   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| "Add Guest" header button                     | `/dashboard/[eventSlug]/guests` (`src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:164`) | Editor+ |
| Empty-state action, also labelled "Add Guest" | same route (`…/guests/page.tsx:180`)                                                              | Editor+ |

Both open the same modal (`…/guests/page.tsx:192`) hosting `GuestForm`. There is no deep link
to the dialog and no create route.

## 5. UX Flow

### Happy path

1. The Editor opens `/dashboard/[eventSlug]/guests`; `EventProvider` resolves the slug and
   `useEvent()._id` supplies the event id (`…/guests/page.tsx:23`).
2. They click **"Add Guest"** → the `Dialog` titled "Add Guest" opens (`…/guests/page.tsx:195`).
3. They fill First Name and Last Name, optionally Email and Phone, optionally tick
   **"Allows +1"** (`src/components/guests/guest-form.tsx:62`–`:98`).
4. Submit → `zodResolver(guestSchema)` validates (`guest-form.tsx:34`).
5. `createGuest.run({...})` calls `api.guests.createGuest`
   (`guest-form.tsx:43`, `convex/guests.ts:148`).
6. The server guards, optionally verifies the invitation, inserts the row with
   `isPlusOne: false`, `allowsPlusOne: args.allowsPlusOne ?? false`, `rsvpStatus: "pending"`
   (`convex/guests.ts:168`), then logs a `guest`/`create` activity entry (`convex/guests.ts:179`).
7. Toast "Guest added successfully" (`guest-form.tsx:22`); the form resets and the dialog closes
   (`guest-form.tsx:52`).
8. The Convex subscription behind `getGuestsPageData` re-delivers, and the new row appears in the
   table with an "—" invitation and a Pending badge.

### Alternate & edge paths

- **A1** — Form opened with an `invitationId` prop → the guest is inserted already linked to
  that invitation; no invitation picker is rendered (`guest-form.tsx:20`, `:44`).
- **A2** — Email left blank → `""` is coerced to `undefined` before the call
  (`guest-form.tsx:48`), so no empty string is stored.
- **A3** — "Allows +1" ticked → only the _permission_ is stored. No +1 guest record exists yet;
  see [F04](./F04-plus-one-lifecycle.md).
- **E1** — First or last name empty → inline field error, no request sent.
- **E2** — Email present but malformed → inline Zod error, no request sent.
- **E3** — `invitationId` belongs to another event → server throws
  `"Invitation does not belong to this event"` (`convex/guests.ts:164`); the user sees only
  "Failed to add guest" (`DEF-04-01`).
- **E4** — Caller lacks the editor floor → `requireEventEditor` throws; same generic toast.

## 6. States

| State             | Behavior                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading           | The page shows 8 skeleton rows while `getGuestsPageData` is undefined (`…/guests/page.tsx:169`); the dialog itself has no loading state                              |
| Empty             | `EmptyState` with `Users` icon, title "No guests yet", description "Add guests here, then group them into invitations", action "Add Guest" (`…/guests/page.tsx:176`) |
| Error             | Validation errors render under the field in rose text; server errors surface only as the sonner toast "Failed to add guest"                                          |
| Success           | Toast "Guest added successfully", form reset, dialog closed                                                                                                          |
| Disabled / locked | The submit button is disabled while `isSubmitting`, its label becoming "Adding..." (`guest-form.tsx:101`)                                                            |
| Mobile            | The dialog is `sm:max-w-lg`; the name pair stays a 2-column grid at every width (`guest-form.tsx:60`)                                                                |

## 7. UI Specification

### Screens & components

| Element          | Component                  | Path                                                           |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| Guests page      | `GuestsPage`               | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:22` |
| Add dialog shell | `Dialog` / `DialogContent` | `…/guests/page.tsx:192`                                        |
| Form             | `GuestForm`                | `src/components/guests/guest-form.tsx:20`                      |
| Empty state      | `EmptyState`               | `src/components/app/empty-state.tsx`                           |
| Mutation wrapper | `useToastMutation`         | `src/hooks/use-toast-mutation.ts:22`                           |

### Fields & validation

| Field           | Type     | Required                | Rule                                                                   | Message                   |
| --------------- | -------- | ----------------------- | ---------------------------------------------------------------------- | ------------------------- |
| `firstName`     | text     | yes                     | `z.string().min(1)` (`src/lib/validations/guest.ts:4`)                 | "First name is required"  |
| `lastName`      | text     | yes                     | `z.string().min(1)` (`guest.ts:5`)                                     | "Last name is required"   |
| `email`         | email    | no                      | `z.string().email().optional().or(z.literal(""))` (`guest.ts:6`)       | Zod default email message |
| `phone`         | tel      | no                      | `z.string().optional()` — **no format validation** (`guest.ts:7`)      | —                         |
| `allowsPlusOne` | checkbox | yes (defaulted `false`) | `z.boolean()` with `defaultValues` (`guest.ts:8`, `guest-form.tsx:35`) | —                         |

Neither name is trimmed or length-capped on the client or the server.

### Copy deck

All copy on this surface is English host-facing text; there are no guest-facing Spanish strings.

| Key              | Copy                                                                  | Source                  |
| ---------------- | --------------------------------------------------------------------- | ----------------------- |
| Dialog title     | "Add Guest"                                                           | `…/guests/page.tsx:195` |
| First name label | "First Name \*"                                                       | `guest-form.tsx:62`     |
| Last name label  | "Last Name \*"                                                        | `guest-form.tsx:70`     |
| Email label      | "Email"                                                               | `guest-form.tsx:78`     |
| Phone label      | "Phone"                                                               | `guest-form.tsx:86`     |
| +1 label         | "Allows +1"                                                           | `guest-form.tsx:97`     |
| Submit           | "Add Guest" / "Adding..."                                             | `guest-form.tsx:102`    |
| Success toast    | "Guest added successfully"                                            | `guest-form.tsx:22`     |
| Error toast      | "Failed to add guest"                                                 | `guest-form.tsx:23`     |
| Empty state      | "No guests yet" / "Add guests here, then group them into invitations" | `…/guests/page.tsx:178` |

## 8. Data Model

| Table          | Fields                                                                                                              | Read / Write           | Index               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------- |
| `guests`       | `eventId`, `invitationId?`, `firstName`, `lastName`, `email?`, `phone?`, `isPlusOne`, `allowsPlusOne`, `rsvpStatus` | Write (insert)         | —                   |
| `invitations`  | whole doc                                                                                                           | Read (ownership check) | direct `ctx.db.get` |
| `activityLogs` | `eventId`, `actorUserId`, `actorName`, `action`, `entity`, `entityName`                                             | Write                  | —                   |

Schema: `convex/schema.ts:122`. Fields **not** written at creation: `isPrimaryContact`
(deprecated, `convex/schema.ts:130`), `plusOneOfGuestId`, `allergies`, `specialRequests`,
`menuOptionId`, `drinkOptionId`, `tableId`, `seatNumber`.

There is no cascade on create. The only side effect is the activity-log row.

## 9. Backend Contract

| Function                       | Type     | Args                                                                            | Returns                                | Guard                                                       | Caps                          |
| ------------------------------ | -------- | ------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| `api.guests.createGuest`       | mutation | `{eventId, invitationId?, firstName, lastName, email?, phone?, allowsPlusOne?}` | `Id<"guests">`                         | `requireEventEditor(ctx, eventId)` (`convex/guests.ts:159`) | none — no per-event guest cap |
| `api.guests.getGuestsPageData` | query    | `{eventId}`                                                                     | see [F02 §9](./F02-guest-directory.md) | `requireEventEditor`                                        | `guests` `.take(1000)`        |

`convex/guests.ts:148`. No other function participates in this feature.

## 10. Business Rules

- **BR-04-F01-01** `[AS-BUILT]` — Creating a guest requires at least the `editor` role on the
  event (`convex/guests.ts:159`).
- **BR-04-F01-02** `[AS-BUILT]` — `firstName` and `lastName` are required by the form schema
  (`src/lib/validations/guest.ts:4`).
- **BR-04-F01-03** `[AS-BUILT]` — `email` is optional; when supplied it must be a valid email
  address, and an empty string is accepted by the schema then converted to `undefined` before
  the mutation (`guest.ts:6`, `guest-form.tsx:48`).
- **BR-04-F01-04** `[AS-BUILT]` — `phone` is optional and accepted in any format
  (`guest.ts:7`).
- **BR-04-F01-05** `[AS-BUILT]` — `invitationId` is optional; when omitted the guest is created
  with no invitation and is therefore an un-invited guest (`convex/guests.ts:170`).
- **BR-04-F01-06** `[AS-BUILT]` — When `invitationId` is supplied it must exist and belong to
  the same event, otherwise the mutation throws "Invitation does not belong to this event"
  (`convex/guests.ts:161`).
- **BR-04-F01-07** `[AS-BUILT]` — A newly created guest always starts with
  `rsvpStatus: "pending"` (`convex/guests.ts:177`).
- **BR-04-F01-08** `[AS-BUILT]` — A newly created guest always starts with `isPlusOne: false`;
  a +1 record is never produced by this mutation (`convex/guests.ts:175`).
- **BR-04-F01-09** `[AS-BUILT]` — `allowsPlusOne` defaults to `false` when the argument is
  omitted (`convex/guests.ts:176`).
- **BR-04-F01-10** `[AS-BUILT]` — Every successful create writes one `activityLogs` row with
  `entity: "guest"`, `action: "create"` and `entityName` = the trimmed "First Last"
  (`convex/guests.ts:179`).
- **BR-04-F01-11** `[AS-BUILT]` — Duplicate names are permitted; there is no uniqueness check on
  name, email or phone (`convex/guests.ts:168` inserts unconditionally).

## 11. Acceptance Criteria

- **AC-04-F01-01** — **Given** an Editor on the Guests page **When** they submit the form with
  first and last name only **Then** a guest appears in the table with an "—" invitation and a
  Pending badge, and the toast reads "Guest added successfully".
- **AC-04-F01-02** — **Given** the form **When** the first name is blank and submit is pressed
  **Then** "First name is required" renders under the field and no mutation is issued.
- **AC-04-F01-03** — **Given** the form **When** the email field contains `not-an-email`
  **Then** an inline email error renders and no mutation is issued.
- **AC-04-F01-04** — **Given** the form **When** a phone number of any shape is entered
  **Then** it is accepted and stored verbatim.
- **AC-04-F01-05** — **Given** a guest created without an invitation **When**
  `guests.listUnassignedByEvent` runs for the event **Then** the new guest is in the result.
- **AC-04-F01-06** — **Given** the form opened with an `invitationId` prop **When** the guest is
  created **Then** the guest's `invitationId` equals that invitation and the directory shows that
  invitation's title.
- **AC-04-F01-07** — **Given** an `invitationId` belonging to a different event **When**
  `createGuest` is called directly **Then** it throws "Invitation does not belong to this event"
  and no row is inserted.
- **AC-04-F01-08** — **Given** the "Allows +1" box ticked **When** the guest is created **Then**
  `allowsPlusOne` is `true` and **no** second guest record exists for them.
- **AC-04-F01-09** — **Given** the box left unticked **When** the guest is created **Then**
  `allowsPlusOne` is `false`.
- **AC-04-F01-10** — **Given** any successful create **When** the Activity page is opened
  **Then** an entry reads that the actor created the guest by name.
- **AC-04-F01-11** — **Given** a Viewer on the event **When** `createGuest` is called **Then**
  it throws and no row is inserted.
- **AC-04-F01-12** — **Given** a guest named "Ana López" already exists **When** a second guest
  with the identical name is added **Then** both rows exist.

## 12. Testing Criteria

| ID           | Level       | Scenario                                                                                                               |
| ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| TC-04-F01-01 | unit        | `guestSchema` rejects empty `firstName`/`lastName`, accepts `""` and a valid address for `email`, accepts any `phone`  |
| TC-04-F01-02 | integration | `createGuest` inserts with `isPlusOne: false`, `rsvpStatus: "pending"`, `allowsPlusOne: false` when the arg is omitted |
| TC-04-F01-03 | integration | `createGuest` with a foreign `invitationId` throws and inserts nothing                                                 |
| TC-04-F01-04 | integration | `createGuest` as a `viewer` throws; as an `editor` succeeds                                                            |
| TC-04-F01-05 | integration | A successful create writes exactly one `activityLogs` row with `entity: "guest"`, `action: "create"`                   |
| TC-04-F01-06 | e2e         | Empty state → "Add Guest" → fill names → submit → row visible with Pending badge                                       |
| TC-04-F01-07 | e2e         | Submitting with a blank last name keeps the dialog open and shows the inline error                                     |

### Manual QA checklist

- [ ] The header "Add Guest" button and the empty-state action open the same dialog
- [ ] Submitting resets the form, so reopening shows blank fields and an unticked +1 box
- [ ] A guest added without an invitation appears in the un-invited pool of the invitation form
- [ ] The new row appears without a manual refresh
- [ ] The activity log records the create

## 13. Non-Functional

| Concern          | Specification                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Limits & caps    | No per-event guest cap. The directory query reads `.take(1000)` (`convex/guests.ts:75`), so an event above 1000 guests silently truncates — `TODO-04-07` |
| Performance      | One insert plus at most one `ctx.db.get` and one activity insert per create                                                                              |
| Security & authz | `requireEventEditor` on the server; the invitation is re-checked against `eventId` so a caller cannot attach a guest to another event's invitation       |
| Accessibility    | Every input has an associated `<Label htmlFor>`; the +1 checkbox label is click-targetable (`guest-form.tsx:96`)                                         |
| i18n             | Host UI is English only; no locale switch exists                                                                                                         |
| Analytics        | None beyond the activity log                                                                                                                             |

## 14. TODOs & Open Questions

- **TODO-04-03** `[P1]` `[CHANGE]` — `email` and `phone` are collected but never used.
  - **Rationale:** No transactional email or SMS exists anywhere in the app; nothing reads
    `guests.email` or `guests.phone` outside the forms that write them. Collecting contact data
    that is never used is a privacy cost with no product benefit, and `phone` is entirely
    unvalidated (`src/lib/validations/guest.ts:7`).
  - **Proposed rule:** Either the fields drive a capability (send-the-link, reminders) or they
    are removed from the form; if kept, `phone` gets a format rule.
- **TODO-04-04** `[P2]` `[REMOVE]` — `guests.isPrimaryContact` is dead.
  - **Rationale:** Declared at `convex/schema.ts:130` and referenced nowhere else in `convex/`
    or `src/` — no query reads it and no mutation writes it.
  - **Proposed rule:** Drop the field after confirming no production document depends on it.
- **TODO-04-07** `[P2]` `[CHANGE]` — Guest reads are silently truncated.
  - **Rationale:** `getGuestsPageData` and `listByEvent` both `.take(1000)`; there is no cap on
    creation and no signal when the ceiling is hit.
  - **Proposed rule:** Either cap guests per event with a clear error, or paginate the directory.
- **TODO-04-09** `[P2]` `[REMOVE]` — `guests.listByEvent` (`convex/guests.ts:13`),
  `guests.listByInvitation` (`:25`) and `guests.getGuestById` (`:138`) have no caller in `src/`.
  - **Rationale:** Dead public API surface; every dashboard read goes through
    `getGuestsPageData` and `listUnassignedByEvent`.
  - **Proposed rule:** Remove them, or document them as an intentional external API.

### Open questions

- **Q1** — Should adding a guest offer an invitation picker inline, so an Editor can group at
  entry time instead of going back through the invitation form?
- **Q2** — Should names be trimmed and length-capped server-side, given the public invitation
  renders them verbatim?

## 15. Traceability

| Concern                    | Source                                                          |
| -------------------------- | --------------------------------------------------------------- |
| Route                      | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:22`  |
| Entry control              | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:164` |
| Empty-state entry          | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:176` |
| Dialog                     | `src/app/(dashboard)/dashboard/[eventSlug]/guests/page.tsx:192` |
| UI                         | `src/components/guests/guest-form.tsx:20`                       |
| Submit handler             | `src/components/guests/guest-form.tsx:42`                       |
| Backend                    | `convex/guests.ts:148`                                          |
| Guard                      | `convex/guests.ts:159`                                          |
| Invitation ownership check | `convex/guests.ts:161`                                          |
| Activity log               | `convex/guests.ts:179`                                          |
| Schema                     | `convex/schema.ts:122`                                          |
| Validation                 | `src/lib/validations/guest.ts:3`                                |
| Toast convention           | `src/hooks/use-toast-mutation.ts:22`                            |

## 16. Changelog

| Version | Date       | Author        | Change                         |
| ------- | ---------- | ------------- | ------------------------------ |
| 1.0.0   | 2026-07-28 | Spec suite v1 | Initial as-built specification |
