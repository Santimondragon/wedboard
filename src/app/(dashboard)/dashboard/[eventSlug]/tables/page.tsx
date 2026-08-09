"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Plus, Table as TableIcon } from "lucide-react";
import { useEvent } from "@/components/dashboard/event-provider";
import { TableGrid } from "@/components/tables/table-grid";
import { AddTableDialog } from "@/components/tables/add-table-dialog";
import { PageHeader, Panel, StateBlock, StatusPill } from "@/components/app";
import { QueryErrorBoundary } from "@/components/app/query-error-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SeatingBoard({ onAdd }: { onAdd: () => void }) {
  const eventId = useEvent()._id;
  const data = useQuery(api.tables.getTablesAndGuests, { eventId });

  if (data === undefined) {
    return (
      <div
        aria-busy
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.tables.length === 0) {
    return (
      <Panel>
        <StateBlock
          kind="empty"
          icon={TableIcon}
          title="No tables yet"
          description="Add a table, set how many seats it has, and start placing guests. Seating is manual — pick a guest for each seat."
          action={{ label: "Add table", onClick: onAdd }}
        />
      </Panel>
    );
  }

  const unseated = data.unassignedGuests.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {unseated > 0 && (
          <StatusPill tone="warning" dot>
            {unseated} unseated
          </StatusPill>
        )}
        <p className="text-caption text-muted-foreground">
          {unseated === 0
            ? "Every guest has a seat."
            : "Pick them from any empty seat below."}
        </p>
      </div>

      <TableGrid
        tables={data.tables}
        guestsByTable={data.guestsByTable}
        unassignedGuests={data.unassignedGuests}
        eventId={eventId}
      />
    </div>
  );
}

export default function TablesPage() {
  const eventId = useEvent()._id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-9">
      <PageHeader
        title="Tables"
        description="Your seating plan. Each table lists its seats in order — assign a guest to a seat, or free one up again."
        actions={
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add table
          </Button>
        }
      />

      <QueryErrorBoundary
        title="Couldn't load the seating plan"
        description="The tables failed to load. Check your connection and try again."
      >
        <SeatingBoard onAdd={() => setAddDialogOpen(true)} />
      </QueryErrorBoundary>

      <AddTableDialog
        eventId={eventId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}
