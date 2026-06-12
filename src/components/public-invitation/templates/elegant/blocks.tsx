"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getConfigList, getConfigString, type BlockType } from "../../blocks"
import type { BlockComponent, BlockComponentProps } from "../default-blocks"
import { ELEGANT_COPY } from "./default-copy"

// ---------------------------------------------------------------------------
// Primitives — shared by the elegant blocks. Each block applies its own padding
// via <ElegantSection> so there is no global spacing on the frame.
// ---------------------------------------------------------------------------

/**
 * 24px horizontal padding matches the design (342px content in a 390px frame).
 * Each block sets its own vertical padding + gap (the design has no global gap).
 */
function ElegantSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <section className={cn("px-6 py-6", className)}>{children}</section>
}

function WeddingButton({
  children,
  href,
}: {
  children: React.ReactNode
  href?: string
}) {
  const className =
    "inline-flex items-center justify-center rounded bg-wedding-soft px-4 py-1.5 font-elegant text-[16px] text-wedding-ink"
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={className}>
      {children}
    </button>
  )
}

/** Decorative gold seal stamp (placeholder for the design's gold sticker). */
function SealStamp({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-16 items-center justify-center rounded-full border-2 border-wedding-gold bg-white font-script text-2xl text-wedding-gold",
        className
      )}
    >
      ❧
    </div>
  )
}

/** Circular event photo — renders the image when set, a placeholder otherwise. */
function CircularPhoto({ className, src, alt }: { className?: string; src?: string; alt?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className={cn(
          "rounded-full object-cover ring-8 ring-white shadow-sm",
          className
        )}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-full bg-wedding-muted ring-8 ring-white shadow-sm",
        className
      )}
    />
  )
}

/** Rectangular image (map, hero of a section) with a muted placeholder fallback. */
function ImagePlaceholder({ className, src, alt }: { className?: string; src?: string; alt?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} className={cn("object-cover", className)} />
    )
  }
  return <div aria-hidden className={cn("bg-wedding-muted", className)} />
}

/** Resolves an "image" config field (media id) to its signed URL. */
function getConfigImage(
  data: BlockComponentProps["data"],
  block: BlockComponentProps["block"],
  key: string
): string | undefined {
  const id = getConfigString(block, key)
  return id ? data.mediaUrls?.[id] : undefined
}

function CheckRow({
  label,
  checked,
  onChange,
  type = "checkbox",
  name,
}: {
  label: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  type?: "checkbox" | "radio"
  name?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-elegant text-[16px] font-bold text-wedding-ink">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center border border-wedding-gold/60 bg-white transition-colors",
          type === "radio" ? "rounded-full" : "rounded-sm",
          checked && "bg-wedding-gold text-white"
        )}
      >
        <input
          type={type}
          name={name}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only"
        />
        {checked && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="size-4"
            aria-hidden
          >
            <path
              d="M3 8.5l3.2 3.2L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </label>
  )
}

function splitNames(name: string): [string, string | null] {
  const parts = name.split(/[&y]/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" & ")]
  return [name, null]
}

/**
 * The couple's display names. Prefers the explicit bride/groom fields when set,
 * otherwise falls back to splitting the event name (e.g. "Ava & Liam").
 */
function coupleNames(event: BlockComponentProps["data"]["event"]): [string, string | null] {
  const bride = event.brideName?.trim()
  const groom = event.groomName?.trim()
  if (bride && groom) return [bride, groom]
  if (bride || groom) return [(bride || groom) as string, null]
  return splitNames(event.name)
}

/** Builds a maps URL: the configured link, else a Google Maps search of the address. */
function mapHref(event: BlockComponentProps["data"]["event"], address: string): string {
  if (event.venueMapUrl?.trim()) return event.venueMapUrl.trim()
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function formatDate(date?: number): string {
  return date ? format(new Date(date), "dd/MM/yyyy") : ""
}

const pad = (n: number) => String(n).padStart(2, "0")

function useRemaining(date?: number) {
  const calc = () => {
    if (!date) return { days: 0, hours: 0, minutes: 0 }
    const diff = Math.max(0, date - Date.now())
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
    }
  }
  const [remaining, setRemaining] = useState(calc)
  useEffect(() => {
    if (!date) return
    const id = setInterval(() => setRemaining(calc()), 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])
  return remaining
}

// Default copy lives in ./default-copy (ELEGANT_COPY); blocks read their text
// from block.config first and fall back to it for layouts saved before the
// copy became authorable.

// Decorative assets exported from the Figma design (file heSJxDYKECFLtzVd9F1LyJ,
// frame 525:3) — gold line-art ornaments (PNG) and itinerary item icons (SVG),
// served from /public/templates/elegant.
const ASSET_BASE = "/templates/elegant"
/** One illustrated icon per itinerary item, in the design's order. */
const ITINERARY_ICONS = [
  `${ASSET_BASE}/itinerary-1.svg`,
  `${ASSET_BASE}/itinerary-2.svg`,
  `${ASSET_BASE}/itinerary-3.svg`,
  `${ASSET_BASE}/itinerary-4.svg`,
]

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function ElegantHero({ data, block }: BlockComponentProps) {
  const [first, second] = coupleNames(data.event)
  const intro = getConfigString(block, "body") ?? ELEGANT_COPY.heroIntro
  return (
    <ElegantSection className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="font-script text-[20px] text-wedding-ink">
        {formatDate(data.event.date)}
      </p>
      <div className="relative">
        <CircularPhoto
          className="size-[236px]"
          src={getConfigImage(data, block, "heroImage")}
          alt={data.event.name}
        />
        <SealStamp className="absolute -bottom-1 right-2" />
      </div>
      <h1 className="font-script text-[48px] leading-[1.05] text-wedding-gold">
        {second ? (
          <>
            {first}
            <br />
            <span className="px-1">&amp;</span> {second}
          </>
        ) : (
          data.event.name
        )}
      </h1>
      <p className="font-elegant text-[16px] leading-relaxed text-wedding-ink">
        {intro}
      </p>
    </ElegantSection>
  )
}

function ElegantLocation({ data, block }: BlockComponentProps) {
  const { venueName, venueAddress } = data.event
  const address =
    [venueName, venueAddress].filter(Boolean).join(", ") ||
    "Cra 123 # 123 - 123 Cali, Valle del Cauca"
  return (
    <ElegantSection className="flex flex-col items-center gap-4 pt-24 pb-6 text-center">
      <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
        Ubicación
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/location-flourish.png`}
        alt=""
        className="h-10 w-auto object-contain"
      />
      <ImagePlaceholder
        className="h-[200px] w-full rounded"
        src={getConfigImage(data, block, "mapImage")}
        alt="Mapa"
      />
      <p className="font-elegant text-[24px] leading-snug text-wedding-ink">
        {address}
      </p>
      <WeddingButton href={mapHref(data.event, address)}>Ver mapa</WeddingButton>
    </ElegantSection>
  )
}

function ElegantRsvp({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? ELEGANT_COPY.rsvpNote
  return (
    <ElegantSection className="flex flex-col items-center gap-2.5 px-10 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/rsvp-sprig.png`}
        alt=""
        className="h-16 w-auto object-contain"
      />
      <p className="font-elegant text-[20px] leading-relaxed text-wedding-ink">
        {note}
      </p>
    </ElegantSection>
  )
}

function ElegantCountdown({ data }: BlockComponentProps) {
  const { days, hours, minutes } = useRemaining(data.event.date)
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Faltan
      </h2>
      <div className="grid w-full max-w-[220px] grid-cols-3 gap-4 font-elegant text-[16px] font-bold text-wedding-ink">
        <span>Días</span>
        <span>Horas</span>
        <span>Min</span>
      </div>
      <p className="font-script text-[48px] leading-none text-wedding-ink tabular-nums">
        {pad(days)}:{pad(hours)}:{pad(minutes)}
      </p>
    </ElegantSection>
  )
}

function ElegantItinerary({ data, block }: BlockComponentProps) {
  const configItems = getConfigList(block, "items")
  const items = configItems
    ? configItems
        .filter((i): i is Record<string, string> => typeof i !== "string")
        .map((i) => ({ time: i.time ?? "", label: i.label ?? "" }))
        .filter((i) => i.time || i.label)
    : [...ELEGANT_COPY.itineraryItems]
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <div className="space-y-1">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          Itinerario
        </h2>
        <p className="font-script text-[20px] text-wedding-ink">
          {formatDate(data.event.date)}
        </p>
      </div>
      <ul className="space-y-6">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              aria-hidden
              src={ITINERARY_ICONS[i % ITINERARY_ICONS.length]}
              alt=""
              className="mb-1 h-20 w-auto object-contain"
            />
            <span className="font-elegant text-[16px] font-bold text-wedding-ink">
              {item.time}
            </span>
            <span className="font-elegant text-[16px] font-bold text-wedding-ink">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </ElegantSection>
  )
}

/** "text" block — e.g. the "Lluvia de sobres" gift section. */
function ElegantText({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline")
  const body = getConfigString(block, "body")
  return (
    <ElegantSection className="space-y-3 text-center">
      {headline && (
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
      )}
      {body && (
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {body}
        </p>
      )}
    </ElegantSection>
  )
}

/** "allergies" block — the design's "Comida" food/allergies section. */
function ElegantAllergies({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.foodHeadline
  const note = getConfigString(block, "note") ?? ELEGANT_COPY.foodNote
  const configOptions = getConfigList(block, "options")
  const options = configOptions
    ? configOptions.filter((o): o is string => typeof o === "string")
    : [...ELEGANT_COPY.foodOptions]
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [other, setOther] = useState("")
  return (
    <ElegantSection className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
          {headline}
        </h2>
        <p className="font-elegant text-[16px] font-bold text-wedding-ink">
          {note}
        </p>
      </div>
      <div className="space-y-3">
        {options.map((option) => (
          <CheckRow
            key={option}
            label={option}
            checked={selected.has(option)}
            onChange={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev)
                if (checked) next.add(option)
                else next.delete(option)
                return next
              })
            }
          />
        ))}
        <label className="flex items-center gap-2 font-elegant text-[16px] font-bold text-wedding-ink">
          Otro:
          <input
            type="text"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            className="flex-1 border-b border-wedding-muted bg-transparent outline-none"
          />
        </label>
      </div>
      <WeddingButton>Enviar</WeddingButton>
    </ElegantSection>
  )
}

function ElegantDressCode({ data, block }: BlockComponentProps) {
  const body = getConfigString(block, "dressCode") ?? ELEGANT_COPY.dressCode
  const note = getConfigString(block, "note")
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Dress code
      </h2>
      <div className="relative">
        <CircularPhoto
          className="size-[222px]"
          src={getConfigImage(data, block, "photo")}
          alt="Dress code"
        />
        <SealStamp className="absolute -bottom-1 right-1" />
      </div>
      <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
        {body}
      </p>
      {note && (
        <p className="font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {note}
        </p>
      )}
    </ElegantSection>
  )
}

/** "specialInvitation" block — the design's dinner invite. */
function ElegantSpecialInvitation({ block }: BlockComponentProps) {
  const description = getConfigString(block, "description") ?? ELEGANT_COPY.dinnerDescription
  const name = getConfigString(block, "name") ?? ELEGANT_COPY.dinnerName
  return (
    <ElegantSection className="relative px-16 py-40 text-center">
      {/* Floral border frame from the design — sits behind the content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/special-invite-frame.png`}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
      <div className="relative flex flex-col items-center gap-2.5">
        <p className="font-elegant text-[16px] font-bold leading-relaxed text-wedding-ink">
          {description}
        </p>
        <h2 className="font-script text-[48px] leading-tight text-wedding-ink">
          {name}
        </h2>
      </div>
    </ElegantSection>
  )
}

/** "stayInvite" block — accommodation invite with full-bleed image. */
function ElegantStayInvite({ data, block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? ELEGANT_COPY.stayHeadline
  const body = getConfigString(block, "body") ?? ELEGANT_COPY.stayBody
  const [stay, setStay] = useState<"yes" | "no" | null>(null)
  return (
    <section className="py-6">
      <ImagePlaceholder
        className="h-[200px] w-full"
        src={getConfigImage(data, block, "image")}
        alt={headline}
      />
      <div className="space-y-4 px-6 pt-5">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {body}
        </p>
        <div className="space-y-3">
          <CheckRow
            type="radio"
            name="stay"
            label="Sí, reservar mi alojamiento"
            checked={stay === "yes"}
            onChange={() => setStay("yes")}
          />
          <CheckRow
            type="radio"
            name="stay"
            label="No necesitaré alojamiento"
            checked={stay === "no"}
            onChange={() => setStay("no")}
          />
        </div>
        <WeddingButton>Enviar</WeddingButton>
      </div>
    </section>
  )
}

function ElegantFooter({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? ELEGANT_COPY.footerNote
  return (
    <ElegantSection className="flex flex-col items-center gap-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        aria-hidden
        src={`${ASSET_BASE}/footer-flourish.png`}
        alt=""
        className="h-12 w-auto object-contain"
      />
      <p className="font-elegant text-[24px] font-bold leading-relaxed text-wedding-gold">
        {note}
      </p>
    </ElegantSection>
  )
}

/** Block overrides for the elegant template. Types not listed fall back to DEFAULT_BLOCKS. */
export const ELEGANT_BLOCKS: Partial<Record<BlockType, BlockComponent>> = {
  hero: ElegantHero,
  location: ElegantLocation,
  rsvp: ElegantRsvp,
  countdown: ElegantCountdown,
  itinerary: ElegantItinerary,
  text: ElegantText,
  allergies: ElegantAllergies,
  dressCode: ElegantDressCode,
  specialInvitation: ElegantSpecialInvitation,
  stayInvite: ElegantStayInvite,
  footer: ElegantFooter,
}
