"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { RefreshCw, UserPlus, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { invitationSchema, type InvitationFormData } from "@/lib/validations/invitation"

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

interface ExistingInvitationGuest {
  _id: Id<"guests">
  firstName: string
  lastName: string
  isPlusOne: boolean
  rsvpStatus: string
}

interface ExistingInvitation {
  _id: Id<"invitations">
  title: string
  slug: string
  notes?: string
  guests?: ExistingInvitationGuest[]
  specialEvents?: { _id: Id<"specialEvents">; name: string }[]
}

interface InvitationFormProps {
  mode: "create" | "edit"
  invitation?: ExistingInvitation
  eventId: Id<"events">
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvitationForm({
  mode,
  invitation,
  eventId,
  open,
  onOpenChange,
}: InvitationFormProps) {
  const params = useParams()
  const eventSlug = params?.eventSlug as string | undefined
  const createInvitation = useToastMutation(api.invitations.createInvitation, {
    success: "Invitation created",
    error: "Failed to create invitation",
  })
  const updateInvitation = useToastMutation(api.invitations.updateInvitation, {
    success: "Invitation updated",
    error: "Failed to update invitation",
  })
  const regenerateSlug = useToastMutation(api.invitations.regenerateSlug, {
    error: "Failed to regenerate slug",
  })

  // Both modes need the un-invited pool (to add) and the event's special
  // invitations (to grant access).
  const unassignedGuests = useQuery(
    api.guests.listUnassignedByEvent,
    open ? { eventId } : "skip",
  )
  const specialEvents = useQuery(
    api.specialEvents.listByEvent,
    open ? { eventId } : "skip",
  )
  const [selectedGuestIds, setSelectedGuestIds] = useState<Id<"guests">[]>([])
  const [selectedSpecialIds, setSelectedSpecialIds] = useState<
    Id<"specialEvents">[]
  >([])

  // Guests/special invitations are locked once any linked guest has responded.
  const currentGuests = invitation?.guests ?? []
  const currentDirectGuests = currentGuests.filter((g) => !g.isPlusOne)
  const composeLocked =
    mode === "edit" && currentGuests.some((g) => g.rsvpStatus !== "pending")

  // Candidate guests: directly-linked guests (so they can be removed) plus the
  // un-invited pool (to add). In create mode there are no current guests yet.
  const candidateGuests = [
    ...(mode === "edit"
      ? currentDirectGuests.map((g) => ({
          _id: g._id,
          firstName: g.firstName,
          lastName: g.lastName,
        }))
      : []),
    ...(unassignedGuests ?? []).map((g) => ({
      _id: g._id,
      firstName: g.firstName,
      lastName: g.lastName,
    })),
  ]

  // Initialize the selection sets from the invitation each time the dialog opens.
  useEffect(() => {
    if (!open) return
    if (mode === "create") {
      setSelectedGuestIds([])
      setSelectedSpecialIds([])
    } else if (invitation) {
      setSelectedGuestIds(
        (invitation.guests ?? [])
          .filter((g) => !g.isPlusOne)
          .map((g) => g._id),
      )
      setSelectedSpecialIds((invitation.specialEvents ?? []).map((s) => s._id))
    }
  }, [open, mode, invitation])

  function toggleGuest(id: Id<"guests">) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    )
  }

  function toggleSpecial(id: Id<"specialEvents">) {
    setSelectedSpecialIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      title: "",
      slug: "",
      notes: "",
    },
  })

  const title = watch("title")

  useEffect(() => {
    if (mode === "edit" && invitation) {
      reset({
        title: invitation.title,
        slug: invitation.slug,
        notes: invitation.notes ?? "",
      })
    } else if (mode === "create") {
      reset({
        title: "",
        slug: "",
        notes: "",
      })
    }
  }, [mode, invitation, reset, open])

  useEffect(() => {
    if (mode === "create" && title) {
      setValue("slug", slugify(title))
    }
  }, [title, mode, setValue])

  async function handleRegenerateSlug() {
    if (mode === "edit" && invitation) {
      const result = await regenerateSlug.run({ id: invitation._id })
      if (result.ok && typeof result.value === "string") {
        setValue("slug", result.value)
      }
    } else {
      setValue("slug", slugify(title) + "-" + Math.random().toString(36).slice(2, 6))
    }
  }

  async function onSubmit(data: InvitationFormData) {
    let result
    if (mode === "create") {
      result = await createInvitation.run({
        eventId,
        title: data.title,
        slug: data.slug,
        notes: data.notes,
        guestIds: selectedGuestIds,
        specialEventIds: selectedSpecialIds,
      })
    } else if (mode === "edit" && invitation) {
      result = await updateInvitation.run({
        id: invitation._id,
        title: data.title,
        slug: data.slug,
        notes: data.notes,
        // Only send composition changes while still editable.
        ...(composeLocked
          ? {}
          : { guestIds: selectedGuestIds, specialEventIds: selectedSpecialIds }),
      })
    }
    if (result?.ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Invitation" : "Edit Invitation"}
          </DialogTitle>
        </DialogHeader>
        {mode === "create" &&
        unassignedGuests !== undefined &&
        unassignedGuests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="rounded-full bg-zinc-100 p-3">
              <UserPlus className="h-6 w-6 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-zinc-900">No guests to invite yet</p>
              <p className="text-sm text-zinc-500">
                Add guests to this event first, then group them into an invitation.
              </p>
            </div>
            <Button asChild>
              <Link
                href={`/dashboard/${eventSlug}/guests`}
                onClick={() => onOpenChange(false)}
              >
                Add Guest
              </Link>
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Smith Family" />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                {...register("slug")}
                placeholder="smith-family"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateSlug}
                title="Regenerate slug"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {errors.slug && (
              <p className="text-xs text-red-500">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Optional notes about this invitation..."
              rows={3}
            />
          </div>

          {composeLocked && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Guests and special invitations are locked because a guest has
                already responded.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Special invitations</Label>
            {specialEvents === undefined ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : specialEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-center">
                <p className="text-sm text-zinc-500">
                  No special invitations yet (optional).
                </p>
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link
                    href={`/dashboard/${eventSlug}/special-events`}
                    onClick={() => onOpenChange(false)}
                  >
                    Create a special invitation
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Choose which special invitations this group can see.
                </p>
                <div className="space-y-1 rounded-lg border p-2">
                  {specialEvents.map((se) => (
                    <label
                      key={se._id}
                      className={
                        "flex items-center gap-2 rounded-md px-2 py-1.5 " +
                        (composeLocked
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-zinc-50")
                      }
                    >
                      <Checkbox
                        checked={selectedSpecialIds.includes(se._id)}
                        disabled={composeLocked}
                        onCheckedChange={() => toggleSpecial(se._id)}
                      />
                      <span className="text-sm text-zinc-800">{se.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Guests</Label>
            {candidateGuests.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No guests available. Add guests to this event first.
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-500">
                  Select the guests included in this invitation.
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {candidateGuests.map((guest) => (
                    <label
                      key={guest._id}
                      className={
                        "flex items-center gap-2 rounded-md px-2 py-1.5 " +
                        (composeLocked
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-zinc-50")
                      }
                    >
                      <Checkbox
                        checked={selectedGuestIds.includes(guest._id)}
                        disabled={composeLocked}
                        onCheckedChange={() => toggleGuest(guest._id)}
                      />
                      <span className="text-sm text-zinc-800">
                        {guest.firstName} {guest.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Invitation"
                : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
