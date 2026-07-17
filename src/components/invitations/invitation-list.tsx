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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Sparkles } from "lucide-react";
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
  const [deleteTarget, setDeleteTarget] = useState<Id<"invitations"> | null>(
    null,
  );
  const deleteInvitation = useToastMutation(api.invitations.deleteInvitation, {
    success: "Invitation deleted",
    error: "Failed to delete invitation",
  });
  const setInvitationSent = useToastMutation(
    api.invitations.setInvitationSent,
    { error: "Failed to update sent status" },
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteInvitation.run({ id: deleteTarget });
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invitation</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Special Invitations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation._id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">
                      {invitation.title}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      /{invitation.slug}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {invitation.guests && invitation.guests.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {invitation.guests.map((g) => (
                        <span
                          key={g._id}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                        >
                          {g.firstName} {g.lastName}
                          {g.isPlusOne && (
                            <span className="text-[10px] font-medium text-amber-600">
                              +1
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">No guests</span>
                  )}
                </TableCell>
                <TableCell>
                  {invitation.specialEvents &&
                  invitation.specialEvents.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {invitation.specialEvents.map((se) => (
                        <Badge
                          key={se._id}
                          variant="outline"
                          className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200"
                        >
                          <Sparkles className="h-3 w-3" />
                          {se.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      invitation.isActive
                        ? "text-xs bg-green-50 text-green-700 border-green-200"
                        : "text-xs bg-zinc-100 text-zinc-500 border-zinc-200"
                    }
                  >
                    {invitation.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTarget(invitation)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(invitation._id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invitation and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
