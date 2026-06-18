"use client"

import { useState } from "react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { Check, Pencil, Trash2 } from "lucide-react"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type MediaItem = Doc<"media"> & { url: string | null }

interface MediaGridProps {
  items: MediaItem[]
}

export function MediaGrid({ items }: MediaGridProps) {
  const [editingId, setEditingId] = useState<Id<"media"> | null>(null)
  const [nameValue, setNameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)

  const renameMedia = useToastMutation(api.media.rename, {
    success: "Image renamed",
    error: "Failed to rename image",
  })
  const removeMedia = useToastMutation(api.media.remove, {
    success: "Image deleted",
    error: "Failed to delete image",
  })

  async function handleRename(id: Id<"media">) {
    if (!nameValue.trim()) return
    const result = await renameMedia.run({ id, name: nameValue.trim() })
    if (result.ok) setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await removeMedia.run({ id: deleteTarget._id })
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <div
            key={item._id}
            className="group overflow-hidden rounded-lg border bg-white"
          >
            <div className="aspect-square bg-zinc-100">
              {item.url && (
                 
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex items-center gap-1 p-2">
              {editingId === item._id ? (
                <>
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(item._id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label="Save name"
                    onClick={() => handleRename(item._id)}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                </>
              ) : (
                <>
                  <p
                    className="flex-1 truncate text-xs text-zinc-700"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-zinc-400 hover:text-zinc-900"
                    aria-label="Rename"
                    onClick={() => {
                      setEditingId(item._id)
                      setNameValue(item.name)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-rose-400 hover:text-rose-600"
                    aria-label="Delete"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{deleteTarget?.name}&rdquo;? Any template block
              using it will show its placeholder again. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
