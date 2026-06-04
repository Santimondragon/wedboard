import { Section } from "./section"

interface ItineraryItem {
  time: string
  title: string
}

interface ItinerarySectionProps {
  items?: ItineraryItem[]
}

// Placeholder schedule until itinerary data is modeled in the backend.
const DEFAULT_ITEMS: ItineraryItem[] = [
  { time: "4:00 PM", title: "Ceremony" },
  { time: "5:00 PM", title: "Cocktail hour" },
  { time: "6:30 PM", title: "Dinner" },
  { time: "8:00 PM", title: "Dancing" },
]

export function ItinerarySection({ items = DEFAULT_ITEMS }: ItinerarySectionProps) {
  return (
    <Section eyebrow="The day" heading="Itinerary">
      <ul className="mx-auto max-w-sm divide-y text-left">
        {items.map((item) => (
          <li
            key={`${item.time}-${item.title}`}
            className="flex items-baseline justify-between py-3"
          >
            <span className="text-sm uppercase tracking-widest text-zinc-400">
              {item.time}
            </span>
            <span className="text-zinc-900">{item.title}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
