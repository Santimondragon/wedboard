"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { MessageSquare } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { MessageList } from "@/components/messages/message-list";
import { PageHeader, Panel, StateBlock } from "@/components/app";
import { QueryErrorBoundary } from "@/components/app/query-error-boundary";

/** Mirrors the `.take()` cap in `messages.listMessagesByEvent`. */
const MESSAGE_CAP = 500;

function MessagesPanel() {
  const eventId = useEvent()._id;
  const messages = useQuery(api.messages.listMessagesByEvent, { eventId });

  if (messages === undefined) {
    return (
      <Panel>
        <StateBlock kind="loading" title="Loading messages…" />
      </Panel>
    );
  }

  if (messages.length === 0) {
    return (
      <Panel>
        <StateBlock
          kind="empty"
          icon={MessageSquare}
          title="No messages yet"
          description="Guests who can't attend can leave you a note from their invitation. They'll show up here."
        />
      </Panel>
    );
  }

  const capped = messages.length >= MESSAGE_CAP;

  return (
    <Panel
      title="Guest notes"
      description={`${messages.length} ${messages.length === 1 ? "message" : "messages"}, newest first`}
      padded={false}
      footer={
        capped ? (
          <p className="text-caption text-muted-foreground">
            Showing the {MESSAGE_CAP} most recent messages. Older notes are kept
            but not listed here.
          </p>
        ) : undefined
      }
    >
      <MessageList messages={messages} />
    </Panel>
  );
}

export default function MessagesPage() {
  return (
    <div className="space-y-9">
      <PageHeader
        title="Messages"
        description="Notes guests left for you when responding to their invitation. Read-only."
      />

      <QueryErrorBoundary
        title="Couldn't load messages"
        description="The message list failed to load. Check your connection and try again."
      >
        <MessagesPanel />
      </QueryErrorBoundary>
    </div>
  );
}
