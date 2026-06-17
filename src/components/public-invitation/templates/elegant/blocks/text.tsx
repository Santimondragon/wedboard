"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ASSET_BASE, ElegantSection } from "./primitives"

export function ElegantText({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline")
  const body = getConfigString(block, "body")
  const showFlourishes = block.config?.showFlourishes !== false
  return (
    <ElegantSection className="relative space-y-3 text-center">
      {showFlourishes && (
        <img
          aria-hidden
          src={`${ASSET_BASE}/text-flourish.svg`}
          alt=""
          className="absolute -left-12 -top-2"
        />
      )}
      {showFlourishes && (
        <img
          aria-hidden
          src={`${ASSET_BASE}/text-flourish.svg`}
          alt=""
          className="absolute -right-12 top-1/2 scale-x-[-1]"
        />
      )}
      {headline && (
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
      )}
      {body && (
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {body}
        </p>
      )}
    </ElegantSection>
  )
}
