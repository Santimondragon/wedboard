import { TemplateSettings } from "@/components/template-selection/template-settings"

export default function TemplatePage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="shrink-0 space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Invitation Template
        </h1>
        <p className="text-sm text-zinc-500">
          Pick a template, then build your page: add, reorder, duplicate, or
          remove blocks. Changes apply to every public invitation page for this
          event.
        </p>
      </div>
      <TemplateSettings />
    </div>
  )
}
