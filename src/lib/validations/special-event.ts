import { z } from "zod"

export const specialEventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // datetime-local string; convert with new Date(str).getTime() before sending.
  date: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean(),
})

export type SpecialEventFormData = z.infer<typeof specialEventSchema>
