// Source of truth for the available templates. Each template can override the
// page frame and/or any block's markup; anything left unset falls back to the
// shared defaults in default-blocks. This is what lets templates have
// completely different markup from each other — not just different theming.

import { TEMPLATE_THEMES, type TemplateTheme } from "../template-theme"
import type { BlockType, LayoutBlock } from "../blocks"
import type { BlockComponent, FrameComponent } from "./default-blocks"
import { ElegantFrame, ELEGANT_BLOCKS, elegantDefaultLayout } from "./elegant"

export interface TemplateDef {
  id: string
  label: string
  description: string
  /** Theme tokens consumed by the default frame/blocks. */
  theme: TemplateTheme
  /** Optional page wrapper. Falls back to DefaultFrame when unset. */
  Frame?: FrameComponent
  /** Per-block markup overrides. Missing types fall back to DEFAULT_BLOCKS. */
  blocks?: Partial<Record<BlockType, BlockComponent>>
  /** Preset layout used when an event has no saved layout. */
  defaultLayout?: () => LayoutBlock[]
}

/**
 * `elegant` is the first official template (Xoom design): it ships its own page
 * frame, a block component per section, and a preset layout. `classic`,
 * `modern` and `romantic` remain as theme-only templates over the default
 * blocks (set a `Frame`/`blocks` to give them their own markup).
 */
export const TEMPLATES: Record<string, TemplateDef> = {
  elegant: {
    id: "elegant",
    label: TEMPLATE_THEMES.elegant.label,
    description: TEMPLATE_THEMES.elegant.description,
    theme: TEMPLATE_THEMES.elegant,
    Frame: ElegantFrame,
    blocks: ELEGANT_BLOCKS,
    defaultLayout: elegantDefaultLayout,
  },
  classic: {
    id: "classic",
    label: TEMPLATE_THEMES.classic.label,
    description: TEMPLATE_THEMES.classic.description,
    theme: TEMPLATE_THEMES.classic,
  },
  modern: {
    id: "modern",
    label: TEMPLATE_THEMES.modern.label,
    description: TEMPLATE_THEMES.modern.description,
    theme: TEMPLATE_THEMES.modern,
  },
  romantic: {
    id: "romantic",
    label: TEMPLATE_THEMES.romantic.label,
    description: TEMPLATE_THEMES.romantic.description,
    theme: TEMPLATE_THEMES.romantic,
  },
}

export const DEFAULT_TEMPLATE_ID = "elegant"
/** Templates in display order, for the picker UI. */
export const TEMPLATE_LIST: TemplateDef[] = Object.values(TEMPLATES)

export function resolveTemplate(id?: string | null): TemplateDef {
  return (id && TEMPLATES[id]) || TEMPLATES.elegant
}
