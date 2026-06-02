"use client"

import { Doc, Id } from "convex/_generated/dataModel"

type MenuOption = Doc<"menuOptions">
type DrinkOption = Doc<"drinkOptions">
type Guest = Doc<"guests">

interface SelectionSummaryProps {
  options: Array<MenuOption | DrinkOption>
  guests: Guest[]
  type: "menu" | "drink"
}

export function SelectionSummary({ options, guests, type }: SelectionSummaryProps) {
  const counts = options.map((option) => {
    const count = guests.filter((g) => {
      if (type === "menu") return g.menuOptionId === option._id
      return g.drinkOptionId === option._id
    }).length
    return { name: option.name, count }
  })

  const unassigned = guests.filter((g) => {
    if (type === "menu") return !g.menuOptionId
    return !g.drinkOptionId
  }).length

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">Guest Selections</p>
      <div className="divide-y divide-zinc-100 rounded-md border text-sm">
        {counts.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-3 py-2">
            <span className="text-zinc-700">{item.name}</span>
            <span className="font-medium text-zinc-900">{item.count}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-zinc-400">No selection</span>
          <span className="font-medium text-zinc-500">{unassigned}</span>
        </div>
      </div>
    </div>
  )
}
