import { Section } from "./section"
import type { PublicGuest } from "../types"

interface DrinkSelectionSectionProps {
  guests: PublicGuest[]
  /** Option names; placeholders until wired to `listDrinkOptionsByEvent`. */
  options?: string[]
}

const DEFAULT_OPTIONS = ["Wine", "Beer", "Non-alcoholic"]

// Draft only — selections are not yet persisted.
export function DrinkSelectionSection({
  guests,
  options = DEFAULT_OPTIONS,
}: DrinkSelectionSectionProps) {
  return (
    <Section eyebrow="Drinks" heading="Drink Selection">
      <ul className="mx-auto max-w-md space-y-3 text-left">
        {guests.map((guest) => (
          <li
            key={guest._id}
            className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
          >
            <span className="text-zinc-900">
              {guest.firstName} {guest.lastName}
            </span>
            <select className="rounded-md border px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </Section>
  )
}
