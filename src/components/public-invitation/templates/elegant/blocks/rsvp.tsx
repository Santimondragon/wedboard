"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, ElegantSection } from "./primitives"

export function ElegantRsvp({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? ELEGANT_COPY.rsvpNote
  return (
    <ElegantSection className="flex flex-col items-center gap-2.5 px-10 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/rsvp-sprig.png`}
        alt=""
        className="h-16 w-auto object-contain"
      />
      <p className="font-elegant text-[20px] leading-relaxed text-wedding-ink">
        {note}
      </p>
    </ElegantSection>
  )
}
