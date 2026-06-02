"use client"

import { StatusBadge } from "@/components/app/status-badge"

type EventStatus = "draft" | "active" | "archived"

interface EventStatusBadgeProps {
  status: EventStatus
  className?: string
}

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  return <StatusBadge status={status} className={className} />
}
