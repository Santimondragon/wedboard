"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getConfigString } from "../../../blocks"
import type { BlockComponentProps } from "../../default-blocks"

/**
 * 24px horizontal padding matches the design (342px content in a 390px frame).
 * Each block sets its own vertical padding + gap (the design has no global gap).
 */
export function ElegantSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <section className={cn("px-6 py-6", className)}>{children}</section>
}

export function WeddingButton({
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

export function SealStamp({ className }: { className?: string }) {
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

export function CircularPhoto({
  className,
  src,
  alt,
}: {
  className?: string
  src?: string
  alt?: string
}) {
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

export function SealedPhoto({
  className,
  src,
  alt,
}: {
  className?: string
  src?: string
  alt?: string
}) {
  const imageClassName = "object-cover w-full h-full";

  return (
    <div className="relative flex flex-col items-center w-full my-10">
      <img
        src={`${ASSET_BASE}/golden-seal.png`}
        alt={'golden-seal-decoration'}
        className="absolute object-cover w-24 h-24 left-1/2 top-0 -translate-1/2"
      />

      <div className="p-4 w-[80%] aspect-square shadow-md shadow-gray-300">
        {src ?
          <img
            src={src}
            alt={alt ?? ""}
            className={imageClassName}
          /> :
          <ImagePlaceholder className={imageClassName} />
        }
      </div>
    </div>
  )

}

export function ImagePlaceholder({
  className
}: {
  className?: string
}) {
  return (
    <img src='/templates/image-placeholder.jpg' alt='image-placeholder' className={cn("object-cover", className)} />
  )
}

export function getConfigImage(
  data: BlockComponentProps["data"],
  block: BlockComponentProps["block"],
  key: string
): string | undefined {
  const id = getConfigString(block, key)
  return id ? data.mediaUrls?.[id] : undefined
}

export function CheckRow({
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

export function coupleNames(
  event: BlockComponentProps["data"]["event"]
): [string, string | null] {
  const bride = event.brideName?.trim()
  const groom = event.groomName?.trim()
  if (bride && groom) return [bride, groom]
  if (bride || groom) return [(bride || groom) as string, null]
  return splitNames(event.name)
}

export function mapHref(
  event: BlockComponentProps["data"]["event"],
  address: string
): string {
  if (event.venueMapUrl?.trim()) return event.venueMapUrl.trim()
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function formatDate(date?: number): string {
  return date ? format(new Date(date), "dd/MM/yyyy") : ""
}

export const pad = (n: number) => String(n).padStart(2, "0")

export function useRemaining(date?: number) {
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

export const ASSET_BASE = "/templates/elegant"

export const ITINERARY_ICONS = [
  `${ASSET_BASE}/itinerary-1.svg`,
  `${ASSET_BASE}/itinerary-2.svg`,
  `${ASSET_BASE}/itinerary-3.svg`,
  `${ASSET_BASE}/itinerary-4.svg`,
]
