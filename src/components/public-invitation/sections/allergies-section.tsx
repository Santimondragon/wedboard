import { Section } from "./section"
import type { PublicGuest } from "../types"

interface AllergiesSectionProps {
  guests: PublicGuest[]
}

// Draft only — inputs are not yet wired to the backend.
export function AllergiesSection({ guests }: AllergiesSectionProps) {
  return (
    <Section eyebrow="Dietary needs" heading="Allergies">
      <ul className="mx-auto max-w-md space-y-3 text-left">
        {guests.map((guest) => (
          <li key={guest._id} className="rounded-lg border bg-white px-4 py-3">
            <label className="block text-sm text-zinc-900">
              {guest.firstName} {guest.lastName}
              <input
                type="text"
                placeholder="Any allergies or restrictions?"
                className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>
          </li>
        ))}
      </ul>
    </Section>
  )
}
