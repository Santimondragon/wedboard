// Shapes returned by the public `getPublicInvitation` query. Kept local to the
// public template so section components can be typed without importing server code.

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

export interface PublicInvitationData {
  event: PublicEvent
  invitation: PublicInvitation
  guests: PublicGuest[]
  /** Media id → signed URL for images referenced by the layout config. */
  mediaUrls?: Record<string, string>
  /**
   * Slugs needed by interactive blocks (e.g. RSVP) to call public mutations.
   * Absent in the template-editor preview, where submission is a no-op.
   */
  eventSlug?: string
  invitationSlug?: string
}
