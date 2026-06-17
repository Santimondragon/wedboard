import { z } from "zod"

export const guestMessageSchema = z.object({
  name: z.string().max(200, "Name is too long").optional(),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long"),
})

export type GuestMessageFormData = z.infer<typeof guestMessageSchema>
