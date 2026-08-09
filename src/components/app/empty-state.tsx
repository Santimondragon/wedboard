import { type LucideIcon } from "lucide-react";
import { StateBlock } from "@/components/app/state-block";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Thin compatibility wrapper over {@link StateBlock} with `kind="empty"`.
 * Kept because ~12 call sites import it; prefer `StateBlock` in new code.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <StateBlock
      kind="empty"
      title={title}
      description={description}
      icon={icon}
      action={action}
    />
  );
}
