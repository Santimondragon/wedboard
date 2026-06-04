import { cn } from "@/lib/utils"
import { useTemplateTheme } from "../template-theme"

interface SectionProps {
  /** Optional small uppercase eyebrow above the heading. */
  eyebrow?: string
  /** Optional section heading. */
  heading?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Minimal wrapper used by every section of the public invitation template.
 * Pulls colors/fonts from the active template theme so the same sections render
 * differently per template.
 */
export function Section({ eyebrow, heading, className, children }: SectionProps) {
  const theme = useTemplateTheme()
  return (
    <section className={cn("py-12 px-4", className)}>
      <div className={cn("max-w-2xl mx-auto space-y-4 text-center", theme.body)}>
        {eyebrow && (
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-widest",
              theme.eyebrow
            )}
          >
            {eyebrow}
          </p>
        )}
        {heading && (
          <h2 className={cn("text-2xl", theme.heading)}>{heading}</h2>
        )}
        {children}
      </div>
    </section>
  )
}
