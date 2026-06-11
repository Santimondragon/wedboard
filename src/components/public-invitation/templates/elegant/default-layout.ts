import type { BlockType, LayoutBlock } from "../../blocks"
import { ELEGANT_BLOCK_CONFIG } from "./default-copy"

// Canonical layout of the official "elegant" template, mirroring the Figma
// design's section order. Each block is seeded with the design's copy so all
// text is immediately editable in the page builder.
export function elegantDefaultLayout(): LayoutBlock[] {
  return [
    "hero",
    "location",
    "rsvp",
    "countdown",
    "itinerary",
    "text",
    "allergies",
    "dressCode",
    "specialInvitation",
    "stayInvite",
    "footer",
  ].map((type, i) => ({
    id: `elegant-${type}-${i}`,
    type: type as BlockType,
    config: { ...(ELEGANT_BLOCK_CONFIG[type] ?? {}) },
  }))
}
