import { TemplateSettings } from "@/components/template-selection/template-settings"

export default function TemplatePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
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
