"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { menuOptionSchema, type MenuOptionFormData } from "@/lib/validations/menu"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

type MenuOption = Doc<"menuOptions">
type DrinkOption = Doc<"drinkOptions">

interface MenuOptionFormProps {
  type: "menu" | "drink"
  mode: "create" | "edit"
  option?: MenuOption | DrinkOption
  eventId: Id<"events">
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenuOptionForm({
  type,
  mode,
  option,
  eventId,
  open,
  onOpenChange,
}: MenuOptionFormProps) {
  const createMenuOption = useMutation(api.menu.createMenuOption)
  const updateMenuOption = useMutation(api.menu.updateMenuOption)
  const createDrinkOption = useMutation(api.drinks.createDrinkOption)
  const updateDrinkOption = useMutation(api.drinks.updateDrinkOption)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MenuOptionFormData>({
    resolver: zodResolver(menuOptionSchema),
    defaultValues: { name: "", description: "", isActive: true },
  })

  const isActive = watch("isActive")

  useEffect(() => {
    if (open && option) {
      reset({
        name: option.name,
        description: option.description ?? "",
        isActive: option.isActive ?? true,
      })
    } else if (open && mode === "create") {
      reset({ name: "", description: "", isActive: true })
    }
  }, [open, option, mode, reset])

  async function onSubmit(data: MenuOptionFormData) {
    try {
      if (mode === "create") {
        if (type === "menu") {
          await createMenuOption({
            eventId,
            name: data.name,
            description: data.description || undefined,
          })
        } else {
          await createDrinkOption({
            eventId,
            name: data.name,
            description: data.description || undefined,
          })
        }
        toast.success(`${type === "menu" ? "Menu" : "Drink"} option created`)
      } else {
        if (!option) return
        if (type === "menu") {
          await updateMenuOption({
            id: option._id as Id<"menuOptions">,
            name: data.name,
            description: data.description || undefined,
            isActive: data.isActive,
          })
        } else {
          await updateDrinkOption({
            id: option._id as Id<"drinkOptions">,
            name: data.name,
            description: data.description || undefined,
            isActive: data.isActive,
          })
        }
        toast.success(`${type === "menu" ? "Menu" : "Drink"} option updated`)
      }
      onOpenChange(false)
    } catch {
      toast.error(`Failed to ${mode} option`)
    }
  }

  const label = type === "menu" ? "Menu" : "Drink"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? `Add ${label} Option` : `Edit ${label} Option`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={2} />
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Active
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Add Option" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
