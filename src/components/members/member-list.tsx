"use client";

import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { ROLE_LABELS, type EventRole, type AssignableRole } from "@/lib/roles";
import { ListRow, ListRows, StatusPill } from "@/components/app";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MemberItem {
  _id: Id<"eventMembers">;
  userId: Id<"users">;
  role: EventRole;
  firstName?: string;
  lastName?: string;
  email: string;
  isSelf: boolean;
}

/** Two-letter monogram for the row's leading medallion. */
function initials(name: string, email: string) {
  const source = name || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function MemberList({
  members,
  isOwner,
}: {
  members: MemberItem[];
  isOwner: boolean;
}) {
  const updateRole = useToastMutation(api.members.updateMemberRole, {
    success: "Role updated",
    error: "Failed to update role",
  });
  const removeMember = useToastMutation(api.members.removeMember, {
    success: "Member removed",
    error: "Failed to remove member",
  });

  return (
    <ListRows>
      {members.map((m) => {
        const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
        const isOwnerRow = m.role === "owner";
        // Non-owners can't manage co-owners or the owner; nobody edits their
        // own row.
        const canEdit =
          !isOwnerRow && !m.isSelf && (isOwner || m.role !== "planner");
        // Only the owner may grant the co-owner (planner) role.
        const roleOptions: AssignableRole[] = isOwner
          ? ["planner", "editor"]
          : ["editor"];

        return (
          <ListRow
            key={m._id}
            leading={
              <span
                aria-hidden
                className="text-caption flex size-9 items-center justify-center rounded-full bg-accent-soft font-medium text-accent-soft-foreground"
              >
                {initials(name, m.email)}
              </span>
            }
            title={
              <span className="flex items-center gap-2">
                <span className="truncate">{name || m.email}</span>
                {m.isSelf && (
                  <span className="text-caption font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </span>
            }
            subtitle={name ? m.email : undefined}
            actions={
              <>
                {canEdit ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      updateRole.run({
                        memberId: m._id,
                        role: v as AssignableRole,
                      })
                    }
                    disabled={updateRole.pending}
                  >
                    <SelectTrigger
                      className="h-9 w-36"
                      aria-label={`Role for ${name || m.email}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusPill tone={isOwnerRow ? "accent" : "neutral"}>
                    {ROLE_LABELS[m.role]}
                  </StatusPill>
                )}

                {canEdit && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-danger"
                            aria-label={`Remove ${name || m.email}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Remove member</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove {name || m.email} from this event? They will
                          lose access immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMember.run({ memberId: m._id })}
                          className="bg-danger text-danger-foreground hover:bg-danger/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            }
          />
        );
      })}
    </ListRows>
  );
}
