"use client"

import { Doc, Id } from "convex/_generated/dataModel"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GuestRsvpData {
  guestId: string
  rsvpStatus: "attending" | "declined" | "pending"
  menuOptionId?: string
  drinkOptionId?: string
  allergies?: string
  specialRequests?: string
}

interface GuestRsvpCardProps {
  guest: Doc<"guests">
  menuOptions: Doc<"menuOptions">[]
  drinkOptions: Doc<"drinkOptions">[]
  value: GuestRsvpData
  onUpdate: (data: GuestRsvpData) => void
}

export function GuestRsvpCard({
  guest,
  menuOptions,
  drinkOptions,
  value,
  onUpdate,
}: GuestRsvpCardProps) {
  function set(partial: Partial<GuestRsvpData>) {
    onUpdate({ ...value, ...partial })
  }

  const isAttending = value.rsvpStatus === "attending"
  const isDeclined = value.rsvpStatus === "declined"

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-lg text-zinc-900">
        {guest.firstName} {guest.lastName}
        {guest.isPlusOne && (
          <span className="ml-2 text-sm font-normal text-zinc-400">Plus One</span>
        )}
      </h3>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => set({ rsvpStatus: "attending" })}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-colors",
            isAttending
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
          )}
        >
          <CheckCircle className={cn("h-4 w-4", isAttending ? "text-emerald-500" : "text-zinc-400")} />
          Attending
        </button>
        <button
          type="button"
          onClick={() => set({ rsvpStatus: "declined" })}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-colors",
            isDeclined
              ? "border-rose-400 bg-rose-50 text-rose-700"
              : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
          )}
        >
          <XCircle className={cn("h-4 w-4", isDeclined ? "text-rose-400" : "text-zinc-400")} />
          Declined
        </button>
      </div>

      {isAttending && (
        <div className="space-y-3 pt-1">
          {menuOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Meal Preference</Label>
              <Select
                value={value.menuOptionId ?? "none"}
                onValueChange={(v) => set({ menuOptionId: v === "none" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meal..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {menuOptions.map((opt) => (
                    <SelectItem key={opt._id} value={opt._id}>
                      {opt.name}
                      {opt.description ? ` — ${opt.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {drinkOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Drink Preference</Label>
              <Select
                value={value.drinkOptionId ?? "none"}
                onValueChange={(v) => set({ drinkOptionId: v === "none" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drink..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {drinkOptions.map((opt) => (
                    <SelectItem key={opt._id} value={opt._id}>
                      {opt.name}
                      {opt.description ? ` — ${opt.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Allergies or dietary requirements</Label>
            <Textarea
              value={value.allergies ?? ""}
              onChange={(e) => set({ allergies: e.target.value })}
              placeholder="Any allergies or dietary needs..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Special requests</Label>
            <Textarea
              value={value.specialRequests ?? ""}
              onChange={(e) => set({ specialRequests: e.target.value })}
              placeholder="Any special requests..."
              rows={2}
            />
          </div>
        </div>
      )}

      {isDeclined && (
        <p className="text-sm text-zinc-400 italic">We&apos;ll miss you!</p>
      )}
    </div>
  )
}
