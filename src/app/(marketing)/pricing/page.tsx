import Link from "next/link";
import { Logo } from "@/components/app";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Pricing — Wedboard",
  description: "Wedboard pricing is not published yet.",
};

/**
 * Deliberately a placeholder. Monetization (EP-16) is still `proposed`, so
 * there are no tiers or prices to state — inventing them here would be a lie
 * in the product's own voice.
 */
export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Link
        href="/"
        className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Logo />
      </Link>

      <h1 className="text-display mt-10 text-balance text-foreground">
        Pricing coming soon
      </h1>
      <p className="text-body mt-4 max-w-md text-pretty text-muted-foreground">
        We are still working out how Wedboard is priced. Until then, everything
        in the app is available to try.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
