import { z } from "zod"

export const tableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  seatsCount: z.number().min(1).max(20),
})

export type TableFormData = z.infer<typeof tableSchema>
