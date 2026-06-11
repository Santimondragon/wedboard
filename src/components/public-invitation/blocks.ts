// Page-builder block model for the public invitation. A layout is an ordered
// list of blocks; the same block type may appear multiple times (e.g. three
// "text" blocks back to back). Persisted on `events.layoutBlocks`.

export type BlockType =
  | "hero"
  | "text"
  | "location"
  | "countdown"
  | "itinerary"
  | "dressCode"
  | "specialInvitation"
  | "rsvp"
  | "allergies"
  | "menuSelection"
  | "drinkSelection"
  | "stayInvite"
  | "footer"

export interface LayoutBlock {
  /** Stable per-instance id (React key + reorder identity). */
  id: string
  type: BlockType
  /** Per-instance content. Empty/absent for data-driven blocks. */
  config?: Record<string, unknown>
}

export interface ConfigField {
  key: string
  label: string
  /** "image" stores a media id (string) referencing the event's media table. */
  input: "text" | "textarea" | "list" | "image"
  placeholder?: string
  /**
   * For "list" fields: shape of each item. Omit for a plain string list
   * (e.g. food options); set for structured rows (e.g. itinerary
   * {time,label} entries).
   */
  itemFields?: { key: string; label: string }[]
}

interface BlockDef {
  label: string
  description: string
  /** Editable content fields. Empty array = data-driven, nothing to edit. */
  fields: ConfigField[]
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  hero: {
    label: "Hero",
    description: "Event name, date, photo and greeting.",
    fields: [
      { key: "body", label: "Greeting", input: "textarea", placeholder: "Intro paragraph…" },
      { key: "heroImage", label: "Photo", input: "image" },
    ],
  },
  text: {
    label: "Text",
    description: "A free paragraph with an optional headline.",
    fields: [
      { key: "headline", label: "Headline", input: "text", placeholder: "Optional headline" },
      { key: "body", label: "Text", input: "textarea", placeholder: "Write your message…" },
    ],
  },
  location: {
    label: "Location & Address",
    description: "Venue name and address.",
    fields: [{ key: "mapImage", label: "Map image", input: "image" }],
  },
  countdown: {
    label: "Countdown",
    description: "Live countdown to the event date.",
    fields: [],
  },
  itinerary: {
    label: "Itinerary",
    description: "Schedule of the day.",
    fields: [
      {
        key: "items",
        label: "Schedule",
        input: "list",
        itemFields: [
          { key: "time", label: "Time" },
          { key: "label", label: "Activity" },
        ],
      },
    ],
  },
  dressCode: {
    label: "Dress Code",
    description: "Dress code and a short note.",
    fields: [
      { key: "dressCode", label: "Dress code", input: "textarea", placeholder: "Formal / Black Tie" },
      { key: "note", label: "Note", input: "textarea", placeholder: "Optional note" },
      { key: "photo", label: "Photo", input: "image" },
    ],
  },
  specialInvitation: {
    label: "Special Invitation",
    description: "Invite to a sub-event (welcome dinner, after-party…).",
    fields: [
      { key: "eyebrow", label: "Eyebrow", input: "text", placeholder: "Special Invitation" },
      { key: "name", label: "Title", input: "text", placeholder: "Welcome Dinner" },
      { key: "description", label: "Description", input: "textarea", placeholder: "Details…" },
      { key: "date", label: "Date", input: "text", placeholder: "Friday, June 12" },
      { key: "location", label: "Location", input: "text", placeholder: "The Garden Room" },
    ],
  },
  rsvp: {
    label: "RSVP (per guest)",
    description: "Attending / declines toggle per guest.",
    fields: [
      { key: "body", label: "Note", input: "textarea", placeholder: "Thank-you note shown above the RSVP controls…" },
    ],
  },
  allergies: {
    label: "Allergies (per guest)",
    description: "Dietary restrictions input per guest.",
    fields: [
      { key: "headline", label: "Headline", input: "text", placeholder: "Food" },
      { key: "note", label: "Note", input: "textarea", placeholder: "Tell us about any allergies…" },
      { key: "options", label: "Options", input: "list" },
    ],
  },
  menuSelection: {
    label: "Menu Selection (per guest)",
    description: "Menu choice per guest.",
    fields: [],
  },
  drinkSelection: {
    label: "Drink Selection (per guest)",
    description: "Drink choice per guest.",
    fields: [],
  },
  stayInvite: {
    label: "Stay Invitation",
    description: "Accommodation invite with image, message and a confirm choice.",
    fields: [
      { key: "headline", label: "Headline", input: "text", placeholder: "Continúa la celebración" },
      { key: "body", label: "Message", input: "textarea", placeholder: "Details about accommodation…" },
      { key: "image", label: "Image", input: "image" },
    ],
  },
  footer: {
    label: "Footer",
    description: "Closing line with the event name.",
    fields: [
      { key: "body", label: "Closing line", input: "textarea", placeholder: "We can't wait to celebrate with you…" },
    ],
  },
}

/** Block types offered in the "add block" menu, in display order. */
export const BLOCK_PALETTE: BlockType[] = [
  "text",
  "hero",
  "location",
  "countdown",
  "itinerary",
  "dressCode",
  "specialInvitation",
  "rsvp",
  "allergies",
  "menuSelection",
  "drinkSelection",
  "stayInvite",
  "footer",
]

/**
 * Order used to build the default layout for events with no saved layout, and
 * the canonical arrangement of the official template. A template may override
 * this with its own preset layout (see TemplateDef.defaultLayout).
 */
const DEFAULT_ORDER: BlockType[] = [
  "hero",
  "location",
  "rsvp",
  "countdown",
  "itinerary",
  "allergies",
  "dressCode",
  "specialInvitation",
  "stayInvite",
  "footer",
]

function newId(type: BlockType): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${type}-${rand}`
}

export function createBlock(type: BlockType): LayoutBlock {
  return { id: newId(type), type, config: {} }
}

/**
 * Default layout (one of each section in a sensible order). Uses deterministic
 * ids so it renders identically on server and client.
 */
export function defaultLayout(): LayoutBlock[] {
  return DEFAULT_ORDER.map((type, i) => ({ id: `${type}-default-${i}`, type, config: {} }))
}

/**
 * Reads a list config value. Plain string lists return string[]; structured
 * lists return one record per row. Returns undefined when missing/empty or
 * the stored value has an unexpected shape.
 */
export function getConfigList(
  block: LayoutBlock,
  key: string
): (string | Record<string, string>)[] | undefined {
  const value = block.config?.[key]
  if (!Array.isArray(value) || value.length === 0) return undefined
  const items = value.filter(
    (item): item is string | Record<string, string> =>
      typeof item === "string" ||
      (typeof item === "object" && item !== null && !Array.isArray(item))
  )
  return items.length > 0 ? items : undefined
}

/** Reads a string config value, returning undefined when empty/missing. */
export function getConfigString(block: LayoutBlock, key: string): string | undefined {
  const value = block.config?.[key]
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? value : undefined
}

/** Normalizes a possibly-undefined saved layout into a usable block list. */
export function resolveLayout(blocks?: LayoutBlock[] | null): LayoutBlock[] {
  return blocks && blocks.length > 0 ? blocks : defaultLayout()
}
