"use client"

import type { BlockComponentProps } from "../../default-blocks"
import {
  ASSET_BASE,
  ElegantSection,
  ImagePlaceholder,
  WeddingButton,
  getConfigImage,
  mapHref,
} from "./primitives"

export function ElegantLocation({ data, block }: BlockComponentProps) {
  const { venueName, venueAddress } = data.event
  const address =
    [venueName, venueAddress].filter(Boolean).join(", ") ||
    "Cra 123 # 123 - 123 Cali, Valle del Cauca"
  return (
    <ElegantSection className="flex flex-col items-center gap-4 pt-24 pb-6 text-center">
      <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
        Ubicación
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/location-flourish.png`}
        alt=""
        className="h-10 w-auto object-contain"
      />
      <ImagePlaceholder
        className="h-[200px] w-full rounded"
        src={getConfigImage(data, block, "mapImage")}
        alt="Mapa"
      />
      <p className="font-elegant text-[24px] leading-snug text-wedding-ink">
        {address}
      </p>
      <WeddingButton href={mapHref(data.event, address)}>Ver mapa</WeddingButton>
    </ElegantSection>
  )
}
