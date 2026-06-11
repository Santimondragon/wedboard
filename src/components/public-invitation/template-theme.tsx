"use client"

import { createContext, useContext } from "react"

/**
 * A template theme is a set of Tailwind class tokens that the shared section
 * components read via context. When templates need to differ in structure (not
 * just styling), this can grow into a richer descriptor.
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
    description: "Gold script, soft serif, mobile-first.",
    font: "font-elegant",
    page: "bg-wedding-soft/40",
    card: "bg-white shadow-sm",
    divider: "divide-y divide-wedding-soft",
    eyebrow: "text-wedding-gold",
    heading: "text-wedding-ink font-bold",
    heroTitle: "text-wedding-gold font-script",
    body: "text-wedding-ink",
  },
}

export type TemplateId = keyof typeof TEMPLATE_THEMES

function resolveTheme(templateId?: string | null): TemplateTheme {
  return (templateId && TEMPLATE_THEMES[templateId]) || TEMPLATE_THEMES.elegant
}

const TemplateThemeContext = createContext<TemplateTheme>(TEMPLATE_THEMES.elegant)

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
