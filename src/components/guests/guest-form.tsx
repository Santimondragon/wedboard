"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { guestSchema, type GuestFormData } from "@/lib/validations/guest"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface GuestFormProps {
  invitationId: Id<"invitations">
  onSuccess: () => void
}

export function GuestForm({ invitationId, onSuccess }: GuestFormProps) {
  const createGuest = useMutation(api.guests.createGuest)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      isPrimaryContact: false,
      isPlusOne: false,
    },
  })

  const isPrimaryContact = watch("isPrimaryContact")
  const isPlusOne = watch("isPlusOne")

  async function onSubmit(data: GuestFormData) {
    try {
      await createGuest({
        invitationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        isPrimaryContact: data.isPrimaryContact,
        isPlusOne: data.isPlusOne,
      })
      toast.success("Guest added successfully")
      reset()
      onSuccess()
    } catch {
      toast.error("Failed to add guest")
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

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isPrimaryContact"
            checked={isPrimaryContact}
            onCheckedChange={(checked) => setValue("isPrimaryContact", !!checked)}
          />
          <Label htmlFor="isPrimaryContact" className="font-normal cursor-pointer">
            Primary Contact
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="isPlusOne"
            checked={isPlusOne}
            onCheckedChange={(checked) => setValue("isPlusOne", !!checked)}
          />
          <Label htmlFor="isPlusOne" className="font-normal cursor-pointer">
            Plus One
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Adding..." : "Add Guest"}
      </Button>
    </form>
  )
}
