"use client"

import { useMemo, useState } from "react"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, ElegantSection, WeddingButton, getConfigImage } from "./primitives"
import {
  SpecialInvitationDialog,
  type SpecialCardProps,
} from "./special-invitation-dialog"
import { WithImageSpecialCard } from "./special-invitation-with-image"

export function ElegantSpecialInvitation({ block, data }: BlockComponentProps) {
  const confirmLabel =
    getConfigString(block, "confirmLabel") ?? ELEGANT_COPY.dinnerConfirmLabel
  const detailsLabel =
    getConfigString(block, "detailsLabel") ?? ELEGANT_COPY.dinnerDetailsLabel
  const templateId = getConfigString(block, "specialTemplateId") ?? "elegant"
  const image = getConfigImage(data, block, "image")

  // Bind the block to one of the invitation's accessible special events: the
  // explicitly configured one, otherwise the sole accessible one.
  const configuredId = getConfigString(block, "specialEventId")
  const bound = useMemo(() => {
    const accessible = data.specialEvents ?? []
    return (
      accessible.find((se) => se._id === configuredId) ??
      (accessible.length === 1 ? accessible[0] : undefined)
    )
  }, [data.specialEvents, configuredId])

  // Slugs are injected on the live public page, absent in the editor preview.
  const isPreview = !(data.eventSlug && data.invitationSlug)

  // Per-invitation assignment is the source of truth: getPublicInvitation only
  // returns special events this invitation has access to. So if nothing is bound
  // on the live page, this invitation isn't assigned it — render nothing.
  if (!bound && !isPreview) return null

  // Guests who declined the main event are off the special invitations.
  const eligibleGuests = data.guests.filter((g) => g.rsvpStatus !== "declined")
  const canConfirm = Boolean(bound) && !isPreview && eligibleGuests.length > 0

  // Once every eligible guest has already responded to this special event, the
  // button switches from "confirm" to a read-only "view details" affordance —
  // it still opens the same modal (now showing their saved choices).
  const hasResponded =
    !!bound &&
    eligibleGuests.length > 0 &&
    eligibleGuests.every((g) => {
      const status = bound.guestStatuses[g._id]
      return status === "attending" || status === "declined"
    })
  const buttonLabel = hasResponded ? detailsLabel : confirmLabel

  const Card = SPECIAL_TEMPLATES[templateId] ?? SPECIAL_TEMPLATES.elegant

  return (
    <Card
      name={bound?.name ?? ELEGANT_COPY.dinnerName}
      description={bound?.description ?? ELEGANT_COPY.dinnerDescription}
      buttonLabel={buttonLabel}
      canConfirm={canConfirm}
      image={image}
      guests={data.guests}
      specialEvent={bound}
      eventSlug={data.eventSlug}
      invitationSlug={data.invitationSlug}
    />
  )
}

/**
 * Registry of special-invitation display templates. Add more by registering
 * another `id → component` entry and listing it in the block's
 * `specialTemplateId` options (see BLOCK_DEFS.specialInvitation in blocks.ts).
 */
const SPECIAL_TEMPLATES: Record<string, (props: SpecialCardProps) => React.ReactNode> = {
  elegant: (props) => <ElegantSpecialCard {...props} />,
  "with-image": (props) => <WithImageSpecialCard {...props} />,
}

function ElegantSpecialCard({
  name,
  description,
  buttonLabel,
  canConfirm,
  guests,
  specialEvent,
  eventSlug,
  invitationSlug,
}: SpecialCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ElegantSection className="relative flex items-center justify-center px-24 py-42 text-center min-h-fit">
        <img
          aria-hidden
          src={`${ASSET_BASE}/special-invitation-top.png`}
          alt=""
          className="pointer-events-none absolute left-0 top-0 h-auto w-full"
        />
        <img
          aria-hidden
          src={`${ASSET_BASE}/special-invitation-bottom.png`}
          alt=""
          className="pointer-events-none absolute left-0 bottom-0 h-auto w-full"
        />
        <div className="relative flex flex-col items-center gap-6">
          <h2 className="font-script text-5xl leading-tight text-wedding-ink text-balance">
            {name}
          </h2>
          <p className="font-elegant text-lg font-bold leading-relaxed text-wedding-ink">
            {description}
          </p>
          <WeddingButton onClick={() => setOpen(true)} disabled={!canConfirm}>
            {buttonLabel}
          </WeddingButton>
        </div>
      </ElegantSection>

      {specialEvent && (
        <SpecialInvitationDialog
          open={open}
          onOpenChange={setOpen}
          guests={guests}
          specialEvent={specialEvent}
          eventSlug={eventSlug}
          invitationSlug={invitationSlug}
        />
      )}
    </>
  )
}
