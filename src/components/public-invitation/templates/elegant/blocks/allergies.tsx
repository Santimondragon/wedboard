"use client"

import { useState } from "react"
import { getConfigList, getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"
import { ELEGANT_COPY } from "../default-copy"
import { CheckRow, ElegantSection, WeddingButton } from "./primitives"

export function ElegantAllergies({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.foodHeadline
  const note = getConfigString(block, "note") ?? ELEGANT_COPY.foodNote
  const configOptions = getConfigList(block, "options")
  const options = configOptions
    ? configOptions.filter((o): o is string => typeof o === "string")
    : [...ELEGANT_COPY.foodOptions]
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [other, setOther] = useState("")
  return (
    <ElegantSection className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
          {headline}
        </h2>
        <p className="font-elegant text-[16px] font-bold text-wedding-ink">
          {note}
        </p>
      </div>
      <div className="space-y-3">
        {options.map((option) => (
          <CheckRow
            key={option}
            label={option}
            checked={selected.has(option)}
            onChange={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev)
                if (checked) next.add(option)
                else next.delete(option)
                return next
              })
            }
          />
        ))}
        <label className="flex items-center gap-2 font-elegant text-[16px] font-bold text-wedding-ink">
          Otro:
          <input
            type="text"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            className="flex-1 border-b border-wedding-muted bg-transparent outline-none"
          />
        </label>
      </div>
      <WeddingButton>Enviar</WeddingButton>
    </ElegantSection>
  )
}
