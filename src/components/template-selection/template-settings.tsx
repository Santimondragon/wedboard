"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { useToastMutation } from "@/hooks/use-toast-mutation"
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  RSVP_VARIANTS,
  type BlockType,
  type LayoutBlock,
  type RsvpVariant,
} from "@/components/public-invitation/blocks"
import { ConfigFieldInput } from "@/components/template-selection/config-field-input"
import { InvitationTemplate } from "@/components/public-invitation/templates/invitation-template"
import { DUMMY_INVITATION_DATA } from "@/components/public-invitation/templates/dummy-data"

export function TemplateSettings() {
  const event = useEvent()
  const media = useQuery(api.media.listByEvent, { eventId: event._id })
  const specialEvents = useQuery(api.specialEvents.listByEvent, {
    eventId: event._id,
  })
  const setTemplate = useToastMutation(api.events.setInvitationTemplate, {
    success: "Invitation layout saved",
    error: "Failed to save layout",
  })

  const [templateId, setTemplateId] = useState<string>(
    event.templateId ?? DEFAULT_TEMPLATE_ID
  )
  // One independent block list per RSVP variant; the public page picks one based
  // on the invitation's guests' RSVP state.
  const [variants, setVariants] = useState<Record<RsvpVariant, LayoutBlock[]>>(
    () => {
      const preset = resolveTemplate(event.templateId ?? DEFAULT_TEMPLATE_ID)
      const defaults = preset.defaultBlockConfig ?? {}

      const applyDefaults = (block: LayoutBlock): LayoutBlock => {
        const seed = defaults[block.type] ?? {}
        const eventDerived = deriveEventConfig(event, block.type)
        // Priority: user's saved values > event-derived > template text defaults
        return { ...block, config: { ...seed, ...eventDerived, ...block.config } }
      }

      const build = (variant: RsvpVariant): LayoutBlock[] => {
        // Existing single layouts migrate to the "accepted" variant.
        const saved = (event.layoutVariants?.[variant] ??
          (variant === "accepted" ? event.layoutBlocks : undefined)) as
          | LayoutBlock[]
          | undefined
        // Drop blocks whose type no longer exists (e.g. removed block types in
        // older saved layouts) so the editor doesn't crash on an unknown def.
        const known = saved?.filter((b) => BLOCK_DEFS[b.type])
        if (known && known.length > 0) return known.map(applyDefaults)
        return (preset.defaultLayouts?.[variant]?.() ?? defaultLayout(variant)).map(
          applyDefaults
        )
      }

      return {
        pending: build("pending"),
        accepted: build("accepted"),
        declined: build("declined"),
      }
    }
  )
  const [activeVariant, setActiveVariant] = useState<RsvpVariant>("pending")

  // The active variant's block list, plus a setter that only touches it.
  const blocks = variants[activeVariant]
  const setBlocks = (updater: (prev: LayoutBlock[]) => LayoutBlock[]) =>
    setVariants((prev) => ({
      ...prev,
      [activeVariant]: updater(prev[activeVariant]),
    }))

  function addBlock(type: BlockType) {
    const seed = resolveTemplate(templateId).defaultBlockConfig?.[type]
    const eventDerived = deriveEventConfig(event, type)
    setBlocks((prev) => {
      const block = createBlock(type)
      block.config = { ...(seed ?? {}), ...eventDerived }
      return [...prev, block]
    })
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

  function updateConfig(id: string, key: string, value: unknown) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b
      )
    )
  }

  // Media id → URL so the live preview renders the chosen images.
  const previewMediaUrls = useMemo(() => {
    const urls: Record<string, string> = {}
    for (const item of media ?? []) {
      if (item.url) urls[item._id] = item.url
    }
    return urls
  }, [media])

  // Preview the real event details (names, date, venue, map link) when set,
  // falling back to the dummy sample so empty fields still render something.
  const previewData = useMemo(
    () => ({
      ...DUMMY_INVITATION_DATA,
      event: {
        ...DUMMY_INVITATION_DATA.event,
        name: event.name || DUMMY_INVITATION_DATA.event.name,
        brideName: event.brideName || DUMMY_INVITATION_DATA.event.brideName,
        groomName: event.groomName || DUMMY_INVITATION_DATA.event.groomName,
        date: event.date ?? DUMMY_INVITATION_DATA.event.date,
        venueName: event.venueName || DUMMY_INVITATION_DATA.event.venueName,
        venueAddress:
          event.venueAddress || DUMMY_INVITATION_DATA.event.venueAddress,
        venueMapUrl: event.venueMapUrl || DUMMY_INVITATION_DATA.event.venueMapUrl,
      },
      mediaUrls: previewMediaUrls,
    }),
    [event, previewMediaUrls]
  )

  async function handleSave() {
    await setTemplate.run({
      eventId: event._id,
      templateId,
      layoutVariants: variants,
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_1fr]">
      {/* Controls */}
      <div className="space-y-8">
        {/* Only show the template picker when there's a real choice to make. */}
        {TEMPLATE_LIST.length > 1 && (
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
        )}

        <section className="space-y-3">
          <Tabs
            value={activeVariant}
            onValueChange={(v) => setActiveVariant(v as RsvpVariant)}
          >
            <TabsList className="w-full">
              {RSVP_VARIANTS.map((variant) => (
                <TabsTrigger key={variant} value={variant} className="capitalize">
                  {VARIANT_LABELS[variant]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-zinc-500">{VARIANT_HINTS[activeVariant]}</p>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Blocks</h2>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer hover:underline"
              onClick={() =>
                setBlocks(
                  () =>
                    resolveTemplate(templateId).defaultLayouts?.[
                      activeVariant
                    ]?.() ?? defaultLayout(activeVariant)
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
                  className="rounded-lg border border-zinc-200 p-4 space-y-2"
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

                  {(() => {
                    const visibleFields = def.fields.filter(
                      (field) =>
                        !field.showWhen ||
                        field.showWhen.equals.includes(
                          String(block.config?.[field.showWhen.key] ?? "")
                        )
                    )
                    if (visibleFields.length === 0) return null
                    return (
                    <div className="space-y-2 pt-1">
                      {visibleFields.map((field) => (
                        <ConfigFieldInput
                          key={field.key}
                          field={field}
                          value={block.config?.[field.key]}
                          eventId={event._id}
                          media={media}
                          specialEvents={specialEvents ?? undefined}
                          onChange={(value) =>
                            updateConfig(block.id, field.key, value)
                          }
                        />
                      ))}
                    </div>
                    )
                  })()}
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
      </div>

      {/* Live preview — sticks to the top while the blocks list scrolls. */}
      <div className="sticky top-0 self-start space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Live preview</h2>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="max-h-[70vh] overflow-y-auto">
            <InvitationTemplate
              data={previewData}
              templateId={templateId}
              blocks={blocks}
              rsvpState={activeVariant}
            />
          </div>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={setTemplate.pending}
        >
          {setTemplate.pending ? "Saving…" : "Save layout"}
        </Button>
      </div>
    </div>
  )
}

const VARIANT_LABELS: Record<RsvpVariant, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
}

const VARIANT_HINTS: Record<RsvpVariant, string> = {
  pending: "Shown while the invitation is unanswered (guests still need to RSVP).",
  accepted: "Shown once at least one guest confirms they're attending.",
  declined: "Shown when every guest has declined.",
}

function deriveEventConfig(
  event: ReturnType<typeof useEvent>,
  blockType: BlockType
): Record<string, unknown> {
  if (blockType === "location") {
    const address = [event.venueName, event.venueAddress].filter(Boolean).join(", ")
    const buttonUrl = event.venueMapUrl?.trim() ||
      (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "")
    return { ...(address && { address }), ...(buttonUrl && { buttonUrl }) }
  }
  return {}
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
