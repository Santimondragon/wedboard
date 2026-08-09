"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  LayoutTemplate,
  RotateCcw,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StateBlock } from "@/components/app";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEvent } from "@/components/dashboard/event-provider";
import {
  TEMPLATE_LIST,
  DEFAULT_TEMPLATE_ID,
  resolveTemplate,
} from "@/components/public-invitation/templates/template-registry";
import {
  BLOCK_DEFS,
  BLOCK_PALETTE,
  createBlock,
  defaultLayout,
  RSVP_VARIANTS,
  type BlockType,
  type LayoutBlock,
  type RsvpVariant,
} from "@/components/public-invitation/blocks";
import { ConfigFieldInput } from "@/components/template-selection/config-field-input";
import { InvitationTemplate } from "@/components/public-invitation/templates/invitation-template";
import { DUMMY_INVITATION_DATA } from "@/components/public-invitation/templates/dummy-data";

export function TemplateSettings() {
  const event = useEvent();
  const media = useQuery(api.media.listByEvent, { eventId: event._id });
  const specialEvents = useQuery(api.specialEvents.listByEvent, {
    eventId: event._id,
  });
  const setTemplate = useToastMutation(api.events.setInvitationTemplate, {
    success: "Invitation layout saved",
    error: "Failed to save layout",
  });

  const [templateId, setTemplateId] = useState<string>(
    event.templateId ?? DEFAULT_TEMPLATE_ID,
  );
  // One independent block list per RSVP variant; the public page picks one based
  // on the invitation's guests' RSVP state.
  const [variants, setVariants] = useState<Record<RsvpVariant, LayoutBlock[]>>(
    () => {
      const preset = resolveTemplate(event.templateId ?? DEFAULT_TEMPLATE_ID);
      const defaults = preset.defaultBlockConfig ?? {};

      const applyDefaults = (block: LayoutBlock): LayoutBlock => {
        const seed = defaults[block.type] ?? {};
        const eventDerived = deriveEventConfig(event, block.type);
        // Priority: user's saved values > event-derived > template text defaults
        return {
          ...block,
          config: { ...seed, ...eventDerived, ...block.config },
        };
      };

      const build = (variant: RsvpVariant): LayoutBlock[] => {
        // Existing single layouts migrate to the "accepted" variant.
        const saved = (event.layoutVariants?.[variant] ??
          (variant === "accepted" ? event.layoutBlocks : undefined)) as
          | LayoutBlock[]
          | undefined;
        // Drop blocks whose type no longer exists (e.g. removed block types in
        // older saved layouts) so the editor doesn't crash on an unknown def.
        const known = saved?.filter((b) => BLOCK_DEFS[b.type]);
        if (known && known.length > 0) return known.map(applyDefaults);
        return (
          preset.defaultLayouts?.[variant]?.() ?? defaultLayout(variant)
        ).map(applyDefaults);
      };

      return {
        pending: build("pending"),
        accepted: build("accepted"),
        declined: build("declined"),
      };
    },
  );
  const [activeVariant, setActiveVariant] = useState<RsvpVariant>("pending");
  // Blocks are collapsed by default; track the ids the user has expanded.
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleExpanded = (id: string) =>
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The active variant's block list, plus a setter that only touches it.
  const blocks = variants[activeVariant];
  const setBlocks = (updater: (prev: LayoutBlock[]) => LayoutBlock[]) =>
    setVariants((prev) => ({
      ...prev,
      [activeVariant]: updater(prev[activeVariant]),
    }));

  function addBlock(type: BlockType) {
    const seed = resolveTemplate(templateId).defaultBlockConfig?.[type];
    const eventDerived = deriveEventConfig(event, type);
    setBlocks((prev) => {
      const block = createBlock(type);
      block.config = { ...(seed ?? {}), ...eventDerived };
      return [...prev, block];
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const source = prev[index];
      const copy: LayoutBlock = {
        ...source,
        id: createBlock(source.type).id,
        config: { ...source.config },
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateConfig(id: string, key: string, value: unknown) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b,
      ),
    );
  }

  // Media id → URL so the live preview renders the chosen images.
  const previewMediaUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const item of media ?? []) {
      if (item.url) urls[item._id] = item.url;
    }
    return urls;
  }, [media]);

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
        venueMapUrl:
          event.venueMapUrl || DUMMY_INVITATION_DATA.event.venueMapUrl,
      },
      mediaUrls: previewMediaUrls,
    }),
    [event, previewMediaUrls],
  );

  async function handleSave() {
    await setTemplate.run({
      eventId: event._id,
      templateId,
      layoutVariants: variants,
    });
  }

  const resetToDefault = () =>
    setBlocks(
      () =>
        resolveTemplate(templateId).defaultLayouts?.[activeVariant]?.() ??
        defaultLayout(activeVariant),
    );

  return (
    <div className="grid min-h-0 flex-1 gap-7 lg:grid-cols-[25rem_1fr]">
      {/* Editor chrome — header, tabs and "add block" stay put; only the list
          scrolls. Nothing here may leak into the preview column. */}
      <div className="flex min-h-0 flex-col gap-5">
        {/* Only show the template picker when there's a real choice to make. */}
        {TEMPLATE_LIST.length > 1 && (
          <section className="shrink-0 space-y-2.5">
            <h2 className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
              Template
            </h2>
            <div className="space-y-2">
              {TEMPLATE_LIST.map((template) => {
                const selected = templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    aria-pressed={selected}
                    className={cn(
                      "w-full cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-card hover:border-accent/40 hover:bg-secondary/60",
                    )}
                  >
                    <p
                      className={cn(
                        "text-body font-medium",
                        selected
                          ? "text-accent-soft-foreground"
                          : "text-foreground",
                      )}
                    >
                      {template.label}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="shrink-0 space-y-3">
          <Tabs
            value={activeVariant}
            onValueChange={(v) => setActiveVariant(v as RsvpVariant)}
          >
            <TabsList className="w-full">
              {RSVP_VARIANTS.map((variant) => (
                <TabsTrigger key={variant} value={variant}>
                  {VARIANT_LABELS[variant]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-caption text-muted-foreground">
            {VARIANT_HINTS[activeVariant]}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
            Blocks
            <span className="tabular-figures ml-1.5 font-normal normal-case">
              ({blocks.length})
            </span>
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-caption h-7 text-muted-foreground hover:text-foreground"
            onClick={resetToDefault}
          >
            <RotateCcw className="mr-1 size-3.5" aria-hidden />
            Reset to default
          </Button>
        </div>

        <Select value="" onValueChange={(v) => addBlock(v as BlockType)}>
          <SelectTrigger className="w-full shrink-0" aria-label="Add block">
            <span className="text-body flex items-center gap-2 text-muted-foreground">
              <Plus className="size-4" aria-hidden />
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

        {blocks.length === 0 ? (
          <div className="min-h-0 flex-1 rounded-lg border border-dashed border-border bg-card/60">
            <StateBlock
              kind="empty"
              icon={LayoutTemplate}
              title="This page is empty"
              description="Add a block above to start building the page guests see in this RSVP state, or restore the template's suggested layout."
              action={{ label: "Reset to default", onClick: resetToDefault }}
              compact
            />
          </div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
            {blocks.map((block, index) => {
              const def = BLOCK_DEFS[block.type];
              const isExpanded = expandedBlocks.has(block.id);
              const visibleFields = def.fields.filter(
                (field) =>
                  !field.showWhen ||
                  field.showWhen.equals.includes(
                    String(block.config?.[field.showWhen.key] ?? ""),
                  ),
              );
              return (
                <li
                  key={block.id}
                  className={cn(
                    "rounded-lg border bg-card shadow-soft-xs transition-colors",
                    isExpanded ? "border-accent/40" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(block.id)}
                      aria-expanded={isExpanded}
                      className="text-body flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg py-3 pl-3 text-left font-medium text-foreground"
                    >
                      <span
                        aria-hidden
                        className="text-caption tabular-figures flex size-5 shrink-0 items-center justify-center rounded-md bg-secondary font-medium text-muted-foreground"
                      >
                        {index + 1}
                      </span>
                      <span className="truncate">{def.label}</span>
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton
                        label="Move up"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Duplicate"
                        onClick={() => duplicateBlock(block.id)}
                      >
                        <Copy className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Remove"
                        destructive
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </div>

                  {isExpanded &&
                    (visibleFields.length === 0 ? (
                      <p className="text-caption border-t border-border px-3 py-3 text-muted-foreground">
                        This block has nothing to configure — its content comes
                        from your event details.
                      </p>
                    ) : (
                      <div className="space-y-4 border-t border-border px-3 py-4">
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
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Live preview — stays in view while the blocks list scrolls. */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
            Live preview
          </h2>
          <p className="text-caption text-muted-foreground">
            Showing the{" "}
            <span className="font-medium text-foreground">
              {VARIANT_LABELS[activeVariant]}
            </span>{" "}
            page
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-soft-sm">
          {/* `invitation-theme` keeps the inline (non-iframed) preview rendering
              against the invitation's tokens, not the dashboard's. Do not move
              or remove this class — it is the isolation contract. */}
          <div className="invitation-theme h-full overflow-y-auto">
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
          className="w-full shrink-0"
          onClick={handleSave}
          disabled={setTemplate.pending}
        >
          {setTemplate.pending ? "Saving…" : "Save layout"}
        </Button>
      </div>
    </div>
  );
}

const VARIANT_LABELS: Record<RsvpVariant, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const VARIANT_HINTS: Record<RsvpVariant, string> = {
  pending:
    "Shown while the invitation is unanswered (guests still need to RSVP).",
  accepted: "Shown once at least one guest confirms they're attending.",
  declined: "Shown when every guest has declined.",
};

function deriveEventConfig(
  event: ReturnType<typeof useEvent>,
  blockType: BlockType,
): Record<string, unknown> {
  if (blockType === "location") {
    const address = [event.venueName, event.venueAddress]
      .filter(Boolean)
      .join(", ");
    const buttonUrl =
      event.venueMapUrl?.trim() ||
      (address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : "");
    return { ...(address && { address }), ...(buttonUrl && { buttonUrl }) };
  }
  return {};
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 text-muted-foreground",
            destructive ? "hover:text-danger" : "hover:text-foreground",
          )}
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
