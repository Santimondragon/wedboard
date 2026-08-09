"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { ArrowRight, Calendar, MapPin, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { Logo, StateBlock, StatusBadge } from "@/components/app";
import { CreateEventDialog } from "@/components/dashboard/create-event-dialog";
import { Button } from "@/components/ui/button";

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
        <StateBlock kind="loading" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal top bar — no event menu on the events list. */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-5 md:px-10">
        <Logo />
        <UserButton />
      </header>

      <main className="flex-1 px-5 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-[1180px]">
          {events === undefined ? (
            <StateBlock kind="loading" title="Loading your events…" />
          ) : events.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
              <h1 className="text-display text-foreground">
                Welcome to Wedboard
              </h1>
              <p className="text-body max-w-md text-muted-foreground">
                Create your first event to start managing invitations, RSVPs,
                menus and seating.
              </p>
              <Button size="lg" onClick={() => setCreateOpen(true)}>
                <PlusCircle className="size-4" aria-hidden />
                Create event
              </Button>
            </div>
          ) : (
            <div className="space-y-9">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-display text-foreground">Your events</h1>
                  <p className="text-body text-muted-foreground">
                    {events.length} {events.length === 1 ? "event" : "events"}{" "}
                    you own or help plan.
                  </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusCircle className="size-4" aria-hidden />
                  New event
                </Button>
              </div>

              {/* Real links: keyboard-activatable and middle-clickable. */}
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <li key={event._id}>
                    <Link
                      href={`/dashboard/${event.slug}`}
                      className="group flex h-full flex-col justify-between gap-6 rounded-xl border border-border bg-card p-6 shadow-soft-xs transition-all hover:border-accent/40 hover:shadow-soft-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-section min-w-0 truncate text-foreground">
                            {event.name}
                          </h2>
                          <StatusBadge status={event.status} />
                        </div>
                        <div className="text-caption flex flex-col gap-1.5 text-muted-foreground">
                          {event.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                              {format(new Date(event.date), "MMMM d, yyyy")}
                            </span>
                          )}
                          {event.venueName && (
                            <span className="flex items-center gap-1.5">
                              <MapPin
                                className="size-3.5 shrink-0"
                                aria-hidden
                              />
                              <span className="truncate">
                                {event.venueName}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-caption flex items-center gap-1.5 font-medium text-muted-foreground transition-colors group-hover:text-accent">
                        Open board
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
