"use client";

import { useState, type ReactNode } from "react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RsvpStatusBadge } from "@/components/guests/rsvp-status-badge";
import type { SpecialEventStatus } from "@/components/guests/guest-table";
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
import { Trash2 } from "lucide-react";

type GuestWithInvitation = Doc<"guests"> & {
  invitationTitle?: string;
  specialStatuses?: Record<string, SpecialEventStatus>;
};

interface GuestDetailsSheetProps {
  guest: GuestWithInvitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuOptions: Array<Doc<"menuOptions">>;
  drinkOptions: Array<Doc<"drinkOptions">>;
  // Special events for the event, used to label the guest's RSVP statuses.
  specialEvents?: { _id: string; name: string }[];
  // The +1 record linked to this guest (when it hosts one).
  plusOne?: Doc<"guests"> | null;
  // The host's display name when this guest *is* a +1.
  hostName?: string | null;
}

/**
 * One labelled band inside the dialog. Sections carry the density here: a small
 * uppercase heading, an optional hint, and a stack of fields.
 */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A label/control pair laid out on one line, used by the RSVP rows. */
function InlineField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-body min-w-0 truncate text-foreground">
        {label}
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function GuestDetailsSheet({
  guest,
  open,
  onOpenChange,
  menuOptions,
  drinkOptions,
  specialEvents = [],
  plusOne,
  hostName,
}: GuestDetailsSheetProps) {
  const updateGuest = useToastMutation(api.guests.updateGuest, {
    success: "Guest updated successfully",
    error: "Failed to update guest",
  });
  const deleteGuest = useToastMutation(api.guests.deleteGuest, {
    success: "Guest deleted",
    error: "Failed to delete guest",
  });
  const addPlusOne = useToastMutation(api.guests.addPlusOne, {
    success: "+1 added",
    error: "Failed to add +1",
  });
  const removePlusOne = useToastMutation(api.guests.removePlusOne, {
    success: "+1 removed",
    error: "Failed to remove +1",
  });
  const setSpecialEventRsvp = useToastMutation(api.guests.setSpecialEventRsvp, {
    success: "Special event RSVP updated",
    error: "Failed to update special event RSVP",
  });
  const removeSpecialEventRsvp = useToastMutation(
    api.guests.removeSpecialEventRsvp,
    {
      success: "Removed from special event",
      error: "Failed to remove from special event",
    },
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<
    "pending" | "attending" | "declined"
  >("pending");
  const [allergies, setAllergies] = useState("");
  const [menuOptionId, setMenuOptionId] = useState<string | undefined>(
    undefined,
  );
  const [drinkOptionId, setDrinkOptionId] = useState<string | undefined>(
    undefined,
  );
  const [allowsPlusOne, setAllowsPlusOne] = useState(false);
  const saving = updateGuest.pending;
  const deleting = deleteGuest.pending;

  // Sync form fields from the selected guest during render (guarded by a
  // previous-value check) rather than in an effect — avoids the cascading
  // re-render that synchronous setState in useEffect triggers.
  const [syncedGuest, setSyncedGuest] = useState(guest);
  if (guest !== syncedGuest) {
    setSyncedGuest(guest);
    if (guest) {
      setFirstName(guest.firstName);
      setLastName(guest.lastName);
      setEmail(guest.email ?? "");
      setPhone(guest.phone ?? "");
      setRsvpStatus(
        (guest.rsvpStatus as "pending" | "attending" | "declined") ?? "pending",
      );
      setAllergies(guest.allergies ?? "");
      setMenuOptionId(guest.menuOptionId ?? undefined);
      setDrinkOptionId(guest.drinkOptionId ?? undefined);
      setAllowsPlusOne(guest.allowsPlusOne ?? false);
    }
  }

  async function handleSave() {
    if (!guest) return;
    const result = await updateGuest.run({
      id: guest._id,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      rsvpStatus,
      allergies: allergies || undefined,
      menuOptionId: menuOptionId as Id<"menuOptions"> | undefined,
      drinkOptionId: drinkOptionId as Id<"drinkOptions"> | undefined,
      allowsPlusOne,
    });
    if (result.ok) onOpenChange(false);
  }

  async function handleDelete() {
    if (!guest) return;
    const result = await deleteGuest.run({ id: guest._id });
    if (result.ok) onOpenChange(false);
  }

  const hasSelections = menuOptions.length > 0 || drinkOptions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-7 pt-6 pb-5 text-left">
          <DialogTitle>
            {guest
              ? `${guest.firstName} ${guest.lastName}`.trim()
              : "Guest details"}
          </DialogTitle>
          <DialogDescription>
            {guest?.invitationTitle
              ? `Invited via ${guest.invitationTitle}`
              : "This guest is not linked to an invitation yet."}
          </DialogDescription>
        </DialogHeader>

        {guest && (
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-7 py-6">
            <Section title="Contact">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
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
              </div>
            </Section>

            {/* RSVPs — the main event status plus a row per special event.
                Special-event rows save immediately; the main status saves with
                the rest of the form. */}
            <Section
              title="RSVPs"
              hint={
                specialEvents.length > 0
                  ? "Special invitation changes save immediately."
                  : undefined
              }
            >
              <div className="divide-y divide-border rounded-lg border border-border">
                <div className="px-4 py-3">
                  <InlineField label="Main event">
                    <Select
                      value={rsvpStatus}
                      onValueChange={(v) =>
                        setRsvpStatus(v as "pending" | "attending" | "declined")
                      }
                    >
                      <SelectTrigger
                        className="w-40"
                        aria-label="Main event RSVP status"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="attending">Attending</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </InlineField>
                </div>

                {/* Every special event — including ones the guest wasn't
                    invited to (default "Not invited"). Picking a status adds
                    them; picking "Not invited" removes their RSVP row. */}
                {specialEvents.map((se) => (
                  <div key={se._id} className="px-4 py-3">
                    <InlineField label={se.name}>
                      <Select
                        value={guest.specialStatuses?.[se._id] ?? "notInvited"}
                        disabled={
                          setSpecialEventRsvp.pending ||
                          removeSpecialEventRsvp.pending
                        }
                        onValueChange={(v) => {
                          const specialEventId = se._id as Id<"specialEvents">;
                          if (v === "notInvited") {
                            removeSpecialEventRsvp.run({
                              guestId: guest._id,
                              specialEventId,
                            });
                          } else {
                            setSpecialEventRsvp.run({
                              guestId: guest._id,
                              specialEventId,
                              status: v as "pending" | "attending" | "declined",
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className="w-40"
                          aria-label={`RSVP status for ${se.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notInvited">
                            Not invited
                          </SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="attending">Attending</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                    </InlineField>
                  </div>
                ))}
              </div>
            </Section>

            {/* +1 management — a guest that IS a +1 shows its host; a host
                guest can allow and manage its +1. */}
            <Section title="Plus one">
              {guest.isPlusOne ? (
                <div className="text-body rounded-lg border border-border bg-secondary/60 px-4 py-3 text-muted-foreground">
                  This guest is the +1 of{" "}
                  <span className="font-medium text-foreground">
                    {hostName ?? "—"}
                  </span>
                  .
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-secondary/60 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="allowsPlusOne"
                      checked={allowsPlusOne}
                      onCheckedChange={(checked) => setAllowsPlusOne(!!checked)}
                    />
                    <Label
                      htmlFor="allowsPlusOne"
                      className="cursor-pointer font-normal"
                    >
                      This guest may bring a +1
                    </Label>
                  </div>
                  {allowsPlusOne &&
                    (plusOne ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-body flex items-center gap-2 text-foreground">
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
                        onClick={() =>
                          addPlusOne.run({ hostGuestId: guest._id })
                        }
                      >
                        Add +1
                      </Button>
                    ))}
                  {!allowsPlusOne && plusOne && (
                    <p className="text-caption text-warning-foreground">
                      Saving with &ldquo;may bring a +1&rdquo; off will remove
                      the linked +1.
                    </p>
                  )}
                </div>
              )}
            </Section>

            {hasSelections && (
              <Section title="Selections">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {menuOptions.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Menu</Label>
                      <Select
                        value={menuOptionId ?? "none"}
                        onValueChange={(v) =>
                          setMenuOptionId(v === "none" ? undefined : v)
                        }
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label="Menu selection"
                        >
                          <SelectValue placeholder="Select menu option…" />
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
                      <Label>Drink</Label>
                      <Select
                        value={drinkOptionId ?? "none"}
                        onValueChange={(v) =>
                          setDrinkOptionId(v === "none" ? undefined : v)
                        }
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label="Drink selection"
                        >
                          <SelectValue placeholder="Select drink option…" />
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
                </div>
              </Section>
            )}

            <Section
              title="Notes"
              hint="Only visible to you and your co-planners."
            >
              <div className="space-y-1.5">
                <Label htmlFor="allergies">Allergies &amp; dietary needs</Label>
                <Textarea
                  id="allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  rows={3}
                  placeholder="Nut allergy, vegetarian, …"
                />
              </div>
            </Section>
          </div>
        )}

        {guest && (
          <DialogFooter className="border-t border-border px-7 py-4 sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete guest</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete {guest.firstName} {guest.lastName}? This also removes
                    their RSVPs and any linked +1. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
