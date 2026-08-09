"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Doc, Id } from "convex/_generated/dataModel";
import { RsvpStatusBadge } from "@/components/guests/rsvp-status-badge";
import { DataTableShell, StateBlock } from "@/components/app";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SpecialEventStatus =
  | "notInvited"
  | "pending"
  | "attending"
  | "declined";

type GuestRow = Doc<"guests"> & {
  invitationTitle?: string;
  menuOptionName?: string;
  drinkOptionName?: string;
  tableName?: string;
  // What to show in the +1 column.
  plusOneLabel?: string;
  // Per-special-event status, keyed by specialEventId.
  specialStatuses?: Record<string, SpecialEventStatus>;
};

interface GuestTableProps {
  guests: GuestRow[];
  onEditGuest: (guestId: Id<"guests">) => void;
  specialEvents?: { _id: string; name: string }[];
  showMenu?: boolean;
  showDrink?: boolean;
}

const columnHelper = createColumnHelper<GuestRow>();

/** Muted em-dash placeholder, so "no value" never reads as a value. */
function Blank() {
  return (
    <span className="text-muted-foreground/60" aria-label="Not set">
      —
    </span>
  );
}

export function GuestTable({
  guests,
  onEditGuest,
  specialEvents = [],
  showMenu = true,
  showDrink = true,
}: GuestTableProps) {
  const [search, setSearch] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState("all");

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase());
      const matchesRsvp = rsvpFilter === "all" || g.rsvpStatus === rsvpFilter;
      return matchesSearch && matchesRsvp;
    });
  }, [guests, search, rsvpFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: "name",
        header: "Name",
        cell: (info) => (
          <span className="text-body font-medium text-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("invitationTitle", {
        header: "Invitation",
        cell: (info) => (
          <span className="text-caption text-muted-foreground">
            {info.getValue() ?? <Blank />}
          </span>
        ),
      }),
      columnHelper.accessor("rsvpStatus", {
        header: "RSVP",
        cell: (info) => (
          <RsvpStatusBadge status={info.getValue() ?? "pending"} />
        ),
      }),
      columnHelper.accessor("plusOneLabel", {
        id: "plusOne",
        header: "+1",
        cell: (info) => (
          <span className="text-caption text-muted-foreground">
            {info.getValue() ?? <Blank />}
          </span>
        ),
      }),
      ...specialEvents.map((se) =>
        columnHelper.accessor((row) => row.specialStatuses?.[se._id], {
          id: `special-${se._id}`,
          header: se.name,
          cell: (info) => {
            const status = info.getValue();
            if (!status || status === "notInvited") {
              return (
                <span className="text-caption text-muted-foreground/70">
                  Not invited
                </span>
              );
            }
            return <RsvpStatusBadge status={status} />;
          },
        }),
      ),
      ...(showMenu
        ? [
            columnHelper.accessor("menuOptionName", {
              header: "Menu",
              cell: (info) => (
                <span className="text-caption text-foreground">
                  {info.getValue() ?? <Blank />}
                </span>
              ),
            }),
          ]
        : []),
      ...(showDrink
        ? [
            columnHelper.accessor("drinkOptionName", {
              header: "Drink",
              cell: (info) => (
                <span className="text-caption text-foreground">
                  {info.getValue() ?? <Blank />}
                </span>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("allergies", {
        header: "Allergies",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <Blank />;
          return (
            <span className="text-caption text-foreground" title={val}>
              {val.length > 30 ? val.slice(0, 30) + "…" : val}
            </span>
          );
        },
      }),
      columnHelper.accessor(
        (row) => ({ tableName: row.tableName, seatNumber: row.seatNumber }),
        {
          id: "tableSeat",
          header: "Table / Seat",
          cell: (info) => {
            const { tableName, seatNumber } = info.getValue();
            if (!tableName) {
              return (
                <span className="text-caption text-muted-foreground/70">
                  Unassigned
                </span>
              );
            }
            return (
              <span className="text-caption tabular-figures text-foreground">
                {tableName}
                {seatNumber != null ? ` · Seat ${seatNumber}` : ""}
              </span>
            );
          },
        },
      ),
    ],
    [specialEvents, showMenu, showDrink],
  );

  // TanStack Table's hook returns functions React Compiler can't memoize; the
  // component opts out of compilation here intentionally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const isFiltered = search.trim() !== "" || rsvpFilter !== "all";

  const toolbar = (
    <>
      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder="Search guests…"
          aria-label="Search guests by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={rsvpFilter} onValueChange={setRsvpFilter}>
        <SelectTrigger className="w-40" aria-label="Filter by RSVP status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="attending">Attending</SelectItem>
          <SelectItem value="declined">Declined</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const footer = (
    <span className="tabular-figures">
      {isFiltered
        ? `${rows.length} of ${guests.length} guests`
        : `${guests.length} ${guests.length === 1 ? "guest" : "guests"}`}
    </span>
  );

  return (
    <DataTableShell toolbar={toolbar} footer={footer}>
      <table className="w-full caption-bottom border-collapse text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-caption px-5 font-medium text-muted-foreground"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <StateBlock
                  kind="empty"
                  compact
                  icon={Search}
                  title="No matching guests"
                  description="Try a different name or clear the RSVP filter."
                  action={
                    isFiltered
                      ? {
                          label: "Clear filters",
                          onClick: () => {
                            setSearch("");
                            setRsvpFilter("all");
                          },
                        }
                      : undefined
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                role="button"
                aria-label={`Edit ${row.original.firstName} ${row.original.lastName}`}
                className="cursor-pointer focus-visible:bg-secondary/60 focus-visible:outline-none"
                onClick={() => onEditGuest(row.original._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEditGuest(row.original._id);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </DataTableShell>
  );
}
