"use client";

import { useState } from "react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { ROLE_LABELS, type AssignableRole } from "@/lib/roles";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function AddMemberDialog({
  eventId,
  isOwner,
  open,
  onOpenChange,
}: {
  eventId: Id<"events">;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("editor");
  const addMember = useToastMutation(api.members.addMember, {
    success: "Member added",
    error: "Failed to add member",
  });

  // Only the owner may invite co-owners.
  const roleOptions: AssignableRole[] = isOwner
    ? ["planner", "editor"]
    : ["editor"];

  async function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    const result = await addMember.run({ eventId, email: trimmed, role });
    if (result.ok) {
      setEmail("");
      setRole("editor");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborator@example.com"
            />
            <p className="text-caption text-muted-foreground">
              They must already have a Wedboard account.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as AssignableRole)}
            >
              <SelectTrigger>
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
            <p className="text-caption text-muted-foreground">
              Co-owners get full access except deleting the event. Editors
              manage content only.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={addMember.pending || !email.trim()}
          >
            {addMember.pending ? "Adding..." : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
