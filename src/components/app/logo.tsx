import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "text-xl font-semibold tracking-tight text-zinc-900",
        className
      )}
    >
      Wedboard
    </span>
  );
}
