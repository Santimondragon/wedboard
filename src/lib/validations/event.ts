import { z } from "zod"

export const eventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  date: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
})

export type EventFormData = z.infer<typeof eventSchema>
