"use client";

import { useCallback } from "react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { TableCard } from "@/components/tables/table-card";

interface TableGridProps {
  tables: Doc<"tables">[];
  guestsByTable: Record<string, Doc<"guests">[]>;
  unassignedGuests: Doc<"guests">[];
  eventId: Id<"events">;
}

export function TableGrid({
  tables,
  guestsByTable,
  unassignedGuests,
}: TableGridProps) {
  const { run: assignGuestToSeat } = useToastMutation(
    api.tables.assignGuestToSeat,
    { error: "Failed to assign guest to seat" },
  );
  const { run: unassignGuestFromSeat } = useToastMutation(
    api.tables.unassignGuestFromSeat,
    { error: "Failed to unassign guest" },
  );
  const { run: updateTableSeats } = useToastMutation(
    api.tables.updateTableSeats,
    { error: "Failed to update seat count" },
  );
  const { run: deleteTable } = useToastMutation(api.tables.deleteTable, {
    success: "Table deleted",
    error: "Failed to delete table",
  });

  // Stable callbacks so memoized TableCards only re-render when their own
  // table/guest data changes.
  const handleAssign = useCallback(
    async (
      guestId: Id<"guests">,
      tableId: Id<"tables">,
      seatNumber: number,
    ) => {
      await assignGuestToSeat({ guestId, tableId, seatNumber });
    },
    [assignGuestToSeat],
  );

  const handleUnassign = useCallback(
    async (guestId: Id<"guests">) => {
      await unassignGuestFromSeat({ guestId });
    },
    [unassignGuestFromSeat],
  );

  const handleUpdateSeats = useCallback(
    async (id: Id<"tables">, seatsCount: number) => {
      await updateTableSeats({ id, seatsCount });
    },
    [updateTableSeats],
  );

  const handleDelete = useCallback(
    async (id: Id<"tables">) => {
      await deleteTable({ id });
    },
    [deleteTable],
  );

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tables.map((table) => (
        <TableCard
          key={table._id}
          table={table}
          assignedGuests={guestsByTable[table._id] ?? []}
          unassignedGuests={unassignedGuests}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onUpdateSeats={handleUpdateSeats}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
