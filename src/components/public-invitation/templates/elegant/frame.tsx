import type { FrameProps } from "../types";

/**
 * Page frame for the "elegant" template: a phone-width invitation
 * card centered on a soft background. Intentionally has NO vertical gap or
 * padding between blocks — each block owns its own spacing (see the design,
 * where the global itemSpacing has been pushed into the components).
 *
 * `invitation-theme` re-pins the design tokens (colors, radius, --font-sans)
 * to the values this template was built against, so the guest page is immune
 * to the dashboard's theme. See the scope definition in `src/app/globals.css`.
 */
export function ElegantFrame({ children }: FrameProps) {
  return (
    <div className="invitation-theme min-h-screen bg-wedding-soft/40">
      <div className="mx-auto w-full max-w-140 bg-white text-wedding-ink shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}
