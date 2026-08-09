"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { History } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { ActivityList } from "@/components/activity/activity-list";
import { PageHeader, Panel, StateBlock } from "@/components/app";
import { QueryErrorBoundary } from "@/components/app/query-error-boundary";

/** Mirrors the `.take()` cap in `activity.listByEvent`. */
const ACTIVITY_CAP = 200;

function ActivityPanel() {
  const eventId = useEvent()._id;
  const items = useQuery(api.activity.listByEvent, { eventId });

  if (items === undefined) {
    return (
      <Panel>
        <StateBlock kind="loading" title="Loading activity…" />
      </Panel>
    );
  }

  if (items.length === 0) {
    return (
      <Panel>
        <StateBlock
          kind="empty"
          icon={History}
          title="No activity yet"
          description="Changes to your event will show up here as they happen."
        />
      </Panel>
    );
  }

  const capped = items.length >= ACTIVITY_CAP;

  return (
    <Panel
      title="Recent changes"
      description={`${items.length} ${items.length === 1 ? "entry" : "entries"}, newest first`}
      padded={false}
      footer={
        capped ? (
          <p className="text-caption text-muted-foreground">
            Showing the {ACTIVITY_CAP} most recent entries. Earlier history is
            retained but not listed here.
          </p>
        ) : undefined
      }
    >
      <ActivityList items={items} />
    </Panel>
  );
}

export default function ActivityPage() {
  return (
    <div className="space-y-9">
      <PageHeader
        title="Activity"
        description="A log of changes made to guests, invitations, special invitations, the template, and meta by you and your collaborators."
      />

      <QueryErrorBoundary
        title="Couldn't load activity"
        description="The activity log failed to load. Check your connection and try again."
      >
        <ActivityPanel />
      </QueryErrorBoundary>
    </div>
  );
}
