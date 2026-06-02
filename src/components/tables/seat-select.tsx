"use client"

import { Doc, Id } from "convex/_generated/dataModel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SeatSelectProps {
  seatNumber: number
  tableId: Id<"tables">
  unassignedGuests: Doc<"guests">[]
  onAssign: (guestId: Id<"guests">, tableId: Id<"tables">, seatNumber: number) => void
}

export function SeatSelect({ seatNumber, tableId, unassignedGuests, onAssign }: SeatSelectProps) {
  return (
    <Select
      onValueChange={(guestId) => onAssign(guestId as Id<"guests">, tableId, seatNumber)}
    >
      <SelectTrigger className="h-8 text-xs text-zinc-400">
        <SelectValue placeholder="Assign guest..." />
      </SelectTrigger>
      <SelectContent>
        {unassignedGuests.map((guest) => (
          <SelectItem key={guest._id} value={guest._id}>
            {guest.firstName} {guest.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
