"use client"

import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"

type MenuOption = Doc<"menuOptions">
type DrinkOption = Doc<"drinkOptions">

interface MenuOptionListProps {
  options: Array<MenuOption | DrinkOption>
  type: "menu" | "drink"
  onEdit: (option: MenuOption | DrinkOption) => void
  onDelete: (id: Id<"menuOptions"> | Id<"drinkOptions">) => void
}

export function MenuOptionList({ options, type, onEdit, onDelete }: MenuOptionListProps) {
  const updateMenuOption = useMutation(api.menu.updateMenuOption)
  const updateDrinkOption = useMutation(api.drinks.updateDrinkOption)

  async function handleToggleActive(option: MenuOption | DrinkOption) {
    try {
      if (type === "menu") {
        await updateMenuOption({
          id: option._id as Id<"menuOptions">,
          isActive: !option.isActive,
        })
      } else {
        await updateDrinkOption({
          id: option._id as Id<"drinkOptions">,
          isActive: !option.isActive,
        })
      }
    } catch {
      toast.error("Failed to update option")
    }
  }

  return (
    <div className="divide-y divide-zinc-100 rounded-md border">
      {options.map((option) => (
        <div key={option._id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-zinc-900 truncate">{option.name}</p>
            {option.description && (
              <p className="text-sm text-zinc-500 truncate">{option.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={option.isActive ?? true}
              onCheckedChange={() => handleToggleActive(option)}
              aria-label="Active"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(option)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Option</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{option.name}&rdquo;? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(option._id as Id<"menuOptions"> | Id<"drinkOptions">)}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  )
}
