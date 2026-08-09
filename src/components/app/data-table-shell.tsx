import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableShellProps {
  /** Filters / search / bulk actions, pinned above the scroll region. */
  toolbar?: ReactNode;
  /** The `<table>` (or any wide content). Scrolls horizontally on its own. */
  children: ReactNode;
  /** Row counts, pagination, totals. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Chrome for a wide table. Owns the horizontal scroll container and the sticky
 * header treatment so no page has to re-solve overflow — the table itself only
 * needs a plain `<thead>`; its cells are pinned here via `[&_thead_th]`.
 *
 * The toolbar and footer sit outside the scroll region, so they stay put while
 * the table scrolls sideways.
 */
export function DataTableShell({
  toolbar,
  children,
  footer,
  className,
}: DataTableShellProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft-xs",
        className,
      )}
    >
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
          {toolbar}
        </div>
      )}

      <div
        className={cn(
          "min-w-0 overflow-x-auto overscroll-x-contain",
          // Sticky header + comfortable 56px rows, applied once here.
          "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-card",
          "[&_tbody_td]:h-14 [&_thead_th]:h-12",
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="text-caption border-t border-border px-5 py-3 text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
