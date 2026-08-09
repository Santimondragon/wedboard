"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id, Doc } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { useEvent } from "@/components/dashboard/event-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MenuOptionForm } from "@/components/menu/menu-option-form";
import { MenuOptionList } from "@/components/menu/menu-option-list";
import { SelectionSummary } from "@/components/menu/selection-summary";
import { PageHeader, Panel, StateBlock } from "@/components/app";
import { QueryErrorBoundary } from "@/components/app/query-error-boundary";
import { UtensilsCrossed, Wine, Plus } from "lucide-react";

type MenuOption = Doc<"menuOptions">;
type DrinkOption = Doc<"drinkOptions">;

type OptionKind = "menu" | "drink";

interface OptionsTabProps {
  kind: OptionKind;
  options: Array<MenuOption | DrinkOption> | undefined;
  counts: Record<string, number> | undefined;
  unassigned: number | undefined;
  totalGuests: number | undefined;
  onCreate: () => void;
  onEdit: (option: MenuOption | DrinkOption) => void;
  onDelete: (id: Id<"menuOptions"> | Id<"drinkOptions">) => void;
}

const COPY = {
  menu: {
    panelTitle: "Food options",
    panelDescription: "What guests can choose from when they RSVP.",
    emptyTitle: "No food options yet",
    emptyDescription:
      "Add the dishes guests can pick from and they'll appear on the invitation's RSVP step.",
    icon: UtensilsCrossed,
    summaryLabel: "food" as const,
  },
  drink: {
    panelTitle: "Drink options",
    panelDescription: "Drink packages guests can choose from when they RSVP.",
    emptyTitle: "No drink options yet",
    emptyDescription:
      "Add the drink options guests can pick from and they'll appear on the invitation's RSVP step.",
    icon: Wine,
    summaryLabel: "drink" as const,
  },
};

function OptionsTab({
  kind,
  options,
  counts,
  unassigned,
  totalGuests,
  onCreate,
  onEdit,
  onDelete,
}: OptionsTabProps) {
  const copy = COPY[kind];

  return (
    <div className="space-y-6">
      <Panel
        title={copy.panelTitle}
        description={
          options
            ? `${options.length} ${options.length === 1 ? "option" : "options"}`
            : copy.panelDescription
        }
        padded={!(options && options.length > 0)}
        actions={
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            Add option
          </Button>
        }
      >
        {options === undefined ? (
          <StateBlock kind="loading" title="Loading options…" compact />
        ) : options.length === 0 ? (
          <StateBlock
            kind="empty"
            icon={copy.icon}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            action={{ label: "Add option", onClick: onCreate }}
            compact
          />
        ) : (
          <MenuOptionList
            options={options}
            type={kind}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </Panel>

      {options !== undefined && options.length > 0 && (
        <Panel
          title="Guest selections"
          description="How your guests have chosen so far."
        >
          {counts === undefined || unassigned === undefined ? (
            <StateBlock kind="loading" title="Loading selections…" compact />
          ) : !totalGuests ? (
            <StateBlock
              kind="empty"
              icon={copy.icon}
              title="No guests yet"
              description="Selections appear once guests are added and start responding."
              compact
            />
          ) : (
            <SelectionSummary
              options={options}
              counts={counts}
              unassigned={unassigned}
              label={copy.summaryLabel}
            />
          )}
        </Panel>
      )}
    </div>
  );
}

export default function MenuPage() {
  const eventId = useEvent()._id;

  const menuOptions = useQuery(api.menu.listMenuOptionsByEventAdmin, {
    eventId,
  });
  const drinkOptions = useQuery(api.drinks.listDrinkOptionsByEventAdmin, {
    eventId,
  });
  const selectionCounts = useQuery(api.menu.getSelectionCounts, { eventId });

  const deleteMenuOption = useToastMutation(api.menu.deleteMenuOption, {
    success: "Menu option deleted",
    error: "Failed to delete menu option",
  });
  const deleteDrinkOption = useToastMutation(api.drinks.deleteDrinkOption, {
    success: "Drink option deleted",
    error: "Failed to delete drink option",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<OptionKind>("menu");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingOption, setEditingOption] = useState<
    MenuOption | DrinkOption | undefined
  >(undefined);

  function openCreate(type: OptionKind) {
    setFormType(type);
    setFormMode("create");
    setEditingOption(undefined);
    setFormOpen(true);
  }

  function openEdit(option: MenuOption | DrinkOption, type: OptionKind) {
    setFormType(type);
    setFormMode("edit");
    setEditingOption(option);
    setFormOpen(true);
  }

  return (
    <div className="space-y-9">
      <PageHeader
        title="Menu & Drinks"
        description="The food and drink choices offered to guests on their invitation, and how they've picked so far."
      />

      <QueryErrorBoundary
        title="Couldn't load menu options"
        description="The menu data failed to load. Check your connection and try again."
      >
        <Tabs defaultValue="food">
          <TabsList>
            <TabsTrigger value="food">
              <UtensilsCrossed className="size-4" aria-hidden />
              Food
            </TabsTrigger>
            <TabsTrigger value="drinks">
              <Wine className="size-4" aria-hidden />
              Drinks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="food" className="mt-6">
            <OptionsTab
              kind="menu"
              options={menuOptions}
              counts={selectionCounts?.menuCounts}
              unassigned={selectionCounts?.menuUnassigned}
              totalGuests={selectionCounts?.totalGuests}
              onCreate={() => openCreate("menu")}
              onEdit={(o) => openEdit(o, "menu")}
              onDelete={(id) =>
                deleteMenuOption.run({ id: id as Id<"menuOptions"> })
              }
            />
          </TabsContent>

          <TabsContent value="drinks" className="mt-6">
            <OptionsTab
              kind="drink"
              options={drinkOptions}
              counts={selectionCounts?.drinkCounts}
              unassigned={selectionCounts?.drinkUnassigned}
              totalGuests={selectionCounts?.totalGuests}
              onCreate={() => openCreate("drink")}
              onEdit={(o) => openEdit(o, "drink")}
              onDelete={(id) =>
                deleteDrinkOption.run({ id: id as Id<"drinkOptions"> })
              }
            />
          </TabsContent>
        </Tabs>
      </QueryErrorBoundary>

      <MenuOptionForm
        type={formType}
        mode={formMode}
        option={editingOption}
        eventId={eventId}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
