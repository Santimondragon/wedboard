"use client"

import type { BlockComponentProps } from "../../types"
import { ElegantSection, pad, useRemaining } from "./primitives"

export function ElegantCountdown({ data }: BlockComponentProps) {
  const { days, hours, minutes } = useRemaining(data.event.date)
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Faltan
      </h2>
      <p className="font-script text-6xl leading-none text-wedding-ink tabular-nums">
        {pad(days)}:{pad(hours)}:{pad(minutes)}
      </p>
      <div className="grid w-full max-w-50 grid-cols-3 gap-4 font-elegant text-[16px] font-bold text-wedding-ink">
        <span>Días</span>
        <span>Horas</span>
        <span>Min</span>
      </div>
    </ElegantSection>
  )
}
