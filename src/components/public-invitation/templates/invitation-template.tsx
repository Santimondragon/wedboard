"use client"

import { defaultLayout, type LayoutBlock } from "../blocks"
import { TemplateThemeProvider } from "../template-theme"
import type { PublicInvitationData } from "../types"
import { DEFAULT_BLOCKS, DefaultFrame } from "./default-blocks"
import { resolveTemplate } from "./template-registry"

interface InvitationTemplateProps {
  data: PublicInvitationData
  /** Template id; falls back to the classic template when unknown/absent. */
  templateId?: string | null
  /** Ordered layout blocks; null/undefined falls back to the default layout. */
  blocks?: LayoutBlock[] | null
}

/**
 * Renders a public invitation. The chosen template supplies the page frame and
 * the component for each block type (falling back to the shared defaults), so
 * templates can differ in markup as well as styling. Sections are still
 * plain-text drafts.
 */
export function InvitationTemplate({
  data,
  templateId,
  blocks,
}: InvitationTemplateProps) {
  const template = resolveTemplate(templateId)
  const Frame = template.Frame ?? DefaultFrame
  // Saved blocks win; otherwise use the template's preset layout, then the
  // global default.
  const layout =
    blocks && blocks.length > 0
      ? blocks
      : template.defaultLayout?.() ?? defaultLayout()

  return (
    <TemplateThemeProvider templateId={templateId}>
      <Frame>
        {layout.map((block) => {
          const Block = template.blocks?.[block.type] ?? DEFAULT_BLOCKS[block.type]
          return Block ? <Block key={block.id} block={block} data={data} /> : null
        })}
      </Frame>
    </TemplateThemeProvider>
  )
}
