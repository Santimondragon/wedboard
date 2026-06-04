"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Section } from "./section"
import { useTemplateTheme } from "../template-theme"

interface CountdownSectionProps {
  /** Event date as Unix ms. Section renders a placeholder when omitted. */
  date?: number
}

function getRemaining(target: number) {
  const diff = Math.max(0, target - Date.now())
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)
  return { days, hours, minutes, seconds }
}

export function CountdownSection({ date }: CountdownSectionProps) {
  const theme = useTemplateTheme()
  const [remaining, setRemaining] = useState(() =>
    date ? getRemaining(date) : null
  )

  useEffect(() => {
    if (!date) return
    const id = setInterval(() => setRemaining(getRemaining(date)), 1000)
    return () => clearInterval(id)
  }, [date])

  return (
    <Section eyebrow="Counting down" heading="Until we celebrate">
      {remaining ? (
        <div className="flex justify-center gap-6 text-zinc-900">
          {[
            { label: "Days", value: remaining.days },
            { label: "Hours", value: remaining.hours },
            { label: "Minutes", value: remaining.minutes },
            { label: "Seconds", value: remaining.seconds },
          ].map((unit) => (
            <div key={unit.label} className="flex flex-col items-center">
              <span className={cn("text-3xl tabular-nums", theme.heading)}>
                {unit.value}
              </span>
              <span
                className={cn(
                  "text-xs uppercase tracking-widest",
                  theme.eyebrow
                )}
              >
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-500">Date to be announced</p>
      )}
    </Section>
  )
}
