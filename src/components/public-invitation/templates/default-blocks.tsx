"use client"

import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useTemplateTheme } from "../template-theme"
import { getConfigString, type BlockType, type LayoutBlock } from "../blocks"
import type { PublicInvitationData } from "../types"
import { HeroSection } from "../sections/hero-section"
import { LocationSection } from "../sections/location-section"
import { MessageSection } from "../sections/message-section"
import { CountdownSection } from "../sections/countdown-section"
import { ItinerarySection } from "../sections/itinerary-section"
import { DressCodeSection } from "../sections/dress-code-section"
import { SpecialInvitationSection } from "../sections/special-invitation-section"
import { RsvpSection } from "../sections/rsvp-section"
import { AllergiesSection } from "../sections/allergies-section"
import { MenuSelectionSection } from "../sections/menu-selection-section"
import { DrinkSelectionSection } from "../sections/drink-selection-section"
import { FooterSection } from "../sections/footer-section"

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

/**
 * Default page frame: a themed, divided card. Templates that want a different
 * overall structure (e.g. full-bleed sections) provide their own `Frame`.
 */
export function DefaultFrame({ children }: FrameProps) {
  const theme = useTemplateTheme()
  return (
    <div className={cn("min-h-screen", theme.font, theme.page)}>
      <div className={cn("mx-auto max-w-3xl", theme.card, theme.divider)}>
        {children}
      </div>
    </div>
  )
}

// Default block components. A template overrides any of these (see
// template-registry); anything it doesn't override falls back to here.

function HeroBlock({ data }: BlockComponentProps) {
  return <HeroSection event={data.event} invitation={data.invitation} />
}

function TextBlock({ block }: BlockComponentProps) {
  return (
    <MessageSection
      headline={getConfigString(block, "headline")}
      message={getConfigString(block, "body")}
    />
  )
}

function LocationBlock({ data }: BlockComponentProps) {
  return <LocationSection event={data.event} />
}

function CountdownBlock({ data }: BlockComponentProps) {
  return <CountdownSection date={data.event.date} />
}

function ItineraryBlock() {
  return <ItinerarySection />
}

function DressCodeBlock({ block }: BlockComponentProps) {
  return (
    <DressCodeSection
      dressCode={getConfigString(block, "dressCode")}
      note={getConfigString(block, "note")}
    />
  )
}

function SpecialInvitationBlock({ block }: BlockComponentProps) {
  return (
    <SpecialInvitationSection
      eyebrow={getConfigString(block, "eyebrow")}
      name={getConfigString(block, "name")}
      description={getConfigString(block, "description")}
      date={getConfigString(block, "date")}
      location={getConfigString(block, "location")}
    />
  )
}

function RsvpBlock({ data }: BlockComponentProps) {
  return <RsvpSection guests={data.guests} />
}

function AllergiesBlock({ data }: BlockComponentProps) {
  return <AllergiesSection guests={data.guests} />
}

function MenuSelectionBlock({ data }: BlockComponentProps) {
  return <MenuSelectionSection guests={data.guests} />
}

function DrinkSelectionBlock({ data }: BlockComponentProps) {
  return <DrinkSelectionSection guests={data.guests} />
}

function StayInviteBlock({ block }: BlockComponentProps) {
  return (
    <MessageSection
      headline={getConfigString(block, "headline") ?? "Stay Invitation"}
      message={getConfigString(block, "body")}
    />
  )
}

function FooterBlock({ data }: BlockComponentProps) {
  return <FooterSection event={data.event} />
}

export const DEFAULT_BLOCKS: Record<BlockType, BlockComponent> = {
  hero: HeroBlock,
  text: TextBlock,
  location: LocationBlock,
  countdown: CountdownBlock,
  itinerary: ItineraryBlock,
  dressCode: DressCodeBlock,
  specialInvitation: SpecialInvitationBlock,
  rsvp: RsvpBlock,
  allergies: AllergiesBlock,
  menuSelection: MenuSelectionBlock,
  drinkSelection: DrinkSelectionBlock,
  stayInvite: StayInviteBlock,
  footer: FooterBlock,
}
