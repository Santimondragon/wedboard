"use client"

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { UserSync } from "@/components/dashboard/user-sync"
import { RedirectToHome } from "@/components/dashboard/redirect-to-home"
import { LoadingState } from "@/components/app/loading-state"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Gate the dashboard on Convex auth so queries/mutations never run
          before the Clerk token is attached (which throws Unauthorized). */}
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <LoadingState message="Loading…" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <RedirectToHome />
      </Unauthenticated>
      <Authenticated>
        <UserSync />
        {children}
      </Authenticated>
    </div>
  )
}
