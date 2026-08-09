import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export interface StatusPillProps {
  /** Semantic tone. Maps to the status tokens, never a hardcoded palette. */
  tone?: StatusTone;
  /** Optional leading dot, useful in dense tables. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-secondary text-muted-foreground border-border",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning-foreground border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  accent: "bg-accent-soft text-accent-soft-foreground border-accent/20",
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent",
};

/**
 * A small semantic status chip. The one place status color is decided —
 * replaces the per-status pastel maps scattered across the dashboard.
 */
export function StatusPill({
  tone = "neutral",
  dot = false,
  children,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "text-caption inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", DOT_CLASS[tone])}
        />
      )}
      {children}
    </span>
  );
}
