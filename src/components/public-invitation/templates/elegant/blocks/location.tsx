"use client"

import type { BlockComponentProps } from "../../default-blocks"
import { getConfigString } from "../../../blocks"
import {
  ASSET_BASE,
  ElegantSection,
  FullWidthPhoto,
  WeddingButton,
  getConfigImage,
  mapHref,
} from "./primitives"

export function ElegantLocation({ data, block }: BlockComponentProps) {
  const { venueName, venueAddress } = data.event
  const derivedAddress =
    [venueName, venueAddress].filter(Boolean).join(", ") ||
    "Venue Name, Venue Address"

  const title = getConfigString(block, "title") ?? "Ubicación"
  const address = getConfigString(block, "address") ?? derivedAddress
  const mapImageSrc = getConfigImage(data, block, "mapImage")
  const buttonLabel = getConfigString(block, "buttonLabel") ?? "Ver mapa"
  const buttonUrl = getConfigString(block, "buttonUrl") ?? mapHref(data.event, derivedAddress)
  const showButton = !!(venueAddress || getConfigString(block, "buttonUrl"))

  return (
    <ElegantSection className="relative flex flex-col items-center gap-4 px-0 pt-32 pb-6 text-center">
      <img
        aria-hidden
        src={`${ASSET_BASE}/location-flourish.svg`}
        alt=""
        className="absolute w-[120%] min-w-130 max-w-none left-[50%] top-0 -translate-x-1/2"
      />
      <h2 className="font-elegant text-3xl font-bold text-wedding-ink px-6">
        {title}
      </h2>
      <div className="relative">
        <FullWidthPhoto src={mapImageSrc} alt={title} />
        {showButton && <WeddingButton className="absolute bottom-8 left-1/2 -translate-1/2" href={buttonUrl}>{buttonLabel}</WeddingButton>}
      </div>

      <p className="font-elegant text-3xl leading-snug text-wedding-ink px-6">
        {address}
      </p>
    </ElegantSection>
  )
}
