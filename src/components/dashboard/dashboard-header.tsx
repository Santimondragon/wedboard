"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { EventStatusBadge } from "@/components/dashboard/event-status-badge";
import { useEvent } from "@/components/dashboard/event-provider";

const PAGE_TITLES: Record<string, string> = {
  guests: "Guests",
  "special-events": "Special Events",
  invitations: "Invitations",
  menu: "Menu & Drinks",
  tables: "Tables",
  template: "Invitation Template",
  media: "Media",
  messages: "Messages",
  meta: "Meta & Sharing",
  settings: "Settings",
};

function getPageTitle(pathname: string): string {
  // Paths look like /dashboard/{eventSlug}[/{section}].
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[2];
  return (section && PAGE_TITLES[section]) ?? "Overview";
}

export function DashboardHeader() {
  const pathname = usePathname();
  const event = useEvent();

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="border-b bg-white px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">{pageTitle}</h1>
        {event && (
          <>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500">{event.name}</span>
            <EventStatusBadge
              status={event.status as "draft" | "active" | "archived"}
            />
          </>
        )}
      </div>
      <UserButton />
    </header>
  );
}
