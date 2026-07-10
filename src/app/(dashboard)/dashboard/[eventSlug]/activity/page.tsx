"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { History } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { ActivityList } from "@/components/activity/activity-list";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";

export default function ActivityPage() {
  const eventId = useEvent()._id;
  const items = useQuery(api.activity.listByEvent, { eventId });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Activity
          {items !== undefined && (
            <span className="ml-2 text-base font-normal text-zinc-500">
              ({items.length})
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          A log of changes made to guests, invitations, special events, the
          template, and meta by you and your collaborators.
        </p>
      </div>

      {items === undefined ? (
        <LoadingState message="Loading activity…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Changes to your event will show up here as they happen."
        />
      ) : (
        <ActivityList items={items} />
      )}
    </div>
  );
}
