"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { InvitationTemplate } from "./templates/invitation-template"
import type { LayoutBlock } from "./blocks"

interface PublicInvitationPageProps {
  eventSlug: string
  invitationSlug: string
}

export function PublicInvitationPage({
  eventSlug,
  invitationSlug,
}: PublicInvitationPageProps) {
  const data = useQuery(api.invitations.getPublicInvitation, {
    eventSlug,
    invitationSlug,
  })

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Invitation Not Found</h1>
          <p className="text-zinc-500">
            This invitation link may be invalid or has been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <InvitationTemplate
      data={{ ...data, eventSlug, invitationSlug }}
      templateId={data.event.templateId}
      blocks={data.event.layoutBlocks as LayoutBlock[] | undefined}
    />
  )
}
