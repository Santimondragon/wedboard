"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, ElegantSection } from "./primitives"

export function ElegantFooter({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? ELEGANT_COPY.footerNote
  return (
    <ElegantSection className="flex flex-col items-center gap-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/footer-flourish.png`}
        alt=""
        className="h-12 w-auto object-contain"
      />
      <p className="font-elegant text-[24px] font-bold leading-relaxed text-wedding-gold">
        {note}
      </p>
    </ElegantSection>
  )
}
