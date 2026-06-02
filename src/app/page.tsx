import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/app/logo";
import { Users, ClipboardList, LayoutGrid } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl">
            Your wedding,{" "}
            <span className="text-rose-500">beautifully managed</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
            Manage RSVPs, seating arrangements, menus, and more — all in one
            elegant platform built for your perfect day.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="border-zinc-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                  <Users className="h-5 w-5 text-rose-500" />
                </div>
                <CardTitle className="text-base font-semibold text-zinc-900">
                  Guest Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">
                  Easily manage your guest list, track dietary requirements, and
                  keep all guest details organized in one place.
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                  <ClipboardList className="h-5 w-5 text-rose-500" />
                </div>
                <CardTitle className="text-base font-semibold text-zinc-900">
                  RSVP Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">
                  Send digital invitations and track responses in real time.
                  Know exactly who is coming at a glance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
                  <LayoutGrid className="h-5 w-5 text-rose-500" />
                </div>
                <CardTitle className="text-base font-semibold text-zinc-900">
                  Table Seating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500">
                  Drag-and-drop seating charts to arrange tables and seats.
                  Ensure every guest is perfectly placed.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Logo className="text-sm text-zinc-400" />
          <p className="mt-2 text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} Wedboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
