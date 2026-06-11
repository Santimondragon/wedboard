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
    type: "group",
    maxGuests: 4,
    allowPlusOne: true,
  },
  guests: [
    { _id: "preview-guest-1", firstName: "Emma", lastName: "Carter" },
    { _id: "preview-guest-2", firstName: "Noah", lastName: "Carter" },
    { _id: "preview-guest-3", firstName: "Olivia", lastName: "Carter" },
  ],
}
