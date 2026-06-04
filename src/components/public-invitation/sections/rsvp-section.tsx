import { Section } from "./section"
import type { PublicGuest } from "../types"

interface RsvpSectionProps {
  guests: PublicGuest[]
}

// Draft only — controls are not yet wired to `submitPublicRsvp`.
export function RsvpSection({ guests }: RsvpSectionProps) {
  return (
    <Section eyebrow="Will you join us?" heading="RSVP">
      <ul className="mx-auto max-w-md space-y-3 text-left">
        {guests.map((guest) => (
          <li
            key={guest._id}
            className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
          >
            <span className="text-zinc-900">
              {guest.firstName} {guest.lastName}
            </span>
            <div className="flex gap-4 text-sm text-zinc-600">
              <label className="flex items-center gap-1.5">
                <input type="radio" name={`rsvp-${guest._id}`} /> Attending
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name={`rsvp-${guest._id}`} /> Declines
              </label>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
