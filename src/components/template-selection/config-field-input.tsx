"use client"

import { useState } from "react"
import { Id } from "convex/_generated/dataModel"
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MediaPickerDialog } from "@/components/media/media-picker-dialog"
import type { MediaItem } from "@/components/media/media-grid"
import type { ConfigField } from "@/components/public-invitation/blocks"

type IllustrationItemField = NonNullable<ConfigField["itemFields"]>[number]

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
  if (field.input === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{field.label}</p>
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
          aria-label={field.label}
        />
      </div>
    )
  }
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
      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500">{field.label}</p>
        <Textarea
          value={text}
          placeholder={field.placeholder}
          aria-label={field.label}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{field.label}</p>
      <Input
        value={text}
        placeholder={field.placeholder}
        aria-label={field.label}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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
              {field.itemFields!.map((itemField) => {
                const itemValue =
                  typeof item === "object" ? (item[itemField.key] ?? "") : ""
                const setValue = (next: string) =>
                  updateItem(index, {
                    ...(typeof item === "object" ? item : {}),
                    [itemField.key]: next,
                  })
                if (itemField.input === "illustration") {
                  return (
                    <IllustrationPicker
                      key={itemField.key}
                      itemField={itemField}
                      value={itemValue}
                      onChange={setValue}
                      label={`${field.label} ${index + 1} — ${itemField.label}`}
                    />
                  )
                }
                return (
                  <Input
                    key={itemField.key}
                    value={itemValue}
                    placeholder={itemField.label}
                    aria-label={`${field.label} ${index + 1} — ${itemField.label}`}
                    onChange={(e) => setValue(e.target.value)}
                  />
                )
              })}
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

/**
 * Picks one preset illustration (e.g. an itinerary item's SVG) via a modal
 * grid. Mirrors the image-field picker but uses the field's static `options`
 * instead of the event media library. Spans both grid columns.
 */
function IllustrationPicker({
  itemField,
  value,
  onChange,
  label,
}: {
  itemField: IllustrationItemField
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const options = itemField.options ?? []
  const selected = options.find((o) => o.value === value)

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="col-span-2 space-y-1">
      <p className="text-xs font-medium text-zinc-500">{itemField.label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-left hover:border-zinc-400"
        aria-label={label}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-50">
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.src}
              alt={selected.label}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-zinc-400" />
          )}
        </span>
        <span className="text-sm text-zinc-700">
          {selected ? selected.label : "Choose illustration"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Illustration</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-3 hover:border-zinc-400",
                  option.value === value && "border-zinc-900 ring-1 ring-zinc-900"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.src}
                  alt={option.label}
                  className="h-14 w-full object-contain"
                />
                <span className="text-xs text-zinc-600">{option.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
