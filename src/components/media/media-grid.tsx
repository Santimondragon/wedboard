"use client";

import { useState } from "react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Check, ImageOff, Pencil, Trash2, X } from "lucide-react";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";

export type MediaItem = Doc<"media"> & { url: string | null };

interface MediaGridProps {
  items: MediaItem[];
}

/** Human-readable file size for the tile caption. */
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({ items }: MediaGridProps) {
  const [editingId, setEditingId] = useState<Id<"media"> | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const renameMedia = useToastMutation(api.media.rename, {
    success: "Image renamed",
    error: "Failed to rename image",
  });
  const removeMedia = useToastMutation(api.media.remove, {
    success: "Image deleted",
    error: "Failed to delete image",
  });

  async function handleRename(id: Id<"media">) {
    if (!nameValue.trim()) return;
    const result = await renameMedia.run({ id, name: nameValue.trim() });
    if (result.ok) setEditingId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeMedia.run({ id: deleteTarget._id });
    setDeleteTarget(null);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => {
          const isEditing = editingId === item._id;
          return (
            <li
              key={item._id}
              className="group overflow-hidden rounded-lg border border-border bg-card shadow-soft-xs transition-shadow hover:shadow-soft-md"
            >
              <div className="relative aspect-square bg-secondary">
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageOff
                      className="size-5 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                )}

                {/* Hover actions sit over the image so the caption row stays
                    quiet and the tile reads as an asset, not a form. */}
                {!isEditing && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="size-8 shadow-soft-sm"
                          aria-label={`Rename ${item.name}`}
                          onClick={() => {
                            setEditingId(item._id);
                            setNameValue(item.name);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rename</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="size-8 text-danger shadow-soft-sm hover:text-danger"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 px-3 py-2.5">
                {isEditing ? (
                  <>
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="h-8"
                      aria-label="Image name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(item._id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-success"
                      aria-label="Save name"
                      onClick={() => handleRename(item._id)}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground"
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-caption truncate font-medium text-foreground"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {formatSize(item.size)}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{deleteTarget?.name}&rdquo;? Any template block
              using it will show its placeholder again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
