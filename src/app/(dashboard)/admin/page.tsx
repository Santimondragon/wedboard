"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  ArrowRight,
  Check,
  Copy,
  Globe,
  Minus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTableShell,
  Logo,
  StateBlock,
  StatusBadge,
  StatusPill,
} from "@/components/app";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Scan caps mirrored from `convex/admin.ts`. The queries `.take()` these counts
 * with no signal to the caller, so the tables say so out loud when a result set
 * lands exactly on the cap (TODO-15-01).
 */
const EVENT_SCAN_CAP = 200;
const USER_SCAN_CAP = 500;

/**
 * Operator chrome. `/admin` is a support-triage console, not a planner's board:
 * same tokens, deliberately denser rows, uppercase column labels and a cooler,
 * flatter surface so a superadmin can never mistake it for their own event.
 */
const OPERATOR_TABLE = cn(
  "rounded-md shadow-none",
  // Deny DataTableShell's comfortable 56px planner rows — `!` because the shell
  // sets `[&_tbody_td]` at equal specificity from its own wrapper.
  "[&_tbody_td]:h-10! [&_thead_th]:h-8!",
  "[&_thead_th]:bg-secondary! [&_thead_th]:text-[11px] [&_thead_th]:font-semibold",
  "[&_thead_th]:tracking-[0.08em] [&_thead_th]:uppercase [&_thead_th]:text-muted-foreground",
  "[&_tbody_td]:py-0 [&_tbody_td]:text-[13px]",
);

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

  if (currentUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <StateBlock kind="loading" title="Opening the console…" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <StateBlock
          kind="error"
          title="Operator access required"
          description="This console is limited to superadmins. Taking you back to your dashboard."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OperatorHeader />

      <main className="mx-auto w-full max-w-[1180px] flex-1 space-y-8 px-6 py-8 md:px-8">
        <div className="space-y-1">
          <h1 className="text-title text-foreground">Operator console</h1>
          <p className="text-caption text-muted-foreground">
            Read-only triage across every event and account in the deployment.
          </p>
        </div>

        <EventsSection events={events} />
        <UsersSection users={users} />
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A dark ink bar rather than the planner's warm paper header — the single
 * loudest signal that this surface is not an event board.
 */
function OperatorHeader() {
  return (
    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-6 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin"
            className="rounded-sm focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Logo className="text-primary-foreground" />
          </Link>
          <span aria-hidden className="h-4 w-px bg-primary-foreground/25" />
          <StatusPill
            tone="warning"
            className="border-warning/40 bg-warning-soft/90 text-warning-foreground"
          >
            <ShieldCheck className="size-3" aria-hidden />
            Admin
          </StatusPill>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-caption text-primary-foreground/70 transition-colors hover:text-primary-foreground"
          >
            My events
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  );
}

/** Compact "N of the scan cap" line, honest about the truncation. */
function scanFooter(count: number, cap: number, noun: string) {
  const label = `${count.toLocaleString()} ${count === 1 ? noun : `${noun}s`}`;
  if (count < cap) return label;
  return `${label} — capped at the first ${cap.toLocaleString()} scanned. More may exist.`;
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

type AdminEvents = FunctionReturnType<typeof api.admin.listAllEvents>;
type AdminUsers = FunctionReturnType<typeof api.admin.listAllUsers>;

function EventsSection({ events }: { events: AdminEvents | undefined }) {
  return (
    <section className="space-y-3">
      <SectionLabel icon={Globe} title="Events" count={events?.length} />

      {events === undefined ? (
        <DataTableShell className={OPERATOR_TABLE}>
          <StateBlock kind="loading" title="Scanning events…" compact />
        </DataTableShell>
      ) : events.length === 0 ? (
        <DataTableShell className={OPERATOR_TABLE}>
          <StateBlock
            kind="empty"
            icon={Globe}
            title="No events"
            description="Nobody has created an event in this deployment yet."
            compact
          />
        </DataTableShell>
      ) : (
        <DataTableShell
          className={OPERATOR_TABLE}
          footer={scanFooter(events.length, EVENT_SCAN_CAP, "event")}
        >
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
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="max-w-[220px]">
                    <Link
                      href={`/dashboard/${event.slug}`}
                      className="block truncate font-medium text-foreground hover:text-accent hover:underline"
                    >
                      {event.name}
                    </Link>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      /{event.slug}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-[11px] text-muted-foreground">
                        {event._id.slice(0, 8)}…
                      </code>
                      <CopyIdButton
                        value={event._id}
                        label={`Copy ID for ${event.name}`}
                      />
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[200px]">
                    <span className="block truncate text-foreground">
                      {event.ownerName ?? "—"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {event.ownerEmail ?? ""}
                    </span>
                  </TableCell>

                  <TableCell className="tabular-figures text-right text-foreground">
                    {event.guestCount}
                  </TableCell>
                  <TableCell className="tabular-figures text-right text-foreground">
                    {event.invitationCount}
                  </TableCell>

                  <TableCell className="max-w-[180px]">
                    {event.hasCustomDomain ? (
                      <span className="flex min-w-0 items-center gap-1 text-success">
                        <Check className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate font-mono text-[11px]">
                          {event.customDomain}
                        </span>
                      </span>
                    ) : (
                      <>
                        <Minus
                          className="size-3.5 text-muted-foreground/50"
                          aria-hidden
                        />
                        <span className="sr-only">No custom domain</span>
                      </>
                    )}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/${event.slug}`}
                      className="text-caption inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Open
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

function UsersSection({ users }: { users: AdminUsers | undefined }) {
  return (
    <section className="space-y-3">
      <SectionLabel icon={Users} title="Users" count={users?.length} />

      {users === undefined ? (
        <DataTableShell className={OPERATOR_TABLE}>
          <StateBlock kind="loading" title="Scanning accounts…" compact />
        </DataTableShell>
      ) : users.length === 0 ? (
        <DataTableShell className={OPERATOR_TABLE}>
          <StateBlock
            kind="empty"
            icon={Users}
            title="No accounts"
            description="No user has signed in to this deployment yet."
            compact
          />
        </DataTableShell>
      ) : (
        <DataTableShell
          className={OPERATOR_TABLE}
          footer={scanFooter(users.length, USER_SCAN_CAP, "user")}
        >
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
                  <TableCell className="font-medium text-foreground">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={user.role === "superadmin" ? "warning" : "neutral"}
                    >
                      {user.role}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="tabular-figures text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                        */
/* -------------------------------------------------------------------------- */

function SectionLabel({
  icon: Icon,
  title,
  count,
}: {
  icon: LucideIcon;
  title: string;
  count: number | undefined;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <Icon
        className="size-3.5 self-center text-muted-foreground"
        aria-hidden
      />
      <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {title}
      </h2>
      <span className="tabular-figures text-[11px] text-muted-foreground/70">
        {count === undefined ? "—" : count.toLocaleString()}
      </span>
    </div>
  );
}

/**
 * Dense clipboard control for the ID column. The shared `CopyButton` renders a
 * labelled outline button, which is too heavy for a 40px operator row — and
 * with an empty label it would have no accessible name.
 */
function CopyIdButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={handleCopy}
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-success" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
