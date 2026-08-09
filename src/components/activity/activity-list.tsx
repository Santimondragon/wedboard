import { formatDistanceToNow } from "date-fns";
import { Minus, Pencil, Plus, type LucideIcon } from "lucide-react";
import { ListRow, ListRows } from "@/components/app";

export interface ActivityLogItem {
  _id: string;
  _creationTime: number;
  actorName: string;
  action: "create" | "update" | "delete";
  entity: "guest" | "invitation" | "specialEvent" | "template" | "meta";
  entityName?: string;
}

const ACTION_VERB: Record<ActivityLogItem["action"], string> = {
  create: "created",
  update: "modified",
  delete: "removed",
};

// Quiet, uniform glyphs — this is a diagnostic log, not a feed to decorate.
const ACTION_ICON: Record<ActivityLogItem["action"], LucideIcon> = {
  create: Plus,
  update: Pencil,
  delete: Minus,
};

const ENTITY_LABEL: Record<ActivityLogItem["entity"], string> = {
  guest: "guest",
  invitation: "invitation",
  specialEvent: "special event",
  template: "the invitation template",
  meta: "meta & sharing",
};

function describe(item: ActivityLogItem): string {
  const verb = ACTION_VERB[item.action];
  const entity = ENTITY_LABEL[item.entity];
  // template/meta carry no name and read naturally ("modified the invitation
  // template"); the others append the record's name.
  if (item.entityName) return `${verb} ${entity} ${item.entityName}`;
  return `${verb} ${entity}`;
}

export function ActivityList({ items }: { items: ActivityLogItem[] }) {
  return (
    <ListRows>
      {items.map((item) => {
        const Icon = ACTION_ICON[item.action];

        return (
          <ListRow
            key={item._id}
            className="gap-3 py-3"
            leading={
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
              >
                <Icon className="size-3.5" />
              </span>
            }
            title={
              <span className="font-normal text-muted-foreground">
                <span className="font-medium text-foreground">
                  {item.actorName}
                </span>{" "}
                {describe(item)}
              </span>
            }
            meta={
              <time dateTime={new Date(item._creationTime).toISOString()}>
                {formatDistanceToNow(new Date(item._creationTime), {
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
