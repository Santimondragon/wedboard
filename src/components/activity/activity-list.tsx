import { formatDistanceToNow } from "date-fns";

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
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item._id}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
        >
          <p className="min-w-0 text-sm text-zinc-700">
            <span className="font-medium text-zinc-900">{item.actorName}</span>{" "}
            {describe(item)}
          </p>
          <span className="shrink-0 text-xs text-zinc-400">
            {formatDistanceToNow(new Date(item._creationTime), {
              addSuffix: true,
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
