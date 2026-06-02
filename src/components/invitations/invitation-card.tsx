"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { CopyInvitationLinkButton } from "@/components/invitations/copy-invitation-link-button"

const TYPE_LABELS: Record<string, string> = {
  single: "Single",
  group: "Group",
  plusOne: "Plus One",
}

interface Invitation {
  _id: string
  title: string
  slug: string
  type: string
  isActive: boolean
}

interface InvitationCardProps {
  eventSlug: string
  invitation: Invitation
  onEdit: () => void
  onDelete: () => void
}

export function InvitationCard({ eventSlug, invitation, onEdit, onDelete }: InvitationCardProps) {
  return (
    <Card className="bg-white border shadow-sm">
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 truncate">{invitation.title}</p>
            <p className="text-xs text-zinc-500 font-mono truncate">/{invitation.slug}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {TYPE_LABELS[invitation.type] ?? invitation.type}
          </Badge>
          <Badge
            variant="outline"
            className={
              invitation.isActive
                ? "shrink-0 text-xs bg-green-50 text-green-700 border-green-200"
                : "shrink-0 text-xs bg-zinc-100 text-zinc-500 border-zinc-200"
            }
          >
            {invitation.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CopyInvitationLinkButton eventSlug={eventSlug} slug={invitation.slug} />
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
