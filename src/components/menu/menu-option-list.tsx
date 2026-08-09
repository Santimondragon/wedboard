"use client";

import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { ListRow, ListRows, StatusPill } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

type MenuOption = Doc<"menuOptions">;
type DrinkOption = Doc<"drinkOptions">;

interface MenuOptionListProps {
  options: Array<MenuOption | DrinkOption>;
  type: "menu" | "drink";
  onEdit: (option: MenuOption | DrinkOption) => void;
  onDelete: (id: Id<"menuOptions"> | Id<"drinkOptions">) => void;
}

export function MenuOptionList({
  options,
  type,
  onEdit,
  onDelete,
}: MenuOptionListProps) {
  const updateMenuOption = useToastMutation(api.menu.updateMenuOption, {
    error: "Failed to update option",
  });
  const updateDrinkOption = useToastMutation(api.drinks.updateDrinkOption, {
    error: "Failed to update option",
  });

  async function handleToggleActive(option: MenuOption | DrinkOption) {
    const isActive = !(option.isActive ?? true);
    if (type === "menu") {
      await updateMenuOption.run({
        id: option._id as Id<"menuOptions">,
        isActive,
      });
    } else {
      await updateDrinkOption.run({
        id: option._id as Id<"drinkOptions">,
        isActive,
      });
    }
  }

  return (
    <ListRows>
      {options.map((option) => {
        const isActive = option.isActive ?? true;

        return (
          <ListRow
            key={option._id}
            title={
              <span className="inline-flex items-center gap-2">
                <span
                  className={isActive ? undefined : "text-muted-foreground"}
                >
                  {option.name}
                </span>
                {!isActive && <StatusPill>Hidden</StatusPill>}
              </span>
            }
            subtitle={option.description || undefined}
            actions={
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleActive(option)}
                      aria-label={
                        isActive
                          ? `Hide ${option.name} from the invitation`
                          : `Show ${option.name} on the invitation`
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {isActive ? "Shown to guests" : "Hidden from guests"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(option)}
                    >
                      <Pencil className="size-4" aria-hidden />
                      <span className="sr-only">Edit {option.name}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit option</TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden />
                          <span className="sr-only">Delete {option.name}</span>
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Delete option</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete option</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete &ldquo;{option.name}&rdquo;? Guests who already
                        picked it will lose their selection. This cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          onDelete(
                            option._id as
                              | Id<"menuOptions">
                              | Id<"drinkOptions">,
                          )
                        }
                        className="bg-danger text-danger-foreground hover:bg-danger/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            }
          />
        );
      })}
    </ListRows>
  );
}
