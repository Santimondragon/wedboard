// Source of truth for the available templates. Each template owns its page
// frame and the markup for every block it renders. This is what lets templates
// have completely different markup from each other — not just different theming.

import { TEMPLATE_THEMES, type TemplateTheme } from "../template-theme"
import type { BlockType, LayoutBlock, RsvpVariant } from "../blocks"
import type { BlockComponent, FrameComponent } from "./types"
import { ElegantFrame, ELEGANT_BLOCKS, elegantDefaultLayouts } from "./elegant"
import { ELEGANT_BLOCK_CONFIG } from "./elegant/default-copy"

export interface TemplateDef {
  id: string
  label: string
  description: string
  /** Theme tokens consumed by the template's frame/blocks. */
  theme: TemplateTheme
  /** Page wrapper that lays out the rendered blocks. */
  Frame: FrameComponent
  /** Markup for each block type. Block types the template omits render nothing. */
  blocks: Partial<Record<BlockType, BlockComponent>>
  /** Preset layout per RSVP variant, used when an event has no saved layout. */
  defaultLayouts?: Record<RsvpVariant, () => LayoutBlock[]>
  /**
   * Per-block default config used to pre-fill newly added blocks in the
   * editor (so the template's copy is editable from the start).
   */
  defaultBlockConfig?: Partial<Record<BlockType, Record<string, unknown>>>
}

/**
 * `elegant` is the only official template: it ships its own page frame, a block
 * component per section, and a preset layout. Add more templates here by giving
 * each its own `Frame`/`blocks` that define their markup.
 */
export const TEMPLATES: Record<string, TemplateDef> = {
  elegant: {
    id: "elegant",
    label: TEMPLATE_THEMES.elegant.label,
    description: TEMPLATE_THEMES.elegant.description,
    theme: TEMPLATE_THEMES.elegant,
    Frame: ElegantFrame,
    blocks: ELEGANT_BLOCKS,
    defaultLayouts: elegantDefaultLayouts,
    defaultBlockConfig: ELEGANT_BLOCK_CONFIG,
  },
}

export const DEFAULT_TEMPLATE_ID = "elegant"
/** Templates in display order, for the picker UI. */
export const TEMPLATE_LIST: TemplateDef[] = Object.values(TEMPLATES)

export function resolveTemplate(id?: string | null): TemplateDef {
  return (id && TEMPLATES[id]) || TEMPLATES.elegant
}
