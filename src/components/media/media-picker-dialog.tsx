"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { Image as ImageIcon } from "lucide-react"
import { UploadButton } from "./upload-button"

interface MediaPickerDialogProps {
  eventId: Id<"events">
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently selected media id, if any. */
  value?: string
  onSelect: (mediaId: string | undefined) => void
}

/** Browse the event's media library and pick one image (used by the template editor). */
export function MediaPickerDialog({
  eventId,
  open,
  onOpenChange,
  value,
  onSelect,
}: MediaPickerDialogProps) {
  const items = useQuery(api.media.listByEvent, open ? { eventId } : "skip")

  function choose(mediaId: string | undefined) {
    onSelect(mediaId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Image</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <UploadButton eventId={eventId} onUploaded={(id) => choose(id)} />
          {value && (
            <Button variant="outline" size="sm" onClick={() => choose(undefined)}>
              Remove image
            </Button>
          )}
        </div>

        {items !== undefined && items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No images yet"
            description="Upload an image to use it in your invitation"
          />
        ) : (
          <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {(items ?? []).map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => choose(item._id)}
                className={cn(
                  "overflow-hidden rounded-lg border text-left transition-colors",
                  value === item._id
                    ? "border-zinc-900 ring-2 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-400"
                )}
              >
                <div className="aspect-square bg-zinc-100">
                  {item.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="truncate p-1.5 text-xs text-zinc-600" title={item.name}>
                  {item.name}
                </p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
