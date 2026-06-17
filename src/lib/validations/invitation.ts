import { z } from "zod"

export const invitationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  type: z.enum(["single", "group", "plusOne"]),
  maxGuests: z.number().min(1).max(10),
  notes: z.string().optional(),
})

export type InvitationFormData = z.infer<typeof invitationSchema>
