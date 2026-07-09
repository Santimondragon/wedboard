"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  LayoutDashboard,
  Mail,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  Palette,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/app/logo";
import { EventSwitcher } from "@/components/dashboard/event-switcher";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, segment: "" },
  { label: "Invitations", icon: Mail, segment: "invitations" },
  { label: "Special Events", icon: Sparkles, segment: "special-events" },
  { label: "Guests", icon: Users, segment: "guests" },
  { label: "Menu & Drinks", icon: UtensilsCrossed, segment: "menu" },
  { label: "Tables", icon: LayoutGrid, segment: "tables" },
  { label: "Messages", icon: MessageSquare, segment: "messages" },
  { label: "Invitation Template", icon: Palette, segment: "template" },
  { label: "Media", icon: ImageIcon, segment: "media" },
  { label: "Settings", icon: Settings, segment: "settings" },
];

export function DashboardSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const eventSlug = params?.eventSlug as string | undefined;
  // Superadmins go "home" to the global admin dashboard, everyone else to /dashboard.
  const homeHref = currentUser?.role === "superadmin" ? "/admin" : "/dashboard";

  function getHref(segment: string) {
    if (!eventSlug) return "/dashboard";
    if (segment === "") return `/dashboard/${eventSlug}`;
    return `/dashboard/${eventSlug}/${segment}`;
  }

  function isActive(segment: string) {
    const href = getHref(segment);
    if (segment === "") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full bg-zinc-50 border-r border-zinc-200 dark:bg-zinc-900">
      <div className="px-4 py-4 border-b border-zinc-200">
        <Link href={homeHref}>
          <Logo />
        </Link>
      </div>
      <div className="px-2 pt-3 pb-1 border-b border-zinc-200">
        <EventSwitcher />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, segment }) => (
          <Link
            key={segment}
            href={getHref(segment)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive(segment)
                ? "bg-zinc-200 dark:bg-zinc-800 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-200 flex items-center gap-3">
        <UserButton />
        {user && (
          <span className="text-xs text-zinc-500 truncate">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        )}
      </div>
    </aside>
  );
}
