"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Id, Doc } from "convex/_generated/dataModel"
import { GuestTable } from "@/components/guests/guest-table"
import { GuestDetailsSheet } from "@/components/guests/guest-details-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Users } from "lucide-react"

export default function GuestsPage() {
  const params = useParams()
  const eventId = params.eventId as Id<"events">

  const guests = useQuery(api.guests.listByEvent, { eventId })
  const invitations = useQuery(api.invitations.listByEvent, { eventId })
  const menuOptions = useQuery(api.menu.listMenuOptionsByEventAdmin, { eventId })
  const drinkOptions = useQuery(api.drinks.listDrinkOptionsByEventAdmin, { eventId })
  const tables = useQuery(api.tables.listTablesByEvent, { eventId })

  const [selectedGuestId, setSelectedGuestId] = useState<Id<"guests"> | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const invitationMap = useMemo(() => {
    if (!invitations) return {}
    return Object.fromEntries(invitations.map((inv) => [inv._id, inv.title]))
  }, [invitations])

  const menuOptionMap = useMemo(() => {
    if (!menuOptions) return {}
    return Object.fromEntries(menuOptions.map((o) => [o._id, o.name]))
  }, [menuOptions])

  const drinkOptionMap = useMemo(() => {
    if (!drinkOptions) return {}
    return Object.fromEntries(drinkOptions.map((o) => [o._id, o.name]))
  }, [drinkOptions])

  const tableMap = useMemo(() => {
    if (!tables) return {}
    return Object.fromEntries(tables.map((t) => [t._id, t.name]))
  }, [tables])

  const enrichedGuests = useMemo(() => {
    if (!guests) return []
    return guests.map((g) => ({
      ...g,
      invitationTitle: g.invitationId ? invitationMap[g.invitationId] : undefined,
      menuOptionName: g.menuOptionId ? menuOptionMap[g.menuOptionId] : undefined,
      drinkOptionName: g.drinkOptionId ? drinkOptionMap[g.drinkOptionId] : undefined,
      tableName: g.tableId ? tableMap[g.tableId] : undefined,
    }))
  }, [guests, invitationMap, menuOptionMap, drinkOptionMap, tableMap])

  const selectedGuest = useMemo(() => {
    if (!selectedGuestId) return null
    return enrichedGuests.find((g) => g._id === selectedGuestId) ?? null
  }, [selectedGuestId, enrichedGuests])

  function handleEditGuest(guestId: Id<"guests">) {
    setSelectedGuestId(guestId)
    setSheetOpen(true)
  }

  const isLoading = guests === undefined

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Guests
          {guests !== undefined && (
            <span className="ml-2 text-base font-normal text-zinc-500">
              ({guests.length})
            </span>
          )}
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guests yet"
          description="Guests added to invitations will appear here"
        />
      ) : (
        <GuestTable guests={enrichedGuests} onEditGuest={handleEditGuest} />
      )}

      <GuestDetailsSheet
        guest={selectedGuest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        menuOptions={menuOptions ?? []}
        drinkOptions={drinkOptions ?? []}
      />
    </div>
  )
}
