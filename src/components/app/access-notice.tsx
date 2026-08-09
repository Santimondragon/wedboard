import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { ROLE_LABELS, type EventRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export interface AccessNoticeProps {
  /** The minimum event role this surface requires. */
  requiredRole: EventRole;
  /** Optional override copy. Defaults to a sentence naming `requiredRole`. */
  children?: ReactNode;
  className?: string;
}

/**
 * Shown in place of (or above) a surface the current member cannot use.
 * Server guards remain the source of truth — this only explains the gate.
 */
export function AccessNotice({
  requiredRole,
  children,
  className,
}: AccessNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border bg-secondary px-5 py-4",
        className,
      )}
    >
      <Lock
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <p className="text-body text-muted-foreground">
        {children ?? (
          <>
            This section is available to{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS[requiredRole]}
            </span>{" "}
            and above. Ask an event owner if you need access.
          </>
        )}
      </p>
    </div>
  );
}
