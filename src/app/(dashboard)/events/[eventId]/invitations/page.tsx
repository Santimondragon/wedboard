"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { type Id } from "convex/_generated/dataModel"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/app/empty-state"
import { InvitationList } from "@/components/invitations/invitation-list"
import { InvitationForm } from "@/components/invitations/invitation-form"

export default function InvitationsPage() {
  const params = useParams()
  const eventId = params.eventId as Id<"events">
  const [createOpen, setCreateOpen] = useState(false)

  const invitations = useQuery(api.invitations.listByEvent, { eventId })

  if (invitations === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"}
          </h2>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            New Invitation
          </Button>
        </div>

        {invitations.length === 0 ? (
          <EmptyState
            title="No invitations yet"
            description="Create an invitation link for a person, couple, family, or group"
            icon={Mail}
            action={{
              label: "New Invitation",
              onClick: () => setCreateOpen(true),
            }}
          />
        ) : (
          <InvitationList eventId={eventId} invitations={invitations} />
        )}
      </div>

      <InvitationForm
        mode="create"
        eventId={eventId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
