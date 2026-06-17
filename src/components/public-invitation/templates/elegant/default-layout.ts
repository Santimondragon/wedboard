import type { LayoutBlock } from "../../blocks"
import { ELEGANT_BLOCK_CONFIG, ELEGANT_COPY } from "./default-copy"

// Canonical layout of the official "elegant" template, mirroring the Figma
// design's section order. Each block carries its own config so multiple blocks
// of the same type can have distinct content.
export function elegantDefaultLayout(): LayoutBlock[] {
  return [
    { id: "elegant-hero", type: "hero", config: { ...ELEGANT_BLOCK_CONFIG.hero } },
    { id: "elegant-location", type: "location", config: { ...ELEGANT_BLOCK_CONFIG.location } },
    { id: "elegant-text-1", type: "text", config: { body: "Gracias por confirmar tu asistencia y por acompañarnos en este día tan especial para nosotros.", showFlourishes: true } },
    { id: "elegant-countdown", type: "countdown", config: {} },
    { id: "elegant-itinerary", type: "itinerary", config: { items: [...ELEGANT_COPY.itineraryItems] } },
    { id: "elegant-text-2", type: "text", config: { headline: "Lluvia de sobres", showFlourishes: false } },
    { id: "elegant-rsvp", type: "rsvp", config: { ...ELEGANT_BLOCK_CONFIG.rsvp } },
    { id: "elegant-allergies", type: "allergies", config: { ...ELEGANT_BLOCK_CONFIG.allergies } },
    { id: "elegant-dressCode", type: "dressCode", config: { ...ELEGANT_BLOCK_CONFIG.dressCode } },
    { id: "elegant-specialInvitation", type: "specialInvitation", config: { ...ELEGANT_BLOCK_CONFIG.specialInvitation } },
    { id: "elegant-stayInvite", type: "stayInvite", config: { ...ELEGANT_BLOCK_CONFIG.stayInvite } },
    { id: "elegant-footer", type: "footer", config: { ...ELEGANT_BLOCK_CONFIG.footer } },
  ]
}
