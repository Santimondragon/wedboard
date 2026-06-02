import { z } from "zod"

export const eventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Event key must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Event key may only contain lowercase letters, numbers, and hyphens"
    )
    .optional(),
  date: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
})

export type EventFormData = z.infer<typeof eventSchema>
