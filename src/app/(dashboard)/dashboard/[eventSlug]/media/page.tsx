"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Image as ImageIcon } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { MediaGrid } from "@/components/media/media-grid";
import { UploadButton } from "@/components/media/upload-button";
import { PageHeader, Panel, StateBlock } from "@/components/app";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Mirrors the per-event cap enforced in `convex/media.ts`. */
const MEDIA_LIMIT = 50;

export default function MediaPage() {
  const eventId = useEvent()._id;
  const items = useQuery(api.media.listByEvent, { eventId });

  const used = items?.length ?? 0;
  const pct = Math.min(100, Math.round((used / MEDIA_LIMIT) * 100));
  const nearLimit = used >= MEDIA_LIMIT * 0.8;
  const atLimit = used >= MEDIA_LIMIT;

  return (
    <div className="space-y-9">
      <PageHeader
        title="Media"
        description="Images you can drop into your invitation template — hero photos, maps, dress-code shots. Up to 50 images, 5MB each."
        actions={<UploadButton eventId={eventId} />}
      />

      <Panel
        title="Library"
        description={
          items === undefined
            ? undefined
            : `${used} of ${MEDIA_LIMIT} images used`
        }
        actions={
          items !== undefined ? (
            <div className="w-40 space-y-1.5">
              <Progress
                value={pct}
                aria-label={`${used} of ${MEDIA_LIMIT} images used`}
                className={cn(
                  "h-2",
                  atLimit
                    ? "[&_[data-slot=progress-indicator]]:bg-danger"
                    : nearLimit
                      ? "[&_[data-slot=progress-indicator]]:bg-warning"
                      : "[&_[data-slot=progress-indicator]]:bg-accent",
                )}
              />
              <p
                className={cn(
                  "text-caption text-right",
                  atLimit ? "text-danger" : "text-muted-foreground",
                )}
              >
                {atLimit
                  ? "Library full — delete an image to upload more"
                  : `${MEDIA_LIMIT - used} slots left`}
              </p>
            </div>
          ) : undefined
        }
      >
        {items === undefined ? (
          <StateBlock kind="loading" title="Loading your images…" />
        ) : items.length === 0 ? (
          <StateBlock
            kind="empty"
            icon={ImageIcon}
            title="No images yet"
            description="Upload an image and it becomes available to every image slot in the template editor."
          />
        ) : (
          <MediaGrid items={items} />
        )}
      </Panel>
    </div>
  );
}
