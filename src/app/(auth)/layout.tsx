import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/app";

/**
 * Frame around Clerk's hosted sign-in / sign-up widgets: warm paper ground, the
 * wordmark as a way back to the marketing page, and a soft clay wash so the
 * logged-out door matches the dashboard behind it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-gradient-to-b from-accent-soft/50 to-transparent"
      />

      <Link
        href="/"
        className="relative rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Logo className="text-2xl" />
      </Link>

      <div className="relative flex w-full max-w-[26rem] justify-center">
        {children}
      </div>
    </div>
  );
}
