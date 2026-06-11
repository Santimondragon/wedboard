"use client"

import { Doc } from "convex/_generated/dataModel"

type MenuOption = Doc<"menuOptions">
type DrinkOption = Doc<"drinkOptions">

interface SelectionSummaryProps {
  options: Array<MenuOption | DrinkOption>
  /** Guest count per option id (from api.menu.getSelectionCounts). */
  counts: Record<string, number>
  unassigned: number
}

export function SelectionSummary({ options, counts, unassigned }: SelectionSummaryProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">Guest Selections</p>
      <div className="divide-y divide-zinc-100 rounded-md border text-sm">
        {options.map((option) => (
          <div key={option._id} className="flex items-center justify-between px-3 py-2">
            <span className="text-zinc-700">{option.name}</span>
            <span className="font-medium text-zinc-900">{counts[option._id] ?? 0}</span>
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
