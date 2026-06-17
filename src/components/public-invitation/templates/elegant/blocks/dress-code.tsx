"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { SealedPhoto, ElegantSection, getConfigImage, RichText } from "./primitives"

export function ElegantDressCode({ data, block }: BlockComponentProps) {
  const body = getConfigString(block, "dressCode") ?? ELEGANT_COPY.dressCode
  const note = getConfigString(block, "note")
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center pb-12">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Dress code
      </h2>
      <SealedPhoto
        src={getConfigImage(data, block, "photo")}
        alt={data.event.name}
        isTilted
      />
      <RichText
        className="block whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink"
        text={body}
      />
      {note && (
        <RichText
          className="block font-elegant text-[16px] leading-relaxed text-wedding-ink"
          text={note}
        />
      )}
    </ElegantSection>
  )
}
