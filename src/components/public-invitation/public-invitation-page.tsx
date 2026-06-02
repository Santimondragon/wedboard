"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { PublicRsvpForm } from "@/components/public-invitation/public-rsvp-form"
import { format } from "date-fns"
import { MapPin, Calendar } from "lucide-react"

interface PublicInvitationPageProps {
  slug: string
}

export function PublicInvitationPage({ slug }: PublicInvitationPageProps) {
  const invitation = useQuery(api.invitations.getPublicInvitationBySlug, { slug })
  const guests = useQuery(
    api.guests.listByInvitation,
    invitation ? { invitationId: invitation._id } : "skip",
  )
  const menuOptions = useQuery(
    api.menu.listMenuOptionsByEvent,
    invitation ? { eventId: invitation.eventId } : "skip",
  )
  const drinkOptions = useQuery(
    api.drinks.listDrinkOptionsByEvent,
    invitation ? { eventId: invitation.eventId } : "skip",
  )
  const specialEvents = useQuery(
    api.specialEvents.listForInvitation,
    invitation ? { invitationId: invitation._id } : "skip",
  )

  if (invitation === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  if (invitation === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Invitation Not Found</h1>
          <p className="text-zinc-500">
            This invitation link may be invalid or has been removed.
          </p>
        </div>
      </div>
    )
  }

  const event = (invitation as any).event

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
            You are invited
          </p>
          <h1 className="text-4xl font-semibold text-zinc-900">
            {event?.name ?? invitation.eventId}
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-zinc-500 text-sm">
            {event?.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(event.date), "MMMM d, yyyy")}
              </span>
            )}
            {event?.venueName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.venueName}
                {event.venueAddress ? `, ${event.venueAddress}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Invitation title */}
        <div className="text-center">
          <div className="inline-block rounded-xl border bg-white px-6 py-3 shadow-sm">
            <p className="text-zinc-500 text-sm">Invitation for</p>
            <p className="text-lg font-semibold text-zinc-900">{invitation.title}</p>
          </div>
        </div>

        {/* RSVP form */}
        {guests === undefined || menuOptions === undefined || drinkOptions === undefined ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-700" />
          </div>
        ) : (
          <PublicRsvpForm
            invitation={invitation}
            guests={guests}
            menuOptions={menuOptions ?? []}
            drinkOptions={drinkOptions ?? []}
            specialEvents={specialEvents ?? []}
          />
        )}
      </div>
    </div>
  )
}
