import type { ComponentType, ReactNode } from "react"
import type { LayoutBlock } from "../blocks"
import type { PublicInvitationData } from "../types"

/** Uniform props every block component receives, regardless of template. */
export interface BlockComponentProps {
  block: LayoutBlock
  data: PublicInvitationData
}
export type BlockComponent = ComponentType<BlockComponentProps>

/** A template's page wrapper. Receives the rendered blocks as children. */
export interface FrameProps {
  children: ReactNode
}
export type FrameComponent = ComponentType<FrameProps>
