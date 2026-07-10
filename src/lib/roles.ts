export type EventRole = "owner" | "planner" | "editor" | "viewer";

/** Roles that can be assigned to a shared member (owner is implicit). */
export type AssignableRole = "planner" | "editor" | "viewer";

const ROLE_RANK: Record<EventRole, number> = {
  owner: 4,
  planner: 3,
  editor: 2,
  viewer: 1,
};

/** Whether `role` meets or exceeds `min` in the event role hierarchy. */
export function hasMinRole(
  role: EventRole | null | undefined,
  min: EventRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Display label for a role. The owner and co-owner get friendlier names. */
export const ROLE_LABELS: Record<EventRole, string> = {
  owner: "Owner",
  planner: "Co-owner",
  editor: "Editor",
  viewer: "Viewer",
};
