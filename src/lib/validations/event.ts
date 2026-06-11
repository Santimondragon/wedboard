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
  brideName: z.string().optional(),
  groomName: z.string().optional(),
  date: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueMapUrl: z
    .string()
    .url("Enter a valid URL (e.g. https://maps.google.com/...)")
    .optional()
    .or(z.literal("")),
})

export type EventFormData = z.infer<typeof eventSchema>
