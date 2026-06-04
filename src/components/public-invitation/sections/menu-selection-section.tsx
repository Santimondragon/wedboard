import { Section } from "./section"
import type { PublicGuest } from "../types"

interface MenuSelectionSectionProps {
  guests: PublicGuest[]
  /** Option names; placeholders until wired to `listMenuOptionsByEvent`. */
  options?: string[]
}

const DEFAULT_OPTIONS = ["Beef", "Chicken", "Vegetarian"]

// Draft only — selections are not yet persisted.
export function MenuSelectionSection({
  guests,
  options = DEFAULT_OPTIONS,
}: MenuSelectionSectionProps) {
  return (
    <Section eyebrow="Dinner" heading="Menu Selection">
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
