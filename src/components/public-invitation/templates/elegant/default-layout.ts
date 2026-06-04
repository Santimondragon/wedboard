import type { BlockType, LayoutBlock } from "../../blocks"

// Canonical layout of the official "elegant" template, mirroring the Figma
// design's section order and copy. Used when an event has no saved layout.
function block(
  type: BlockType,
  config: Record<string, unknown>,
  i: number
): LayoutBlock {
  return { id: `elegant-${type}-${i}`, type, config }
}

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
  ].map((type, i) =>
    block(
      type as BlockType,
      // The "text" block is the "Lluvia de sobres" gift section; everything else
      // pulls its default copy from the block components.
      type === "text" ? { headline: "Lluvia de sobres" } : {},
      i
    )
  )
}
