"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  MessageSquare,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Share2,
  Sparkles,
  Users,
  Users2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/app";
import { EventSwitcher } from "@/components/dashboard/event-switcher";
import { useEventRole } from "@/components/dashboard/event-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { hasMinRole, type EventRole } from "@/lib/roles";

type NavItem = {
  label: string;
  icon: LucideIcon;
  segment: string;
  minRole: EventRole;
};

type NavGroup = {
  /** Group label. Hidden entirely when every item in the group is gated out. */
  label: string;
  items: NavItem[];
};

/**
 * Grouped navigation. Order follows the planner's hot path: Overview and the
 * guest surfaces are daily, DESIGN and MANAGE are set-once. Per-item `minRole`
 * gating is unchanged from the flat list it replaces; a group whose items are
 * all gated out renders nothing at all (label included).
 *
 * MANAGE is where a future `/dashboard/billing` (EP-16) slots in.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        segment: "",
        minRole: "editor",
      },
    ],
  },
  {
    label: "Guests",
    items: [
      { label: "Guests", icon: Users, segment: "guests", minRole: "editor" },
      {
        label: "Invitations",
        icon: Mail,
        segment: "invitations",
        minRole: "editor",
      },
      {
        label: "Special Invitations",
        icon: Sparkles,
        segment: "special-events",
        minRole: "editor",
      },
    ],
  },
  {
    label: "Event",
    items: [
      {
        label: "Menu & Drinks",
        icon: UtensilsCrossed,
        segment: "menu",
        minRole: "editor",
      },
      {
        label: "Tables",
        icon: LayoutGrid,
        segment: "tables",
        minRole: "editor",
      },
      {
        label: "Messages",
        icon: MessageSquare,
        segment: "messages",
        minRole: "editor",
      },
    ],
  },
  {
    label: "Design",
    items: [
      {
        label: "Template",
        icon: Palette,
        segment: "template",
        minRole: "editor",
      },
      { label: "Media", icon: ImageIcon, segment: "media", minRole: "editor" },
      {
        label: "Meta & Sharing",
        icon: Share2,
        segment: "meta",
        minRole: "editor",
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        label: "Members",
        icon: Users2,
        segment: "members",
        minRole: "planner",
      },
      {
        label: "Settings",
        icon: Settings,
        segment: "settings",
        minRole: "planner",
      },
      {
        label: "Activity",
        icon: History,
        segment: "activity",
        minRole: "editor",
      },
    ],
  },
];

/** Resolves the section label shown in the header breadcrumb. */
export function getSectionLabel(segment: string | undefined): string | null {
  if (!segment) return null;
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.segment === segment);
    if (item) return item.label;
  }
  return null;
}

interface DashboardSidebarProps {
  /** Icon-rail mode. Labels collapse into tooltips. */
  collapsed?: boolean;
  /** Rendered when collapsing is available (desktop only). */
  onToggleCollapse?: () => void;
  /** Called after any nav link activates — closes the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}

export function DashboardSidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  className,
}: DashboardSidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const role = useEventRole();
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
    if (segment === "") return pathname === href;
    return pathname.startsWith(href);
  }

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasMinRole(role, item.minRole)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <Link
            href={homeHref}
            onClick={onNavigate}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-sidebar-border px-2 py-3">
          <EventSwitcher />
        </div>
      )}

      <ScrollArea className="flex-1">
        <nav
          aria-label="Event sections"
          className={cn("space-y-6 py-4", collapsed ? "px-2" : "px-3")}
        >
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {collapsed ? (
                <div
                  aria-hidden
                  className="mx-auto mb-2 h-px w-6 bg-sidebar-border"
                />
              ) : (
                <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {group.label}
                </p>
              )}
              {group.items.map(({ label, icon: Icon, segment }) => {
                const active = isActive(segment);
                const link = (
                  <Link
                    key={segment}
                    href={getHref(segment)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      collapsed
                        ? "size-10 justify-center"
                        : "gap-3 px-3 py-2.5",
                      active
                        ? "bg-accent-soft font-medium text-accent-soft-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );

                if (!collapsed) return link;

                return (
                  <Tooltip key={segment}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div
        className={cn(
          "flex items-center gap-3 border-t border-sidebar-border py-4",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <UserButton />
        {!collapsed && user && (
          <span className="text-caption truncate text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        )}
      </div>
    </aside>
  );
}
