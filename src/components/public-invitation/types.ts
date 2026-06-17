// Shapes returned by the public `getPublicInvitation` query. Kept local to the
// public template so section components can be typed without importing server code.

import type { RsvpVariant } from "./blocks"

export interface PublicEvent {
  name: string
  brideName?: string
  groomName?: string
  date?: number
  venueName?: string
  venueAddress?: string
  /** Google Maps (or any maps) link for the venue. */
  venueMapUrl?: string
}

export interface PublicInvitation {
  _id: string
  title: string
  slug: string
  type: "single" | "group" | "plusOne"
  maxGuests: number
  allowPlusOne: boolean
}

export interface PublicGuest {
  _id: string
  firstName: string
  lastName: string
}

export interface PublicSpecialEvent {
  _id: string
  name: string
  description?: string
  date?: number
  location?: string
  /** guestId → that guest's current RSVP status for this special event. */
  guestStatuses: Record<string, "pending" | "attending" | "declined">
}

export interface PublicInvitationData {
  event: PublicEvent
  invitation: PublicInvitation
  guests: PublicGuest[]
  /** Special events this invitation can RSVP to (with per-guest statuses). */
  specialEvents?: PublicSpecialEvent[]
  /** Media id → signed URL for images referenced by the layout config. */
  mediaUrls?: Record<string, string>
  /**
   * Slugs needed by interactive blocks (e.g. RSVP) to call public mutations.
   * Absent in the template-editor preview, where submission is a no-op.
   */
  eventSlug?: string
  invitationSlug?: string
  /** RSVP variant the server resolved for this invitation; drives default layout. */
  rsvpState?: RsvpVariant
}
