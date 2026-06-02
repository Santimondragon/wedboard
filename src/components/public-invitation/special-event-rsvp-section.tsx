"use client"

import { Doc, Id } from "convex/_generated/dataModel"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CheckCircle, XCircle } from "lucide-react"

interface SpecialEventRsvp {
  guestId: string
  specialEventId: string
  status: "attending" | "declined" | "pending"
}

interface SpecialEventRsvpSectionProps {
  specialEvents: Doc<"specialEvents">[]
  guests: Doc<"guests">[]
  guestSpecialEventRsvps: SpecialEventRsvp[]
  onUpdate: (rsvps: SpecialEventRsvp[]) => void
}

export function SpecialEventRsvpSection({
  specialEvents,
  guests,
  guestSpecialEventRsvps,
  onUpdate,
}: SpecialEventRsvpSectionProps) {
  function getStatus(guestId: string, specialEventId: string): "attending" | "declined" | "pending" {
    return (
      guestSpecialEventRsvps.find(
        (r) => r.guestId === guestId && r.specialEventId === specialEventId,
      )?.status ?? "pending"
    )
  }

  function setStatus(
    guestId: string,
    specialEventId: string,
    status: "attending" | "declined" | "pending",
  ) {
    const updated = guestSpecialEventRsvps.filter(
      (r) => !(r.guestId === guestId && r.specialEventId === specialEventId),
    )
    onUpdate([...updated, { guestId, specialEventId, status }])
  }

  if (specialEvents.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900">Special Events</h2>
      {specialEvents.map((event) => (
        <div key={event._id} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base text-zinc-900">{event.name}</h3>
            {event.date && (
              <p className="text-sm text-zinc-500">
                {format(new Date(event.date), "MMMM d, yyyy")}
              </p>
            )}
            {event.location && (
              <p className="text-sm text-zinc-500">{event.location}</p>
            )}
          </div>

          <div className="space-y-3">
            {guests.map((guest) => {
              const status = getStatus(guest._id, event._id)
              const isAttending = status === "attending"
              const isDeclined = status === "declined"
              return (
                <div key={guest._id} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-zinc-700">
                    {guest.firstName} {guest.lastName}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus(guest._id, event._id, "attending")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        isAttending
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
                      )}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(guest._id, event._id, "declined")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        isDeclined
                          ? "border-rose-400 bg-rose-50 text-rose-700"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
                      )}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      No
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
