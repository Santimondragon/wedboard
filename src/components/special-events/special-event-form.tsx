"use client";

import { useEffect, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import {
  specialEventSchema,
  type SpecialEventFormData,
} from "@/lib/validations/special-event";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type SpecialEvent = Doc<"specialEvents">;
type Invitation = Doc<"invitations">;

interface SpecialEventFormProps {
  mode: "create" | "edit";
  specialEvent?: SpecialEvent;
  eventId: Id<"events">;
  invitations: Invitation[];
  /** invitation ids this special event is currently visible to (edit mode). */
  accessIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Unix ms → the value an <input type="datetime-local"> expects. */
function toDateTimeLocal(ms?: number): string {
  if (!ms) return "";
  return format(new Date(ms), "yyyy-MM-dd'T'HH:mm");
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-section text-foreground">{title}</h3>
        {description && (
          <p className="text-caption text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function SpecialEventForm({
  mode,
  specialEvent,
  eventId,
  invitations,
  accessIds,
  open,
  onOpenChange,
}: SpecialEventFormProps) {
  const createSpecialEvent = useToastMutation(
    api.specialEvents.createSpecialEvent,
    {
      success: "Special invitation created",
      error: "Failed to create special invitation",
    },
  );
  const updateSpecialEvent = useToastMutation(
    api.specialEvents.updateSpecialEvent,
    {
      success: "Special invitation updated",
      error: "Failed to update special invitation",
    },
  );
  const setSpecialEventAccess = useMutation(
    api.invitations.setSpecialEventAccess,
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpecialEventFormData>({
    resolver: zodResolver(specialEventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      location: "",
      isActive: true,
    },
  });

  const isActive = useWatch({ control, name: "isActive" });

  useEffect(() => {
    if (open && specialEvent) {
      reset({
        name: specialEvent.name,
        description: specialEvent.description ?? "",
        date: toDateTimeLocal(specialEvent.date),
        location: specialEvent.location ?? "",
        isActive: specialEvent.isActive ?? true,
      });
    } else if (open && mode === "create") {
      reset({
        name: "",
        description: "",
        date: "",
        location: "",
        isActive: true,
      });
    }
  }, [open, specialEvent, mode, reset]);

  async function onSubmit(data: SpecialEventFormData) {
    const date = data.date ? new Date(data.date).getTime() : undefined;
    if (mode === "create") {
      const result = await createSpecialEvent.run({
        eventId,
        name: data.name,
        description: data.description || undefined,
        date,
        location: data.location || undefined,
      });
      if (result.ok) onOpenChange(false);
    } else {
      if (!specialEvent) return;
      const result = await updateSpecialEvent.run({
        id: specialEvent._id,
        name: data.name,
        description: data.description || undefined,
        date,
        location: data.location || undefined,
        isActive: data.isActive,
      });
      if (result.ok) onOpenChange(false);
    }
  }

  async function toggleAccess(
    invitationId: Id<"invitations">,
    hasAccess: boolean,
  ) {
    if (!specialEvent) return;
    try {
      await setSpecialEventAccess({
        invitationId,
        specialEventId: specialEvent._id,
        hasAccess,
      });
    } catch {
      toast.error("Failed to update visibility");
    }
  }

  const accessSet = new Set(accessIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[88vh] flex-col"
        >
          <DialogHeader className="border-b border-border px-8 pt-8 pb-5 text-left">
            <DialogTitle>
              {mode === "create"
                ? "Add special invitation"
                : "Edit special invitation"}
            </DialogTitle>
            <DialogDescription>
              A mini sub-event — welcome dinner, after-party — guests RSVP to
              from their invitation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-8 overflow-y-auto px-8 py-7">
            <FormSection
              title="Details"
              description="What guests see on the special-invitation card."
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Welcome dinner"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-caption text-danger">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="A short note about this sub-event…"
                    rows={3}
                    {...register("description")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date &amp; time</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      {...register("date")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="Casa del Mar"
                      {...register("location")}
                    />
                  </div>
                </div>

                {mode === "edit" && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary p-4">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="isActive"
                        className="text-body cursor-pointer font-medium"
                      >
                        Active
                      </Label>
                      <p className="text-caption text-muted-foreground">
                        Inactive special invitations stay hidden from guests.
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={isActive}
                      onCheckedChange={(v) => setValue("isActive", v)}
                    />
                  </div>
                )}
              </div>
            </FormSection>

            {/* Per-invitation visibility — assignment needs a saved id. */}
            <FormSection
              title="Visible to invitations"
              description="Only the invitations you tick here can see and RSVP to this."
            >
              {mode === "create" ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-center">
                  <p className="text-caption text-muted-foreground">
                    Save first, then reopen to choose which invitations can see
                    this.
                  </p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-center">
                  <Mail
                    className="mx-auto mb-2 size-5 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-caption text-muted-foreground">
                    No invitations yet. Create one first, then come back to
                    grant access.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-1.5">
                  {invitations.map((invitation) => (
                    <label
                      key={invitation._id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-secondary"
                    >
                      <Checkbox
                        checked={accessSet.has(invitation._id)}
                        onCheckedChange={(checked) =>
                          toggleAccess(invitation._id, checked === true)
                        }
                      />
                      <span className="text-body text-foreground">
                        {invitation.title}
                      </span>
                    </label>
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
              {mode === "edit" ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : mode === "create"
                  ? "Add special invitation"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
