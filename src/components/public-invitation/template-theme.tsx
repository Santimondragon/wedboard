"use client"

import { createContext, useContext } from "react"

/**
 * A template is currently just a theme: a set of Tailwind class tokens that the
 * shared section components read via context. This keeps the three templates as
 * "small variances" over one set of sections. When templates need to differ in
 * structure (not just styling), this can grow into a richer descriptor.
 */
export interface TemplateTheme {
  id: string
  label: string
  description: string
  /** Font family applied to the whole template. */
  font: string
  /** Outer page background. */
  page: string
  /** Inner content card. */
  card: string
  /** Divider between sections. */
  divider: string
  /** Small uppercase eyebrow text. */
  eyebrow: string
  /** Section headings. */
  heading: string
  /** Large hero title. */
  heroTitle: string
  /** Default body text color. */
  body: string
}

export const TEMPLATE_THEMES: Record<string, TemplateTheme> = {
  elegant: {
    id: "elegant",
    label: "Elegant",
    description: "The official Xoom design — gold script, soft serif, mobile-first.",
    font: "font-elegant",
    page: "bg-wedding-soft/40",
    card: "bg-white shadow-sm",
    divider: "divide-y divide-wedding-soft",
    eyebrow: "text-wedding-gold",
    heading: "text-wedding-ink font-bold",
    heroTitle: "text-wedding-gold font-script",
    body: "text-wedding-ink",
  },
  classic: {
    id: "classic",
    label: "Classic",
    description: "Soft stone tones, centered and understated.",
    font: "font-sans",
    page: "bg-stone-50",
    card: "bg-white shadow-sm",
    divider: "divide-y divide-stone-200",
    eyebrow: "text-zinc-400",
    heading: "text-zinc-900 font-semibold",
    heroTitle: "text-zinc-900 font-semibold",
    body: "text-zinc-600",
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "High-contrast black & white with uppercase headings.",
    font: "font-sans",
    page: "bg-white",
    card: "bg-white border-x border-zinc-900",
    divider: "divide-y divide-zinc-900/10",
    eyebrow: "text-zinc-900 uppercase tracking-[0.3em]",
    heading: "text-zinc-900 font-bold uppercase tracking-wide",
    heroTitle: "text-zinc-900 font-bold uppercase tracking-tight",
    body: "text-zinc-700",
  },
  romantic: {
    id: "romantic",
    label: "Romantic",
    description: "Warm rose palette with serif headings.",
    font: "font-serif",
    page: "bg-rose-50",
    card: "bg-white shadow-sm",
    divider: "divide-y divide-rose-100",
    eyebrow: "text-rose-400",
    heading: "text-rose-900 font-semibold",
    heroTitle: "text-rose-900 font-semibold italic",
    body: "text-rose-950/70",
  },
}

export type TemplateId = keyof typeof TEMPLATE_THEMES

function resolveTheme(templateId?: string | null): TemplateTheme {
  return (templateId && TEMPLATE_THEMES[templateId]) || TEMPLATE_THEMES.classic
}

const TemplateThemeContext = createContext<TemplateTheme>(TEMPLATE_THEMES.classic)

export function useTemplateTheme(): TemplateTheme {
  return useContext(TemplateThemeContext)
}

export function TemplateThemeProvider({
  templateId,
  children,
}: {
  templateId?: string | null
  children: React.ReactNode
}) {
  return (
    <TemplateThemeContext.Provider value={resolveTheme(templateId)}>
      {children}
    </TemplateThemeContext.Provider>
  )
}
