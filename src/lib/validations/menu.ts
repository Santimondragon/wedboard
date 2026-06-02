import { z } from "zod"

export const menuOptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
})

export type MenuOptionFormData = z.infer<typeof menuOptionSchema>
