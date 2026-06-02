"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { ChevronsUpDown, PlusCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateEventDialog } from "@/components/dashboard/create-event-dialog"

export function EventSwitcher() {
  const router = useRouter()
  const params = useParams()
  const eventSlug = params?.eventSlug as string | undefined
  const events = useQuery(api.events.listMyEvents)
  const [createOpen, setCreateOpen] = useState(false)

  const currentEvent = events?.find((e) => e?.slug === eventSlug)

  function switchToEvent(slug: string) {
    router.push(`/dashboard/${slug}`)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors">
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="truncate text-xs text-zinc-500 font-normal">Current event</span>
              <span className="truncate font-semibold leading-tight">
                {currentEvent?.name ?? (events === undefined ? "Loading…" : "Select event")}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {events && events.length > 0 ? (
            events.map((event) => (
              <DropdownMenuItem
                key={event._id}
                onClick={() => switchToEvent(event.slug)}
                className="flex items-center justify-between"
              >
                <span className={cn("truncate", event.slug === eventSlug && "font-medium")}>
                  {event.name}
                </span>
                {event.slug === eventSlug && <Check className="h-4 w-4 shrink-0 text-zinc-500" />}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No events yet</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
