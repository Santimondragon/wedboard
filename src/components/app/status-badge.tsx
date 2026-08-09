import { StatusPill, type StatusTone } from "@/components/app/status-pill";

type Status =
  | "draft"
  | "active"
  | "archived"
  | "pending"
  | "attending"
  | "declined";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  attending: { label: "Attending", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
};

/**
 * Event / RSVP status chip. A thin domain mapping over {@link StatusPill} —
 * the tone decisions live here, the color decisions live in the tokens.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, tone } = STATUS_CONFIG[status];
  return (
    <StatusPill tone={tone} dot className={className}>
      {label}
    </StatusPill>
  );
}
