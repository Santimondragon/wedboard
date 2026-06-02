"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { RefreshCw, UserPlus } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { invitationSchema, type InvitationFormData } from "@/lib/validations/invitation"

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

interface ExistingInvitation {
  _id: Id<"invitations">
  title: string
  slug: string
  type: string
  maxGuests: number
  allowPlusOne: boolean
  notes?: string
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
  const createInvitation = useMutation(api.invitations.createInvitation)
  const updateInvitation = useMutation(api.invitations.updateInvitation)
  const regenerateSlug = useMutation(api.invitations.regenerateSlug)

  const unassignedGuests = useQuery(
    api.guests.listUnassignedByEvent,
    mode === "create" && open ? { eventId } : "skip",
  )
  const [selectedGuestIds, setSelectedGuestIds] = useState<Id<"guests">[]>([])

  useEffect(() => {
    if (open && mode === "create") setSelectedGuestIds([])
  }, [open, mode])

  function toggleGuest(id: Id<"guests">) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
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
      type: "single",
      maxGuests: 1,
      allowPlusOne: false,
      notes: "",
    },
  })

  const title = watch("title")
  const allowPlusOne = watch("allowPlusOne")

  useEffect(() => {
    if (mode === "edit" && invitation) {
      reset({
        title: invitation.title,
        slug: invitation.slug,
        type: invitation.type as "single" | "group" | "plusOne",
        maxGuests: invitation.maxGuests,
        allowPlusOne: invitation.allowPlusOne,
        notes: invitation.notes ?? "",
      })
    } else if (mode === "create") {
      reset({
        title: "",
        slug: "",
        type: "single",
        maxGuests: 1,
        allowPlusOne: false,
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
      try {
        const result = await regenerateSlug({ id: invitation._id })
        if (result && typeof result === "object" && "slug" in result) {
          setValue("slug", (result as { slug: string }).slug)
        }
      } catch (err) {
        toast.error("Failed to regenerate slug")
      }
    } else {
      setValue("slug", slugify(title) + "-" + Math.random().toString(36).slice(2, 6))
    }
  }

  async function onSubmit(data: InvitationFormData) {
    try {
      if (mode === "create") {
        await createInvitation({
          eventId,
          title: data.title,
          slug: data.slug,
          type: data.type,
          maxGuests: data.maxGuests,
          allowPlusOne: data.allowPlusOne,
          notes: data.notes,
          guestIds: selectedGuestIds,
        })
        toast.success("Invitation created")
      } else if (mode === "edit" && invitation) {
        await updateInvitation({
          id: invitation._id,
          title: data.title,
          slug: data.slug,
          type: data.type,
          maxGuests: data.maxGuests,
          allowPlusOne: data.allowPlusOne,
          notes: data.notes,
        })
        toast.success("Invitation updated")
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(mode === "create" ? "Failed to create invitation" : "Failed to update invitation")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Smith Family" />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              defaultValue={invitation?.type ?? "single"}
              onValueChange={(value) =>
                setValue("type", value as "single" | "group" | "plusOne")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="plusOne">Plus One</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxGuests">Max Guests *</Label>
            <Input
              id="maxGuests"
              type="number"
              min={1}
              max={10}
              {...register("maxGuests", { valueAsNumber: true })}
            />
            {errors.maxGuests && (
              <p className="text-xs text-red-500">{errors.maxGuests.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="allowPlusOne" className="text-sm font-medium">
                Allow Plus One
              </Label>
              <p className="text-xs text-zinc-500">Guest can bring an additional person</p>
            </div>
            <Switch
              id="allowPlusOne"
              checked={allowPlusOne}
              onCheckedChange={(checked) => setValue("allowPlusOne", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Optional notes about this invitation..."
              rows={3}
            />
          </div>

          {mode === "create" && unassignedGuests && unassignedGuests.length > 0 && (
            <div className="space-y-2">
              <Label>Guests</Label>
              <p className="text-xs text-zinc-500">
                Select the un-invited guests to include in this invitation.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {unassignedGuests.map((guest) => (
                  <label
                    key={guest._id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
                  >
                    <Checkbox
                      checked={selectedGuestIds.includes(guest._id)}
                      onCheckedChange={() => toggleGuest(guest._id)}
                    />
                    <span className="text-sm text-zinc-800">
                      {guest.firstName} {guest.lastName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
