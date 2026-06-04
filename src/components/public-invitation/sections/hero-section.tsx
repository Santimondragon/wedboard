import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useTemplateTheme } from "../template-theme"
import type { PublicEvent, PublicInvitation } from "../types"

interface HeroSectionProps {
  event: PublicEvent
  invitation: PublicInvitation
}

export function HeroSection({ event, invitation }: HeroSectionProps) {
  const theme = useTemplateTheme()
  return (
    <section className="py-20 px-4 text-center">
      <div className={cn("max-w-2xl mx-auto space-y-6", theme.body)}>
        <p
          className={cn(
            "text-sm font-medium uppercase tracking-widest",
            theme.eyebrow
          )}
        >
          You are invited
        </p>
        <h1 className={cn("text-5xl", theme.heroTitle)}>{event.name}</h1>
        {event.date && (
          <p className="text-lg">
            {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
          </p>
        )}
        <p>Dear {invitation.title},</p>
      </div>
    </section>
  )
}
