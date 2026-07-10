"use client";

import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { ROLE_LABELS, type EventRole, type AssignableRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
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

export interface MemberItem {
  _id: Id<"eventMembers">;
  userId: Id<"users">;
  role: EventRole;
  firstName?: string;
  lastName?: string;
  email: string;
  isSelf: boolean;
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
    <ul className="space-y-2">
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
          <li
            key={m._id}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {name || m.email}
                {m.isSelf && (
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    (you)
                  </span>
                )}
              </p>
              {name && (
                <p className="truncate text-xs text-zinc-500">{m.email}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
                  <SelectTrigger className="h-8 w-32 text-sm">
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
                <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
              )}

              {canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove {name || m.email} from this event? They will lose
                        access immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeMember.run({ memberId: m._id })}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
