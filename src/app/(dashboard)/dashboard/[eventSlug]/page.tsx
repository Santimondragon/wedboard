"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { toast } from "sonner";
import { useEvent } from "@/components/dashboard/event-provider";
import {
  Mail,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  CheckCircle,
  XCircle,
  Salad,
  Sparkles,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/app";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/** One segment of the RSVP response bar. */
function ResponseSegment({
  label,
  count,
  total,
  className,
}: {
  label: string;
  count: number;
  total: number;
  className: string;
}) {
  if (count === 0) return null;
  return (
    <div
      className={className}
      style={{ width: `${(count / total) * 100}%` }}
      title={`${label}: ${count}`}
    />
  );
}

export default function EventOverviewPage() {
  const router = useRouter();
  const event = useEvent();
  const eventId = event._id;
  const base = `/dashboard/${event.slug}`;

  const stats = useQuery(api.dashboard.getOverviewStats, { eventId });
  const seedDemo = useMutation(api.seed.seedDemoEventForCurrentUser);

  async function handleSeedDemo() {
    try {
      const result = await seedDemo();
      toast.success("Demo data seeded. Taking you there…");
      router.push(`/dashboard/${result.slug}`);
    } catch {
      toast.error("Failed to seed demo data");
    }
  }

  if (stats === undefined) {
    return (
      <>
        <PageHeader
          title="Overview"
          description="How your guest list is tracking."
        />
        <div
          className="space-y-9"
          role="status"
          aria-busy
          aria-label="Loading overview"
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <Skeleton className="h-52 rounded-lg lg:col-span-1" />
            <Skeleton className="h-52 rounded-lg lg:col-span-2" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </>
    );
  }

  const {
    totalInvitations,
    totalGuests,
    attendingCount,
    declinedCount,
    pendingCount,
    allergyCount,
    menuCompletionCount,
    tableAssignmentCount,
  } = stats;

  const responded = attendingCount + declinedCount;
  const hasGuests = totalGuests > 0;
  const responseRate = hasGuests
    ? Math.round((responded / totalGuests) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        description="How your guest list is tracking."
      />

      {/* Headline region: pending is the metric that drives action, so it gets
          primacy. The right-hand panel is the slot a future RSVP burn-up chart
          (EP-14) drops into — today it shows the live response split. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <StatCard
          label="Awaiting reply"
          value={pendingCount}
          hint={
            hasGuests
              ? `of ${totalGuests} guests · ${responseRate}% have responded`
              : "No guests yet"
          }
          tone={pendingCount > 0 ? "warning" : "success"}
          href={`${base}/guests`}
          className="flex flex-col justify-between px-7 py-6 lg:col-span-1"
        />

        <Panel
          title="RSVP progress"
          description={
            hasGuests
              ? `${responded} of ${totalGuests} guests have responded.`
              : "Add guests to start tracking replies."
          }
          className="lg:col-span-2"
        >
          {hasGuests ? (
            <div className="space-y-5">
              <div
                className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label={`${attendingCount} attending, ${declinedCount} declined, ${pendingCount} pending`}
              >
                <ResponseSegment
                  label="Attending"
                  count={attendingCount}
                  total={totalGuests}
                  className="rounded-full bg-success"
                />
                <ResponseSegment
                  label="Declined"
                  count={declinedCount}
                  total={totalGuests}
                  className="rounded-full bg-danger"
                />
                <ResponseSegment
                  label="Pending"
                  count={pendingCount}
                  total={totalGuests}
                  className="rounded-full bg-warning"
                />
              </div>

              <dl className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Attending",
                    value: attendingCount,
                    dot: "bg-success",
                  },
                  { label: "Declined", value: declinedCount, dot: "bg-danger" },
                  { label: "Pending", value: pendingCount, dot: "bg-warning" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <dt className="text-caption flex items-center gap-1.5 text-muted-foreground">
                      <span
                        aria-hidden
                        className={`size-1.5 rounded-full ${item.dot}`}
                      />
                      {item.label}
                    </dt>
                    <dd className="text-section tabular-figures text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">
              Once guests are added, their replies appear here.
            </p>
          )}
        </Panel>
      </div>

      {/* Supporting counts. */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Invitations"
          value={totalInvitations}
          hint={totalInvitations === 0 ? "None created yet" : "Shareable links"}
          icon={Mail}
          href={`${base}/invitations`}
        />
        <StatCard
          label="Guests"
          value={totalGuests}
          hint={totalGuests === 0 ? "None added yet" : "On the list"}
          icon={Users}
          href={`${base}/guests`}
        />
        <StatCard
          label="Attending"
          value={attendingCount}
          hint={
            hasGuests
              ? `${attendingCount} of ${totalGuests} confirmed`
              : "No guests yet"
          }
          tone={attendingCount > 0 ? "success" : "default"}
          icon={CheckCircle}
          href={`${base}/guests`}
        />
        <StatCard
          label="Declined"
          value={declinedCount}
          hint={declinedCount === 0 ? "Nobody has declined" : "Can't make it"}
          icon={XCircle}
          href={`${base}/guests`}
        />
      </div>

      {/* Things that still need doing. Phrased as done/total so an empty event
          reads as "nothing to do yet" rather than a bare remainder. */}
      <section className="space-y-4">
        <h2 className="text-section text-foreground">Needs attention</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Menu choices"
            value={
              attendingCount === 0
                ? "—"
                : `${menuCompletionCount}/${attendingCount}`
            }
            hint={
              attendingCount === 0
                ? "No confirmed guests yet"
                : menuCompletionCount === attendingCount
                  ? "Everyone has chosen"
                  : `${attendingCount - menuCompletionCount} still to choose`
            }
            tone={
              attendingCount > 0 && menuCompletionCount < attendingCount
                ? "warning"
                : "default"
            }
            icon={UtensilsCrossed}
            href={`${base}/menu`}
          />
          <StatCard
            label="Seated"
            value={
              totalGuests === 0 ? "—" : `${tableAssignmentCount}/${totalGuests}`
            }
            hint={
              totalGuests === 0
                ? "No guests to seat yet"
                : tableAssignmentCount === totalGuests
                  ? "Everyone has a seat"
                  : `${totalGuests - tableAssignmentCount} without a table`
            }
            tone={
              totalGuests > 0 && tableAssignmentCount < totalGuests
                ? "warning"
                : "default"
            }
            icon={LayoutGrid}
            href={`${base}/tables`}
          />
          <StatCard
            label="Dietary notes"
            value={allergyCount}
            hint={
              allergyCount === 0
                ? "None recorded"
                : "Guests with allergies or requests"
            }
            tone={allergyCount > 0 ? "accent" : "default"}
            icon={Salad}
            href={`${base}/guests`}
          />
        </div>
      </section>

      {totalInvitations === 0 && (
        <Panel className="border-dashed bg-accent-soft/40">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-accent shadow-soft-xs"
              >
                <Sparkles className="size-4" />
              </span>
              <div className="space-y-1">
                <p className="text-body font-medium text-foreground">
                  Want to see it with data first?
                </p>
                <p className="text-caption text-muted-foreground">
                  Seed a fully-populated demo event — guests, invitations, menu
                  and tables — in a separate board.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSeedDemo}
              className="shrink-0"
            >
              Seed demo data
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}
