// Shapes returned by the public `getPublicInvitation` query. Kept local to the
// public template so section components can be typed without importing server code.

export interface PublicEvent {
  name: string
  date?: number
  venueName?: string
  venueAddress?: string
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
}
