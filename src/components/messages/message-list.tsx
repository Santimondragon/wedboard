import { formatDistanceToNow } from "date-fns"

export interface GuestMessageItem {
  _id: string
  name: string
  message: string
  createdAt: number
  invitationTitle: string
}

export function MessageList({ messages }: { messages: GuestMessageItem[] }) {
  return (
    <ul className="space-y-4">
      {messages.map((m) => (
        <li
          key={m._id}
          className="rounded-lg border border-zinc-200 p-4 space-y-2"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {m.name || "Anónimo"}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {m.invitationTitle}
              </p>
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-700">
            {m.message}
          </p>
        </li>
      ))}
    </ul>
  )
}
