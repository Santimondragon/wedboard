"use client";

import { StatusPill, type StatusTone } from "@/components/app";

type RsvpStatus = "attending" | "declined" | "pending";

interface RsvpStatusBadgeProps {
  status: RsvpStatus | string;
  className?: string;
}

const RSVP_TONE: Record<RsvpStatus, StatusTone> = {
  attending: "success",
  declined: "danger",
  pending: "warning",
};

const RSVP_LABEL: Record<RsvpStatus, string> = {
  attending: "Attending",
  declined: "Declined",
  pending: "Pending",
};

/**
 * The RSVP state of a guest. Semantics live in the tokens — attending reads as
 * success, declined as danger, pending as warning — never a hardcoded palette.
 */
export function RsvpStatusBadge({ status, className }: RsvpStatusBadgeProps) {
  const key: RsvpStatus =
    status === "attending" || status === "declined" ? status : "pending";

  return (
    <StatusPill tone={RSVP_TONE[key]} dot className={className}>
      {RSVP_LABEL[key]}
    </StatusPill>
  );
}
