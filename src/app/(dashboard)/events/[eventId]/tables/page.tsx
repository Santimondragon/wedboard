"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { TableGrid } from "@/components/tables/table-grid"
import { AddTableDialog } from "@/components/tables/add-table-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableIcon, Plus } from "lucide-react"

export default function TablesPage() {
  const params = useParams()
  const eventId = params.eventId as Id<"events">

  const data = useQuery(api.tables.getTablesAndGuests, { eventId })
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const isLoading = data === undefined

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">Tables</h1>
          {data && data.unassignedGuests.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {data.unassignedGuests.length} unassigned
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Table
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.tables.length === 0 ? (
        <EmptyState
          icon={TableIcon}
          title="No tables yet"
          description="Create tables to start assigning guests to seats"
          action={{ label: "Add Table", onClick: () => setAddDialogOpen(true) }}
        />
      ) : (
        <TableGrid
          tables={data?.tables ?? []}
          guestsByTable={data?.guestsByTable ?? {}}
          unassignedGuests={data?.unassignedGuests ?? []}
          eventId={eventId}
        />
      )}

      <AddTableDialog
        eventId={eventId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  )
}
