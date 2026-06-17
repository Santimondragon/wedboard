"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { CheckRow, ElegantSection, WeddingButton } from "./primitives"

type Choice = "attending" | "declined"

function GuestRsvp({
  name,
  group,
  value,
  onChange,
  attendLabel,
  declineLabel,
}: {
  name: string
  group: string
  value: Choice | undefined
  onChange: (choice: Choice) => void
  attendLabel: string
  declineLabel: string
}) {
  return (
    <div className="space-y-3">
      <p className="font-elegant text-[24px] font-bold text-wedding-ink">{name}</p>
      <CheckRow
        type="radio"
        name={group}
        label={attendLabel}
        checked={value === "attending"}
        onChange={() => onChange("attending")}
      />
      <CheckRow
        type="radio"
        name={group}
        label={declineLabel}
        checked={value === "declined"}
        onChange={() => onChange("declined")}
      />
    </div>
  )
}

export function ElegantRsvp({ block, data }: BlockComponentProps) {
  const title = getConfigString(block, "title") ?? ELEGANT_COPY.rsvpTitle
  const deadline = getConfigString(block, "deadline") ?? ELEGANT_COPY.rsvpDeadline
  const attendLabel =
    getConfigString(block, "attendLabel") ?? ELEGANT_COPY.rsvpAttendLabel
  const declineLabel =
    getConfigString(block, "declineLabel") ?? ELEGANT_COPY.rsvpDeclineLabel
  const note = getConfigString(block, "note") ?? ELEGANT_COPY.rsvpNote
  const submitLabel =
    getConfigString(block, "submitLabel") ?? ELEGANT_COPY.rsvpSubmitLabel

  // One row per named guest. Existing +1 records are not shown as their own
  // primary row — instead each host that allows a +1 gets a sub-question.
  const namedGuests = data.guests.filter((g) => !g.isPlusOne)
  // Existing +1 record per host, so we can prefill its name and answer.
  const plusOneByHost = new Map(
    data.guests
      .filter((g) => g.isPlusOne && g.plusOneOfGuestId)
      .map((g) => [g.plusOneOfGuestId as string, g])
  )

  const [choices, setChoices] = useState<Record<string, Choice>>({})
  // Per-host +1 state: whether they bring one, and the optional name.
  const [plusOnes, setPlusOnes] = useState<
    Record<string, { attending: boolean; name: string }>
  >(() => {
    const init: Record<string, { attending: boolean; name: string }> = {}
    for (const g of data.guests) {
      if (g.isPlusOne && g.plusOneOfGuestId) {
        init[g.plusOneOfGuestId] = {
          attending: true,
          name: `${g.firstName} ${g.lastName}`.trim(),
        }
      }
    }
    return init
  })
  const { run, pending } = useToastMutation(api.guests.submitPublicRsvp, {
    success: "¡Gracias! Tu confirmación fue recibida.",
    error: "No pudimos enviar tu confirmación. Inténtalo de nuevo.",
  })

  // Every named guest must pick a choice before submitting, so the derived
  // public layout (pending/accepted/declined) is unambiguous.
  const allNamedAnswered = namedGuests.every((g) => choices[g._id])
  const canSubmit = Boolean(data.eventSlug && data.invitationSlug) && allNamedAnswered

  const handleSubmit = async () => {
    if (!data.eventSlug || !data.invitationSlug) return
    if (!allNamedAnswered) {
      toast.error("Por favor responde por cada invitado.")
      return
    }
    const guestUpdates = namedGuests.map((g) => ({
      guestId: g._id as Id<"guests">,
      rsvpStatus: choices[g._id],
    }))
    // A +1 is only sent for an attending host that allows one.
    const plusOneUpdates = namedGuests.flatMap((g) => {
      if (!g.allowsPlusOne) return []
      const state = plusOnes[g._id]
      const attending = choices[g._id] === "attending" && !!state?.attending
      const name = state?.name?.trim() ?? ""
      const [firstName, ...rest] = name.split(/\s+/)
      return [
        {
          hostGuestId: g._id as Id<"guests">,
          attending,
          firstName: firstName || undefined,
          lastName: rest.join(" ") || undefined,
        },
      ]
    })
    await run({
      eventSlug: data.eventSlug,
      invitationSlug: data.invitationSlug,
      guestUpdates,
      plusOneUpdates,
    })
  }

  return (
    <ElegantSection className="space-y-4">
      <div className="text-center">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {title}
        </h2>
        <p className="font-elegant text-[16px] text-wedding-gold">{deadline}</p>
      </div>
      {namedGuests.map((guest) => {
        const guestName = `${guest.firstName} ${guest.lastName}`.trim()
        const plusOneState = plusOnes[guest._id] ?? {
          attending: !!plusOneByHost.get(guest._id),
          name: "",
        }
        return (
          <div key={guest._id} className="space-y-3">
            <GuestRsvp
              name={guestName}
              group={`rsvp-${block.id}-${guest._id}`}
              value={choices[guest._id]}
              onChange={(choice) =>
                setChoices((prev) => ({ ...prev, [guest._id]: choice }))
              }
              attendLabel={attendLabel}
              declineLabel={declineLabel}
            />
            {guest.allowsPlusOne && choices[guest._id] === "attending" && (
              <div className="space-y-2 pl-4">
                <CheckRow
                  type="checkbox"
                  name={`plusone-${block.id}-${guest._id}`}
                  label={ELEGANT_COPY.rsvpPlusOneQuestion}
                  checked={plusOneState.attending}
                  onChange={() =>
                    setPlusOnes((prev) => ({
                      ...prev,
                      [guest._id]: {
                        attending: !plusOneState.attending,
                        name: plusOneState.name,
                      },
                    }))
                  }
                />
                {plusOneState.attending && (
                  <input
                    type="text"
                    value={plusOneState.name}
                    onChange={(e) =>
                      setPlusOnes((prev) => ({
                        ...prev,
                        [guest._id]: {
                          attending: true,
                          name: e.target.value,
                        },
                      }))
                    }
                    placeholder={ELEGANT_COPY.rsvpPlusOneNamePlaceholder}
                    className="w-full rounded-md border border-wedding-muted bg-transparent px-3 py-2 font-elegant text-[16px] text-wedding-ink placeholder:text-wedding-muted focus:border-wedding-gold focus:outline-none"
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
      {note && (
        <p className="font-elegant text-[16px] text-wedding-ink">{note}</p>
      )}
      <div className="flex justify-center pt-2">
        <WeddingButton
          onClick={handleSubmit}
          disabled={!canSubmit || pending}
        >
          {pending ? "Enviando…" : submitLabel}
        </WeddingButton>
      </div>
    </ElegantSection>
  )
}
