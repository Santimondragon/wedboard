// Page-builder block model for the public invitation. A layout is an ordered
// list of blocks; the same block type may appear multiple times (e.g. three
// "text" blocks back to back). Persisted on `events.layoutBlocks`.

import { ITINERARY_ILLUSTRATIONS } from "./templates/elegant/illustrations"

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
  | "guestMessage"
  | "footer"

/**
 * The public page renders one of three layout variants per invitation, chosen
 * from the invitation's guests' RSVP state (see getPublicInvitation):
 * - "pending"  — nobody has responded yet
 * - "accepted" — at least one guest is attending
 * - "declined" — everyone declined
 */
export type RsvpVariant = "pending" | "accepted" | "declined"

export const RSVP_VARIANTS: RsvpVariant[] = ["pending", "accepted", "declined"]

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
  /** "toggle" stores a boolean. */
  input: "text" | "textarea" | "list" | "image" | "toggle"
  placeholder?: string
  /**
   * For "list" fields: shape of each item. Omit for a plain string list
   * (e.g. food options); set for structured rows (e.g. itinerary
   * {time,label} entries).
   */
  itemFields?: {
    key: string
    label: string
    /**
     * Defaults to a plain text input. "illustration" renders a modal picker
     * of preset images (see `options`) instead of a text field.
     */
    input?: "text" | "illustration"
    /** For "illustration" item fields: the selectable presets. */
    options?: { value: string; label: string; src: string }[]
  }[]
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
      { key: "showFlourishes", label: "Show flourishes", input: "toggle" },
    ],
  },
  location: {
    label: "Location & Address",
    description: "Venue name and address.",
    fields: [
      { key: "title", label: "Title", input: "text", placeholder: "Ubicación" },
      { key: "address", label: "Address", input: "text", placeholder: "Venue name, address…" },
      { key: "mapImage", label: "Location image", input: "image" },
      { key: "buttonLabel", label: "Button label", input: "text", placeholder: "Ver mapa" },
      { key: "buttonUrl", label: "Button URL", input: "text", placeholder: "https://maps.google.com/…" },
    ],
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
          {
            key: "illustration",
            label: "Illustration",
            input: "illustration",
            options: ITINERARY_ILLUSTRATIONS,
          },
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
    description: "Attending / declines choice per guest (plus-one aware).",
    fields: [
      { key: "title", label: "Title", input: "text", placeholder: "Confirma tu asistencia" },
      { key: "deadline", label: "Deadline", input: "text", placeholder: "Antes del 00 del Mes" },
      { key: "attendLabel", label: "Attending label", input: "text", placeholder: "Sí asistiré" },
      { key: "declineLabel", label: "Declining label", input: "text", placeholder: "Lamentablemente no podré asistir" },
      { key: "note", label: "Note", input: "textarea", placeholder: "Optional note shown below the RSVP controls…" },
      { key: "submitLabel", label: "Submit button", input: "text", placeholder: "Enviar" },
    ],
  },
  allergies: {
    label: "Allergies (per guest)",
    description: "Dietary restrictions input per guest.",
    fields: [
      { key: "headline", label: "Headline", input: "text", placeholder: "Food" },
      { key: "note", label: "Note", input: "textarea", placeholder: "Tell us about any allergies…" },
      { key: "noneLabel", label: "No-allergies label", input: "text", placeholder: "No, como de todo" },
      { key: "hasLabel", label: "Has-allergies label", input: "text", placeholder: "Sí, tengo algunas" },
      { key: "otherLabel", label: "Other label", input: "text", placeholder: "Otra:" },
      { key: "submitLabel", label: "Submit button", input: "text", placeholder: "Enviar" },
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
  guestMessage: {
    label: "Message to the host",
    description: "Lets a guest leave the host a message (e.g. when they can't attend).",
    fields: [
      { key: "headline", label: "Headline", input: "text", placeholder: "Déjanos un mensaje" },
      { key: "note", label: "Note", input: "textarea", placeholder: "Optional note shown above the form…" },
      { key: "nameLabel", label: "Name label", input: "text", placeholder: "Tu nombre" },
      { key: "messageLabel", label: "Message label", input: "text", placeholder: "Tu mensaje" },
      { key: "placeholder", label: "Message placeholder", input: "text", placeholder: "Escribe aquí…" },
      { key: "submitLabel", label: "Submit button", input: "text", placeholder: "Enviar" },
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
  "guestMessage",
  "footer",
]

/**
 * Per-RSVP-variant default block order, used to build the fallback layout for
 * events with no saved layout. A template may override these with its own
 * preset layouts (see TemplateDef.defaultLayouts):
 * - accepted — the full event-details page
 * - pending  — short page: hero, location, rsvp, footer
 * - declined — hero, location, leave-a-message, footer
 */
const DEFAULT_ORDER: Record<RsvpVariant, BlockType[]> = {
  accepted: [
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
  ],
  pending: ["hero", "location", "rsvp", "footer"],
  declined: ["hero", "location", "guestMessage", "footer"],
}

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
 * Default layout for a given RSVP variant. Uses deterministic ids so it renders
 * identically on server and client.
 */
export function defaultLayout(variant: RsvpVariant = "accepted"): LayoutBlock[] {
  return DEFAULT_ORDER[variant].map((type, i) => ({
    id: `${variant}-${type}-default-${i}`,
    type,
    config: {},
  }))
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
