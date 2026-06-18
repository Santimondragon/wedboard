"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table"
import { Doc, Id } from "convex/_generated/dataModel"
import { RsvpStatusBadge } from "@/components/guests/rsvp-status-badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type SpecialEventStatus =
  | "notInvited"
  | "pending"
  | "attending"
  | "declined"

type GuestRow = Doc<"guests"> & {
  invitationTitle?: string
  menuOptionName?: string
  drinkOptionName?: string
  tableName?: string
  // What to show in the +1 column.
  plusOneLabel?: string
  // Per-special-event status, keyed by specialEventId.
  specialStatuses?: Record<string, SpecialEventStatus>
}

interface GuestTableProps {
  guests: GuestRow[]
  onEditGuest: (guestId: Id<"guests">) => void
  specialEvents?: { _id: string; name: string }[]
  showMenu?: boolean
  showDrink?: boolean
}

const columnHelper = createColumnHelper<GuestRow>()

export function GuestTable({
  guests,
  onEditGuest,
  specialEvents = [],
  showMenu = true,
  showDrink = true,
}: GuestTableProps) {
  const [search, setSearch] = useState("")
  const [rsvpFilter, setRsvpFilter] = useState("all")

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      const fullName = `${g.firstName} ${g.lastName}`.toLowerCase()
      const matchesSearch = fullName.includes(search.toLowerCase())
      const matchesRsvp =
        rsvpFilter === "all" || g.rsvpStatus === rsvpFilter
      return matchesSearch && matchesRsvp
    })
  }, [guests, search, rsvpFilter])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: "name",
        header: "Name",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("invitationTitle", {
        header: "Invitation",
        cell: (info) => (
          <span className="text-zinc-500 text-sm">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("rsvpStatus", {
        header: "RSVP",
        cell: (info) => <RsvpStatusBadge status={info.getValue() ?? "pending"} />,
      }),
      columnHelper.accessor("plusOneLabel", {
        id: "plusOne",
        header: "+1",
        cell: (info) => (
          <span className="text-sm text-zinc-600">{info.getValue() ?? "—"}</span>
        ),
      }),
      ...specialEvents.map((se) =>
        columnHelper.accessor((row) => row.specialStatuses?.[se._id], {
          id: `special-${se._id}`,
          header: se.name,
          cell: (info) => {
            const status = info.getValue()
            if (!status || status === "notInvited") {
              return <span className="text-zinc-400 text-sm">Not invited</span>
            }
            return <RsvpStatusBadge status={status} />
          },
        }),
      ),
      ...(showMenu
        ? [
            columnHelper.accessor("menuOptionName", {
              header: "Menu",
              cell: (info) => (
                <span className="text-sm">{info.getValue() ?? "—"}</span>
              ),
            }),
          ]
        : []),
      ...(showDrink
        ? [
            columnHelper.accessor("drinkOptionName", {
              header: "Drink",
              cell: (info) => (
                <span className="text-sm">{info.getValue() ?? "—"}</span>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("allergies", {
        header: "Allergies",
        cell: (info) => {
          const val = info.getValue()
          if (!val) return <span className="text-zinc-400 text-sm">—</span>
          return (
            <span className="text-sm" title={val}>
              {val.length > 30 ? val.slice(0, 30) + "…" : val}
            </span>
          )
        },
      }),
      columnHelper.accessor((row) => ({ tableName: row.tableName, seatNumber: row.seatNumber }), {
        id: "tableSeat",
        header: "Table/Seat",
        cell: (info) => {
          const { tableName, seatNumber } = info.getValue()
          if (!tableName) return <span className="text-zinc-400 text-sm">Unassigned</span>
          return (
            <span className="text-sm">
              {tableName}
              {seatNumber != null ? ` · Seat ${seatNumber}` : ""}
            </span>
          )
        },
      }),
    ],
    [specialEvents, showMenu, showDrink],
  )

  // TanStack Table's hook returns functions React Compiler can't memoize; the
  // component opts out of compilation here intentionally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={rsvpFilter} onValueChange={setRsvpFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="attending">Attending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 text-zinc-500">
                  No guests found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => onEditGuest(row.original._id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
