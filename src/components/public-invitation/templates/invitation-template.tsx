"use client"

import { defaultLayout, type LayoutBlock } from "../blocks"
import { TemplateThemeProvider } from "../template-theme"
import type { PublicInvitationData } from "../types"
import { resolveTemplate } from "./template-registry"

interface InvitationTemplateProps {
  data: PublicInvitationData
  /** Template id; falls back to the elegant template when unknown/absent. */
  templateId?: string | null
  /** Ordered layout blocks; null/undefined falls back to the default layout. */
  blocks?: LayoutBlock[] | null
}

/**
 * Renders a public invitation. The chosen template owns the page frame and the
 * component for each block type, so templates differ in markup as well as
 * styling. Block types a template doesn't implement render nothing.
 */
export function InvitationTemplate({
  data,
  templateId,
  blocks,
}: InvitationTemplateProps) {
  const template = resolveTemplate(templateId)
  const Frame = template.Frame
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
          const Block = template.blocks[block.type]
          return Block ? <Block key={block.id} block={block} data={data} /> : null
        })}
      </Frame>
    </TemplateThemeProvider>
  )
}
