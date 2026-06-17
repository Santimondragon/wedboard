"use client"

import { useState } from "react"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { CheckRow, ImagePlaceholder, WeddingButton, getConfigImage } from "./primitives"

export function ElegantStayInvite({ data, block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.stayHeadline
  const body = getConfigString(block, "body") ?? ELEGANT_COPY.stayBody
  const [stay, setStay] = useState<"yes" | "no" | null>(null)
  return (
    <section className="py-6">
      <ImagePlaceholder
        className="h-50 w-full"
      />
      <div className="space-y-4 px-6 pt-5">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {body}
        </p>
        <div className="space-y-3">
          <CheckRow
            type="radio"
            name="stay"
            label="Sí, reservar mi alojamiento"
            checked={stay === "yes"}
            onChange={() => setStay("yes")}
          />
          <CheckRow
            type="radio"
            name="stay"
            label="No necesitaré alojamiento"
            checked={stay === "no"}
            onChange={() => setStay("no")}
          />
        </div>
        <WeddingButton>Enviar</WeddingButton>
      </div>
    </section>
  )
}
