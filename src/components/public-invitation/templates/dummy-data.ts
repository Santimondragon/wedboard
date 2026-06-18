import type { PublicInvitationData } from "../types"

/** Sample data used to render the live preview in the template-selection UI. */
export const DUMMY_INVITATION_DATA: PublicInvitationData = {
  event: {
    name: "Ava & Liam",
    brideName: "Ava",
    groomName: "Liam",
    // ~4 months out so the countdown shows non-zero values.
    date: Date.now() + 1000 * 60 * 60 * 24 * 120,
    venueName: "The Grand Hall",
    venueAddress: "123 Rosewood Avenue, Springfield",
    venueMapUrl: "https://maps.google.com/?q=The+Grand+Hall",
  },
  invitation: {
    _id: "preview-invitation",
    title: "The Carter Family",
    slug: "the-carter-family",
  },
  guests: [
    {
      _id: "preview-guest-1",
      firstName: "Emma",
      lastName: "Carter",
      rsvpStatus: "pending",
      allowsPlusOne: true,
      isPlusOne: false,
    },
    {
      _id: "preview-guest-2",
      firstName: "Noah",
      lastName: "Carter",
      rsvpStatus: "pending",
      allowsPlusOne: false,
      isPlusOne: false,
    },
    {
      _id: "preview-guest-3",
      firstName: "Olivia",
      lastName: "Carter",
      rsvpStatus: "pending",
      allowsPlusOne: false,
      isPlusOne: false,
    },
  ],
  // Sample sub-event so the special-invitation block renders in the live preview.
  specialEvents: [
    {
      _id: "preview-special-1",
      name: "Welcome Dinner",
      description:
        "Join us the evening before for an intimate welcome dinner as the celebration begins.",
      date: Date.now() + 1000 * 60 * 60 * 24 * 119,
      location: "The Garden Room",
      guestStatuses: {},
    },
  ],
}
