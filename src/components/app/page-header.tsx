import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** The page `<h1>`. Rendered at the `text-title` scale. */
  title: ReactNode;
  /** One line of context under the title. */
  description?: ReactNode;
  /** Right-aligned controls — primary action button, filters, etc. */
  actions?: ReactNode;
  /** Optional breadcrumb trail rendered above the title. */
  breadcrumb?: ReactNode;
  className?: string;
}

/**
 * The single page-title block. Every dashboard route opens with one of these,
 * retiring the ad-hoc `text-2xl font-semibold` / `text-sm text-muted` pairs
 * that were repeated across the app.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-title text-foreground">{title}</h1>
          {description && (
            <p className="text-body max-w-2xl text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
