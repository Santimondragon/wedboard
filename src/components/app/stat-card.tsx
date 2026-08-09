import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "warning" | "danger" | "accent";

export interface StatCardProps {
  /** What is being counted, e.g. "Attending". */
  label: string;
  /** The figure. Rendered at the `text-metric` scale with tabular figures. */
  value: string | number;
  /** One short line of context under the value. */
  hint?: string;
  /** Optional icon in the top-right corner. */
  icon?: LucideIcon;
  /** When set, the whole card becomes a link to the underlying list. */
  href?: string;
  /** Tints the value — use sparingly, for genuinely semantic figures. */
  tone?: StatTone;
  className?: string;
}

const TONE_CLASS: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
};

/**
 * A single headline figure. Successor to `dashboard/metric-card.tsx`: the dead
 * `trend` prop is gone and `href` is new, so an overview metric can navigate to
 * the list it summarizes.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
  className,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-caption font-medium text-muted-foreground">
          {label}
        </span>
        {href ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/stat:text-accent"
            aria-hidden
          />
        ) : (
          Icon && (
            <Icon
              className="size-4 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          )
        )}
      </div>
      <div className={cn("text-metric mt-3", TONE_CLASS[tone])}>{value}</div>
      {hint && (
        <p className="text-caption mt-1 text-muted-foreground">{hint}</p>
      )}
    </>
  );

  const shell = cn(
    "group/stat block rounded-lg border border-border bg-card px-6 py-5 shadow-soft-xs transition-shadow",
    href &&
      "hover:border-accent/30 hover:shadow-soft-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
