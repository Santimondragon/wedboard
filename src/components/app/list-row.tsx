import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ListRowProps {
  /** Left slot — avatar, icon medallion, checkbox. */
  leading?: ReactNode;
  /** Primary label. */
  title: ReactNode;
  /** Secondary line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned metadata (timestamp, count) shown before `actions`. */
  meta?: ReactNode;
  /** Right-aligned controls (menu, buttons). */
  actions?: ReactNode;
  className?: string;
}

/**
 * One row of a vertical list. Use inside {@link ListRows} so rows share a
 * single divider treatment. Replaces the hand-rolled `<li>` markup in the
 * message / activity / member / special-event / menu-option lists.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  actions,
  className,
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-7 py-4 transition-colors hover:bg-secondary/50",
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-body truncate font-medium text-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="text-caption text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {meta && (
        <div className="text-caption shrink-0 text-muted-foreground">
          {meta}
        </div>
      )}
      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </div>
  );
}

/**
 * Divider container for a stack of {@link ListRow}s. Pair with
 * `<Panel padded={false}>` for a full-bleed list.
 */
export function ListRows({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border", className)}>{children}</div>
  );
}
