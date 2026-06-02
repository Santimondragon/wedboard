import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { UserSync } from "@/components/dashboard/user-sync"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell>
      <UserSync />
      {children}
    </DashboardShell>
  )
}
