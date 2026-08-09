"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreateEventDialog } from "@/components/dashboard/create-event-dialog";

/**
 * Searchable event combobox. A planner can own many events, so the switcher is
 * a `Command` palette rather than a plain dropdown.
 */
export function EventSwitcher() {
  const router = useRouter();
  const params = useParams();
  const eventSlug = params?.eventSlug as string | undefined;
  const events = useQuery(api.events.listMyEvents);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const currentEvent = events?.find((e) => e?.slug === eventSlug);
  const loading = events === undefined;

  function switchToEvent(slug: string) {
    setOpen(false);
    router.push(`/dashboard/${slug}`);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label="Switch event"
            className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Current event
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {currentEvent?.name ?? (loading ? "Loading…" : "Select event")}
              </span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search events…" />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading events…" : "No events found."}
              </CommandEmpty>
              {events && events.length > 0 && (
                <CommandGroup heading="Your events">
                  {events.map((event) => (
                    <CommandItem
                      key={event._id}
                      value={event.name}
                      onSelect={() => switchToEvent(event.slug)}
                    >
                      <span
                        className={cn(
                          "flex-1 truncate",
                          event.slug === eventSlug && "font-medium",
                        )}
                      >
                        {event.name}
                      </span>
                      {event.slug === eventSlug && (
                        <Check
                          className="size-4 shrink-0 text-accent"
                          aria-hidden
                        />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__create-new-event"
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <PlusCircle className="size-4" aria-hidden />
                  New event
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
