"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Image as ImageIcon } from "lucide-react"
import { useEvent } from "@/components/dashboard/event-provider"
import { MediaGrid } from "@/components/media/media-grid"
import { UploadButton } from "@/components/media/upload-button"
import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"

export default function MediaPage() {
  const eventId = useEvent()._id
  const items = useQuery(api.media.listByEvent, { eventId })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Media
          {items !== undefined && (
            <span className="ml-2 text-base font-normal text-zinc-500">
              ({items.length})
            </span>
          )}
        </h1>
        <UploadButton eventId={eventId} />
      </div>

      {items === undefined ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Upload images to use them in your public invitation template"
        />
      ) : (
        <MediaGrid items={items} />
      )}
    </div>
  )
}
