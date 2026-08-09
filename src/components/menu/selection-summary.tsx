"use client";

import { Doc } from "convex/_generated/dataModel";
import { Progress } from "@/components/ui/progress";

type MenuOption = Doc<"menuOptions">;
type DrinkOption = Doc<"drinkOptions">;

interface SelectionSummaryProps {
  options: Array<MenuOption | DrinkOption>;
  /** Guest count per option id (from api.menu.getSelectionCounts). */
  counts: Record<string, number>;
  /** Guests who haven't picked anything yet. */
  unassigned: number;
  /** What is being counted — used in the lead figure's caption. */
  label: "food" | "drink";
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Per-option tallies. The only genuinely quantitative surface on this page, so
 * the figures get real typographic weight (tabular figures throughout) and a
 * proportion bar rather than a bare number in a row.
 */
export function SelectionSummary({
  options,
  counts,
  unassigned,
  label,
}: SelectionSummaryProps) {
  const chosen = options.reduce((sum, o) => sum + (counts[o._id] ?? 0), 0);
  const total = chosen + unassigned;

  return (
    <div className="space-y-7">
      <div className="flex items-baseline gap-4">
        <span className="text-metric text-foreground">{chosen}</span>
        <p className="text-caption text-muted-foreground">
          of{" "}
          <span className="tabular-figures font-medium text-foreground">
            {total}
          </span>{" "}
          {total === 1 ? "guest has" : "guests have"} picked a {label} option
        </p>
      </div>

      <ul className="space-y-5">
        {options.map((option) => {
          const count = counts[option._id] ?? 0;
          const share = percent(count, total);

          return (
            <li key={option._id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-body min-w-0 truncate text-foreground">
                  {option.name}
                </span>
                <span className="shrink-0 tabular-figures">
                  <span className="text-section text-foreground">{count}</span>
                  <span className="text-caption ml-1.5 text-muted-foreground">
                    {share}%
                  </span>
                </span>
              </div>
              <Progress
                value={share}
                className="h-1.5 bg-secondary [&_[data-slot=progress-indicator]]:bg-accent"
                aria-label={`${option.name}: ${count} of ${total} guests`}
              />
            </li>
          );
        })}

        <li className="space-y-2 border-t border-border pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-body min-w-0 truncate text-muted-foreground">
              No selection yet
            </span>
            <span className="shrink-0 tabular-figures">
              <span className="text-section text-muted-foreground">
                {unassigned}
              </span>
              <span className="text-caption ml-1.5 text-muted-foreground">
                {percent(unassigned, total)}%
              </span>
            </span>
          </div>
          <Progress
            value={percent(unassigned, total)}
            className="h-1.5 bg-secondary [&_[data-slot=progress-indicator]]:bg-muted-foreground/40"
            aria-label={`No selection: ${unassigned} of ${total} guests`}
          />
        </li>
      </ul>
    </div>
  );
}
