"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ELEGANT_COPY } from "../default-copy"
import {
  CircularPhoto,
  ElegantSection,
  SealStamp,
  coupleNames,
  formatDate,
  getConfigImage,
} from "./primitives"

export function ElegantHero({ data, block }: BlockComponentProps) {
  const [first, second] = coupleNames(data.event)
  const intro = getConfigString(block, "body") ?? ELEGANT_COPY.heroIntro
  return (
    <ElegantSection className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="font-script text-[20px] text-wedding-ink">
        {formatDate(data.event.date)}
      </p>
      <div className="relative">
        <CircularPhoto
          className="size-[236px]"
          src={getConfigImage(data, block, "heroImage")}
          alt={data.event.name}
        />
        <SealStamp className="absolute -bottom-1 right-2" />
      </div>
      <h1 className="font-script text-[48px] leading-[1.05] text-wedding-gold">
        {second ? (
          <>
            {first}
            <br />
            <span className="px-1">&amp;</span> {second}
          </>
        ) : (
          data.event.name
        )}
      </h1>
      <p className="font-elegant text-[16px] leading-relaxed text-wedding-ink">
        {intro}
      </p>
    </ElegantSection>
  )
}
