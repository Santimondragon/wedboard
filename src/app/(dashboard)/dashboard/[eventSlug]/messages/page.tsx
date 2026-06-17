"use client"

import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { MessageSquare } from "lucide-react"
import { useEvent } from "@/components/dashboard/event-provider"
import { MessageList } from "@/components/messages/message-list"
import { EmptyState } from "@/components/app/empty-state"
import { LoadingState } from "@/components/app/loading-state"

export default function MessagesPage() {
  const eventId = useEvent()._id
  const messages = useQuery(api.messages.listMessagesByEvent, { eventId })

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Messages
        {messages !== undefined && (
          <span className="ml-2 text-base font-normal text-zinc-500">
            ({messages.length})
          </span>
        )}
      </h1>

      {messages === undefined ? (
        <LoadingState message="Loading messages…" />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Guests who can't attend can leave you a message from their invitation. They'll show up here."
        />
      ) : (
        <MessageList messages={messages} />
      )}
    </div>
  )
}
