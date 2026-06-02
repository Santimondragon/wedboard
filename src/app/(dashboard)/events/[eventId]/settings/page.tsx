"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  const params = useParams()
  const eventId = params.eventId as Id<"events">

  const event = useQuery(api.events.getEventById, { eventId })
  const updateEvent = useMutation(api.events.updateEvent)

  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft")
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (event) {
      setName(event.name ?? "")
      setDate(event.date ? new Date(event.date).toISOString().split("T")[0] : "")
      setVenueName(event.venueName ?? "")
      setVenueAddress(event.venueAddress ?? "")
      setStatus((event.status as "draft" | "active" | "archived") ?? "draft")
    }
  }, [event])

  async function handleSave() {
    setSaving(true)
    try {
      await updateEvent({
        eventId,
        name,
        date: date ? new Date(date).getTime() : undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        status,
      })
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      await updateEvent({ eventId, status: "archived" })
      setStatus("archived")
      toast.success("Event archived")
    } catch {
      toast.error("Failed to archive event")
    } finally {
      setArchiving(false)
    }
  }

  const isLoading = event === undefined

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Event Settings</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-base font-medium text-zinc-900">General</h2>
            <div className="space-y-1.5">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <Label htmlFor="venueName">Venue Name</Label>
              <Input
                id="venueName"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueAddress">Venue Address</Label>
              <Input
                id="venueAddress"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "draft" | "active" | "archived")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </section>

          <Separator />

          <section className="space-y-4 opacity-60 pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-zinc-900">Subdomain</h2>
              <Badge variant="outline" className="text-xs">Coming soon</Badge>
            </div>
            <Input disabled placeholder="your-event" />
          </section>

          <Separator />

          <section className="space-y-4 opacity-60 pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-zinc-900">Custom Domain</h2>
              <Badge variant="outline" className="text-xs">Coming soon</Badge>
            </div>
            <Input disabled placeholder="wedding.yourdomain.com" />
          </section>

          <Separator />

          <section className="space-y-4 opacity-60 pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-zinc-900">Invitation Template</h2>
              <Badge variant="outline" className="text-xs">Coming soon</Badge>
            </div>
            <p className="text-sm text-zinc-500">
              Choose a design template for your public invitation page.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-base font-medium text-zinc-900 text-rose-700">Danger Zone</h2>
            <div className="rounded-md border border-rose-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Archive this event</p>
                <p className="text-sm text-zinc-500">
                  The event will be marked as archived and hidden from active events.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50">
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive &ldquo;{event?.name}&rdquo;? The event and its data will
                      be preserved but it will be marked as archived.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleArchive}
                      disabled={archiving}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      {archiving ? "Archiving..." : "Archive Event"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
