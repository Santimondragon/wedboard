import { MapPin } from "lucide-react"
import { Section } from "./section"
import type { PublicEvent } from "../types"

interface LocationSectionProps {
  event: PublicEvent
}

export function LocationSection({ event }: LocationSectionProps) {
  return (
    <Section eyebrow="Where" heading="Location">
      <div className="flex flex-col items-center gap-1 text-zinc-600">
        <MapPin className="h-5 w-5 text-zinc-400" />
        <p className="text-lg text-zinc-900">
          {event.venueName ?? "Venue to be announced"}
        </p>
        {event.venueAddress && <p className="text-zinc-500">{event.venueAddress}</p>}
      </div>
    </Section>
  )
}
