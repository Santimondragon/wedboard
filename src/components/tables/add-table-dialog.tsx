"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { tableSchema, type TableFormData } from "@/lib/validations/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddTableDialogProps {
  eventId: Id<"events">
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTableDialog({ eventId, open, onOpenChange }: AddTableDialogProps) {
  const createTable = useToastMutation(api.tables.createTable, {
    success: "Table created",
    error: "Failed to create table",
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: { name: "", seatsCount: 8 },
  })

  async function onSubmit(data: TableFormData) {
    const result = await createTable.run({
      eventId,
      name: data.name,
      seatsCount: data.seatsCount,
    })
    if (result.ok) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Table</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Table Name *</Label>
            <Input id="name" placeholder="e.g. Table 1, Head Table" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seatsCount">Number of Seats</Label>
            <Input
              id="seatsCount"
              type="number"
              min={1}
              max={20}
              {...register("seatsCount", { valueAsNumber: true })}
            />
            {errors.seatsCount && (
              <p className="text-xs text-rose-600">{errors.seatsCount.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
