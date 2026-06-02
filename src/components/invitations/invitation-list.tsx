"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
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
  allowPlusOne: boolean
  isActive: boolean
  notes?: string
}

interface InvitationListProps {
  eventId: Id<"events">
  invitations: Invitation[]
}

export function InvitationList({ eventId, invitations }: InvitationListProps) {
  const [editTarget, setEditTarget] = useState<Invitation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Id<"invitations"> | null>(null)
  const deleteInvitation = useMutation(api.invitations.deleteInvitation)

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteInvitation({ id: deleteTarget })
      toast.success("Invitation deleted")
    } catch (err) {
      toast.error("Failed to delete invitation")
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation._id}
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
