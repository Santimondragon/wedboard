"use client";

import { useId, useState, type ReactNode } from "react";
import { Id } from "convex/_generated/dataModel";
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
import type { MediaItem } from "@/components/media/media-grid";
import type { ConfigField } from "@/components/public-invitation/blocks";

type IllustrationItemField = NonNullable<ConfigField["itemFields"]>[number];

interface ConfigFieldInputProps {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Required for "image" fields: scopes the media picker to the event. */
  eventId?: Id<"events">;
  /** Event media (for image thumbnails) — pass the media.listByEvent result. */
  media?: MediaItem[];
  /** Options for "select" fields with optionsSource "specialEvents". */
  specialEvents?: { _id: string; name: string }[];
}

/** Sentinel value for the "none" option (shadcn Select disallows empty values). */
const SELECT_NONE = "__none__";

/**
 * One labelled row of the block-config form. Every input kind shares this
 * wrapper so an expanded block reads as a form rather than a stack of controls.
 */
function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-caption text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
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
  specialEvents,
}: ConfigFieldInputProps) {
  const id = useId();

  if (field.input === "select") {
    // Dynamic source (e.g. the event's special events) or a static option set.
    const dynamic = field.optionsSource === "specialEvents";
    const options: { value: string; label: string }[] = dynamic
      ? (specialEvents ?? []).map((se) => ({ value: se._id, label: se.name }))
      : (field.options ?? []);
    const current = typeof value === "string" && value ? value : SELECT_NONE;
    return (
      <Field
        label={field.label}
        htmlFor={id}
        hint={
          dynamic && options.length === 0
            ? "No special invitations yet — create one under Special Invitations."
            : undefined
        }
      >
        <Select
          value={current}
          onValueChange={(v) => onChange(v === SELECT_NONE ? undefined : v)}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_NONE}>None</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  if (field.input === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2">
        <Label htmlFor={id} className="text-caption text-muted-foreground">
          {field.label}
        </Label>
        <Switch
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.input === "list") {
    return <ListFieldInput field={field} value={value} onChange={onChange} />;
  }

  if (field.input === "image") {
    if (!eventId) return null;
    return (
      <ImageFieldInput
        field={field}
        value={value}
        onChange={onChange}
        eventId={eventId}
        media={media}
      />
    );
  }

  const text = typeof value === "string" ? value : "";
  if (field.input === "textarea") {
    return (
      <Field label={field.label} htmlFor={id}>
        <Textarea
          id={id}
          value={text}
          placeholder={field.placeholder}
          aria-label={field.label}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={id}>
      <Input
        id={id}
        value={text}
        placeholder={field.placeholder}
        aria-label={field.label}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function ImageFieldInput({
  field,
  value,
  onChange,
  eventId,
  media,
}: ConfigFieldInputProps & { eventId: Id<"events"> }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mediaId = typeof value === "string" && value ? value : undefined;
  const selected = mediaId
    ? media?.find((item) => item._id === mediaId)
    : undefined;

  return (
    <Field label={field.label}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-secondary transition-colors hover:border-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          aria-label={`Choose ${field.label}`}
        >
          {selected?.url ? (
            <img
              src={selected.url}
              alt={selected.name}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
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
            className="size-8 text-muted-foreground hover:text-danger"
            aria-label="Remove image"
            onClick={() => onChange(undefined)}
          >
            <X className="size-4" />
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
    </Field>
  );
}

type ListItem = string | Record<string, string>;

function ListFieldInput({ field, value, onChange }: ConfigFieldInputProps) {
  const structured = !!field.itemFields?.length;
  const items: ListItem[] = Array.isArray(value) ? (value as ListItem[]) : [];

  function setItems(next: ListItem[]) {
    onChange(next);
  }

  function updateItem(index: number, item: ListItem) {
    setItems(items.map((it, i) => (i === index ? item : it)));
  }

  function addItem() {
    setItems([
      ...items,
      structured
        ? Object.fromEntries(field.itemFields!.map((f) => [f.key, ""]))
        : "",
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <Field label={field.label}>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-caption rounded-md border border-dashed border-border px-3 py-2.5 text-muted-foreground">
            No items yet.
          </p>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-1.5 rounded-md border border-border bg-secondary/40 p-2"
          >
            {structured ? (
              <div className="grid flex-1 grid-cols-2 gap-2">
                {field.itemFields!.map((itemField) => {
                  const itemValue =
                    typeof item === "object" ? (item[itemField.key] ?? "") : "";
                  const setValue = (next: string) =>
                    updateItem(index, {
                      ...(typeof item === "object" ? item : {}),
                      [itemField.key]: next,
                    });
                  if (itemField.input === "illustration") {
                    return (
                      <IllustrationPicker
                        key={itemField.key}
                        itemField={itemField}
                        value={itemValue}
                        onChange={setValue}
                        label={`${field.label} ${index + 1} — ${itemField.label}`}
                      />
                    );
                  }
                  return (
                    <Input
                      key={itemField.key}
                      className="bg-card"
                      value={itemValue}
                      placeholder={itemField.label}
                      aria-label={`${field.label} ${index + 1} — ${itemField.label}`}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  );
                })}
              </div>
            ) : (
              <Input
                className="flex-1 bg-card"
                value={typeof item === "string" ? item : ""}
                aria-label={`${field.label} ${index + 1}`}
                onChange={(e) => updateItem(index, e.target.value)}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-danger"
              aria-label={`Remove ${field.label} ${index + 1}`}
              onClick={() => removeItem(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={addItem}
        >
          <Plus className="mr-1 size-3.5" aria-hidden />
          Add item
        </Button>
      </div>
    </Field>
  );
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
  itemField: IllustrationItemField;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const options = itemField.options ?? [];
  const selected = options.find((o) => o.value === value);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className="col-span-2 space-y-1.5">
      <p className="text-caption text-muted-foreground">{itemField.label}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={label}
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
          {selected ? (
            <img
              src={selected.src}
              alt={selected.label}
              className="size-full object-contain p-1"
            />
          ) : (
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          )}
        </span>
        <span className="text-body text-foreground">
          {selected ? selected.label : "Choose illustration"}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose illustration</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-border hover:border-accent/50 hover:bg-secondary/60",
                  )}
                >
                  {}
                  <img
                    src={option.src}
                    alt={option.label}
                    className="h-14 w-full object-contain"
                  />
                  <span className="text-caption text-muted-foreground">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
