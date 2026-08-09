/**
 * Shared dashboard primitives. Import from `@/components/app` so the seam
 * between the design system and feature code stays a single module.
 */
export { AccessNotice, type AccessNoticeProps } from "./access-notice";
export { CopyButton } from "./copy-button";
export { DataTableShell, type DataTableShellProps } from "./data-table-shell";
export { EmptyState } from "./empty-state";
export { ListRow, ListRows, type ListRowProps } from "./list-row";
export { LoadingState } from "./loading-state";
export { Logo } from "./logo";
export { PageHeader, type PageHeaderProps } from "./page-header";
export { Panel, type PanelProps } from "./panel";
export { StatCard, type StatCardProps, type StatTone } from "./stat-card";
export {
  StateBlock,
  type StateBlockProps,
  type StateBlockKind,
  type StateBlockAction,
} from "./state-block";
export { StatusBadge } from "./status-badge";
export {
  StatusPill,
  type StatusPillProps,
  type StatusTone,
} from "./status-pill";
