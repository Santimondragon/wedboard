"use client";

import { useEffect } from "react";
import { StateBlock } from "@/components/app/state-block";

/**
 * Root error boundary. Catches anything not handled by a nested boundary and
 * offers a retry rather than leaving the user on a blank page.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <StateBlock
        kind="error"
        title="Something went wrong"
        description="We hit an unexpected error loading this page. Try again, and if it keeps happening, refresh."
        retry={reset}
      />
    </main>
  );
}
