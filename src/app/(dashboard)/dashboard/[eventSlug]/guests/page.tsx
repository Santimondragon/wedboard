"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Id, Doc } from "convex/_generated/dataModel"
import { useEvent } from "@/components/dashboard/event-provider"
import { GuestTable } from "@/components/guests/guest-table"
import { GuestDetailsSheet } from "@/components/guests/guest-details-sheet"
import { GuestForm } from "@/components/guests/guest-form"
import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users } from "lucide-react"

export default function GuestsPage() {
  const eventId = useEvent()._id

  const pageData = useQuery(api.guests.getGuestsPageData, { eventId })
  const guests = pageData?.guests
  const invitations = pageData?.invitations
  const menuOptions = pageData?.menuOptions
  const drinkOptions = pageData?.drinkOptions
  const tables = pageData?.tables
  const specialEvents = pageData?.specialEvents
  const accessByEvent = pageData?.accessByEvent
  const specialRsvpByGuest = pageData?.specialRsvpByGuest

  const [selectedGuestId, setSelectedGuestId] = useState<Id<"guests"> | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

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

  // Reverse +1 link: host guest id → its +1 record, plus a name lookup so we
  // can label +1 rows and the details sheet.
  const plusOneByHost = useMemo(() => {
    const map: Record<string, Doc<"guests">> = {}
    if (!guests) return map
    for (const g of guests) {
      if (g.isPlusOne && g.plusOneOfGuestId) map[g.plusOneOfGuestId] = g
    }
    return map
  }, [guests])

  const guestNameById = useMemo(() => {
    if (!guests) return {} as Record<string, string>
    return Object.fromEntries(
      guests.map((g) => [g._id, `${g.firstName} ${g.lastName}`.trim()]),
    )
  }, [guests])

  const enrichedGuests = useMemo(() => {
    if (!guests) return []
    return guests.map((g) => {
      // +1 column label.
      let plusOneLabel: string | undefined
      if (g.isPlusOne && g.plusOneOfGuestId) {
        plusOneLabel = `↳ +1 de ${guestNameById[g.plusOneOfGuestId] ?? "—"}`
      } else if (g.allowsPlusOne) {
        const po = plusOneByHost[g._id]
        plusOneLabel = po ? `${po.firstName} ${po.lastName}`.trim() : "Allowed"
      }

      // Per-special-event status.
      const specialStatuses: Record<
        string,
        "notInvited" | "pending" | "attending" | "declined"
      > = {}
      for (const se of specialEvents ?? []) {
        // Invited either because the guest's invitation has access, or because
        // the owner explicitly added an RSVP row for this guest (see the guest
        // details dialog → setSpecialEventRsvp).
        const explicitStatus = specialRsvpByGuest?.[g._id]?.[se._id]
        const invitedViaAccess =
          !!g.invitationId &&
          g.rsvpStatus !== "declined" &&
          (accessByEvent?.[se._id]?.includes(g.invitationId) ?? false)
        specialStatuses[se._id] =
          invitedViaAccess || explicitStatus
            ? (explicitStatus ?? "pending")
            : "notInvited"
      }

      return {
        ...g,
        invitationTitle: g.invitationId ? invitationMap[g.invitationId] : undefined,
        menuOptionName: g.menuOptionId ? menuOptionMap[g.menuOptionId] : undefined,
        drinkOptionName: g.drinkOptionId ? drinkOptionMap[g.drinkOptionId] : undefined,
        tableName: g.tableId ? tableMap[g.tableId] : undefined,
        plusOneLabel,
        specialStatuses,
      }
    })
  }, [
    guests,
    invitationMap,
    menuOptionMap,
    drinkOptionMap,
    tableMap,
    specialEvents,
    accessByEvent,
    specialRsvpByGuest,
    plusOneByHost,
    guestNameById,
  ])

  const selectedGuest = useMemo(() => {
    if (!selectedGuestId) return null
    return enrichedGuests.find((g) => g._id === selectedGuestId) ?? null
  }, [selectedGuestId, enrichedGuests])

  const selectedPlusOne = selectedGuest
    ? (plusOneByHost[selectedGuest._id] ?? null)
    : null
  const selectedHostName =
    selectedGuest?.isPlusOne && selectedGuest.plusOneOfGuestId
      ? (guestNameById[selectedGuest.plusOneOfGuestId] ?? null)
      : null

  // Stable callback so GuestTable's memoized columns don't rebuild each render.
  const handleEditGuest = useCallback((guestId: Id<"guests">) => {
    setSelectedGuestId(guestId)
    setSheetOpen(true)
  }, [])

  const isLoading = guests === undefined

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Guests
          {guests !== undefined && (
            <span className="ml-2 text-base font-normal text-zinc-500">
              ({guests.length})
            </span>
          )}
        </h1>
        <Button onClick={() => setAddOpen(true)} size="sm">
          Add Guest
        </Button>
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
          description="Add guests here, then group them into invitations"
          action={{ label: "Add Guest", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <GuestTable
          guests={enrichedGuests}
          onEditGuest={handleEditGuest}
          specialEvents={specialEvents ?? []}
          showMenu={(menuOptions?.length ?? 0) > 0}
          showDrink={(drinkOptions?.length ?? 0) > 0}
        />
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
          </DialogHeader>
          <GuestForm eventId={eventId} onSuccess={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <GuestDetailsSheet
        guest={selectedGuest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        menuOptions={menuOptions ?? []}
        drinkOptions={drinkOptions ?? []}
        specialEvents={specialEvents ?? []}
        plusOne={selectedPlusOne}
        hostName={selectedHostName}
      />
    </div>
  )
}
