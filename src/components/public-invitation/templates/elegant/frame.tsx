import type { FrameProps } from "../default-blocks"

/**
 * Page frame for the "elegant" template: a phone-width invitation
 * card centered on a soft background. Intentionally has NO vertical gap or
 * padding between blocks — each block owns its own spacing (see the design,
 * where the global itemSpacing has been pushed into the components).
 */
export function ElegantFrame({ children }: FrameProps) {
  return (
    <div className="min-h-screen bg-wedding-soft/40 py-8">
      <div className="mx-auto w-full max-w-[420px] bg-white text-wedding-ink shadow-sm">
        {children}
      </div>
    </div>
  )
}
