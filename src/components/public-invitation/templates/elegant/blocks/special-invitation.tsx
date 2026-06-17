"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, MapPin } from "lucide-react"
import { toast } from "sonner"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getConfigString } from "../../../blocks"
import type { PublicSpecialEvent } from "../../../types"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, CheckRow, ElegantSection, WeddingButton } from "./primitives"

type Choice = "attending" | "declined"

export function ElegantSpecialInvitation({ block, data }: BlockComponentProps) {
  const confirmLabel =
    getConfigString(block, "confirmLabel") ?? ELEGANT_COPY.dinnerConfirmLabel
  const detailsLabel =
    getConfigString(block, "detailsLabel") ?? ELEGANT_COPY.dinnerDetailsLabel
  const templateId = getConfigString(block, "specialTemplateId") ?? "elegant"

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

  const canConfirm = Boolean(bound) && !isPreview && data.guests.length > 0

  // Once every named guest has already responded to this special event, the
  // button switches from "confirm" to a read-only "view details" affordance —
  // it still opens the same modal (now showing their saved choices).
  const hasResponded =
    !!bound &&
    data.guests.length > 0 &&
    data.guests.every((g) => {
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
      guests={data.guests}
      specialEvent={bound}
      eventSlug={data.eventSlug}
      invitationSlug={data.invitationSlug}
    />
  )
}

interface SpecialCardProps {
  name: string
  description: string
  buttonLabel: string
  canConfirm: boolean
  guests: BlockComponentProps["data"]["guests"]
  specialEvent?: PublicSpecialEvent
  eventSlug?: string
  invitationSlug?: string
}

/**
 * Registry of special-invitation display templates. One for now; add more by
 * registering another `id → component` entry and listing it in the block's
 * `specialTemplateId` options (see BLOCK_DEFS.specialInvitation in blocks.ts).
 */
const SPECIAL_TEMPLATES: Record<string, (props: SpecialCardProps) => React.ReactNode> = {
  elegant: (props) => <ElegantSpecialCard {...props} />,
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

function SpecialInvitationDialog({
  open,
  onOpenChange,
  guests,
  specialEvent,
  eventSlug,
  invitationSlug,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guests: BlockComponentProps["data"]["guests"]
  specialEvent: PublicSpecialEvent
  eventSlug?: string
  invitationSlug?: string
}) {
  // Prefill each guest with their stored status (pending → unanswered).
  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const initial: Record<string, Choice> = {}
    for (const g of guests) {
      const status = specialEvent.guestStatuses[g._id]
      if (status === "attending" || status === "declined") initial[g._id] = status
    }
    return initial
  })

  const { run, pending } = useToastMutation(api.guests.submitPublicRsvp, {
    success: "¡Gracias! Tu confirmación fue recibida.",
    error: "No pudimos enviar tu confirmación. Inténtalo de nuevo.",
  })

  const allAnswered = guests.every((g) => choices[g._id])
  const canSubmit = Boolean(eventSlug && invitationSlug) && allAnswered

  const handleSubmit = async () => {
    if (!eventSlug || !invitationSlug) return
    if (!allAnswered) {
      toast.error("Por favor responde por cada invitado.")
      return
    }
    const result = await run({
      eventSlug,
      invitationSlug,
      guestUpdates: [],
      specialEventRsvps: guests.map((g) => ({
        guestId: g._id as Id<"guests">,
        specialEventId: specialEvent._id as Id<"specialEvents">,
        status: choices[g._id],
      })),
    })
    if (result.ok) onOpenChange(false)
  }

  const dateLabel = specialEvent.date
    ? format(new Date(specialEvent.date), "EEEE d 'de' MMMM, p", { locale: es })
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center font-script text-5xl font-normal text-wedding-gold">
            {specialEvent.name}
          </DialogTitle>
        </DialogHeader>

        {/* Mini-event details */}
        <div className="space-y-1 text-center font-elegant text-md text-wedding-ink">
          {dateLabel && (
            <p className="flex items-center justify-center gap-2 capitalize">
              <CalendarDays className="size-4 shrink-0 text-wedding-gold" aria-hidden />
              {dateLabel}
            </p>
          )}
          {specialEvent.location && (
            <p className="flex items-center justify-center gap-2">
              <MapPin className="size-4 shrink-0 text-wedding-gold" aria-hidden />
              {specialEvent.location}
            </p>
          )}
          {specialEvent.description && (
            <p className="pt-1 text-wedding-ink/80 text-lg">{specialEvent.description}</p>
          )}
          <p className="pt-2 font-bold text-lg">{ELEGANT_COPY.dinnerModalNote}</p>
        </div>

        <div className="space-y-5">
          {guests.map((guest) => {
            const fullName = `${guest.firstName} ${guest.lastName}`.trim()
            return (
              <div key={guest._id} className="space-y-2">
                <p className="font-elegant text-[18px] font-bold text-wedding-ink">
                  {fullName}
                </p>
                <CheckRow
                  type="radio"
                  name={`special-${specialEvent._id}-${guest._id}`}
                  label={ELEGANT_COPY.dinnerAttendLabel}
                  checked={choices[guest._id] === "attending"}
                  onChange={() =>
                    setChoices((prev) => ({ ...prev, [guest._id]: "attending" }))
                  }
                />
                <CheckRow
                  type="radio"
                  name={`special-${specialEvent._id}-${guest._id}`}
                  label={ELEGANT_COPY.dinnerDeclineLabel}
                  checked={choices[guest._id] === "declined"}
                  onChange={() =>
                    setChoices((prev) => ({ ...prev, [guest._id]: "declined" }))
                  }
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-center">
          <WeddingButton onClick={handleSubmit} disabled={!canSubmit || pending}>
            {pending ? "Enviando…" : ELEGANT_COPY.dinnerModalSubmitLabel}
          </WeddingButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
