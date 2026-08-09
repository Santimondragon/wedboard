"use client";

import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StateBlockKind = "empty" | "loading" | "error";

export interface StateBlockAction {
  label: string;
  onClick: () => void;
}

export interface StateBlockProps {
  /** Which of the three async states this block represents. */
  kind: StateBlockKind;
  /** Headline. Defaults per kind ("Loading…" / "Something went wrong"). */
  title?: string;
  /** One sentence of context under the title. */
  description?: string;
  /** Illustrative icon. Ignored for `loading` (which renders a spinner). */
  icon?: LucideIcon;
  /** Primary call to action — typically "Add your first guest". */
  action?: StateBlockAction;
  /** Retry handler for `kind="error"`. Renders a "Try again" button. */
  retry?: () => void;
  /** Render inline (tighter padding) rather than as a full-panel state. */
  compact?: boolean;
  className?: string;
}

const DEFAULT_TITLE: Record<StateBlockKind, string> = {
  empty: "Nothing here yet",
  loading: "Loading…",
  error: "Something went wrong",
};

/**
 * The single async-state surface: empty, loading, and error render from one
 * component so every page states them the same way. Replaces the former
 * `EmptyState` / `LoadingState` / `ErrorState` trio.
 */
export function StateBlock({
  kind,
  title,
  description,
  icon: Icon,
  action,
  retry,
  compact = false,
  className,
}: StateBlockProps) {
  const heading = title ?? DEFAULT_TITLE[kind];

  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      aria-busy={kind === "loading" || undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      {kind === "loading" ? (
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : (
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            kind === "error" ? "bg-danger-soft" : "bg-secondary",
          )}
        >
          {kind === "error" ? (
            <AlertCircle className="size-6 text-danger" aria-hidden />
          ) : Icon ? (
            <Icon className="size-6 text-muted-foreground" aria-hidden />
          ) : null}
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-section text-foreground">{heading}</h3>
        {description && (
          <p className="text-caption mx-auto max-w-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {(action || retry) && (
        <div className="flex items-center gap-2">
          {retry && (
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          )}
          {action && (
            <Button
              variant={retry ? "ghost" : "outline"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
