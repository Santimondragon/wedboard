import { TemplateSettings } from "@/components/template-selection/template-settings";
import { PageHeader } from "@/components/app";

export default function TemplatePage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-7">
      <PageHeader
        className="shrink-0"
        title="Invitation Template"
        description="Pick a template, then build your page: add, reorder, duplicate, or remove blocks. Changes apply to every public invitation page for this event."
      />
      <TemplateSettings />
    </div>
  );
}
