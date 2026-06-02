"use client"

import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { TableCard } from "@/components/tables/table-card"

interface TableGridProps {
  tables: Doc<"tables">[]
  guestsByTable: Record<string, Doc<"guests">[]>
  unassignedGuests: Doc<"guests">[]
  eventId: Id<"events">
}

export function TableGrid({ tables, guestsByTable, unassignedGuests }: TableGridProps) {
  const assignGuestToSeat = useMutation(api.tables.assignGuestToSeat)
  const unassignGuestFromSeat = useMutation(api.tables.unassignGuestFromSeat)
  const updateTableSeats = useMutation(api.tables.updateTableSeats)
  const deleteTable = useMutation(api.tables.deleteTable)

  async function handleAssign(
    guestId: Id<"guests">,
    tableId: Id<"tables">,
    seatNumber: number,
  ) {
    try {
      await assignGuestToSeat({ guestId, tableId, seatNumber })
    } catch {
      toast.error("Failed to assign guest to seat")
    }
  }

  async function handleUnassign(guestId: Id<"guests">) {
    try {
      await unassignGuestFromSeat({ guestId })
    } catch {
      toast.error("Failed to unassign guest")
    }
  }

  async function handleUpdateSeats(id: Id<"tables">, seatsCount: number) {
    try {
      await updateTableSeats({ id, seatsCount })
    } catch {
      toast.error("Failed to update seat count")
    }
  }

  async function handleDelete(id: Id<"tables">) {
    try {
      await deleteTable({ id })
      toast.success("Table deleted")
    } catch {
      toast.error("Failed to delete table")
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables.map((table) => (
        <TableCard
          key={table._id}
          table={table}
          assignedGuests={guestsByTable[table._id] ?? []}
          unassignedGuests={unassignedGuests}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onUpdateSeats={handleUpdateSeats}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
