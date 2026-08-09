"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { UserSync } from "@/components/dashboard/user-sync";
import { RedirectToHome } from "@/components/dashboard/redirect-to-home";
import { StateBlock } from "@/components/app";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Gate the dashboard on Convex auth so queries/mutations never run
          before the Clerk token is attached (which throws Unauthorized). */}
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <StateBlock kind="loading" />
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
  );
}
