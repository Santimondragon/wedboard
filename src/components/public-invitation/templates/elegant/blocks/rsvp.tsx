"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ElegantSection, WeddingButton } from "./primitives"

type Choice = "attending" | "declined"

function RsvpRadio({
  label,
  name,
  checked,
  onChange,
}: {
  label: string
  name: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-elegant text-[16px] text-wedding-ink">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-wedding-ink/70 bg-white transition-colors",
          checked && "border-wedding-gold"
        )}
      >
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        {checked && <span className="size-3 rounded-full bg-wedding-gold" />}
      </span>
      <span>{label}</span>
    </label>
  )
}

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
      <RsvpRadio
        name={group}
        label={attendLabel}
        checked={value === "attending"}
        onChange={() => onChange("attending")}
      />
      <RsvpRadio
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

  // One row per named guest, plus an extra row for the invitation's plus-one
  // when allowed. The +1 belongs to the primary (first) guest, so it's labelled
  // with that guest's name and a "(+1)" suffix. The +1 has no guest record, so
  // it isn't submitted — only named guests are persisted.
  const rows: { key: string; name: string; guestId: Id<"guests"> | null }[] =
    data.guests.map((guest) => ({
      key: guest._id,
      name: `${guest.firstName} ${guest.lastName}`.trim(),
      guestId: guest._id as Id<"guests">,
    }))
  if (data.invitation.allowPlusOne && rows.length > 0) {
    rows.push({
      key: "plus-one",
      name: `${rows[0].name} ${ELEGANT_COPY.rsvpPlusOneSuffix}`,
      guestId: null,
    })
  }

  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const { run, pending } = useToastMutation(api.guests.submitPublicRsvp, {
    success: "¡Gracias! Tu confirmación fue recibida.",
    error: "No pudimos enviar tu confirmación. Inténtalo de nuevo.",
  })

  // Every named guest must pick a choice before submitting, so the derived
  // public layout (pending/accepted/declined) is unambiguous. The +1 row has no
  // guest record, so it's excluded from this requirement.
  const allNamedAnswered = data.guests.every((g) => choices[g._id])
  const canSubmit = Boolean(data.eventSlug && data.invitationSlug) && allNamedAnswered

  const handleSubmit = async () => {
    if (!data.eventSlug || !data.invitationSlug) return
    if (!allNamedAnswered) {
      toast.error("Por favor responde por cada invitado.")
      return
    }
    const guestUpdates = rows.flatMap((row) =>
      row.guestId && choices[row.key]
        ? [{ guestId: row.guestId, rsvpStatus: choices[row.key] }]
        : []
    )
    if (guestUpdates.length === 0) {
      toast.error("Selecciona una opción para confirmar.")
      return
    }
    await run({
      eventSlug: data.eventSlug,
      invitationSlug: data.invitationSlug,
      guestUpdates,
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
      {rows.map((row) => (
        <GuestRsvp
          key={row.key}
          name={row.name}
          group={`rsvp-${block.id}-${row.key}`}
          value={choices[row.key]}
          onChange={(choice) =>
            setChoices((prev) => ({ ...prev, [row.key]: choice }))
          }
          attendLabel={attendLabel}
          declineLabel={declineLabel}
        />
      ))}
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
