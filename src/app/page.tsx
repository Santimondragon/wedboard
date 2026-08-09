import Link from "next/link";
import {
  ClipboardList,
  LayoutGrid,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/app";
import { Button } from "@/components/ui/button";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Users,
    title: "Guest Management",
    description:
      "Easily manage your guest list, track dietary requirements, and keep all guest details organized in one place.",
  },
  {
    icon: ClipboardList,
    title: "RSVP Tracking",
    description:
      "Send digital invitations and track responses in real time. Know exactly who is coming at a glance.",
  },
  {
    icon: LayoutGrid,
    title: "Table Seating",
    description:
      "Drag-and-drop seating charts to arrange tables and seats. Ensure every guest is perfectly placed.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* A single soft clay wash behind the hero — the one brand gesture. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-accent-soft/60 to-transparent"
          />
          <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center sm:py-28">
            <h1 className="text-display text-balance text-foreground sm:text-[3.25rem] sm:leading-[1.05]">
              Your wedding,{" "}
              <span className="text-accent">beautifully managed</span>
            </h1>
            <p className="text-body mt-6 max-w-xl text-pretty text-muted-foreground sm:text-base">
              Manage RSVPs, seating arrangements, menus, and more — all in one
              elegant platform built for your perfect day.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-[1180px] px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-card p-7 shadow-soft-xs transition-shadow hover:shadow-soft-sm"
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-accent-soft">
                  <Icon
                    className="size-5 text-accent-soft-foreground"
                    aria-hidden
                  />
                </div>
                <h2 className="text-section text-foreground">{title}</h2>
                <p className="text-caption mt-2 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/60 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-6 text-center">
          <Logo className="text-base text-muted-foreground" />
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} Wedboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
