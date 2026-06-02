"use client"

import { Badge } from "@/components/ui/badge"

type RsvpStatus = "attending" | "declined" | "pending"

interface RsvpStatusBadgeProps {
  status: RsvpStatus | string
}

export function RsvpStatusBadge({ status }: RsvpStatusBadgeProps) {
  if (status === "attending") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
        Attending
      </Badge>
    )
  }
  if (status === "declined") {
    return (
      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">
        Declined
      </Badge>
    )
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
      Pending
    </Badge>
  )
}
