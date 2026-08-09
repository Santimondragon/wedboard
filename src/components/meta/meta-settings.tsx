"use client";

import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Image as ImageIcon, Globe } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { FaviconUploadButton } from "@/components/meta/favicon-upload-button";
import { PageHeader, Panel } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  META_VARIABLES,
  META_TITLE_MAX,
  META_DESCRIPTION_MAX,
  DEFAULT_META_TITLE,
  DEFAULT_META_DESCRIPTION,
  buildMetaVariables,
  resolveMetaTemplate,
} from "convex/lib/meta";

export function MetaSettings() {
  const event = useEvent();
  const eventId = event._id;

  const media = useQuery(api.media.listByEvent, { eventId });
  const invitations = useQuery(api.invitations.listByEvent, { eventId });
  const saveMeta = useToastMutation(api.meta.updateEventMeta, {
    success: "Sharing settings saved",
    error: "Failed to save sharing settings",
  });

  const [title, setTitle] = useState(event.meta?.title ?? "");
  const [description, setDescription] = useState(event.meta?.description ?? "");
  const [imageId, setImageId] = useState<Id<"media"> | undefined>(
    event.meta?.imageId,
  );
  const [faviconId, setFaviconId] = useState<Id<"media"> | undefined>(
    event.meta?.faviconId,
  );
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync form fields from the loaded event during render (same pattern as the
  // settings page) rather than in an effect.
  const [syncedEvent, setSyncedEvent] = useState<typeof event | null>(null);
  if (event !== syncedEvent) {
    setSyncedEvent(event);
    setTitle(event.meta?.title ?? "");
    setDescription(event.meta?.description ?? "");
    setImageId(event.meta?.imageId);
    setFaviconId(event.meta?.faviconId);
  }

  const imageUrl = media?.find((m) => m._id === imageId)?.url ?? null;
  const favicon = media?.find((m) => m._id === faviconId) ?? null;

  // Live preview resolved against the first invitation (or a sample).
  const sampleInvitation = invitations?.[0];
  const previewVariables = buildMetaVariables({
    eventName: event.name,
    brideName: event.brideName,
    groomName: event.groomName,
    invitationTitle: sampleInvitation?.title ?? "The Smith Family",
    guestNames: [],
  });
  const previewTitle = resolveMetaTemplate(
    title || DEFAULT_META_TITLE,
    previewVariables,
  );
  const previewDescription = resolveMetaTemplate(
    description || DEFAULT_META_DESCRIPTION,
    previewVariables,
  );
  const primaryDomain =
    process.env.NEXT_PUBLIC_PRIMARY_DOMAIN ?? "wedboard.app";
  const previewHost = event.customDomain ?? primaryDomain;
  const previewUrl = `${event.customDomain ?? `${primaryDomain}/${event.slug}`}/invitations/${sampleInvitation?.slug ?? "the-smith-family"}`;

  function insertVariable(token: string) {
    const input = titleRef.current;
    const text = `{${token}}`;
    if (input && document.activeElement === input) {
      const start = input.selectionStart ?? title.length;
      const end = input.selectionEnd ?? title.length;
      setTitle(title.slice(0, start) + text + title.slice(end));
    } else {
      setTitle((t) => (t ? `${t} ${text}` : text));
    }
  }

  function handleSave() {
    saveMeta.run({
      eventId,
      title: title || undefined,
      description: description || undefined,
      imageId,
      faviconId,
    });
  }

  return (
    <div className="space-y-9">
      <PageHeader
        title="Meta &amp; Sharing"
        description="Controls how your public invitation links look when shared on WhatsApp, iMessage, and social networks, plus the browser-tab icon. Leave a field empty to use the default built from your event data."
        actions={
          <Button onClick={handleSave} disabled={saveMeta.pending}>
            {saveMeta.pending ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-7">
          <Panel
            title="Link text"
            description="The headline and blurb that appear under a shared link."
          >
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="metaTitle">Title</Label>
                <Input
                  id="metaTitle"
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={META_TITLE_MAX}
                  placeholder={DEFAULT_META_TITLE}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-caption text-muted-foreground">
                    Click a variable to insert it
                  </p>
                  <CharCount value={title.length} max={META_TITLE_MAX} />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {META_VARIABLES.map((variable) => (
                    <Tooltip key={variable.token}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertVariable(variable.token)}
                          className="text-caption cursor-pointer rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent-soft-foreground"
                        >
                          {"{" + variable.token + "}"}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{variable.description}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="metaDescription">Description</Label>
                <Textarea
                  id="metaDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={META_DESCRIPTION_MAX}
                  rows={3}
                  placeholder={DEFAULT_META_DESCRIPTION}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-caption text-muted-foreground">
                    The same variables work here.
                  </p>
                  <CharCount
                    value={description.length}
                    max={META_DESCRIPTION_MAX}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Social image"
            description="Shown as the large preview image when the link is shared. Recommended 1200×630."
          >
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Social preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon
                    className="size-6 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImagePickerOpen(true)}
                >
                  {imageId ? "Change image" : "Choose image"}
                </Button>
                {imageId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageId(undefined)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <MediaPickerDialog
              eventId={eventId}
              open={imagePickerOpen}
              onOpenChange={setImagePickerOpen}
              value={imageId}
              onSelect={(id) => setImageId(id as Id<"media"> | undefined)}
            />
          </Panel>

          <Panel
            title="Favicon"
            description="The browser-tab icon on your public invitation pages. Accepts .ico, .svg, or .png files."
          >
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                {favicon?.url ? (
                  <img
                    src={favicon.url}
                    alt="Favicon"
                    className="size-6 object-contain"
                  />
                ) : (
                  <Globe className="size-5 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="flex gap-2">
                <FaviconUploadButton
                  eventId={eventId}
                  onUploaded={(id) => setFaviconId(id)}
                />
                {faviconId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFaviconId(undefined)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* The unfurl preview is the point of this page — keep it in view. */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-3">
            <p className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
              Live preview
            </p>

            {/* Browser tab — shows the favicon in the place it actually lands. */}
            <div className="flex items-center gap-2 rounded-t-lg border border-border bg-secondary px-3 py-2">
              <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                {favicon?.url ? (
                  <img
                    src={favicon.url}
                    alt=""
                    className="size-full object-contain"
                  />
                ) : (
                  <Globe
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </span>
              <span className="text-caption truncate text-muted-foreground">
                {previewTitle}
              </span>
            </div>

            {/* Social card */}
            <div className="-mt-3 overflow-hidden rounded-b-lg border border-t-0 border-border bg-card shadow-soft-md">
              <div className="flex aspect-[1200/630] items-center justify-center bg-secondary">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Social card"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="space-y-1 px-6 text-center">
                    <ImageIcon
                      className="mx-auto size-6 text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-caption text-muted-foreground">
                      No image selected
                    </p>
                    <p className="text-caption text-muted-foreground/70">
                      Platforms may pick a random image from the page
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1 px-5 py-4">
                <p className="text-caption truncate text-muted-foreground uppercase">
                  {previewHost}
                </p>
                <p className="text-body leading-snug font-semibold text-foreground">
                  {previewTitle}
                </p>
                <p className="text-caption line-clamp-2 text-muted-foreground">
                  {previewDescription}
                </p>
              </div>
            </div>

            <p className="text-caption text-muted-foreground">
              <span className="font-mono break-all">{previewUrl}</span>
            </p>
            <p className="text-caption text-muted-foreground">
              Preview uses{" "}
              {sampleInvitation
                ? `your invitation “${sampleInvitation.title}”`
                : "a sample invitation"}
              . Guest-name variables resolve per invitation on the real page.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Char counter that warns as the field approaches its cap. */
function CharCount({ value, max }: { value: number; max: number }) {
  const near = value >= max * 0.9;
  return (
    <span
      className={cn(
        "text-caption tabular-figures shrink-0",
        near ? "text-warning-foreground" : "text-muted-foreground",
      )}
    >
      {value}/{max}
    </span>
  );
}
