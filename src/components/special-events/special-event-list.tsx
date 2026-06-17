"use client"

import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { format } from "date-fns"
import { toast } from "sonner"
import { CalendarClock, MapPin, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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

type SpecialEvent = Doc<"specialEvents">

interface SpecialEventListProps {
  specialEvents: SpecialEvent[]
  /** invitation ids each special event is currently visible to. */
  accessByEvent: Record<string, string[]>
  onEdit: (specialEvent: SpecialEvent) => void
  onDelete: (id: Id<"specialEvents">) => void
}

export function SpecialEventList({
  specialEvents,
  accessByEvent,
  onEdit,
  onDelete,
}: SpecialEventListProps) {
  const updateSpecialEvent = useMutation(api.specialEvents.updateSpecialEvent)

  async function handleToggleActive(specialEvent: SpecialEvent) {
    try {
      await updateSpecialEvent({
        id: specialEvent._id,
        isActive: !specialEvent.isActive,
      })
    } catch {
      toast.error("Failed to update special invitation")
    }
  }

  return (
    <div className="divide-y divide-zinc-100 rounded-md border">
      {specialEvents.map((specialEvent) => {
        const accessCount = accessByEvent[specialEvent._id]?.length ?? 0
        return (
          <div
            key={specialEvent._id}
            className="flex items-start justify-between gap-4 px-4 py-3"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium text-sm text-zinc-900 truncate">
                {specialEvent.name}
              </p>
              {specialEvent.description && (
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {specialEvent.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                {specialEvent.date && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {format(new Date(specialEvent.date), "PP · p")}
                  </span>
                )}
                {specialEvent.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {specialEvent.location}
                  </span>
                )}
                <span>
                  Visible to {accessCount}{" "}
                  {accessCount === 1 ? "invitation" : "invitations"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={specialEvent.isActive ?? true}
                onCheckedChange={() => handleToggleActive(specialEvent)}
                aria-label="Active"
              />
              <Button variant="ghost" size="sm" onClick={() => onEdit(specialEvent)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete special invitation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &ldquo;{specialEvent.name}
                      &rdquo;? This also removes its guest responses and
                      invitation access. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(specialEvent._id)}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )
      })}
    </div>
  )
}
