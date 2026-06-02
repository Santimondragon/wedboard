import { z } from "zod"

export const publicRsvpSchema = z.object({
  guestUpdates: z.array(
    z.object({
      guestId: z.string(),
      rsvpStatus: z.enum(["attending", "declined", "pending"]),
      menuOptionId: z.string().optional(),
      drinkOptionId: z.string().optional(),
      allergies: z.string().optional(),
      specialRequests: z.string().optional(),
    }),
  ),
  specialEventRsvps: z
    .array(
      z.object({
        guestId: z.string(),
        specialEventId: z.string(),
        status: z.enum(["attending", "declined", "pending"]),
      }),
    )
    .optional(),
})

export type PublicRsvpFormData = z.infer<typeof publicRsvpSchema>
