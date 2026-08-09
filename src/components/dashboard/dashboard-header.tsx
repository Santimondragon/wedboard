"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Drawer } from "vaul";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EventStatusBadge } from "@/components/dashboard/event-status-badge";
import { useEvent } from "@/components/dashboard/event-provider";
import { getSectionLabel } from "@/components/dashboard/dashboard-sidebar";

/**
 * Event-scoped header: a Event → Section breadcrumb, the event status, the
 * mobile drawer trigger and the Clerk account button.
 *
 * Must render inside the shell's `Drawer.Root` — the menu button is a
 * `Drawer.Trigger`.
 */
export function DashboardHeader() {
  const pathname = usePathname();
  const event = useEvent();

  // Paths look like /dashboard/{eventSlug}[/{section}].
  const section = pathname.split("/").filter(Boolean)[2];
  const sectionLabel = getSectionLabel(section);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-5 md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <Drawer.Trigger
          aria-label="Open navigation"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </Drawer.Trigger>

        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="min-w-0">
              {sectionLabel ? (
                <BreadcrumbLink asChild>
                  <Link
                    href={`/dashboard/${event.slug}`}
                    className="block max-w-[9rem] truncate sm:max-w-xs"
                  >
                    {event.name}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="block max-w-[12rem] truncate sm:max-w-md">
                  {event.name}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {sectionLabel && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate">
                    {sectionLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <EventStatusBadge
          status={event.status as "draft" | "active" | "archived"}
          className="hidden sm:inline-flex"
        />
      </div>

      <UserButton />
    </header>
  );
}
