import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

/**
 * The Wedboard wordmark. Pinned to the display face rather than inheriting
 * `font-sans`, so it can't drift when body type changes.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "font-heading text-xl leading-none font-semibold tracking-[-0.03em] text-foreground",
        className,
      )}
    >
      Wedboard
    </span>
  );
}
