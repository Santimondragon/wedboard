"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Id, Doc } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { useEvent } from "@/components/dashboard/event-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MenuOptionForm } from "@/components/menu/menu-option-form"
import { MenuOptionList } from "@/components/menu/menu-option-list"
import { SelectionSummary } from "@/components/menu/selection-summary"
import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { UtensilsCrossed, Wine, Plus } from "lucide-react"

type MenuOption = Doc<"menuOptions">
type DrinkOption = Doc<"drinkOptions">

export default function MenuPage() {
  const eventId = useEvent()._id

  const menuOptions = useQuery(api.menu.listMenuOptionsByEventAdmin, { eventId })
  const drinkOptions = useQuery(api.drinks.listDrinkOptionsByEventAdmin, { eventId })
  const guests = useQuery(api.guests.listByEvent, { eventId })

  const deleteMenuOption = useMutation(api.menu.deleteMenuOption)
  const deleteDrinkOption = useMutation(api.drinks.deleteDrinkOption)

  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState<"menu" | "drink">("menu")
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingOption, setEditingOption] = useState<MenuOption | DrinkOption | undefined>(
    undefined,
  )

  function openCreate(type: "menu" | "drink") {
    setFormType(type)
    setFormMode("create")
    setEditingOption(undefined)
    setFormOpen(true)
  }

  function openEdit(option: MenuOption | DrinkOption, type: "menu" | "drink") {
    setFormType(type)
    setFormMode("edit")
    setEditingOption(option)
    setFormOpen(true)
  }

  async function handleDeleteMenu(id: Id<"menuOptions">) {
    try {
      await deleteMenuOption({ id })
      toast.success("Menu option deleted")
    } catch {
      toast.error("Failed to delete menu option")
    }
  }

  async function handleDeleteDrink(id: Id<"drinkOptions">) {
    try {
      await deleteDrinkOption({ id })
      toast.success("Drink option deleted")
    } catch {
      toast.error("Failed to delete drink option")
    }
  }

  const isLoading = menuOptions === undefined || drinkOptions === undefined

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Menu & Drinks</h1>

      <Tabs defaultValue="food">
        <TabsList>
          <TabsTrigger value="food">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Food Options
          </TabsTrigger>
          <TabsTrigger value="drinks">
            <Wine className="h-4 w-4 mr-2" />
            Drink Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {menuOptions ? `${menuOptions.length} options` : ""}
            </p>
            <Button size="sm" onClick={() => openCreate("menu")}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-md" />
          ) : menuOptions.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No menu options yet"
              description="Add food options for your guests to select from"
            />
          ) : (
            <>
              <MenuOptionList
                options={menuOptions}
                type="menu"
                onEdit={(o) => openEdit(o, "menu")}
                onDelete={(id) => handleDeleteMenu(id as Id<"menuOptions">)}
              />
              {guests && guests.length > 0 && (
                <SelectionSummary options={menuOptions} guests={guests} type="menu" />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="drinks" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {drinkOptions ? `${drinkOptions.length} options` : ""}
            </p>
            <Button size="sm" onClick={() => openCreate("drink")}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-md" />
          ) : drinkOptions.length === 0 ? (
            <EmptyState
              icon={Wine}
              title="No drink options yet"
              description="Add drink options for your guests to select from"
            />
          ) : (
            <>
              <MenuOptionList
                options={drinkOptions}
                type="drink"
                onEdit={(o) => openEdit(o, "drink")}
                onDelete={(id) => handleDeleteDrink(id as Id<"drinkOptions">)}
              />
              {guests && guests.length > 0 && (
                <SelectionSummary options={drinkOptions} guests={guests} type="drink" />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <MenuOptionForm
        type={formType}
        mode={formMode}
        option={editingOption}
        eventId={eventId}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  )
}
