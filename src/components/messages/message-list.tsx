import { formatDistanceToNow } from "date-fns";
import { ListRow, ListRows } from "@/components/app";

export interface GuestMessageItem {
  _id: string;
  name: string;
  message: string;
  createdAt: number;
  invitationTitle: string;
}

/** Dashboard copy is English — the guest-facing layer is the Spanish surface. */
const ANONYMOUS = "Anonymous";

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

export function MessageList({ messages }: { messages: GuestMessageItem[] }) {
  return (
    <ListRows>
      {messages.map((m) => {
        const sender = m.name?.trim() || ANONYMOUS;

        return (
          <ListRow
            key={m._id}
            className="items-start"
            leading={
              <span
                aria-hidden
                className="text-caption flex size-9 items-center justify-center rounded-full bg-secondary font-medium text-muted-foreground"
              >
                {m.name?.trim() ? initial(m.name) : "—"}
              </span>
            }
            title={sender}
            subtitle={
              <>
                <span className="block">{m.invitationTitle}</span>
                <p className="text-body mt-2.5 whitespace-pre-wrap text-foreground">
                  {m.message}
                </p>
              </>
            }
            meta={
              <time dateTime={new Date(m.createdAt).toISOString()}>
                {formatDistanceToNow(new Date(m.createdAt), {
                  addSuffix: true,
                })}
              </time>
            }
          />
        );
      })}
    </ListRows>
  );
}
