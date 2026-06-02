"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { GuestRsvpCard, type GuestRsvpData } from "@/components/public-invitation/guest-rsvp-card"
import { SpecialEventRsvpSection } from "@/components/public-invitation/special-event-rsvp-section"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface PublicRsvpFormProps {
  invitation: Doc<"invitations">
  guests: Doc<"guests">[]
  menuOptions: Doc<"menuOptions">[]
  drinkOptions: Doc<"drinkOptions">[]
  specialEvents: Doc<"specialEvents">[]
}

interface SpecialEventRsvp {
  guestId: string
  specialEventId: string
  status: "attending" | "declined" | "pending"
}

function initialGuestData(guests: Doc<"guests">[]): GuestRsvpData[] {
  return guests.map((g) => ({
    guestId: g._id,
    rsvpStatus: (g.rsvpStatus as "attending" | "declined" | "pending") ?? "pending",
    menuOptionId: g.menuOptionId ?? undefined,
    drinkOptionId: g.drinkOptionId ?? undefined,
    allergies: g.allergies ?? undefined,
    specialRequests: g.specialRequests ?? undefined,
  }))
}

export function PublicRsvpForm({
  invitation,
  guests,
  menuOptions,
  drinkOptions,
  specialEvents,
}: PublicRsvpFormProps) {
  const submitRsvp = useMutation(api.guests.submitPublicRsvp)

  const [guestData, setGuestData] = useState<GuestRsvpData[]>(() => initialGuestData(guests))
  const [specialEventRsvps, setSpecialEventRsvps] = useState<SpecialEventRsvp[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setGuestData(initialGuestData(guests))
  }, [guests])

  function updateGuest(data: GuestRsvpData) {
    setGuestData((prev) =>
      prev.map((g) => (g.guestId === data.guestId ? data : g)),
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitRsvp({
        invitationSlug: invitation.slug,
        guestUpdates: guestData.map((g) => ({
          guestId: g.guestId,
          rsvpStatus: g.rsvpStatus,
          menuOptionId: g.menuOptionId as Id<"menuOptions"> | undefined,
          drinkOptionId: g.drinkOptionId as Id<"drinkOptions"> | undefined,
          allergies: g.allergies,
          specialRequests: g.specialRequests,
        })),
        specialEventRsvps:
          specialEventRsvps.length > 0
            ? specialEventRsvps.map((r) => ({
                guestId: r.guestId,
                specialEventId: r.specialEventId as Id<"specialEvents">,
                status: r.status,
              }))
            : undefined,
      })
      setSubmitted(true)
    } catch {
      toast.error("Failed to submit RSVP. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900">Thank you!</h2>
        <p className="text-zinc-500 max-w-sm mx-auto">
          Your RSVP has been received. We look forward to celebrating with you!
        </p>
        <Button
          variant="outline"
          onClick={() => setSubmitted(false)}
          className="mt-4"
        >
          Update my RSVP
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-zinc-900">Your RSVP</h2>
        {guests.map((guest) => {
          const data = guestData.find((g) => g.guestId === guest._id)
          if (!data) return null
          return (
            <GuestRsvpCard
              key={guest._id}
              guest={guest}
              menuOptions={menuOptions}
              drinkOptions={drinkOptions}
              value={data}
              onUpdate={updateGuest}
            />
          )
        })}
      </div>

      {specialEvents.length > 0 && (
        <SpecialEventRsvpSection
          specialEvents={specialEvents}
          guests={guests}
          guestSpecialEventRsvps={specialEventRsvps}
          onUpdate={setSpecialEventRsvps}
        />
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit RSVP"}
      </Button>
    </div>
  )
}
