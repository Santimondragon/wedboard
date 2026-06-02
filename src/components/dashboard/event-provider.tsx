"use client"

import { createContext, useContext } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { type Doc } from "convex/_generated/dataModel"
import { LoadingState } from "@/components/app/loading-state"
import { Button } from "@/components/ui/button"
import { CalendarX } from "lucide-react"

const EventContext = createContext<Doc<"events"> | null>(null)

/**
 * Resolves the `[eventSlug]` route param to its event and exposes it to all
 * descendant dashboard pages. Handles loading and not-found states so pages
 * can assume a resolved event.
 */
export function EventProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const slug = params?.eventSlug as string | undefined
  const event = useQuery(
    api.events.getEventBySlug,
    slug ? { slug } : "skip",
  )

  if (event === undefined) {
    return <LoadingState message="Loading event…" />
  }

  if (event === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 min-h-[60vh] text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <CalendarX className="h-6 w-6 text-zinc-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-900">Event not found</h3>
          <p className="max-w-sm text-sm text-zinc-500">
            This event doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to events</Link>
        </Button>
      </div>
    )
  }

  return <EventContext.Provider value={event}>{children}</EventContext.Provider>
}

/** Returns the resolved current event. Throws if used outside EventProvider. */
export function useEvent(): Doc<"events"> {
  const event = useContext(EventContext)
  if (!event) {
    throw new Error("useEvent must be used within an EventProvider")
  }
  return event
}
