"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { Sparkles, Plus } from "lucide-react"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { useEvent } from "@/components/dashboard/event-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/app/empty-state"
import { SpecialEventForm } from "@/components/special-events/special-event-form"
import { SpecialEventList } from "@/components/special-events/special-event-list"

type SpecialEvent = Doc<"specialEvents">

const MAX_SPECIAL_EVENTS = 2

export default function SpecialEventsPage() {
  const eventId = useEvent()._id

  const pageData = useQuery(api.specialEvents.getSpecialEventsPageData, {
    eventId,
  })

  const deleteSpecialEvent = useToastMutation(
    api.specialEvents.deleteSpecialEvent,
    {
      success: "Special invitation deleted",
      error: "Failed to delete special invitation",
    }
  )

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<SpecialEvent | undefined>(undefined)

  function openCreate() {
    setFormMode("create")
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(specialEvent: SpecialEvent) {
    setFormMode("edit")
    setEditing(specialEvent)
    setFormOpen(true)
  }

  async function handleDelete(id: Id<"specialEvents">) {
    await deleteSpecialEvent.run({ id })
  }

  const isLoading = pageData === undefined
  const specialEvents = pageData?.specialEvents ?? []
  const atCap = specialEvents.length >= MAX_SPECIAL_EVENTS

  // Keep the edited row in sync with live query data (e.g. after toggling access).
  const editingLive = editing
    ? specialEvents.find((se) => se._id === editing._id) ?? editing
    : undefined

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Special Events
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mini sub-events (welcome dinner, after-party…) guests RSVP to from
          their invitation. Up to {MAX_SPECIAL_EVENTS} per event.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {isLoading
            ? ""
            : `${specialEvents.length} of ${MAX_SPECIAL_EVENTS}`}
        </p>
        <Button
          size="sm"
          onClick={openCreate}
          disabled={isLoading || atCap}
          title={atCap ? `Limit of ${MAX_SPECIAL_EVENTS} reached` : undefined}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add special invitation
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : specialEvents.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No special invitations yet"
          description="Create a mini sub-event your guests can RSVP to separately."
        />
      ) : (
        <SpecialEventList
          specialEvents={specialEvents}
          accessByEvent={pageData.accessByEvent}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      <SpecialEventForm
        mode={formMode}
        specialEvent={editingLive}
        eventId={eventId}
        invitations={pageData?.invitations ?? []}
        accessIds={editingLive ? pageData?.accessByEvent[editingLive._id] ?? [] : []}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}
