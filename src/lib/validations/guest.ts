import { z } from "zod"

export const guestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  allowsPlusOne: z.boolean(),
})

export type GuestFormData = z.infer<typeof guestSchema>
