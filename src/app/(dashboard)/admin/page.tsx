"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { format } from "date-fns";
import { Check, Minus, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { CopyButton } from "@/components/app/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminPage() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  const isSuperadmin = currentUser?.role === "superadmin";

  useEffect(() => {
    // Non-superadmins never see this page. Server queries enforce the same.
    if (currentUser !== undefined && !isSuperadmin) {
      router.replace("/dashboard");
    }
  }, [currentUser, isSuperadmin, router]);

  const events = useQuery(api.admin.listAllEvents, isSuperadmin ? {} : "skip");
  const users = useQuery(api.admin.listAllUsers, isSuperadmin ? {} : "skip");

  if (currentUser === undefined || !isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700"
          >
            <ShieldCheck className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        </div>
        <UserButton />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 p-6">
        {/* Events */}
        <section className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">All Events</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {events === undefined
                ? "Loading…"
                : `${events.length} ${events.length === 1 ? "event" : "events"} in the system`}
            </p>
          </div>

          {events === undefined ? (
            <LoadingState message="Loading events…" />
          ) : events.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="No one has created an event in the system."
            />
          ) : (
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Guests</TableHead>
                    <TableHead className="text-right">Invitations</TableHead>
                    <TableHead>Custom domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/${event.slug}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {event.name}
                        </Link>
                        <div className="text-xs text-zinc-500">
                          /{event.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-zinc-500">
                            {event._id.slice(0, 8)}…
                          </code>
                          <CopyButton text={event._id} label="" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-900">
                          {event.ownerName ?? "—"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {event.ownerEmail ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {event.guestCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {event.invitationCount}
                      </TableCell>
                      <TableCell>
                        {event.hasCustomDomain ? (
                          <span className="flex items-center gap-1 text-sm text-green-700">
                            <Check className="h-3.5 w-3.5" />
                            {event.customDomain}
                          </span>
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-zinc-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={event.status} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/${event.slug}`}
                          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Users */}
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">All Users</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {users === undefined
                ? "Loading…"
                : `${users.length} ${users.length === 1 ? "user" : "users"}`}
            </p>
          </div>

          {users === undefined ? (
            <LoadingState message="Loading users…" />
          ) : users.length === 0 ? (
            <EmptyState title="No users yet" description="No users found." />
          ) : (
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium text-zinc-900">
                        {[user.firstName, user.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === "superadmin"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
