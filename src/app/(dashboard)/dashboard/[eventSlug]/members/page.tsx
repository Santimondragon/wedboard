"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Users2, Plus } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { hasMinRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { MemberList } from "@/components/members/member-list";
import { AddMemberDialog } from "@/components/members/add-member-dialog";

export default function MembersPage() {
  const event = useEvent();
  const canManage = hasMinRole(event.myRole, "planner");
  const isOwner = event.myRole === "owner";
  const members = useQuery(
    api.members.listMembers,
    canManage ? { eventId: event._id } : "skip",
  );
  const [addOpen, setAddOpen] = useState(false);

  if (!canManage) {
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
        <p className="text-sm text-zinc-500">
          You don&apos;t have permission to manage this event&apos;s members.
          Ask an owner or co-owner for access.
        </p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/${event.slug}`}>Back to overview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share this event with co-owners (full access except deleting the
          event) and editors (content only). Members must already have a
          Wedboard account.
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add member
        </Button>
      </div>

      {members === undefined ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No members yet"
          description="Add a co-owner or editor to collaborate on this event."
        />
      ) : (
        <MemberList members={members} isOwner={isOwner} />
      )}

      <AddMemberDialog
        eventId={event._id}
        isOwner={isOwner}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
