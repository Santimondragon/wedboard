"use client"

import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import {
  SealedPhoto,
  ElegantSection,
  SealStamp,
  coupleNames,
  formatDate,
  getConfigImage,
} from "./primitives"

export function ElegantHero({ data, block }: BlockComponentProps) {
  const [first, second] = coupleNames(data.event);
  const intro = getConfigString(block, "body") ?? ELEGANT_COPY.heroIntro;
  
  return (
    <ElegantSection className="Hero flex flex-col items-center gap-4 pt-12 pb-10 text-center">
      <p className="font-script text-xl text-wedding-ink">
        {formatDate(data.event.date)}
      </p>
      <SealedPhoto
        className="w-[80%]"
        src={getConfigImage(data, block, "heroImage")}
        alt={data.event.name}
      />
      <h1 className="font-script text-[48px] leading-[1.05] text-wedding-gold text-balance">
        {first && second ? (
          <>{first} &amp; {second}</>
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
