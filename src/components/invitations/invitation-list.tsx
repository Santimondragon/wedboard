"use client";

import { useState } from "react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, Sparkles } from "lucide-react";
import { DataTableShell, StatusPill } from "@/components/app";
import { CopyInvitationLinkButton } from "@/components/invitations/copy-invitation-link-button";
import { InvitationForm } from "@/components/invitations/invitation-form";

interface InvitationGuest {
  _id: Id<"guests">;
  firstName: string;
  lastName: string;
  isPlusOne: boolean;
  rsvpStatus: string;
}

interface Invitation {
  _id: Id<"invitations">;
  title: string;
  slug: string;
  isActive: boolean;
  isSent?: boolean;
  notes?: string;
  guestCount?: number;
  guests?: InvitationGuest[];
  specialEvents?: { _id: Id<"specialEvents">; name: string }[];
}

interface InvitationListProps {
  eventId: Id<"events">;
  eventSlug: string;
  customDomain?: string;
  invitations: Invitation[];
}

export function InvitationList({
  eventId,
  eventSlug,
  customDomain,
  invitations,
}: InvitationListProps) {
  const [editTarget, setEditTarget] = useState<Invitation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);
  const deleteInvitation = useToastMutation(api.invitations.deleteInvitation, {
    success: "Invitation deleted",
    error: "Failed to delete invitation",
  });
  const setInvitationSent = useToastMutation(
    api.invitations.setInvitationSent,
    {
      error: "Failed to update sent status",
    },
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteInvitation.run({ id: deleteTarget._id });
    setDeleteTarget(null);
  }

  const sentCount = invitations.filter((i) => i.isSent).length;

  return (
    <>
      <DataTableShell
        footer={
          <span className="tabular-nums">
            {invitations.length}{" "}
            {invitations.length === 1 ? "invitation" : "invitations"} ·{" "}
            {sentCount} sent
          </span>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Invitation</TableHead>
              <TableHead className="min-w-[220px]">Guests</TableHead>
              <TableHead className="min-w-[180px]">
                Special invitations
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation._id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="text-body truncate font-medium text-foreground">
                      {invitation.title}
                    </p>
                    <p className="text-caption truncate font-mono text-muted-foreground">
                      /{invitation.slug}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  {invitation.guests && invitation.guests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {invitation.guests.map((guest) => (
                        <span
                          key={guest._id}
                          className="text-caption inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-secondary-foreground"
                        >
                          {guest.firstName} {guest.lastName}
                          {guest.isPlusOne && (
                            <span className="rounded-sm bg-accent-soft px-1 text-[10px] font-semibold text-accent-soft-foreground">
                              +1
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-caption text-muted-foreground">
                      No guests
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  {invitation.specialEvents &&
                  invitation.specialEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {invitation.specialEvents.map((specialEvent) => (
                        <StatusPill key={specialEvent._id} tone="accent">
                          <Sparkles className="size-3" aria-hidden />
                          {specialEvent.name}
                        </StatusPill>
                      ))}
                    </div>
                  ) : (
                    <span className="text-caption text-muted-foreground">
                      —
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  <StatusPill
                    tone={invitation.isActive ? "success" : "neutral"}
                    dot
                  >
                    {invitation.isActive ? "Active" : "Inactive"}
                  </StatusPill>
                </TableCell>

                <TableCell className="text-center">
                  <Checkbox
                    checked={invitation.isSent ?? false}
                    onCheckedChange={(checked) =>
                      setInvitationSent.run({
                        id: invitation._id,
                        isSent: checked === true,
                      })
                    }
                    aria-label={`Mark ${invitation.title} as sent`}
                  />
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <CopyInvitationLinkButton
                      eventSlug={eventSlug}
                      slug={invitation.slug}
                      customDomain={customDomain}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditTarget(invitation)}
                        >
                          <Pencil className="size-4" aria-hidden />
                          <span className="sr-only">
                            Edit {invitation.title}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit invitation</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(invitation)}
                          className="text-danger hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          <span className="sr-only">
                            Delete {invitation.title}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete invitation</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <InvitationForm
        mode="edit"
        invitation={
          editTarget
            ? (invitations.find((i) => i._id === editTarget._id) ?? editTarget)
            : undefined
        }
        eventId={eventId}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invitation</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” will be permanently deleted and its link will stop working. Its guests stay in the event and become un-invited.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger/30"
            >
              Delete invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
