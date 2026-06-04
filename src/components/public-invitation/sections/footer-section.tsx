import { cn } from "@/lib/utils"
import { useTemplateTheme } from "../template-theme"
import type { PublicEvent } from "../types"

interface FooterSectionProps {
  event: PublicEvent
}

export function FooterSection({ event }: FooterSectionProps) {
  const theme = useTemplateTheme()
  return (
    <footer className="py-10 px-4 text-center">
      <p className={cn("text-lg", theme.heading)}>{event.name}</p>
      <p className={cn("mt-1 text-sm", theme.eyebrow)}>
        We can&apos;t wait to celebrate with you
      </p>
    </footer>
  )
}
