"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "convex/_generated/api"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ElegantSection, WeddingButton } from "./primitives"

export function ElegantGuestMessage({ block, data }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.messageHeadline
  const note = getConfigString(block, "note") ?? ELEGANT_COPY.messageNote
  const nameLabel =
    getConfigString(block, "nameLabel") ?? ELEGANT_COPY.messageNameLabel
  const messageLabel =
    getConfigString(block, "messageLabel") ?? ELEGANT_COPY.messageMessageLabel
  const placeholder =
    getConfigString(block, "placeholder") ?? ELEGANT_COPY.messagePlaceholder
  const submitLabel =
    getConfigString(block, "submitLabel") ?? ELEGANT_COPY.messageSubmitLabel

  // Prefill the name with the invitation's primary guest, when known.
  const [name, setName] = useState(() => {
    const first = data.guests[0]
    return first ? `${first.firstName} ${first.lastName}`.trim() : ""
  })
  const [message, setMessage] = useState("")

  const { run, pending } = useToastMutation(api.messages.submitGuestMessage, {
    success: "¡Gracias! Tu mensaje fue enviado.",
    error: "No pudimos enviar tu mensaje. Inténtalo de nuevo.",
  })

  // Submission needs the slugs (absent in the editor preview).
  const canSubmit = Boolean(data.eventSlug && data.invitationSlug)

  const handleSubmit = async () => {
    if (!data.eventSlug || !data.invitationSlug) return
    if (message.trim().length === 0) {
      toast.error("Escribe un mensaje antes de enviar.")
      return
    }
    const result = await run({
      eventSlug: data.eventSlug,
      invitationSlug: data.invitationSlug,
      name: name.trim(),
      message: message.trim(),
    })
    if (result.ok) setMessage("")
  }

  return (
    <ElegantSection className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
        {note && (
          <p className="font-elegant text-[16px] text-wedding-ink">{note}</p>
        )}
      </div>
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="font-elegant text-[16px] font-bold text-wedding-ink">
            {nameLabel}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-wedding-muted bg-transparent py-1 font-elegant text-[16px] text-wedding-ink outline-none focus:border-wedding-gold"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-elegant text-[16px] font-bold text-wedding-ink">
            {messageLabel}
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full resize-none border border-wedding-muted bg-transparent p-2 font-elegant text-[16px] text-wedding-ink outline-none focus:border-wedding-gold"
          />
        </label>
      </div>
      <div className="flex justify-center pt-2">
        <WeddingButton onClick={handleSubmit} disabled={!canSubmit || pending}>
          {pending ? "Enviando…" : submitLabel}
        </WeddingButton>
      </div>
    </ElegantSection>
  )
}
