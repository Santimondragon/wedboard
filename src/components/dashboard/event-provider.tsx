"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Doc } from "convex/_generated/dataModel";
import { StateBlock } from "@/components/app";
import { Button } from "@/components/ui/button";
import { CalendarX } from "lucide-react";
import { type EventRole } from "@/lib/roles";

/** The resolved event plus the caller's effective role on it. */
export type EventWithRole = Doc<"events"> & { myRole: EventRole | null };

const EventContext = createContext<EventWithRole | null>(null);

/**
 * Resolves the `[eventSlug]` route param to its event and exposes it to all
 * descendant dashboard pages. Handles loading and not-found states so pages
 * can assume a resolved event.
 */
export function EventProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params?.eventSlug as string | undefined;
  const event = useQuery(api.events.getEventBySlug, slug ? { slug } : "skip");

  if (event === undefined) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <StateBlock kind="loading" title="Loading event…" />
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4">
        <StateBlock
          kind="empty"
          icon={CalendarX}
          title="Event not found"
          description="This event doesn't exist, or you don't have access to it."
        />
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to events</Link>
        </Button>
      </div>
    );
  }

  return (
    <EventContext.Provider value={event}>{children}</EventContext.Provider>
  );
}

/** Returns the resolved current event. Throws if used outside EventProvider. */
export function useEvent(): EventWithRole {
  const event = useContext(EventContext);
  if (!event) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return event;
}

/** The caller's effective role on the current event (null if unknown). */
export function useEventRole(): EventRole | null {
  return useEvent().myRole;
}
