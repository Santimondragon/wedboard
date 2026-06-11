"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { api } from "convex/_generated/api"
import { useToastMutation } from "@/hooks/use-toast-mutation"
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
import { eventSchema, type EventFormData } from "@/lib/validations/event"

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateEventDialog({ open, onOpenChange }: CreateEventDialogProps) {
  const router = useRouter()
  const createEvent = useToastMutation(api.events.createEvent, {
    success: "Event created",
    error: "Failed to create event",
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  })

  async function onSubmit(data: EventFormData) {
    const result = await createEvent.run({
      ...data,
      date: data.date ? new Date(data.date).getTime() : undefined,
    })
    if (result.ok) {
      reset()
      onOpenChange(false)
      router.push(`/dashboard/${result.value.slug}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input id="name" {...register("name")} placeholder="Our Wedding" />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name</Label>
            <Input id="venueName" {...register("venueName")} placeholder="The Grand Ballroom" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address</Label>
            <Input id="venueAddress" {...register("venueAddress")} placeholder="123 Main St, City, State" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
