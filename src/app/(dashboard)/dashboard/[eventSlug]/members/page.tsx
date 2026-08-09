"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Users2, Plus } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { hasMinRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { AccessNotice, PageHeader, Panel, StateBlock } from "@/components/app";
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
      <div className="max-w-2xl space-y-6">
        <PageHeader
          title="Members"
          description="Share this event with co-owners and editors."
        />
        <AccessNotice requiredRole="planner">
          Managing members is available to owners and co-owners. Ask an event
          owner if you need access.
        </AccessNotice>
        <Button asChild variant="outline">
          <Link href={`/dashboard/${event.slug}`}>Back to overview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-9">
      <PageHeader
        title="Members"
        description="Share this event with co-owners (full access except deleting the event) and editors (content only). Members must already have a Wedboard account."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 size-4" />
            Add member
          </Button>
        }
      />

      <Panel
        title="People with access"
        description={
          members === undefined
            ? undefined
            : `${members.length} ${members.length === 1 ? "person" : "people"} can open this event.`
        }
        padded={false}
      >
        {members === undefined ? (
          <StateBlock kind="loading" title="Loading members…" compact />
        ) : members.length === 0 ? (
          <StateBlock
            kind="empty"
            icon={Users2}
            title="No members yet"
            description="Add a co-owner or editor to collaborate on this event."
            action={{ label: "Add member", onClick: () => setAddOpen(true) }}
            compact
          />
        ) : (
          <MemberList members={members} isOwner={isOwner} />
        )}
      </Panel>

      <AddMemberDialog
        eventId={event._id}
        isOwner={isOwner}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
