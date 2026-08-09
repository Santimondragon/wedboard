/**
 * Clerk `appearance` shared by sign-in and sign-up.
 *
 * Deliberately shallow: only the surfaces that would otherwise clash with the
 * warm-paper brand (card chrome, headings, primary button, links). Clerk's own
 * internals are left alone — chasing every element is a maintenance tax for
 * little gain.
 *
 * Colors come from Tailwind utilities mapped to our tokens rather than the
 * `variables` API, which derives shade ramps and cannot resolve `var(--…)`.
 */
export const authAppearance = {
  variables: {
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-soft-lg",
    card: "bg-card border border-border",
    headerTitle: "font-heading tracking-[-0.02em] text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton: "border-border hover:bg-secondary",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldLabel: "text-foreground",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 normal-case tracking-normal",
    footerActionLink: "text-accent hover:text-accent/80",
    footer: "bg-secondary/50",
  },
} as const;
