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
import { Textarea } from "@/components/ui/textarea"
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
}

export function GuestDetailsSheet({
  guest,
  open,
  onOpenChange,
  menuOptions,
  drinkOptions,
}: GuestDetailsSheetProps) {
  const updateGuest = useToastMutation(api.guests.updateGuest, {
    success: "Guest updated successfully",
    error: "Failed to update guest",
  })
  const deleteGuest = useToastMutation(api.guests.deleteGuest, {
    success: "Guest deleted",
    error: "Failed to delete guest",
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
