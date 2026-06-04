"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"
import { toast } from "sonner"
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEvent } from "@/components/dashboard/event-provider"
import {
  TEMPLATE_LIST,
  DEFAULT_TEMPLATE_ID,
  resolveTemplate,
} from "@/components/public-invitation/templates/template-registry"
import {
  BLOCK_DEFS,
  BLOCK_PALETTE,
  createBlock,
  defaultLayout,
  type BlockType,
  type LayoutBlock,
} from "@/components/public-invitation/blocks"
import { InvitationTemplate } from "@/components/public-invitation/templates/invitation-template"
import { DUMMY_INVITATION_DATA } from "@/components/public-invitation/templates/dummy-data"

export function TemplateSettings() {
  const event = useEvent()
  const setTemplate = useMutation(api.events.setInvitationTemplate)

  const [templateId, setTemplateId] = useState<string>(
    event.templateId ?? DEFAULT_TEMPLATE_ID
  )
  const [blocks, setBlocks] = useState<LayoutBlock[]>(() => {
    const saved = event.layoutBlocks as LayoutBlock[] | undefined
    if (saved && saved.length > 0) return saved
    const preset = resolveTemplate(event.templateId ?? DEFAULT_TEMPLATE_ID)
    return preset.defaultLayout?.() ?? defaultLayout()
  })
  const [saving, setSaving] = useState(false)

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, createBlock(type)])
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id)
      if (index === -1) return prev
      const source = prev[index]
      const copy: LayoutBlock = {
        ...source,
        id: createBlock(source.type).id,
        config: { ...source.config },
      }
      const next = [...prev]
      next.splice(index + 1, 0, copy)
      return next
    })
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateConfig(id: string, key: string, value: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b
      )
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await setTemplate({ eventId: event._id, templateId, layoutBlocks: blocks })
      toast.success("Invitation layout saved")
    } catch {
      toast.error("Failed to save layout")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_1fr]">
      {/* Controls */}
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Template</h2>
          <div className="space-y-2">
            {TEMPLATE_LIST.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  templateId === template.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                )}
              >
                <p className="text-sm font-medium text-zinc-900">
                  {template.label}
                </p>
                <p className="text-xs text-zinc-500">{template.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Blocks</h2>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-900"
              onClick={() =>
                setBlocks(
                  resolveTemplate(templateId).defaultLayout?.() ?? defaultLayout()
                )
              }
            >
              Reset to default
            </button>
          </div>

          <ul className="space-y-2">
            {blocks.map((block, index) => {
              const def = BLOCK_DEFS[block.type]
              return (
                <li
                  key={block.id}
                  className="rounded-lg border border-zinc-200 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-900">
                      {def.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        label="Move up"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Duplicate"
                        onClick={() => duplicateBlock(block.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Remove"
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  {def.fields.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {def.fields.map((field) => {
                        const value =
                          (block.config?.[field.key] as string | undefined) ?? ""
                        return field.input === "textarea" ? (
                          <Textarea
                            key={field.key}
                            value={value}
                            placeholder={field.placeholder}
                            aria-label={field.label}
                            rows={3}
                            onChange={(e) =>
                              updateConfig(block.id, field.key, e.target.value)
                            }
                          />
                        ) : (
                          <Input
                            key={field.key}
                            value={value}
                            placeholder={field.placeholder}
                            aria-label={field.label}
                            onChange={(e) =>
                              updateConfig(block.id, field.key, e.target.value)
                            }
                          />
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <Select value="" onValueChange={(v) => addBlock(v as BlockType)}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-2 text-zinc-600">
                <Plus className="h-4 w-4" />
                <SelectValue placeholder="Add block" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {BLOCK_PALETTE.map((type) => (
                <SelectItem key={type} value={type}>
                  {BLOCK_DEFS[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save layout"}
        </Button>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Live preview</h2>
          <span className="text-xs text-zinc-400">Sample data</span>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="max-h-[75vh] overflow-y-auto">
            <InvitationTemplate
              data={DUMMY_INVITATION_DATA}
              templateId={templateId}
              blocks={blocks}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-zinc-500 hover:text-zinc-900"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
