import { Section } from "./section"

interface SpecialInvitationSectionProps {
  /** Eyebrow label above the title; defaults to "Special Invitation". */
  eyebrow?: string
  name?: string
  description?: string
  date?: string
  location?: string
}

export function SpecialInvitationSection({
  eyebrow,
  name,
  description,
  date,
  location,
}: SpecialInvitationSectionProps) {
  return (
    <Section
      eyebrow={eyebrow ?? "Special Invitation"}
      heading={name ?? "Special Event"}
    >
      <p>
        {description ?? "Details for this special event will be shared here."}
      </p>
      <div className="flex flex-col items-center gap-0.5 text-sm">
        {date && <span>{date}</span>}
        {location && <span>{location}</span>}
      </div>
    </Section>
  )
}
