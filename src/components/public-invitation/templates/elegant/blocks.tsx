"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getConfigString, type BlockType } from "../../blocks"
import type { BlockComponent, BlockComponentProps } from "../default-blocks"

// ---------------------------------------------------------------------------
// Primitives — shared by the elegant blocks. Each block applies its own padding
// via <ElegantSection> so there is no global spacing on the frame.
// ---------------------------------------------------------------------------

/** 30px horizontal padding matches the design (330px content in a 390px frame). */
function ElegantSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <section className={cn("px-[30px] py-6", className)}>{children}</section>
}

function WeddingButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded bg-wedding-soft px-4 py-1.5 font-elegant text-[16px] text-wedding-ink"
    >
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

/** Placeholder for an event photo (circular). Real photos are wired later. */
function CircularPhoto({ className }: { className?: string }) {
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

/** Placeholder for a rectangular image (map, hero of a section). */
function ImagePlaceholder({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-wedding-muted", className)} />
}

function CheckRow({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-3 font-elegant text-[16px] font-bold text-wedding-ink">
      <span aria-hidden className="size-6 shrink-0 bg-wedding-muted" />
      <span>{label}</span>
    </label>
  )
}

function splitNames(name: string): [string, string | null] {
  const parts = name.split(/[&y]/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" & ")]
  return [name, null]
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

// Default copy from the design (used when a block carries no config).
const HERO_INTRO =
  "Con mucha alegría en el corazón, queremos invitarte a acompañarnos en uno de los momentos más importantes de nuestras vidas. Será un día para celebrar el amor, la unión y el comienzo de una nueva historia que soñamos compartir con quienes más queremos."
const RSVP_NOTE =
  "Gracias por confirmar tu asistencia y por acompañarnos en este día tan especial para nosotros."
const FOOD_NOTE =
  "Por favor, indícanos si tienes alguna alergia o restricción alimentaria para tenerlo en cuenta:"
const FOOD_OPTIONS = [
  "Frutos secos",
  "Mariscos / pescados",
  "Lácteos",
  "Gluten",
  "Huevo",
  "Vegetariano / Vegano",
]
const DRESS_CODE =
  "Hombres: Smoking (traje y corbatín)\nMujeres: Vestido formal de un solo tono\n\nAgradecemos evitar el color vinotinto, el blanco y sus tonalidades afines, tanto en vestuario femenino como masculino."
const DINNER_DESC =
  "Porque los mejores momentos comienzan alrededor de una mesa, los esperamos para compartir una cena especial y comenzar juntos este fin de semana inolvidable."
const STAY_BODY =
  "Después de una noche inolvidable, queremos que puedas descansar y disfrutar con tranquilidad. Si deseas hospedarte en la hacienda, por favor confírmanos tu asistencia."
const FOOTER_NOTE =
  "Esperamos celebrar juntos este comienzo tan importante en nuestras vidas."
const ITINERARY_ITEMS = [
  { time: "00:00 pm", label: "Ceremonia" },
  { time: "00:00 pm", label: "Recepción" },
  { time: "00:00 pm", label: "Cocktail de bienvenida" },
  { time: "00:00 pm", label: "Fiesta" },
]

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function ElegantHero({ data, block }: BlockComponentProps) {
  const [first, second] = splitNames(data.event.name)
  const intro = getConfigString(block, "body") ?? HERO_INTRO
  return (
    <ElegantSection className="flex flex-col items-center gap-4 pt-10 text-center">
      <p className="font-script text-[20px] text-wedding-ink">
        {formatDate(data.event.date)}
      </p>
      <div className="relative">
        <CircularPhoto className="size-[236px]" />
        <SealStamp className="absolute -bottom-1 right-2" />
      </div>
      <h1 className="font-script text-[48px] leading-[1.15] text-wedding-gold">
        {second ? (
          <>
            {first} <span className="px-1">&amp;</span> {second}
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

function ElegantLocation({ data }: BlockComponentProps) {
  const { venueName, venueAddress } = data.event
  const address =
    [venueName, venueAddress].filter(Boolean).join(", ") ||
    "Cra 123 # 123 - 123 Cali, Valle del Cauca"
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
        Ubicación
      </h2>
      <ImagePlaceholder className="h-[200px] w-full rounded" />
      <p className="font-elegant text-[24px] leading-snug text-wedding-ink">
        {address}
      </p>
      <WeddingButton>Ver mapa</WeddingButton>
    </ElegantSection>
  )
}

function ElegantRsvp({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? RSVP_NOTE
  return (
    <ElegantSection className="text-center">
      <p className="font-elegant text-[20px] leading-relaxed text-wedding-ink">
        {note}
      </p>
    </ElegantSection>
  )
}

function ElegantCountdown({ data }: BlockComponentProps) {
  const { days, hours, minutes } = useRemaining(data.event.date)
  return (
    <ElegantSection className="flex flex-col items-center gap-3 text-center">
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

function ElegantItinerary({ data }: BlockComponentProps) {
  return (
    <ElegantSection className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-1">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          Itinerario
        </h2>
        <p className="font-script text-[20px] text-wedding-ink">
          {formatDate(data.event.date)}
        </p>
      </div>
      <ul className="space-y-6">
        {ITINERARY_ITEMS.map((item) => (
          <li key={item.label} className="flex flex-col items-center gap-1">
            <span
              aria-hidden
              className="mb-1 size-10 rounded-full border border-wedding-gold/40"
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
function ElegantAllergies() {
  return (
    <ElegantSection className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-elegant text-[24px] font-bold text-wedding-ink">
          Comida
        </h2>
        <p className="font-elegant text-[16px] font-bold text-wedding-ink">
          {FOOD_NOTE}
        </p>
      </div>
      <div className="space-y-3">
        {FOOD_OPTIONS.map((option) => (
          <CheckRow key={option} label={option} />
        ))}
        <label className="flex items-center gap-2 font-elegant text-[16px] font-bold text-wedding-ink">
          Otro:
          <input
            type="text"
            className="flex-1 border-b border-wedding-muted bg-transparent outline-none"
          />
        </label>
      </div>
      <WeddingButton>Enviar</WeddingButton>
    </ElegantSection>
  )
}

function ElegantDressCode({ block }: BlockComponentProps) {
  const body = getConfigString(block, "dressCode") ?? DRESS_CODE
  const note = getConfigString(block, "note")
  return (
    <ElegantSection className="flex flex-col items-center gap-4 text-center">
      <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
        Dress code
      </h2>
      <div className="relative">
        <CircularPhoto className="size-[222px]" />
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
  const description = getConfigString(block, "description") ?? DINNER_DESC
  const name = getConfigString(block, "name") ?? "Una Noche para Compartir"
  return (
    <ElegantSection className="flex flex-col items-center gap-4 py-10 text-center">
      <p className="font-elegant text-[16px] font-bold leading-relaxed text-wedding-ink">
        {description}
      </p>
      <h2 className="font-script text-[48px] leading-tight text-wedding-ink">
        {name}
      </h2>
    </ElegantSection>
  )
}

/** "stayInvite" block — accommodation invite with full-bleed image. */
function ElegantStayInvite({ block }: BlockComponentProps) {
  const headline = getConfigString(block, "headline") ?? "Continúa la celebración"
  const body = getConfigString(block, "body") ?? STAY_BODY
  return (
    <section className="py-6">
      <ImagePlaceholder className="h-[200px] w-full" />
      <div className="space-y-4 px-[30px] pt-5">
        <h2 className="font-script text-[48px] leading-tight text-wedding-gold">
          {headline}
        </h2>
        <p className="whitespace-pre-line font-elegant text-[16px] leading-relaxed text-wedding-ink">
          {body}
        </p>
        <div className="space-y-3">
          <CheckRow label="Sí, reservar mi alojamiento" />
          <CheckRow label="No necesitaré alojamiento" />
        </div>
        <WeddingButton>Enviar</WeddingButton>
      </div>
    </section>
  )
}

function ElegantFooter({ block }: BlockComponentProps) {
  const note = getConfigString(block, "body") ?? FOOTER_NOTE
  return (
    <ElegantSection className="py-8 text-center">
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
