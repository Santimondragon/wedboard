"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { toast } from "sonner"
import { useEvent } from "@/components/dashboard/event-provider"
import {
  Mail,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EventOverviewPage() {
  const router = useRouter()
  const event = useEvent()
  const eventId = event._id

  const stats = useQuery(api.dashboard.getOverviewStats, { eventId })
  const seedDemo = useMutation(api.seed.seedDemoEventForCurrentUser)

  async function handleSeedDemo() {
    try {
      const result = await seedDemo()
      toast.success("Demo data seeded! Redirecting…")
      router.push(`/dashboard/${result.slug}`)
    } catch (err) {
      toast.error("Failed to seed demo data")
    }
  }

  if (stats === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const metrics = [
    {
      title: "Total Invitations",
      value: stats.totalInvitations,
      icon: Mail,
    },
    {
      title: "Guest Capacity",
      value: stats.guestCapacity,
      icon: Users,
    },
    {
      title: "Total Guests",
      value: stats.totalGuests,
      icon: Users,
    },
    {
      title: "Attending",
      value: stats.attendingCount,
      icon: CheckCircle,
      description: "Confirmed guests",
    },
    {
      title: "Declined",
      value: stats.declinedCount,
      icon: XCircle,
    },
    {
      title: "Pending",
      value: stats.pendingCount,
      icon: Clock,
    },
    {
      title: "Menu Selections Missing",
      value: stats.attendingCount - stats.menuCompletionCount,
      icon: UtensilsCrossed,
      description: "Attending without menu choice",
    },
    {
      title: "Guests Without Table",
      value: stats.totalGuests - stats.tableAssignmentCount,
      icon: AlertCircle,
      description: "Need seating assignment",
    },
  ]

  const quickActions = [
    { label: "Manage Invitations", href: `/dashboard/${event.slug}/invitations`, icon: Mail },
    { label: "View Guests", href: `/dashboard/${event.slug}/guests`, icon: Users },
    { label: "Menu & Drinks", href: `/dashboard/${event.slug}/menu`, icon: UtensilsCrossed },
    { label: "Tables", href: `/dashboard/${event.slug}/tables`, icon: LayoutGrid },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.title}
            title={m.title}
            value={m.value}
            description={m.description}
            icon={m.icon}
          />
        ))}
      </div>

      <Card className="bg-white border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-zinc-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {stats.totalInvitations === 0 && (
        <Card className="bg-white border shadow-sm border-dashed">
          <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-zinc-500">
              No invitations yet. Seed demo data to explore all features.
            </p>
            <Button variant="outline" onClick={handleSeedDemo}>
              Seed Demo Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
