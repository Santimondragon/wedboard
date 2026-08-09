import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelProps {
  /** Section heading, rendered at the `text-section` scale. */
  title?: ReactNode;
  /** Supporting copy under the title. */
  description?: ReactNode;
  /** Controls aligned to the right of the header row. */
  actions?: ReactNode;
  /** Footer strip, separated by a rule (actions, totals, help text). */
  footer?: ReactNode;
  /**
   * Whether the body gets the standard inset. Pass `false` when the child owns
   * its own edges — a full-bleed table or list.
   * @default true
   */
  padded?: boolean;
  children?: ReactNode;
  className?: string;
  /** Applied to the body wrapper only, not the panel shell. */
  bodyClassName?: string;
}

/**
 * The standard content surface: a warm card with a hairline border and the
 * resting `shadow-soft-xs` elevation. Replaces the several hand-rolled
 * `rounded-lg border bg-white` variants.
 */
export function Panel({
  title,
  description,
  actions,
  footer,
  padded = true,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-soft-xs",
        className,
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex flex-col gap-3 px-7 pt-6 sm:flex-row sm:items-start sm:justify-between",
            children ? "pb-5" : "pb-6",
          )}
        >
          <div className="min-w-0 space-y-1">
            {title && <h2 className="text-section text-foreground">{title}</h2>}
            {description && (
              <p className="text-caption text-muted-foreground">
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
      )}

      {children && (
        <div
          className={cn(
            padded && (hasHeader ? "px-7 pb-7" : "p-7"),
            bodyClassName,
          )}
        >
          {children}
        </div>
      )}

      {footer && (
        <div className="border-t border-border px-7 py-4">{footer}</div>
      )}
    </section>
  );
}
