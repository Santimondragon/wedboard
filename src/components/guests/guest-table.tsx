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
import { Button } from "@/components/ui/button"
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
import { Pencil } from "lucide-react"

type GuestRow = Doc<"guests"> & {
  invitationTitle?: string
  menuOptionName?: string
  drinkOptionName?: string
  tableName?: string
}

interface GuestTableProps {
  guests: GuestRow[]
  onEditGuest: (guestId: Id<"guests">) => void
}

const columnHelper = createColumnHelper<GuestRow>()

export function GuestTable({ guests, onEditGuest }: GuestTableProps) {
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
      columnHelper.accessor("menuOptionName", {
        header: "Menu",
        cell: (info) => (
          <span className="text-sm">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("drinkOptionName", {
        header: "Drink",
        cell: (info) => (
          <span className="text-sm">{info.getValue() ?? "—"}</span>
        ),
      }),
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
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditGuest(row.original._id)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ),
      }),
    ],
    [onEditGuest],
  )

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
