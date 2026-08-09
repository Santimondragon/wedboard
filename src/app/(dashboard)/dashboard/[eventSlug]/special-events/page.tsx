"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Info, Plus, Sparkles } from "lucide-react";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useEvent } from "@/components/dashboard/event-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader, Panel, StateBlock, StatusPill } from "@/components/app";
import { SpecialEventForm } from "@/components/special-events/special-event-form";
import { SpecialEventList } from "@/components/special-events/special-event-list";

type SpecialEvent = Doc<"specialEvents">;

const MAX_SPECIAL_EVENTS = 2;

export default function SpecialEventsPage() {
  const eventId = useEvent()._id;

  const pageData = useQuery(api.specialEvents.getSpecialEventsPageData, {
    eventId,
  });

  const deleteSpecialEvent = useToastMutation(
    api.specialEvents.deleteSpecialEvent,
    {
      success: "Special invitation deleted",
      error: "Failed to delete special invitation",
    },
  );

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SpecialEvent | undefined>(undefined);

  function openCreate() {
    setFormMode("create");
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(specialEvent: SpecialEvent) {
    setFormMode("edit");
    setEditing(specialEvent);
    setFormOpen(true);
  }

  async function handleDelete(id: Id<"specialEvents">) {
    await deleteSpecialEvent.run({ id });
  }

  const isLoading = pageData === undefined;
  const specialEvents = pageData?.specialEvents ?? [];
  const atCap = specialEvents.length >= MAX_SPECIAL_EVENTS;

  // Keep the edited row in sync with live query data (e.g. after toggling access).
  const editingLive = editing
    ? (specialEvents.find((se) => se._id === editing._id) ?? editing)
    : undefined;

  const addButton = (
    <Button onClick={openCreate} disabled={isLoading || atCap}>
      <Plus className="size-4" aria-hidden />
      Add special invitation
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Special Invitations"
        description="Mini sub-events — a welcome dinner, an after-party — that selected invitations can RSVP to separately from the main event."
        actions={
          atCap ? (
            <Tooltip>
              {/* A disabled button doesn't fire pointer events; the span carries them. */}
              <TooltipTrigger asChild>
                <span tabIndex={0}>{addButton}</span>
              </TooltipTrigger>
              <TooltipContent>
                Limit of {MAX_SPECIAL_EVENTS} reached — delete one to add
                another.
              </TooltipContent>
            </Tooltip>
          ) : (
            addButton
          )
        }
      />

      <Panel
        padded={false}
        title="Your special invitations"
        description="Each one is assigned to invitations individually, so only the guests you choose ever see it."
        actions={
          !isLoading && (
            <StatusPill tone={atCap ? "warning" : "neutral"}>
              <span className="tabular-nums">
                {specialEvents.length} of {MAX_SPECIAL_EVENTS} used
              </span>
            </StatusPill>
          )
        }
        footer={
          atCap ? (
            <p className="text-caption flex items-center gap-2 text-warning-foreground">
              <Info className="size-4 shrink-0" aria-hidden />
              You&apos;ve reached the limit of {MAX_SPECIAL_EVENTS} special
              invitations for this event. Delete one to make room for another.
            </p>
          ) : (
            <p className="text-caption text-muted-foreground">
              You can create up to {MAX_SPECIAL_EVENTS} special invitations per
              event.
            </p>
          )
        }
      >
        {isLoading ? (
          <StateBlock
            kind="loading"
            title="Loading special invitations…"
            description="Fetching this event's sub-events."
          />
        ) : specialEvents.length === 0 ? (
          <StateBlock
            kind="empty"
            icon={Sparkles}
            title="No special invitations yet"
            description="Create a mini sub-event your guests can RSVP to separately, then choose which invitations can see it."
            action={{ label: "Add special invitation", onClick: openCreate }}
          />
        ) : (
          <SpecialEventList
            specialEvents={specialEvents}
            accessByEvent={pageData.accessByEvent}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </Panel>

      <SpecialEventForm
        mode={formMode}
        specialEvent={editingLive}
        eventId={eventId}
        invitations={pageData?.invitations ?? []}
        accessIds={
          editingLive ? (pageData?.accessByEvent[editingLive._id] ?? []) : []
        }
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </>
  );
}
