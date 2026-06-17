"use client"

import { getConfigList } from "../../../blocks"
import type { BlockComponentProps } from "../../types"
import { ELEGANT_COPY } from "../default-copy"
import { ElegantSection, ITINERARY_ICONS, formatDate } from "./primitives"

export function ElegantItinerary({ data, block }: BlockComponentProps) {
  const configItems = getConfigList(block, "items")
  const items = configItems
    ? configItems
        .filter((i): i is Record<string, string> => typeof i !== "string")
        .map((i) => ({ time: i.time ?? "", label: i.label ?? "" }))
        .filter((i) => i.time || i.label)
    : [...ELEGANT_COPY.itineraryItems]
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
      <ul className="space-y-6">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              aria-hidden
              src={ITINERARY_ICONS[i % ITINERARY_ICONS.length]}
              alt=""
              className="mb-1 h-20 w-auto object-contain"
            />
            <span className="font-elegant text-[16px] font-bold text-wedding-ink">
              {item.time}
            </span>
            <span className="font-elegant text-[16px] font-bold text-wedding-ink">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </ElegantSection>
  )
}
