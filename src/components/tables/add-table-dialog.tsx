"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
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
  const createTable = useMutation(api.tables.createTable)

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
    try {
      await createTable({
        eventId,
        name: data.name,
        seatsCount: data.seatsCount,
      })
      toast.success("Table created")
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Failed to create table")
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
