import type { BlockType } from "../../../blocks"
import type { BlockComponent } from "../../types"
import { ElegantAllergies } from "./allergies"
import { ElegantCountdown } from "./countdown"
import { ElegantDressCode } from "./dress-code"
import { ElegantFooter } from "./footer"
import { ElegantGuestMessage } from "./guest-message"
import { ElegantHero } from "./hero"
import { ElegantItinerary } from "./itinerary"
import { ElegantLocation } from "./location"
import { ElegantRsvp } from "./rsvp"
import { ElegantSpecialInvitation } from "./special-invitation"
import { ElegantText } from "./text"

export const ELEGANT_BLOCKS: Partial<Record<BlockType, BlockComponent>> = {
  hero: ElegantHero,
  location: ElegantLocation,
  rsvp: ElegantRsvp,
  countdown: ElegantCountdown,
  itinerary: ElegantItinerary,
  text: ElegantText,
  allergies: ElegantAllergies,
  dressCode: ElegantDressCode,
  specialInvitation: ElegantSpecialInvitation,
  guestMessage: ElegantGuestMessage,
  footer: ElegantFooter,
}
