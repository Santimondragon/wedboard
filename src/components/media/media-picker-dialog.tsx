"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/app";
import { Check, Image as ImageIcon } from "lucide-react";
import { UploadButton } from "./upload-button";

interface MediaPickerDialogProps {
  eventId: Id<"events">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected media id, if any. */
  value?: string;
  onSelect: (mediaId: string | undefined) => void;
}

/** Browse the event's media library and pick one image (used by the template editor). */
export function MediaPickerDialog({
  eventId,
  open,
  onOpenChange,
  value,
  onSelect,
}: MediaPickerDialogProps) {
  const items = useQuery(api.media.listByEvent, open ? { eventId } : "skip");

  function choose(mediaId: string | undefined) {
    onSelect(mediaId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose image</DialogTitle>
          <DialogDescription>
            Pick one from this event&apos;s media library, or upload a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <UploadButton eventId={eventId} onUploaded={(id) => choose(id)} />
          {value && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => choose(undefined)}
            >
              Remove image
            </Button>
          )}
        </div>

        {items === undefined ? (
          <StateBlock kind="loading" title="Loading library…" compact />
        ) : items.length === 0 ? (
          <StateBlock
            kind="empty"
            icon={ImageIcon}
            title="No images yet"
            description="Upload an image to use it in your invitation."
            compact
          />
        ) : (
          <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((item) => {
              const selected = value === item._id;
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => choose(item._id)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected
                      ? "border-accent ring-2 ring-accent/40"
                      : "border-border hover:border-accent/50",
                  )}
                >
                  <div className="aspect-square bg-secondary">
                    {item.url && (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="size-3" aria-hidden />
                    </span>
                  )}
                  <p
                    className="text-caption truncate px-2 py-1.5 text-muted-foreground"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
