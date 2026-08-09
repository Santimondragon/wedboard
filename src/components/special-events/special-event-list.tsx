"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, MapPin, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { ListRow, ListRows, StatusPill } from "@/components/app";

type SpecialEvent = Doc<"specialEvents">;

interface SpecialEventListProps {
  specialEvents: SpecialEvent[];
  /** invitation ids each special event is currently visible to. */
  accessByEvent: Record<string, string[]>;
  onEdit: (specialEvent: SpecialEvent) => void;
  onDelete: (id: Id<"specialEvents">) => void;
}

export function SpecialEventList({
  specialEvents,
  accessByEvent,
  onEdit,
  onDelete,
}: SpecialEventListProps) {
  const updateSpecialEvent = useMutation(api.specialEvents.updateSpecialEvent);

  async function handleToggleActive(specialEvent: SpecialEvent) {
    try {
      await updateSpecialEvent({
        id: specialEvent._id,
        isActive: !specialEvent.isActive,
      });
    } catch {
      toast.error("Failed to update special invitation");
    }
  }

  return (
    <ListRows>
      {specialEvents.map((specialEvent) => {
        const accessCount = accessByEvent[specialEvent._id]?.length ?? 0;
        const isActive = specialEvent.isActive ?? true;

        return (
          <ListRow
            key={specialEvent._id}
            className="items-start"
            leading={
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft">
                <Sparkles
                  className="size-4 text-accent-soft-foreground"
                  aria-hidden
                />
              </div>
            }
            title={
              <span className="flex items-center gap-2">
                {specialEvent.name}
                <StatusPill tone={isActive ? "success" : "neutral"} dot>
                  {isActive ? "Active" : "Hidden"}
                </StatusPill>
              </span>
            }
            subtitle={
              <div className="space-y-1.5">
                {specialEvent.description && (
                  <p className="line-clamp-2">{specialEvent.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {specialEvent.date && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" aria-hidden />
                      {format(new Date(specialEvent.date), "PP · p")}
                    </span>
                  )}
                  {specialEvent.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {specialEvent.location}
                    </span>
                  )}
                  <span className="tabular-nums">
                    Visible to {accessCount}{" "}
                    {accessCount === 1 ? "invitation" : "invitations"}
                  </span>
                </div>
              </div>
            }
            actions={
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleActive(specialEvent)}
                      aria-label={`${isActive ? "Hide" : "Show"} ${
                        specialEvent.name
                      } on invitations`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {isActive
                      ? "Visible on invitations"
                      : "Hidden from invitations"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(specialEvent)}
                    >
                      <Pencil className="size-4" aria-hidden />
                      <span className="sr-only">Edit {specialEvent.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit special invitation</TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-danger hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          <span className="sr-only">
                            Delete {specialEvent.name}
                          </span>
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Delete special invitation</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete special invitation
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        &ldquo;{specialEvent.name}&rdquo; will be permanently
                        deleted, along with its guest responses and invitation
                        access. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(specialEvent._id)}
                        className="bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger/30"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            }
          />
        );
      })}
    </ListRows>
  );
}
