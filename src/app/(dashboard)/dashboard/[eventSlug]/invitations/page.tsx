"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StateBlock } from "@/components/app";
import { InvitationList } from "@/components/invitations/invitation-list";
import { InvitationForm } from "@/components/invitations/invitation-form";
import { useEvent } from "@/components/dashboard/event-provider";

function InvitationsContent({ onCreate }: { onCreate: () => void }) {
  const event = useEvent();
  const invitations = useQuery(api.invitations.getInvitationsPageData, {
    eventId: event._id,
  });

  if (invitations === undefined) {
    return (
      <Panel padded={false}>
        <StateBlock
          kind="loading"
          title="Loading invitations…"
          description="Fetching this event's invitation links."
        />
      </Panel>
    );
  }

  if (invitations.length === 0) {
    return (
      <Panel padded={false}>
        <StateBlock
          kind="empty"
          icon={Mail}
          title="No invitations yet"
          description="An invitation is one shareable link for a person, couple, family, or group. Create your first one to start collecting RSVPs."
          action={{ label: "New invitation", onClick: onCreate }}
        />
      </Panel>
    );
  }

  return (
    <InvitationList
      eventId={event._id}
      eventSlug={event.slug}
      customDomain={event.customDomainVerified ? event.customDomain : undefined}
      invitations={invitations}
    />
  );
}

export default function InvitationsPage() {
  const event = useEvent();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Invitations"
        description="Every guest reaches the event through an invitation link. Group guests together, grant access to special invitations, and track what you've already sent."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New invitation
          </Button>
        }
      />

      <InvitationsContent onCreate={() => setCreateOpen(true)} />

      <InvitationForm
        mode="create"
        eventId={event._id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
