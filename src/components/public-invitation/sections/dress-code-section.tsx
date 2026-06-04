import { Section } from "./section"

interface DressCodeSectionProps {
  dressCode?: string
  note?: string
}

export function DressCodeSection({ dressCode, note }: DressCodeSectionProps) {
  return (
    <Section eyebrow="What to wear" heading="Dress Code">
      <p className="text-lg text-zinc-900">{dressCode ?? "Formal / Black Tie"}</p>
      <p className="text-zinc-500">
        {note ?? "We kindly ask our guests to dress accordingly."}
      </p>
    </Section>
  )
}
