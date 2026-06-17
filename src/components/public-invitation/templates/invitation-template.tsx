"use client"

import { defaultLayout, type LayoutBlock, type RsvpVariant } from "../blocks"
import { TemplateThemeProvider } from "../template-theme"
import type { PublicInvitationData } from "../types"
import { resolveTemplate } from "./template-registry"

interface InvitationTemplateProps {
  data: PublicInvitationData
  /** Template id; falls back to the elegant template when unknown/absent. */
  templateId?: string | null
  /** Ordered layout blocks; null/undefined falls back to the variant default. */
  blocks?: LayoutBlock[] | null
  /** RSVP variant whose default layout to use when `blocks` is empty. */
  rsvpState?: RsvpVariant
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
  rsvpState = "accepted",
}: InvitationTemplateProps) {
  const template = resolveTemplate(templateId)
  const Frame = template.Frame
  // Saved blocks win; otherwise use the template's preset layout for this RSVP
  // variant, then the global variant default.
  const layout =
    blocks && blocks.length > 0
      ? blocks
      : template.defaultLayouts?.[rsvpState]?.() ?? defaultLayout(rsvpState)

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
