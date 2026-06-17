"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { getConfigList, getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { CheckRow, ElegantSection, WeddingButton } from "./primitives"

/** Per-guest allergy answer. Defaults to "no allergies". */
type GuestAllergy = {
  has: boolean
  selected: Set<string>
  other: string
}

const emptyAnswer = (): GuestAllergy => ({
  has: false,
  selected: new Set(),
  other: "",
})

/** Build the persisted allergies string for one guest. */
function buildAllergies(answer: GuestAllergy): string {
  if (!answer.has) return ""
  return [...answer.selected, answer.other.trim()].filter(Boolean).join(", ")
}

/** Two-option pill toggle: "no allergies" vs "yes, some". */
function AllergyToggle({
  value,
  onChange,
  noneLabel,
  hasLabel,
}: {
  value: boolean
  onChange: (has: boolean) => void
  noneLabel: string
  hasLabel: string
}) {
  const base =
    "flex-1 cursor-pointer border px-3 py-2 text-center font-elegant text-[15px] transition-colors"
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          base,
          !value
            ? "border-wedding-gold bg-wedding-gold text-white"
            : "border-wedding-muted text-wedding-ink"
        )}
      >
        {noneLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          base,
          value
            ? "border-wedding-gold bg-wedding-gold text-white"
            : "border-wedding-muted text-wedding-ink"
        )}
      >
        {hasLabel}
      </button>
    </div>
  )
}

function GuestAllergyRow({
  name,
  answer,
  onChange,
  options,
  noneLabel,
  hasLabel,
  otherLabel,
  otherPlaceholder,
}: {
  name: string
  answer: GuestAllergy
  onChange: (next: GuestAllergy) => void
  options: string[]
  noneLabel: string
  hasLabel: string
  otherLabel: string
  otherPlaceholder: string
}) {
  return (
    <div className="space-y-5 border-b border-wedding-muted/60 pb-5 last:border-0 last:pb-0">
      <p className="font-elegant text-[20px] font-bold text-wedding-ink">
        {name}
      </p>
      <AllergyToggle
        value={answer.has}
        onChange={(has) => onChange({ ...answer, has })}
        noneLabel={noneLabel}
        hasLabel={hasLabel}
      />
      {answer.has && (
        <div className="space-y-4 pl-1">
          {options.map((option) => (
            <CheckRow
              key={option}
              label={option}
              checked={answer.selected.has(option)}
              onChange={(checked) => {
                const next = new Set(answer.selected)
                if (checked) next.add(option)
                else next.delete(option)
                onChange({ ...answer, selected: next })
              }}
            />
          ))}
          <label className="flex items-center gap-2 font-elegant text-[16px] font-bold text-wedding-ink">
            {otherLabel}
            <input
              type="text"
              value={answer.other}
              placeholder={otherPlaceholder}
              onChange={(e) => onChange({ ...answer, other: e.target.value })}
              className="flex-1 border-b border-wedding-muted bg-transparent outline-none mt-2"
            />
          </label>
        </div>
      )}
    </div>
  )
}

export function ElegantAllergies({ block, data }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.foodHeadline
  const note = getConfigString(block, "note") ?? ELEGANT_COPY.foodNote
  const question = getConfigString(block, "question") ?? ELEGANT_COPY.foodQuestion
  const noneLabel = getConfigString(block, "noneLabel") ?? ELEGANT_COPY.foodNoneLabel
  const hasLabel = getConfigString(block, "hasLabel") ?? ELEGANT_COPY.foodHasLabel
  const otherLabel = getConfigString(block, "otherLabel") ?? ELEGANT_COPY.foodOtherLabel
  const submitLabel = getConfigString(block, "submitLabel") ?? ELEGANT_COPY.foodSubmitLabel
  const configOptions = getConfigList(block, "options")
  const options = configOptions
    ? configOptions.filter((o): o is string => typeof o === "string")
    : [...ELEGANT_COPY.foodOptions]

  const [answers, setAnswers] = useState<Record<string, GuestAllergy>>(() =>
    Object.fromEntries(data.guests.map((g) => [g._id, emptyAnswer()]))
  )

  const { run, pending } = useToastMutation(api.guests.submitPublicRsvp, {
    success: "¡Gracias! Guardamos tus preferencias alimentarias.",
    error: "No pudimos guardar tus preferencias. Inténtalo de nuevo.",
  })

  const canSubmit = Boolean(data.eventSlug && data.invitationSlug)

  const handleSubmit = async () => {
    if (!data.eventSlug || !data.invitationSlug) return
    // This block lives on the "accepted" layout, so its guests are attending.
    const guestUpdates = data.guests.map((g) => ({
      guestId: g._id as Id<"guests">,
      rsvpStatus: "attending" as const,
      allergies: buildAllergies(answers[g._id] ?? emptyAnswer()),
    }))
    if (guestUpdates.length === 0) {
      toast.error("No hay invitados para registrar.")
      return
    }
    await run({
      eventSlug: data.eventSlug,
      invitationSlug: data.invitationSlug,
      guestUpdates,
    })
  }

  return (
    <ElegantSection className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
          {headline}
        </h2>
        <p className="font-elegant text-[16px] font-bold text-wedding-ink">
          {note}
        </p>
      </div>
      {data.guests.length === 0 ? (
        <p className="font-elegant text-[16px] text-wedding-ink/70">{question}</p>
      ) : (
        <div className="space-y-5">
          {data.guests.map((guest) => (
            <GuestAllergyRow
              key={guest._id}
              name={`${guest.firstName} ${guest.lastName}`.trim()}
              answer={answers[guest._id] ?? emptyAnswer()}
              onChange={(next) =>
                setAnswers((prev) => ({ ...prev, [guest._id]: next }))
              }
              options={options}
              noneLabel={noneLabel}
              hasLabel={hasLabel}
              otherLabel={otherLabel}
              otherPlaceholder={ELEGANT_COPY.foodOtherPlaceholder}
            />
          ))}
        </div>
      )}
      <div className="flex justify-center pt-1">
        <WeddingButton onClick={handleSubmit} disabled={!canSubmit || pending}>
          {pending ? "Enviando…" : submitLabel}
        </WeddingButton>
      </div>
    </ElegantSection>
  )
}
