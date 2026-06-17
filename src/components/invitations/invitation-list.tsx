"use client"

import { useState } from "react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InvitationCard } from "@/components/invitations/invitation-card"
import { InvitationForm } from "@/components/invitations/invitation-form"

interface Invitation {
  _id: Id<"invitations">
  title: string
  slug: string
  type: string
  maxGuests: number
  isActive: boolean
  notes?: string
  guestCount?: number
  specialEvents?: { _id: string; name: string }[]
}

interface InvitationListProps {
  eventId: Id<"events">
  eventSlug: string
  invitations: Invitation[]
}

export function InvitationList({ eventId, eventSlug, invitations }: InvitationListProps) {
  const [editTarget, setEditTarget] = useState<Invitation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Id<"invitations"> | null>(null)
  const deleteInvitation = useToastMutation(api.invitations.deleteInvitation, {
    success: "Invitation deleted",
    error: "Failed to delete invitation",
  })

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteInvitation.run({ id: deleteTarget })
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation._id}
            eventSlug={eventSlug}
            invitation={invitation}
            onEdit={() => setEditTarget(invitation)}
            onDelete={() => setDeleteTarget(invitation._id)}
          />
        ))}
      </div>

      <InvitationForm
        mode="edit"
        invitation={editTarget ?? undefined}
        eventId={eventId}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
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
  )
}
