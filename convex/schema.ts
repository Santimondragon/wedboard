import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Ordered page-builder blocks for the public invitation (see
// public-invitation/blocks). Shared by `events.layoutBlocks`,
// `events.layoutVariants`, and `events.setInvitationTemplate`.
export const LAYOUT_BLOCKS_VALIDATOR = v.array(
  v.object({
    id: v.string(),
    type: v.string(),
    config: v.optional(v.any()),
  }),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  events: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerUserId: v.id("users"),
    brideName: v.optional(v.string()),
    groomName: v.optional(v.string()),
    date: v.optional(v.number()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    // Google Maps (or any maps) link for the venue, shown on the public invitation.
    venueMapUrl: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    // Cached Vercel verification state for the settings UI only — public
    // routing never gates on it (an unverified domain simply never resolves
    // DNS to us).
    customDomainVerified: v.optional(v.boolean()),
    templateId: v.optional(v.string()),
    // Legacy single layout. Kept for back-compat; read as the "accepted"
    // variant fallback when `layoutVariants.accepted` is unset.
    layoutBlocks: v.optional(LAYOUT_BLOCKS_VALIDATOR),
    // Per-RSVP-state layouts for the public invitation. The public page picks
    // one based on the invitation's guests' RSVP state (see getPublicInvitation).
    // Each variant undefined = "use the selected template's default for that state".
    layoutVariants: v.optional(
      v.object({
        pending: v.optional(LAYOUT_BLOCKS_VALIDATOR),
        accepted: v.optional(LAYOUT_BLOCKS_VALIDATOR),
        declined: v.optional(LAYOUT_BLOCKS_VALIDATOR),
      }),
    ),
    // Social sharing / SEO metadata for the public invitation pages. Title and
    // description are templates that may contain {variables} (see
    // convex/lib/meta.ts); image is the OG/social card image, favicon an
    // .ico/.svg/.png from the media library. Unset fields fall back to
    // defaults derived from the event data.
    meta: v.optional(
      v.object({
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        imageId: v.optional(v.id("media")),
        faviconId: v.optional(v.id("media")),
      }),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived"),
    ),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_slug", ["slug"])
    .index("by_subdomain", ["subdomain"])
    .index("by_customDomain", ["customDomain"]),

  eventMembers: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("planner"),
      v.literal("editor"),
      v.literal("viewer"),
    ),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"])
    .index("by_eventId_and_userId", ["eventId", "userId"]),

  invitations: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    slug: v.string(),
    // Deprecated: no longer surfaced or written. Kept optional for back-compat
    // with existing docs.
    type: v.optional(
      v.union(v.literal("single"), v.literal("group"), v.literal("plusOne")),
    ),
    // Deprecated: no longer surfaced or written. Kept optional for back-compat
    // with existing docs.
    maxGuests: v.optional(v.number()),
    // Deprecated: +1 is now a per-guest flag (`guests.allowsPlusOne`). Kept
    // optional for back-compat with existing docs; no longer read or written.
    allowPlusOne: v.optional(v.boolean()),
    isActive: v.boolean(),
    // Owner-managed flag: the invitation link was sent to its guests. Purely
    // informational — nothing automated gates on it.
    isSent: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_slug", ["slug"])
    .index("by_eventId_and_slug", ["eventId", "slug"]),

  guests: defineTable({
    eventId: v.id("events"),
    invitationId: v.optional(v.id("invitations")),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Deprecated: never surfaced or used. Optional for back-compat.
    isPrimaryContact: v.optional(v.boolean()),
    // `isPlusOne` marks a record that *is* a +1 (created from a host guest).
    isPlusOne: v.boolean(),
    // Host guest is permitted to bring a +1.
    allowsPlusOne: v.optional(v.boolean()),
    // Set on a +1 record, points to its host guest. Lets us cascade the +1
    // when the host declines or is deleted.
    plusOneOfGuestId: v.optional(v.id("guests")),
    rsvpStatus: v.union(
      v.literal("pending"),
      v.literal("attending"),
      v.literal("declined"),
    ),
    allergies: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    menuOptionId: v.optional(v.id("menuOptions")),
    drinkOptionId: v.optional(v.id("drinkOptions")),
    tableId: v.optional(v.id("tables")),
    seatNumber: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_eventId_and_invitationId", ["eventId", "invitationId"])
    .index("by_invitationId", ["invitationId"])
    .index("by_plusOneOf", ["plusOneOfGuestId"])
    .index("by_tableId", ["tableId"])
    .index("by_tableId_and_seatNumber", ["tableId", "seatNumber"])
    .index("by_eventId_and_rsvpStatus", ["eventId", "rsvpStatus"]),

  specialEvents: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    location: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_eventId", ["eventId"]),

  guestSpecialEventRsvps: defineTable({
    eventId: v.id("events"),
    guestId: v.id("guests"),
    specialEventId: v.id("specialEvents"),
    status: v.union(
      v.literal("pending"),
      v.literal("attending"),
      v.literal("declined"),
    ),
  })
    .index("by_eventId", ["eventId"])
    .index("by_guestId", ["guestId"])
    .index("by_specialEventId", ["specialEventId"])
    .index("by_guestId_and_specialEventId", ["guestId", "specialEventId"]),

  invitationSpecialEventAccess: defineTable({
    eventId: v.id("events"),
    invitationId: v.id("invitations"),
    specialEventId: v.id("specialEvents"),
  })
    .index("by_eventId", ["eventId"])
    .index("by_invitationId", ["invitationId"])
    .index("by_specialEventId", ["specialEventId"])
    .index("by_invitationId_and_specialEventId", [
      "invitationId",
      "specialEventId",
    ]),

  menuOptions: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }).index("by_eventId", ["eventId"]),

  drinkOptions: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  }).index("by_eventId", ["eventId"]),

  // Per-event image library (template photos, maps, etc.). Blobs live in
  // Convex file storage; this table is the catalog.
  media: defineTable({
    eventId: v.id("events"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
  }).index("by_eventId", ["eventId"]),

  tables: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    seatsCount: v.number(),
    sortOrder: v.number(),
  }).index("by_eventId", ["eventId"]),

  // Messages guests leave for the host (e.g. from the "declined" public layout,
  // when they can't attend). Read by the planner in the dashboard.
  guestMessages: defineTable({
    eventId: v.id("events"),
    invitationId: v.id("invitations"),
    name: v.string(),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_invitationId", ["invitationId"]),

  // Append-only audit trail of dashboard actions on an event (member-visible
  // on the Activity page). Timestamps come from `_creationTime`.
  activityLogs: defineTable({
    eventId: v.id("events"),
    actorUserId: v.id("users"),
    // Denormalized "First Last" (or email) so the Activity list doesn't have
    // to join the users table for display.
    actorName: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
    ),
    entity: v.union(
      v.literal("guest"),
      v.literal("invitation"),
      v.literal("specialEvent"),
      v.literal("template"),
      v.literal("meta"),
    ),
    entityName: v.optional(v.string()),
  }).index("by_eventId", ["eventId"]),
});
