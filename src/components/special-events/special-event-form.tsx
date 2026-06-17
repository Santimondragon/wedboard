"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { format } from "date-fns"
import { toast } from "sonner"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import {
  specialEventSchema,
  type SpecialEventFormData,
} from "@/lib/validations/special-event"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

type SpecialEvent = Doc<"specialEvents">
type Invitation = Doc<"invitations">

interface SpecialEventFormProps {
  mode: "create" | "edit"
  specialEvent?: SpecialEvent
  eventId: Id<"events">
  invitations: Invitation[]
  /** invitation ids this special event is currently visible to (edit mode). */
  accessIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Unix ms → the value an <input type="datetime-local"> expects. */
function toDateTimeLocal(ms?: number): string {
  if (!ms) return ""
  return format(new Date(ms), "yyyy-MM-dd'T'HH:mm")
}

export function SpecialEventForm({
  mode,
  specialEvent,
  eventId,
  invitations,
  accessIds,
  open,
  onOpenChange,
}: SpecialEventFormProps) {
  const createSpecialEvent = useToastMutation(
    api.specialEvents.createSpecialEvent,
    {
      success: "Special invitation created",
      error: "Failed to create special invitation",
    }
  )
  const updateSpecialEvent = useToastMutation(
    api.specialEvents.updateSpecialEvent,
    {
      success: "Special invitation updated",
      error: "Failed to update special invitation",
    }
  )
  const setSpecialEventAccess = useMutation(
    api.invitations.setSpecialEventAccess
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpecialEventFormData>({
    resolver: zodResolver(specialEventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      location: "",
      isActive: true,
    },
  })

  const isActive = watch("isActive")

  useEffect(() => {
    if (open && specialEvent) {
      reset({
        name: specialEvent.name,
        description: specialEvent.description ?? "",
        date: toDateTimeLocal(specialEvent.date),
        location: specialEvent.location ?? "",
        isActive: specialEvent.isActive ?? true,
      })
    } else if (open && mode === "create") {
      reset({
        name: "",
        description: "",
        date: "",
        location: "",
        isActive: true,
      })
    }
  }, [open, specialEvent, mode, reset])

  async function onSubmit(data: SpecialEventFormData) {
    const date = data.date ? new Date(data.date).getTime() : undefined
    if (mode === "create") {
      const result = await createSpecialEvent.run({
        eventId,
        name: data.name,
        description: data.description || undefined,
        date,
        location: data.location || undefined,
      })
      if (result.ok) onOpenChange(false)
    } else {
      if (!specialEvent) return
      const result = await updateSpecialEvent.run({
        id: specialEvent._id,
        name: data.name,
        description: data.description || undefined,
        date,
        location: data.location || undefined,
        isActive: data.isActive,
      })
      if (result.ok) onOpenChange(false)
    }
  }

  async function toggleAccess(invitationId: Id<"invitations">, hasAccess: boolean) {
    if (!specialEvent) return
    try {
      await setSpecialEventAccess({
        invitationId,
        specialEventId: specialEvent._id,
        hasAccess,
      })
    } catch {
      toast.error("Failed to update visibility")
    }
  }

  const accessSet = new Set(accessIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Add special invitation"
              : "Edit special invitation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date &amp; time</Label>
              <Input id="date" type="datetime-local" {...register("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
            </div>
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Active
              </Label>
            </div>
          )}

          {/* Per-invitation visibility — assignment needs a saved id. */}
          <div className="space-y-2 rounded-md border bg-zinc-50 p-3">
            <p className="text-sm font-medium text-zinc-900">
              Visible to invitations
            </p>
            {mode === "create" ? (
              <p className="text-xs text-zinc-500">
                Save first, then reopen to choose which invitations can see this.
              </p>
            ) : invitations.length === 0 ? (
              <p className="text-xs text-zinc-500">No invitations yet.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <label
                    key={invitation._id}
                    className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer"
                  >
                    <Checkbox
                      checked={accessSet.has(invitation._id)}
                      onCheckedChange={(checked) =>
                        toggleAccess(invitation._id, checked === true)
                      }
                    />
                    {invitation.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {mode === "edit" ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Add"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
