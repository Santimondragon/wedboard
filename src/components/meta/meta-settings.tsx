"use client";

import { useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Image as ImageIcon } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import { FaviconUploadButton } from "@/components/meta/favicon-upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    <div className="p-6 max-w-5xl grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Meta &amp; Sharing
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Controls how your public invitation links look when shared on
            WhatsApp, iMessage, and social networks, plus the browser-tab icon.
            Leave a field empty to use the default built from your event data.
          </p>
        </div>

        <section className="space-y-4">
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
            <p className="text-xs text-zinc-400">
              {title.length}/{META_TITLE_MAX} · Click a variable to insert it:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {META_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  title={variable.description}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVariable(variable.token)}
                >
                  <Badge
                    variant="outline"
                    className="font-mono text-xs cursor-pointer hover:bg-zinc-100"
                  >
                    {"{" + variable.token + "}"}
                  </Badge>
                </button>
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
            <p className="text-xs text-zinc-400">
              {description.length}/{META_DESCRIPTION_MAX} · The same variables
              work here.
            </p>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-medium text-zinc-900">
              Social Image
            </h2>
            <p className="text-sm text-zinc-500">
              Shown as the large preview image when the link is shared.
              Recommended 1200×630.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-20 w-36 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Social preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-zinc-300" />
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
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-medium text-zinc-900">Favicon</h2>
            <p className="text-sm text-zinc-500">
              The browser-tab icon on your public invitation pages. Accepts
              .ico, .svg, or .png files.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center">
              {favicon?.url ? (
                <img
                  src={favicon.url}
                  alt="Favicon"
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-zinc-300" />
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
        </section>

        <Button onClick={handleSave} disabled={saveMeta.pending}>
          {saveMeta.pending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-2 lg:pt-16">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 text-center">
          Social card preview
        </p>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="aspect-[1200/630] bg-zinc-100 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Social card"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center">
                <p className="text-sm text-zinc-400">No image selected</p>
                <p className="text-xs text-zinc-300">
                  Platforms may pick a random image from the page
                </p>
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-zinc-900 leading-snug">
              {previewTitle}
            </p>
            <p className="text-sm text-zinc-600 line-clamp-2">
              {previewDescription}
            </p>
            <p className="text-xs text-zinc-400 truncate">{previewUrl}</p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 text-center">
          Preview uses{" "}
          {sampleInvitation
            ? `your invitation "${sampleInvitation.title}"`
            : "a sample invitation"}
          . Guest-name variables resolve per invitation on the real page.
        </p>
      </div>
    </div>
  );
}
