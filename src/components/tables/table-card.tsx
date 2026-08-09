"use client";

import { memo, useState } from "react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { SeatSelect } from "@/components/tables/seat-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Check, Minus, Pencil, Plus, Trash2, X } from "lucide-react";

const MIN_SEATS = 1;
const MAX_SEATS = 20;

interface TableCardProps {
  table: Doc<"tables">;
  assignedGuests: Doc<"guests">[];
  unassignedGuests: Doc<"guests">[];
  onAssign: (
    guestId: Id<"guests">,
    tableId: Id<"tables">,
    seatNumber: number,
  ) => void;
  onUnassign: (guestId: Id<"guests">) => void;
  onUpdateSeats: (id: Id<"tables">, seatsCount: number) => void;
  onDelete: (id: Id<"tables">) => void;
}

function guestName(guest: Doc<"guests">): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

// Memoized: with stable callbacks from TableGrid, a seat change in one table
// no longer re-renders every other card.
export const TableCard = memo(function TableCard({
  table,
  assignedGuests,
  unassignedGuests,
  onAssign,
  onUnassign,
  onUpdateSeats,
  onDelete,
}: TableCardProps) {
  const updateTable = useToastMutation(api.tables.updateTable, {
    error: "Failed to rename the table",
  });
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(table.name);
  // Set while a seat reduction would unseat someone — drives the confirmation.
  const [pendingShrink, setPendingShrink] = useState<number | null>(null);

  // `guests.seatNumber` is 0-based on the server (`assignGuestToSeat` rejects
  // `seatNumber >= seatsCount`); only the label is 1-based.
  const seats = Array.from({ length: table.seatsCount }, (_, i) => i);
  const guestBySeat: Record<number, Doc<"guests"> | undefined> = {};
  for (const g of assignedGuests) {
    if (g.seatNumber != null) guestBySeat[g.seatNumber] = g;
  }

  const filled = assignedGuests.length;
  const share =
    table.seatsCount > 0
      ? Math.min(100, Math.round((filled / table.seatsCount) * 100))
      : 0;

  async function handleSaveName() {
    const next = nameValue.trim();
    if (!next || next === table.name) {
      setNameValue(table.name);
      setEditingName(false);
      return;
    }
    const result = await updateTable.run({ id: table._id, name: next });
    if (result.ok) setEditingName(false);
  }

  /** Guests who would lose their seat if the table shrank to `seatsCount`. */
  function displacedBy(seatsCount: number): Doc<"guests">[] {
    return assignedGuests.filter(
      (g) => g.seatNumber != null && g.seatNumber >= seatsCount,
    );
  }

  // TODO-12-01: shrinking a table silently unseated guests. Confirm first.
  function handleRemoveSeat() {
    const next = table.seatsCount - 1;
    if (next < MIN_SEATS) return;
    if (displacedBy(next).length > 0) {
      setPendingShrink(next);
      return;
    }
    onUpdateSeats(table._id, next);
  }

  const displaced = pendingShrink === null ? [] : displacedBy(pendingShrink);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-soft-xs">
      <header className="space-y-4 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          {editingName ? (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <Input
                value={nameValue}
                aria-label={`Rename ${table.name}`}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameValue(table.name);
                    setEditingName(false);
                  }
                }}
                className="h-8"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSaveName}
              >
                <Check className="size-4" aria-hidden />
                <span className="sr-only">Save table name</span>
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <h3 className="text-section truncate text-foreground">
                {table.name}
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                    onClick={() => {
                      setNameValue(table.name);
                      setEditingName(true);
                    }}
                  >
                    <Pencil className="size-3" aria-hidden />
                    <span className="sr-only">Rename {table.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename table</TooltipContent>
              </Tooltip>
            </div>
          )}

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Delete {table.name}</span>
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete table</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {table.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {filled > 0
                    ? `${filled} ${filled === 1 ? "guest is" : "guests are"} seated here and will be moved back to the unseated list. `
                    : ""}
                  The table itself is removed permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(table._id)}
                  className="bg-danger text-danger-foreground hover:bg-danger/90"
                >
                  Delete table
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-muted-foreground">
              <span className="tabular-figures font-medium text-foreground">
                {filled}
              </span>{" "}
              of <span className="tabular-figures">{table.seatsCount}</span>{" "}
              seats filled
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                disabled={table.seatsCount <= MIN_SEATS}
                onClick={handleRemoveSeat}
              >
                <Minus className="size-3" aria-hidden />
                <span className="sr-only">Remove a seat from {table.name}</span>
              </Button>
              <span className="text-caption tabular-figures w-6 text-center text-foreground">
                {table.seatsCount}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                disabled={table.seatsCount >= MAX_SEATS}
                onClick={() => onUpdateSeats(table._id, table.seatsCount + 1)}
              >
                <Plus className="size-3" aria-hidden />
                <span className="sr-only">Add a seat to {table.name}</span>
              </Button>
            </div>
          </div>

          <Progress
            value={share}
            aria-label={`${table.name}: ${filled} of ${table.seatsCount} seats filled`}
            className="h-1.5 bg-secondary [&_[data-slot=progress-indicator]]:bg-accent"
          />
        </div>
      </header>

      <ul className="space-y-1 px-5 pb-5">
        {seats.map((seat) => {
          const guest = guestBySeat[seat];
          const label = seat + 1;

          return (
            <li key={seat} className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "text-caption tabular-figures flex size-6 shrink-0 items-center justify-center rounded-full",
                  guest
                    ? "bg-accent-soft text-accent-soft-foreground"
                    : "border border-dashed border-border text-muted-foreground",
                )}
              >
                {label}
              </span>

              {guest ? (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-secondary/70 py-1.5 pr-1 pl-3">
                  <span className="text-caption min-w-0 truncate font-medium text-foreground">
                    {guestName(guest)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => onUnassign(guest._id)}
                      >
                        <X className="size-3" aria-hidden />
                        <span className="sr-only">
                          Unseat {guestName(guest)} from seat {label}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Unseat guest</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <SeatSelect
                    seatNumber={seat}
                    seatLabel={label}
                    tableName={table.name}
                    tableId={table._id}
                    unassignedGuests={unassignedGuests}
                    onAssign={onAssign}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pendingShrink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingShrink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the last seat?</AlertDialogTitle>
            <AlertDialogDescription>
              {displaced.length === 1
                ? `${guestName(displaced[0])} is sitting in it and will be moved back to the unseated list.`
                : `${displaced.length} guests are sitting beyond the new seat count and will be moved back to the unseated list: ${displaced
                    .map(guestName)
                    .join(", ")}.`}{" "}
              You can seat them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the seat</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingShrink !== null) {
                  onUpdateSeats(table._id, pendingShrink);
                  setPendingShrink(null);
                }
              }}
            >
              Remove seat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
});
