"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { hasMinRole } from "@/lib/roles";
import { CustomDomainSettings } from "@/components/dashboard/custom-domain-settings";
import { AccessNotice, PageHeader, Panel } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const router = useRouter();
  const event = useEvent();
  const eventId = event._id;
  const canManage = hasMinRole(event.myRole, "planner");
  const isOwner = event.myRole === "owner";
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [date, setDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueMapUrl, setVenueMapUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">(
    "draft",
  );
  const [saving, setSaving] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync form fields from the loaded event during render (guarded by a
  // previous-value check) rather than in an effect — avoids the cascading
  // re-render that synchronous setState in useEffect triggers.
  const [syncedEvent, setSyncedEvent] = useState<typeof event | null>(null);
  if (event !== syncedEvent) {
    setSyncedEvent(event);
    if (event) {
      setName(event.name ?? "");
      setSlug(event.slug ?? "");
      setBrideName(event.brideName ?? "");
      setGroomName(event.groomName ?? "");
      setDate(
        event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      );
      setVenueName(event.venueName ?? "");
      setVenueAddress(event.venueAddress ?? "");
      setVenueMapUrl(event.venueMapUrl ?? "");
      setStatus((event.status as "draft" | "active" | "archived") ?? "draft");
    }
  }

  async function handleSaveSlug() {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error(
        "Event key may only contain lowercase letters, numbers, and hyphens",
      );
      return;
    }
    setSavingSlug(true);
    try {
      await updateEvent({ eventId, slug });
      toast.success("Event key updated");
      // The slug is part of the URL — move to the new address.
      router.replace(`/dashboard/${slug}/settings`);
    } catch (err) {
      toast.error(
        err instanceof ConvexError
          ? (err.data as string)
          : "Failed to update event key",
      );
    } finally {
      setSavingSlug(false);
    }
  }

  async function handleSave() {
    const trimmedMapUrl = venueMapUrl.trim();
    if (trimmedMapUrl && !/^https?:\/\//i.test(trimmedMapUrl)) {
      toast.error("Location link must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      await updateEvent({
        eventId,
        name,
        brideName: brideName || undefined,
        groomName: groomName || undefined,
        date: date ? new Date(date).getTime() : undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        venueMapUrl: trimmedMapUrl || undefined,
        status,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await updateEvent({ eventId, status: "archived" });
      setStatus("archived");
      toast.success("Event archived");
    } catch {
      toast.error("Failed to archive event");
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEvent({ eventId });
      toast.success("Event deleted");
      router.replace("/dashboard");
    } catch {
      toast.error("Failed to delete event");
      setDeleting(false);
    }
  }

  // Editors (content-only) can't reach settings. The sidebar hides this route,
  // but guard direct navigation too.
  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Event details, public address, and lifecycle."
        />
        <AccessNotice requiredRole="planner">
          Event settings are available to owners and co-owners. Ask an event
          owner if you need access.
        </AccessNotice>
        <Button asChild variant="outline">
          <Link href={`/dashboard/${event.slug}`}>Back to overview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      <PageHeader
        title="Settings"
        description="The details behind every public invitation for this event — the couple, the date, the venue, and the address guests visit."
      />

      <Panel
        title="General"
        description="Shown on the invitation hero, the countdown, and the location card."
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Event name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brideName">Bride&apos;s name</Label>
              <Input
                id="brideName"
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                placeholder="Ava"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="groomName">Groom&apos;s name</Label>
              <Input
                id="groomName"
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                placeholder="Liam"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "draft" | "active" | "archived")
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-caption text-muted-foreground">
                Archived events stop serving their public invitations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="venueName">Venue name</Label>
              <Input
                id="venueName"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venueAddress">Venue address</Label>
              <Input
                id="venueAddress"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venueMapUrl">Location link (Google Maps)</Label>
            <Input
              id="venueMapUrl"
              type="url"
              inputMode="url"
              value={venueMapUrl}
              onChange={(e) => setVenueMapUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
            />
            <p className="text-caption text-muted-foreground">
              Guests tap &ldquo;View map&rdquo; on the invitation to open this
              link.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Event key"
        description="Your public invitation links use this key, like a handle. It must be unique across all events."
        actions={
          <Button
            onClick={handleSaveSlug}
            disabled={savingSlug}
            variant="outline"
          >
            {savingSlug ? "Saving…" : "Save key"}
          </Button>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="slug">Key</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="font-mono"
            placeholder="smith-wedding"
          />
          <p className="text-caption font-mono text-muted-foreground">
            /{slug || "your-event"}/invitations/…
          </p>
        </div>
      </Panel>

      <CustomDomainSettings
        eventId={eventId}
        customDomain={event.customDomain}
        customDomainVerified={event.customDomainVerified}
      />

      <Panel
        title={
          <span className="flex items-center gap-2">
            Subdomain
            <Badge variant="outline" className="text-caption font-normal">
              Coming soon
            </Badge>
          </span>
        }
        description="A wedboard.app address for this event, without buying a domain."
        className="opacity-70"
      >
        <div className="pointer-events-none select-none">
          <Input disabled placeholder="your-event" />
        </div>
      </Panel>

      <div className="grid gap-7 sm:grid-cols-2">
        <Panel
          title="Invitation template"
          description="Choose a design and build the sections shown on your public invitation page."
        >
          <Button asChild variant="outline">
            <Link href={`/dashboard/${event.slug}/template`}>
              Manage template
              <ArrowUpRight className="ml-1 size-4" aria-hidden />
            </Link>
          </Button>
        </Panel>

        <Panel
          title="Members & sharing"
          description="Invite co-owners and editors to collaborate on this event."
        >
          <Button asChild variant="outline">
            <Link href={`/dashboard/${event.slug}/members`}>
              Manage members
              <ArrowUpRight className="ml-1 size-4" aria-hidden />
            </Link>
          </Button>
        </Panel>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2 text-danger">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Danger zone
          </span>
        }
        description="These actions change who can reach this event. Deleting is permanent."
        className="border-danger/30"
        padded={false}
      >
        <div className="divide-y divide-border border-t border-border">
          <div className="flex flex-col gap-3 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="text-body font-medium text-foreground">
                Archive this event
              </p>
              <p className="text-caption max-w-md text-muted-foreground">
                Hides it from your active events and stops serving its public
                invitations. Everything is preserved and you can unarchive it
                from the status field above.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                >
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Archive &ldquo;{event.name}&rdquo;? The event and its data
                    are preserved, but its public invitation links stop working
                    until you make it active again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleArchive}
                    disabled={archiving}
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    {archiving ? "Archiving…" : "Archive event"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isOwner && (
            <div className="flex flex-col gap-3 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="text-body font-medium text-foreground">
                  Delete this event
                </p>
                <p className="text-caption max-w-md text-muted-foreground">
                  Permanently removes the event and everything in it —
                  invitations, guests, special invitations, menus, tables,
                  media, and messages. This cannot be undone.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="shrink-0 bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Permanently delete &ldquo;{event.name}&rdquo;? This
                      removes the event and all related invitations, guests,
                      special invitations, menus, drinks, tables, media, and
                      messages. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-danger text-danger-foreground hover:bg-danger/90"
                    >
                      {deleting ? "Deleting…" : "Delete event"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
