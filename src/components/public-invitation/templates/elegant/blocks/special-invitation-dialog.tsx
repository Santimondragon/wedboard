"use client"

import { useState } from "react"
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
import type { PublicSpecialEvent } from "../../../types"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { CheckRow, WeddingButton } from "./primitives"

type Choice = "attending" | "declined"

/** Shared props every special-invitation display template (card) receives. */
export interface SpecialCardProps {
  name: string
  description: string
  buttonLabel: string
  canConfirm: boolean
  image?: string
  guests: BlockComponentProps["data"]["guests"]
  specialEvent?: PublicSpecialEvent
  eventSlug?: string
  invitationSlug?: string
}

/**
 * The RSVP modal shared by every special-invitation card: shows the linked
 * special event's details and a per-guest attending/declining radio group,
 * submitting via `submitPublicRsvp.specialEventRsvps`.
 */
export function SpecialInvitationDialog({
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
