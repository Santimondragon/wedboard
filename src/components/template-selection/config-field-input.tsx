"use client"

import { useState } from "react"
import { Id } from "convex/_generated/dataModel"
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MediaPickerDialog } from "@/components/media/media-picker-dialog"
import type { MediaItem } from "@/components/media/media-grid"
import type { ConfigField } from "@/components/public-invitation/blocks"

interface ConfigFieldInputProps {
  field: ConfigField
  value: unknown
  onChange: (value: unknown) => void
  /** Required for "image" fields: scopes the media picker to the event. */
  eventId?: Id<"events">
  /** Event media (for image thumbnails) — pass the media.listByEvent result. */
  media?: MediaItem[]
}

/**
 * Renders one editable block-config field, switching on the field's input
 * kind.
 */
export function ConfigFieldInput({
  field,
  value,
  onChange,
  eventId,
  media,
}: ConfigFieldInputProps) {
  if (field.input === "list") {
    return <ListFieldInput field={field} value={value} onChange={onChange} />
  }
  if (field.input === "image") {
    if (!eventId) return null
    return (
      <ImageFieldInput
        field={field}
        value={value}
        onChange={onChange}
        eventId={eventId}
        media={media}
      />
    )
  }

  const text = typeof value === "string" ? value : ""
  if (field.input === "textarea") {
    return (
      <Textarea
        value={text}
        placeholder={field.placeholder}
        aria-label={field.label}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <Input
      value={text}
      placeholder={field.placeholder}
      aria-label={field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function ImageFieldInput({
  field,
  value,
  onChange,
  eventId,
  media,
}: ConfigFieldInputProps & { eventId: Id<"events"> }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const mediaId = typeof value === "string" && value ? value : undefined
  const selected = mediaId
    ? media?.find((item) => item._id === mediaId)
    : undefined

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{field.label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-zinc-50 hover:border-zinc-400"
          aria-label={`Choose ${field.label}`}
        >
          {selected?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.url}
              alt={selected.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-zinc-400" />
          )}
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          {mediaId ? "Change" : "Choose from library"}
        </Button>
        {mediaId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
            aria-label="Remove image"
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <MediaPickerDialog
        eventId={eventId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={mediaId}
        onSelect={(id) => onChange(id)}
      />
    </div>
  )
}

type ListItem = string | Record<string, string>

function ListFieldInput({ field, value, onChange }: ConfigFieldInputProps) {
  const structured = !!field.itemFields?.length
  const items: ListItem[] = Array.isArray(value) ? (value as ListItem[]) : []

  function setItems(next: ListItem[]) {
    onChange(next)
  }

  function updateItem(index: number, item: ListItem) {
    setItems(items.map((it, i) => (i === index ? item : it)))
  }

  function addItem() {
    setItems([
      ...items,
      structured
        ? Object.fromEntries(field.itemFields!.map((f) => [f.key, ""]))
        : "",
    ])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">{field.label}</p>
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-1.5">
          {structured ? (
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              {field.itemFields!.map((itemField) => (
                <Input
                  key={itemField.key}
                  value={
                    typeof item === "object" ? (item[itemField.key] ?? "") : ""
                  }
                  placeholder={itemField.label}
                  aria-label={`${field.label} ${index + 1} — ${itemField.label}`}
                  onChange={(e) =>
                    updateItem(index, {
                      ...(typeof item === "object" ? item : {}),
                      [itemField.key]: e.target.value,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <Input
              className="flex-1"
              value={typeof item === "string" ? item : ""}
              aria-label={`${field.label} ${index + 1}`}
              onChange={(e) => updateItem(index, e.target.value)}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-zinc-400 hover:text-zinc-900"
            aria-label="Remove item"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addItem}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add item
      </Button>
    </div>
  )
}
