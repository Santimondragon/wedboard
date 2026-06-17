"use client"

import { useState } from "react"
import { api } from "convex/_generated/api"
import { Doc, Id } from "convex/_generated/dataModel"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RsvpStatusBadge } from "@/components/guests/rsvp-status-badge"
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
import { Trash2 } from "lucide-react"

type GuestWithInvitation = Doc<"guests"> & { invitationTitle?: string }

interface GuestDetailsSheetProps {
  guest: GuestWithInvitation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  menuOptions: Array<Doc<"menuOptions">>
  drinkOptions: Array<Doc<"drinkOptions">>
  // The +1 record linked to this guest (when it hosts one).
  plusOne?: Doc<"guests"> | null
  // The host's display name when this guest *is* a +1.
  hostName?: string | null
}

export function GuestDetailsSheet({
  guest,
  open,
  onOpenChange,
  menuOptions,
  drinkOptions,
  plusOne,
  hostName,
}: GuestDetailsSheetProps) {
  const updateGuest = useToastMutation(api.guests.updateGuest, {
    success: "Guest updated successfully",
    error: "Failed to update guest",
  })
  const deleteGuest = useToastMutation(api.guests.deleteGuest, {
    success: "Guest deleted",
    error: "Failed to delete guest",
  })
  const addPlusOne = useToastMutation(api.guests.addPlusOne, {
    success: "+1 added",
    error: "Failed to add +1",
  })
  const removePlusOne = useToastMutation(api.guests.removePlusOne, {
    success: "+1 removed",
    error: "Failed to remove +1",
  })

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [rsvpStatus, setRsvpStatus] = useState<"pending" | "attending" | "declined">("pending")
  const [allergies, setAllergies] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [menuOptionId, setMenuOptionId] = useState<string | undefined>(undefined)
  const [drinkOptionId, setDrinkOptionId] = useState<string | undefined>(undefined)
  const [allowsPlusOne, setAllowsPlusOne] = useState(false)
  const saving = updateGuest.pending
  const deleting = deleteGuest.pending

  // Sync form fields from the selected guest during render (guarded by a
  // previous-value check) rather than in an effect — avoids the cascading
  // re-render that synchronous setState in useEffect triggers.
  const [syncedGuest, setSyncedGuest] = useState(guest)
  if (guest !== syncedGuest) {
    setSyncedGuest(guest)
    if (guest) {
      setFirstName(guest.firstName)
      setLastName(guest.lastName)
      setEmail(guest.email ?? "")
      setPhone(guest.phone ?? "")
      setRsvpStatus((guest.rsvpStatus as "pending" | "attending" | "declined") ?? "pending")
      setAllergies(guest.allergies ?? "")
      setSpecialRequests(guest.specialRequests ?? "")
      setMenuOptionId(guest.menuOptionId ?? undefined)
      setDrinkOptionId(guest.drinkOptionId ?? undefined)
      setAllowsPlusOne(guest.allowsPlusOne ?? false)
    }
  }

  async function handleSave() {
    if (!guest) return
    const result = await updateGuest.run({
      id: guest._id,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      rsvpStatus,
      allergies: allergies || undefined,
      specialRequests: specialRequests || undefined,
      menuOptionId: menuOptionId as Id<"menuOptions"> | undefined,
      drinkOptionId: drinkOptionId as Id<"drinkOptions"> | undefined,
      allowsPlusOne,
    })
    if (result.ok) onOpenChange(false)
  }

  async function handleDelete() {
    if (!guest) return
    const result = await deleteGuest.run({ id: guest._id })
    if (result.ok) onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Guest Details</SheetTitle>
          {guest?.invitationTitle && (
            <p className="text-sm text-zinc-500">{guest.invitationTitle}</p>
          )}
        </SheetHeader>

        {guest && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>RSVP Status</Label>
              <Select
                value={rsvpStatus}
                onValueChange={(v) => setRsvpStatus(v as "pending" | "attending" | "declined")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="attending">Attending</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* +1 management — a guest that IS a +1 shows its host; a host
                guest can allow and manage its +1. */}
            {guest.isPlusOne ? (
              <div className="rounded-md border bg-zinc-50 p-3 text-sm text-zinc-600">
                ↳ +1 de {hostName ?? "—"}
              </div>
            ) : (
              <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allowsPlusOne"
                    checked={allowsPlusOne}
                    onCheckedChange={(checked) => setAllowsPlusOne(!!checked)}
                  />
                  <Label htmlFor="allowsPlusOne" className="font-normal cursor-pointer">
                    Allows +1
                  </Label>
                </div>
                {allowsPlusOne &&
                  (plusOne ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-zinc-700">
                        <span>
                          {plusOne.firstName} {plusOne.lastName}
                        </span>
                        <RsvpStatusBadge status={plusOne.rsvpStatus} />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={removePlusOne.pending}
                        onClick={() =>
                          removePlusOne.run({ hostGuestId: guest._id })
                        }
                      >
                        Remove +1
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={addPlusOne.pending}
                      onClick={() => addPlusOne.run({ hostGuestId: guest._id })}
                    >
                      Add +1
                    </Button>
                  ))}
                {!allowsPlusOne && plusOne && (
                  <p className="text-xs text-zinc-500">
                    Turning off &ldquo;Allows +1&rdquo; and saving will remove the
                    linked +1.
                  </p>
                )}
              </div>
            )}

            {menuOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Menu Selection</Label>
                <Select
                  value={menuOptionId ?? "none"}
                  onValueChange={(v) => setMenuOptionId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select menu option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No selection</SelectItem>
                    {menuOptions.map((opt) => (
                      <SelectItem key={opt._id} value={opt._id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {drinkOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Drink Selection</Label>
                <Select
                  value={drinkOptionId ?? "none"}
                  onValueChange={(v) => setDrinkOptionId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select drink option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No selection</SelectItem>
                    {drinkOptions.map((opt) => (
                      <SelectItem key={opt._id} value={opt._id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Guest</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {guest.firstName} {guest.lastName}? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
