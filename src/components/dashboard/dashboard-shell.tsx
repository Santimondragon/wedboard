"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Drawer } from "vaul";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const COLLAPSE_KEY = "wedboard:sidebar-collapsed";

/* --------------------------------------------------------------------------
   Sidebar-rail preference, kept in localStorage and read through
   `useSyncExternalStore` so the server snapshot (always expanded) hydrates
   cleanly and every mounted shell stays in sync.
   -------------------------------------------------------------------------- */

const collapseListeners = new Set<() => void>();
let collapseCache: boolean | null = null;

function subscribeCollapse(onChange: () => void) {
  collapseListeners.add(onChange);
  return () => {
    collapseListeners.delete(onChange);
  };
}

function getCollapsed(): boolean {
  if (collapseCache === null) {
    try {
      collapseCache = window.localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      collapseCache = false; // localStorage unavailable (private mode).
    }
  }
  return collapseCache;
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

function writeCollapsed(next: boolean) {
  collapseCache = next;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, String(next));
  } catch {
    // Persistence failed — the toggle still works for this session.
  }
  for (const listener of collapseListeners) listener();
}

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * The event-scoped app shell: sidebar (icon-rail collapsible on desktop, vaul
 * drawer under `md`), header, and the scrollable main region.
 *
 * **The shell owns page padding.** Pages render their sections directly and
 * must not re-apply `p-6` / `space-y-6` of their own.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    getCollapsed,
    getCollapsedServerSnapshot,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    writeCollapsed(!getCollapsed());
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <DashboardSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      <Drawer.Root
        direction="left"
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-foreground/30 md:hidden" />
          <Drawer.Content
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-72 outline-none md:hidden"
          >
            <Drawer.Title className="sr-only">Navigation</Drawer.Title>
            <Drawer.Description className="sr-only">
              Sections of the current event
            </Drawer.Description>
            <DashboardSidebar
              className="w-full"
              onNavigate={() => setDrawerOpen(false)}
            />
          </Drawer.Content>
        </Drawer.Portal>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-9">
            <div className="mx-auto max-w-[1180px] space-y-9">{children}</div>
          </main>
        </div>
      </Drawer.Root>
    </div>
  );
}
