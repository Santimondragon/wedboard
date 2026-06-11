"use client"

import { memo, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { SeatSelect } from "@/components/tables/seat-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Minus, Plus, Trash2, X, Pencil, Check } from "lucide-react"

interface TableCardProps {
  table: Doc<"tables">
  assignedGuests: Doc<"guests">[]
  unassignedGuests: Doc<"guests">[]
  onAssign: (guestId: Id<"guests">, tableId: Id<"tables">, seatNumber: number) => void
  onUnassign: (guestId: Id<"guests">) => void
  onUpdateSeats: (id: Id<"tables">, seatsCount: number) => void
  onDelete: (id: Id<"tables">) => void
}

// Memoized: with stable callbacks from TableGrid, a seat change in one table
// no longer re-renders every other card.
export const TableCard = memo(function TableCard({
  table,
  assignedGuests,
  unassignedGuests,
  onAssign,
  onUnassign,
  onUpdateSeats,
  onDelete,
}: TableCardProps) {
  const updateTable = useMutation(api.tables.updateTable)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(table.name)

  const seats = Array.from({ length: table.seatsCount }, (_, i) => i + 1)
  const guestBySeat: Record<number, Doc<"guests"> | undefined> = {}
  for (const g of assignedGuests) {
    if (g.seatNumber != null) {
      guestBySeat[g.seatNumber] = g
    }
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return
    try {
      await updateTable({ id: table._id, name: nameValue.trim() })
      setEditingName(false)
    } catch {
      toast.error("Failed to update table name")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          {editingName ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-7 text-sm font-semibold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName()
                  if (e.key === "Escape") {
                    setNameValue(table.name)
                    setEditingName(false)
                  }
                }}
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={handleSaveName}>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <CardTitle className="text-base">{table.name}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Table</AlertDialogTitle>
                <AlertDialogDescription>
                  {assignedGuests.length > 0
                    ? `This table has ${assignedGuests.length} guest(s) assigned. They will be unassigned. `
                    : ""}
                  Are you sure you want to delete &ldquo;{table.name}&rdquo;?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(table._id)}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {assignedGuests.length}/{table.seatsCount} seats filled
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={table.seatsCount <= 1}
              onClick={() => onUpdateSeats(table._id, table.seatsCount - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs w-6 text-center">{table.seatsCount}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={table.seatsCount >= 20}
              onClick={() => onUpdateSeats(table._id, table.seatsCount + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-1.5">
        {seats.map((seatNum) => {
          const guest = guestBySeat[seatNum]
          return (
            <div key={seatNum} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-5 shrink-0">{seatNum}</span>
              {guest ? (
                <div className="flex items-center justify-between flex-1 rounded-md bg-zinc-50 border px-2 py-1">
                  <span className="text-xs font-medium text-zinc-700">
                    {guest.firstName} {guest.lastName}
                  </span>
                  <button
                    onClick={() => onUnassign(guest._id)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex-1">
                  <SeatSelect
                    seatNumber={seatNum}
                    tableId={table._id}
                    unassignedGuests={unassignedGuests}
                    onAssign={onAssign}
                  />
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
})
