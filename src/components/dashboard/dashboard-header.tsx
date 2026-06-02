"use client"

import { useParams, usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { EventStatusBadge } from "@/components/dashboard/event-status-badge"

const PAGE_TITLES: Record<string, string> = {
  "": "Overview",
  "invitations": "Invitations",
  "guests": "Guests",
  "menu": "Menu & Drinks",
  "tables": "Tables",
  "settings": "Settings",
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  // If last segment looks like an ID (eventId), it's the overview page
  if (!last || last.length > 20) return "Overview"
  return PAGE_TITLES[last] ?? "Overview"
}

export function DashboardHeader() {
  const params = useParams()
  const pathname = usePathname()
  const eventId = params?.eventId as Id<"events"> | undefined

  const event = useQuery(
    api.events.getEventById,
    eventId ? { eventId } : "skip"
  )

  const pageTitle = getPageTitle(pathname)

  return (
    <header className="border-b bg-white px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">{pageTitle}</h1>
        {event && (
          <>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500">{event.name}</span>
            <EventStatusBadge status={event.status as "draft" | "active" | "archived"} />
          </>
        )}
      </div>
      <UserButton />
    </header>
  )
}
