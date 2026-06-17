"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ASSET_BASE, ElegantSection } from "./primitives"

export function ElegantSpecialInvitation({ block }: BlockComponentProps) {
  const description = getConfigString(block, "description") ?? ELEGANT_COPY.dinnerDescription
  const name = getConfigString(block, "name") ?? ELEGANT_COPY.dinnerName
  return (
    <ElegantSection className="relative px-16 py-40 text-center">
      {/* Floral border frame from the design — sits behind the content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/special-invite-frame.png`}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
      <div className="relative flex flex-col items-center gap-2.5">
        <p className="font-elegant text-[16px] font-bold leading-relaxed text-wedding-ink">
          {description}
        </p>
        <h2 className="font-script text-[48px] leading-tight text-wedding-ink">
          {name}
        </h2>
      </div>
    </ElegantSection>
  )
}
