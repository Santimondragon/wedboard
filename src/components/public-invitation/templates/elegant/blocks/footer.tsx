"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, ElegantSection } from "./primitives"

export function ElegantFooter({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? ELEGANT_COPY.footerNote
  return (
    <ElegantSection className="flex flex-col items-center gap-6 pt-10 pb-16 text-center">
      <p className="font-elegant text-[24px] font-bold leading-relaxed text-wedding-gold">
        {note}
      </p>
      <img
        aria-hidden
        src={`${ASSET_BASE}/footer-flourish.svg`}
        alt=""
        className="h-auto w-[80%] object-contain"
      />
    </ElegantSection>
  )
}
