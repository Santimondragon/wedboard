import { EventProvider } from "@/components/dashboard/event-provider"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EventProvider>
      <DashboardShell>{children}</DashboardShell>
    </EventProvider>
  )
}
