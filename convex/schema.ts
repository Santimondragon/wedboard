import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  events: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerUserId: v.id("users"),
    date: v.optional(v.number()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    templateId: v.optional(v.string()),
    // Ordered page-builder blocks for the public invitation (see
    // public-invitation/blocks). Undefined means "use the default layout".
    layoutBlocks: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.string(),
          config: v.optional(v.any()),
        })
      )
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived")
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
      v.literal("viewer")
    ),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"])
    .index("by_eventId_and_userId", ["eventId", "userId"]),

  invitations: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    slug: v.string(),
    type: v.union(
      v.literal("single"),
      v.literal("group"),
      v.literal("plusOne")
    ),
    maxGuests: v.number(),
    allowPlusOne: v.boolean(),
    isActive: v.boolean(),
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
    isPrimaryContact: v.boolean(),
    isPlusOne: v.boolean(),
    rsvpStatus: v.union(
      v.literal("pending"),
      v.literal("attending"),
      v.literal("declined")
    ),
    allergies: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    menuOptionId: v.optional(v.id("menuOptions")),
    drinkOptionId: v.optional(v.id("drinkOptions")),
    tableId: v.optional(v.id("tables")),
    seatNumber: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_invitationId", ["invitationId"])
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
      v.literal("declined")
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

  tables: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    seatsCount: v.number(),
    sortOrder: v.number(),
  }).index("by_eventId", ["eventId"]),
});
