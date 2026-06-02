"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { toast } from "sonner"
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
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as Id<"events">

  const stats = useQuery(api.dashboard.getOverviewStats, { eventId })
  const seedDemo = useMutation(api.seed.seedDemoEventForCurrentUser)

  async function handleSeedDemo() {
    try {
      const newEventId = await seedDemo()
      toast.success("Demo data seeded! Redirecting…")
      router.push(`/events/${newEventId}`)
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
      value: stats.attending,
      icon: CheckCircle,
      description: "Confirmed guests",
    },
    {
      title: "Declined",
      value: stats.declined,
      icon: XCircle,
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
    },
    {
      title: "Menu Selections Missing",
      value: stats.menuSelectionsMissing ?? 0,
      icon: UtensilsCrossed,
      description: "Attending without menu choice",
    },
    {
      title: "Guests Without Table",
      value: stats.guestsWithoutTable ?? 0,
      icon: AlertCircle,
      description: "Need seating assignment",
    },
  ]

  const quickActions = [
    { label: "Manage Invitations", href: `/events/${eventId}/invitations`, icon: Mail },
    { label: "View Guests", href: `/events/${eventId}/guests`, icon: Users },
    { label: "Menu & Drinks", href: `/events/${eventId}/menu`, icon: UtensilsCrossed },
    { label: "Tables", href: `/events/${eventId}/tables`, icon: LayoutGrid },
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
