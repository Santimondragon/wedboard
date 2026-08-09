"use client";

import { Doc, Id } from "convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SeatSelectProps {
  /** 0-based seat index, as stored on `guests.seatNumber`. */
  seatNumber: number;
  /** 1-based label used in accessible names. */
  seatLabel: number;
  tableName: string;
  tableId: Id<"tables">;
  unassignedGuests: Doc<"guests">[];
  onAssign: (
    guestId: Id<"guests">,
    tableId: Id<"tables">,
    seatNumber: number,
  ) => void;
}

/**
 * The one control an empty seat carries. Rendered borderless-dashed so a free
 * seat reads as an open space in the room rather than as another form field.
 */
export function SeatSelect({
  seatNumber,
  seatLabel,
  tableName,
  tableId,
  unassignedGuests,
  onAssign,
}: SeatSelectProps) {
  const hasGuests = unassignedGuests.length > 0;

  return (
    <Select
      disabled={!hasGuests}
      value=""
      onValueChange={(guestId) =>
        onAssign(guestId as Id<"guests">, tableId, seatNumber)
      }
    >
      <SelectTrigger
        size="sm"
        aria-label={`Seat a guest at seat ${seatLabel} of ${tableName}`}
        className="text-caption h-8 w-full border-dashed bg-transparent text-muted-foreground shadow-none data-[placeholder]:text-muted-foreground"
      >
        <SelectValue
          placeholder={hasGuests ? "Seat a guest…" : "Everyone is seated"}
        />
      </SelectTrigger>
      <SelectContent>
        {unassignedGuests.map((guest) => (
          <SelectItem key={guest._id} value={guest._id}>
            {guest.firstName} {guest.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
