"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { PlusCircle, Calendar, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState } from "@/components/app/empty-state";
import { CreateEventDialog } from "@/components/dashboard/create-event-dialog";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/status-badge";

export default function DashboardPage() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const events = useQuery(api.events.listMyEvents);
  const [createOpen, setCreateOpen] = useState(false);

  const isSuperadmin = currentUser?.role === "superadmin";

  useEffect(() => {
    // Superadmins land on the global admin dashboard, not their own events.
    if (isSuperadmin) {
      router.replace("/admin");
    }
  }, [isSuperadmin, router]);

  if (currentUser === undefined || isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal top bar — no event menu on the dashboard */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <Logo />
        <UserButton />
      </header>

      <main className="flex-1 p-6">
        {events === undefined ? (
          <LoadingState message="Loading your events…" />
        ) : events.length === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[60vh]">
            <EmptyState
              title="Welcome to Wedboard"
              description="Create your first event to start managing invitations, RSVPs, menus, and seating."
              icon={PlusCircle}
              action={{
                label: "Create Event",
                onClick: () => setCreateOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900">
                  Your Events
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {events.length} {events.length === 1 ? "event" : "events"}
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </div>

            <div className="grid gap-3">
              {events.map((event) => (
                <Card
                  key={event._id}
                  className="cursor-pointer hover:border-zinc-400 transition-colors group"
                  onClick={() => router.push(`/dashboard/${event.slug}`)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base truncate">
                          {event.name}
                        </CardTitle>
                        <StatusBadge status={event.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        {event.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </span>
                        )}
                        {event.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0 group-hover:text-zinc-700 transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
