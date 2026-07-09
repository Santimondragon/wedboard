// Pure helpers for the public-invitation social metadata (title/description
// templates with {variables}). No Convex imports — also consumed by the
// dashboard Meta page (via the `convex/*` alias) for its live preview.

export type MetaVariableValues = {
  "invitation-title": string;
  "guest-name": string;
  "guest-names": string;
  "event-name": string;
  "bride-name": string;
  "groom-name": string;
  "couple-names": string;
};

export const META_VARIABLES: {
  token: keyof MetaVariableValues;
  description: string;
}[] = [
  {
    token: "invitation-title",
    description: 'Invitation title, e.g. "The Smith Family"',
  },
  { token: "guest-name", description: "First guest's full name" },
  { token: "guest-names", description: "All guest names on the invitation" },
  { token: "event-name", description: "Event name" },
  { token: "bride-name", description: "Bride's name" },
  { token: "groom-name", description: "Groom's name" },
  { token: "couple-names", description: 'Both names, e.g. "Ava & Liam"' },
];

/** Replaces every known {variable} in a template; unknown tokens are left as-is. */
export function resolveMetaTemplate(
  template: string,
  values: MetaVariableValues,
): string {
  return template
    .replace(/\{([a-z-]+)\}/g, (match, token: string) =>
      token in values ? values[token as keyof MetaVariableValues] : match,
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Builds the variable values for one invitation from event + guest data. */
export function buildMetaVariables(args: {
  eventName: string;
  brideName?: string;
  groomName?: string;
  invitationTitle: string;
  guestNames: string[];
}): MetaVariableValues {
  const couple = [args.brideName, args.groomName].filter(Boolean).join(" & ");
  return {
    "invitation-title": args.invitationTitle,
    "guest-name": args.guestNames[0] ?? args.invitationTitle,
    "guest-names": formatNameList(args.guestNames) || args.invitationTitle,
    "event-name": args.eventName,
    "bride-name": args.brideName ?? "",
    "groom-name": args.groomName ?? "",
    "couple-names": couple || args.eventName,
  };
}

function formatNameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Default title template when the owner hasn't set one. */
export const DEFAULT_META_TITLE =
  "Invitation for {invitation-title} — {couple-names}";

/** Default description template when the owner hasn't set one. */
export const DEFAULT_META_DESCRIPTION =
  "You're invited to the wedding of {couple-names}. Open your invitation and RSVP.";

export const META_TITLE_MAX = 120;
export const META_DESCRIPTION_MAX = 300;

/** Favicon must be an .ico, .svg, or .png from the media library. */
export const FAVICON_MIME_TYPES = [
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
  "image/png",
];
