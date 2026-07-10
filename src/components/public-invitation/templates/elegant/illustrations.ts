// Itinerary illustrations the author can pick per schedule item (elegant template).
//
// To add a new illustration:
//   1. Drop the SVG in `public/templates/elegant` (e.g. `itinerary-rings.svg`).
//   2. Add an entry to ITINERARY_ILLUSTRATIONS below ({ value, label, src }).
// It then appears automatically in the template editor's illustration picker
// (itinerary block) and renders on the public itinerary. `value` is what gets
// stored on each itinerary item's `illustration` config key, so keep it stable.

const ASSET_BASE = "/templates/elegant";

export interface ItineraryIllustration {
  /** Stable key stored on each itinerary item's `illustration` config field. */
  value: string;
  /** Shown in the editor's picker. */
  label: string;
  /** Public path to the SVG. */
  src: string;
}

export const ITINERARY_ILLUSTRATIONS: ItineraryIllustration[] = [
  {
    value: "church",
    label: "Church",
    src: `${ASSET_BASE}/itinerary-church.svg`,
  },
  { value: "cake", label: "Cake", src: `${ASSET_BASE}/itinerary-cake.svg` },
  {
    value: "camera",
    label: "Camera",
    src: `${ASSET_BASE}/itinerary-camera.svg`,
  },
  {
    value: "celebration",
    label: "Celebration",
    src: `${ASSET_BASE}/itinerary-celebration.svg`,
  },
  { value: "food", label: "Food", src: `${ASSET_BASE}/itinerary-food.svg` },
];

/** Cycled through for itinerary items that have no explicit illustration set. */
export const ITINERARY_ILLUSTRATION_FALLBACK = ITINERARY_ILLUSTRATIONS.map(
  (i) => i.src,
);

/** Resolves a stored illustration `value` to its SVG path (undefined if unknown). */
export function itineraryIllustrationSrc(value?: string): string | undefined {
  return value
    ? ITINERARY_ILLUSTRATIONS.find((i) => i.value === value)?.src
    : undefined;
}
