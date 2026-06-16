"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ELEGANT_COPY } from "../default-copy"
import { CircularPhoto, ElegantSection, SealStamp, getConfigImage } from "./primitives"

export function ElegantDressCode({ data, block }: BlockComponentProps) {
  const body = getConfigString(block, "dressCode") ?? ELEGANT_COPY.dressCode
  const note = getConfigString(block, "note")
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Dress code
      </h2>
      <div className="relative">
        <CircularPhoto
          className="size-[222px]"
          src={getConfigImage(data, block, "photo")}
          alt="Dress code"
        />
        <SealStamp className="absolute -bottom-1 right-1" />
      </div>
      <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
        {body}
      </p>
      {note && (
        <p className="font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {note}
        </p>
      )}
    </ElegantSection>
  )
}
