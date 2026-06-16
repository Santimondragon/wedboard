"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ElegantSection } from "./primitives"

export function ElegantText({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline")
  const body = getConfigString(block, "body")
  return (
    <ElegantSection className="space-y-3 text-center">
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
