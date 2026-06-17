"use client"

import { getConfigList } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import {
  ITINERARY_ILLUSTRATION_FALLBACK,
  itineraryIllustrationSrc,
} from "../illustrations"
import { ASSET_BASE, ElegantSection, formatDate } from "./primitives"

export function ElegantItinerary({ data, block }: BlockComponentProps) {
  const configItems = getConfigList(block, "items")
  const items = configItems
    ? configItems
      .filter((i): i is Record<string, string> => typeof i !== "string")
      .map((i) => ({ time: i.time ?? "", label: i.label ?? "", illustration: i.illustration ?? "" }))
      .filter((i) => i.time || i.label)
    : ELEGANT_COPY.itineraryItems.map((i) => ({ ...i, illustration: "" }))
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <div className="space-y-1">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          Itinerario
        </h2>
        <p className="font-script text-[20px] text-wedding-ink">
          {formatDate(data.event.date)}
        </p>
      </div>
      <ul className="flex flex-col gap-0 w-75">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="group flex flex-col items-center gap-1 w-full odd:items-start even:items-end">
            <div className="relative flex flex-col items-center w-32">
              <img
                aria-hidden
                src={
                  itineraryIllustrationSrc(item.illustration) ??
                  ITINERARY_ILLUSTRATION_FALLBACK[i % ITINERARY_ILLUSTRATION_FALLBACK.length]
                }
                alt=""
                className="mb-1 h-20 w-auto object-contain"
              />
              <span className="font-elegant text-md font-bold text-wedding-ink">
                {item.time}
              </span>
              <span className="font-elegant text-md font-bold text-wedding-ink text-balance">
                {item.label}
              </span>
              <img
                aria-hidden
                src={`${ASSET_BASE}/itinerary-connector-right-left.svg`}
                alt=""
                className="absolute group-odd:hidden group-last:hidden top-[80%] right-[90%]"
              />
              <img
                aria-hidden
                src={`${ASSET_BASE}/itinerary-connector-left-right.svg`}
                alt=""
                className="absolute group-even:hidden group-last:hidden top-[80%] left-[90%]"
              />
            </div>
          </li>
        ))}
      </ul>
    </ElegantSection>
  )
}
