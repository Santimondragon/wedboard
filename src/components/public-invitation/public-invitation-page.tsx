"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { format } from "date-fns"
import { MapPin, Calendar } from "lucide-react"

interface PublicInvitationPageProps {
  eventSlug: string
  invitationSlug: string
}

export function PublicInvitationPage({
  eventSlug,
  invitationSlug,
}: PublicInvitationPageProps) {
  const data = useQuery(api.invitations.getPublicInvitation, {
    eventSlug,
    invitationSlug,
  })

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  if (data === null) {
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

  const { event, invitation, guests } = data

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
            You are invited
          </p>
          <h1 className="text-4xl font-semibold text-zinc-900">{event.name}</h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-zinc-500 text-sm">
            {event.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(new Date(event.date), "MMMM d, yyyy")}
              </span>
            )}
            {event.venueName && (
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

        {/* Guests */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {guests.length === 0 ? (
            <p className="text-center text-zinc-500">
              No guests have been added to this invitation yet.
            </p>
          ) : (
            <ul className="divide-y">
              {guests.map((guest) => (
                <li
                  key={guest._id}
                  className="py-3 text-center text-lg text-zinc-800"
                >
                  {guest.firstName} {guest.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
