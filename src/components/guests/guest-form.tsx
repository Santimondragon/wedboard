"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { guestSchema, type GuestFormData } from "@/lib/validations/guest"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface GuestFormProps {
  eventId: Id<"events">
  invitationId?: Id<"invitations">
  onSuccess: () => void
}

export function GuestForm({ eventId, invitationId, onSuccess }: GuestFormProps) {
  const createGuest = useToastMutation(api.guests.createGuest, {
    success: "Guest added successfully",
    error: "Failed to add guest",
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      allowsPlusOne: false,
    },
  })

  const allowsPlusOne = useWatch({ control, name: "allowsPlusOne" })

  async function onSubmit(data: GuestFormData) {
    const result = await createGuest.run({
      eventId,
      invitationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      allowsPlusOne: data.allowsPlusOne,
    })
    if (result.ok) {
      reset()
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-rose-600">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-rose-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-rose-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" {...register("phone")} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="allowsPlusOne"
          checked={allowsPlusOne}
          onCheckedChange={(checked) => setValue("allowsPlusOne", !!checked)}
        />
        <Label htmlFor="allowsPlusOne" className="font-normal cursor-pointer">
          Allows +1
        </Label>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Adding..." : "Add Guest"}
      </Button>
    </form>
  )
}
