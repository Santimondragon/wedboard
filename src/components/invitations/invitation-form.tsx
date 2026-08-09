"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { RefreshCw, UserPlus, Lock, Sparkles, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StateBlock } from "@/components/app";
import { cn } from "@/lib/utils";
import {
  invitationSchema,
  type InvitationFormData,
} from "@/lib/validations/invitation";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ExistingInvitationGuest {
  _id: Id<"guests">;
  firstName: string;
  lastName: string;
  isPlusOne: boolean;
  rsvpStatus: string;
}

interface ExistingInvitation {
  _id: Id<"invitations">;
  title: string;
  slug: string;
  isSent?: boolean;
  notes?: string;
  guests?: ExistingInvitationGuest[];
  specialEvents?: { _id: Id<"specialEvents">; name: string }[];
}

interface InvitationFormProps {
  mode: "create" | "edit";
  invitation?: ExistingInvitation;
  eventId: Id<"events">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** One titled block of the dialog. Gives the long form real structure. */
function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: typeof Users;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-section flex items-center gap-2 text-foreground">
          {Icon && (
            <Icon className="size-4 text-muted-foreground" aria-hidden />
          )}
          {title}
        </h3>
        {description && (
          <p className="text-caption text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** A checkbox row inside one of the two selection lists. */
function CheckRow({
  checked,
  disabled,
  onToggle,
  children,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:bg-secondary",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
      />
      <span className="text-body text-foreground">{children}</span>
    </label>
  );
}

export function InvitationForm({
  mode,
  invitation,
  eventId,
  open,
  onOpenChange,
}: InvitationFormProps) {
  const params = useParams();
  const eventSlug = params?.eventSlug as string | undefined;
  const createInvitation = useToastMutation(api.invitations.createInvitation, {
    success: "Invitation created",
    error: "Failed to create invitation",
  });
  const updateInvitation = useToastMutation(api.invitations.updateInvitation, {
    success: "Invitation updated",
    error: "Failed to update invitation",
  });
  const regenerateSlug = useToastMutation(api.invitations.regenerateSlug, {
    error: "Failed to regenerate slug",
  });
  const setInvitationSent = useToastMutation(
    api.invitations.setInvitationSent,
    {
      error: "Failed to update sent status",
    },
  );

  // Both modes need the un-invited pool (to add) and the event's special
  // invitations (to grant access).
  const unassignedGuests = useQuery(
    api.guests.listUnassignedByEvent,
    open ? { eventId } : "skip",
  );
  const specialEvents = useQuery(
    api.specialEvents.listByEvent,
    open ? { eventId } : "skip",
  );
  const [selectedGuestIds, setSelectedGuestIds] = useState<Id<"guests">[]>([]);
  const [selectedSpecialIds, setSelectedSpecialIds] = useState<
    Id<"specialEvents">[]
  >([]);

  // Guests/special invitations are locked once any linked guest has responded.
  const currentGuests = invitation?.guests ?? [];
  const currentDirectGuests = currentGuests.filter((g) => !g.isPlusOne);
  const composeLocked =
    mode === "edit" && currentGuests.some((g) => g.rsvpStatus !== "pending");

  // Candidate guests: directly-linked guests (so they can be removed) plus the
  // un-invited pool (to add). In create mode there are no current guests yet.
  const candidateGuests = [
    ...(mode === "edit"
      ? currentDirectGuests.map((g) => ({
          _id: g._id,
          firstName: g.firstName,
          lastName: g.lastName,
        }))
      : []),
    ...(unassignedGuests ?? []).map((g) => ({
      _id: g._id,
      firstName: g.firstName,
      lastName: g.lastName,
    })),
  ];
  const guestsLoading = unassignedGuests === undefined;

  // Initialize the selection sets from the invitation each time the dialog
  // opens (or the source invitation changes while open). Done during render via
  // a sync key rather than an effect — the latter trips React Compiler's
  // set-state-in-effect rule.
  const syncKey = open ? `${mode}:${invitation?._id ?? ""}` : null;
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (syncKey !== syncedFor) {
    setSyncedFor(syncKey);
    if (open) {
      if (mode === "create") {
        setSelectedGuestIds([]);
        setSelectedSpecialIds([]);
      } else if (invitation) {
        setSelectedGuestIds(
          (invitation.guests ?? [])
            .filter((g) => !g.isPlusOne)
            .map((g) => g._id),
        );
        setSelectedSpecialIds(
          (invitation.specialEvents ?? []).map((s) => s._id),
        );
      }
    }
  }

  function toggleGuest(id: Id<"guests">) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  function toggleSpecial(id: Id<"specialEvents">) {
    setSelectedSpecialIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      title: "",
      slug: "",
      notes: "",
    },
  });

  const title = useWatch({ control, name: "title" });

  useEffect(() => {
    if (mode === "edit" && invitation) {
      reset({
        title: invitation.title,
        slug: invitation.slug,
        notes: invitation.notes ?? "",
      });
    } else if (mode === "create") {
      reset({
        title: "",
        slug: "",
        notes: "",
      });
    }
  }, [mode, invitation, reset, open]);

  useEffect(() => {
    if (mode === "create" && title) {
      setValue("slug", slugify(title));
    }
  }, [title, mode, setValue]);

  async function handleRegenerateSlug() {
    if (mode === "edit" && invitation) {
      const result = await regenerateSlug.run({ id: invitation._id });
      if (result.ok && typeof result.value === "string") {
        setValue("slug", result.value);
      }
    } else {
      setValue(
        "slug",
        slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
      );
    }
  }

  async function onSubmit(data: InvitationFormData) {
    let result;
    if (mode === "create") {
      result = await createInvitation.run({
        eventId,
        title: data.title,
        slug: data.slug,
        notes: data.notes,
        guestIds: selectedGuestIds,
        specialEventIds: selectedSpecialIds,
      });
    } else if (mode === "edit" && invitation) {
      result = await updateInvitation.run({
        id: invitation._id,
        title: data.title,
        slug: data.slug,
        notes: data.notes,
        // Only send composition changes while still editable.
        ...(composeLocked
          ? {}
          : {
              guestIds: selectedGuestIds,
              specialEventIds: selectedSpecialIds,
            }),
      });
    }
    if (result?.ok) onOpenChange(false);
  }

  const noGuestsToInvite =
    mode === "create" &&
    unassignedGuests !== undefined &&
    unassignedGuests.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        {noGuestsToInvite ? (
          <div className="flex max-h-[88vh] flex-col">
            <DialogHeader className="border-b border-border px-8 pt-8 pb-5 text-left">
              <DialogTitle>New invitation</DialogTitle>
              <DialogDescription>
                Group guests into one shareable link.
              </DialogDescription>
            </DialogHeader>
            <div className="px-8">
              <StateBlock
                kind="empty"
                icon={UserPlus}
                title="No guests to invite yet"
                description="Add guests to this event first, then group them into an invitation."
                compact
              />
            </div>
            <DialogFooter className="border-t border-border px-8 py-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button asChild>
                <Link
                  href={`/dashboard/${eventSlug}/guests`}
                  onClick={() => onOpenChange(false)}
                >
                  Add guest
                </Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex max-h-[88vh] flex-col"
          >
            <DialogHeader className="border-b border-border px-8 pt-8 pb-5 text-left">
              <DialogTitle>
                {mode === "create" ? "New invitation" : "Edit invitation"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "One link for a person, couple, family, or group."
                  : "Update this invitation's details, guests, and special invitations."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-8 overflow-y-auto px-8 py-7">
              {mode === "edit" && invitation && (
                <div
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-lg border p-4",
                    invitation.isSent
                      ? "border-success/25 bg-success-soft"
                      : "border-border bg-secondary",
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="text-body font-medium text-foreground">
                      {invitation.isSent ? "Invitation sent" : "Not sent yet"}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      Mark this once you have shared the link with the guests.
                    </p>
                  </div>
                  <Switch
                    checked={invitation.isSent ?? false}
                    onCheckedChange={(checked) =>
                      setInvitationSent.run({
                        id: invitation._id,
                        isSent: checked,
                      })
                    }
                    aria-label="Mark invitation as sent"
                  />
                </div>
              )}

              <FormSection
                title="Details"
                description="The name guests see and the link they open."
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="Smith Family"
                    />
                    {errors.title && (
                      <p className="text-caption text-danger">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Link slug *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        {...register("slug")}
                        placeholder="smith-family"
                        className="font-mono text-sm"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleRegenerateSlug}
                          >
                            <RefreshCw className="size-4" aria-hidden />
                            <span className="sr-only">Regenerate slug</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Regenerate slug</TooltipContent>
                      </Tooltip>
                    </div>
                    {errors.slug && (
                      <p className="text-caption text-danger">
                        {errors.slug.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Private notes about this invitation — guests never see these."
                      rows={3}
                    />
                  </div>
                </div>
              </FormSection>

              {composeLocked && (
                <div className="text-caption flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft p-4 text-warning-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Guests and special invitations are locked because a guest
                    has already responded.
                  </span>
                </div>
              )}

              <FormSection
                title="Special invitations"
                icon={Sparkles}
                description="Choose which special invitations this group can see."
              >
                {specialEvents === undefined ? (
                  <StateBlock kind="loading" title="Loading…" compact />
                ) : specialEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center">
                    <p className="text-caption text-muted-foreground">
                      No special invitations yet — this is optional.
                    </p>
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                    >
                      <Link
                        href={`/dashboard/${eventSlug}/special-events`}
                        onClick={() => onOpenChange(false)}
                      >
                        Create a special invitation
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-1.5">
                    {specialEvents.map((se) => (
                      <CheckRow
                        key={se._id}
                        checked={selectedSpecialIds.includes(se._id)}
                        disabled={composeLocked}
                        onToggle={() => toggleSpecial(se._id)}
                      >
                        {se.name}
                      </CheckRow>
                    ))}
                  </div>
                )}
              </FormSection>

              <FormSection
                title="Guests"
                icon={Users}
                description="Select the guests included in this invitation."
              >
                {guestsLoading ? (
                  <StateBlock kind="loading" title="Loading…" compact />
                ) : candidateGuests.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center">
                    <p className="text-caption text-muted-foreground">
                      No guests available. Add guests to this event first.
                    </p>
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                    >
                      <Link
                        href={`/dashboard/${eventSlug}/guests`}
                        onClick={() => onOpenChange(false)}
                      >
                        Add a guest
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-1.5">
                    {candidateGuests.map((guest) => (
                      <CheckRow
                        key={guest._id}
                        checked={selectedGuestIds.includes(guest._id)}
                        disabled={composeLocked}
                        onToggle={() => toggleGuest(guest._id)}
                      >
                        {guest.firstName} {guest.lastName}
                      </CheckRow>
                    ))}
                  </div>
                )}
              </FormSection>
            </div>

            <DialogFooter className="border-t border-border px-8 py-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "create"
                    ? "Creating…"
                    : "Saving…"
                  : mode === "create"
                    ? "Create invitation"
                    : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
