"use client";

import { useEffect } from "react";
import { StateBlock } from "@/components/app/state-block";

/**
 * Error boundary for the dashboard route group. Renders inside the shell, so
 * the sidebar and header stay usable while the page content recovers.
 */
export default function DashboardError({
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
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <StateBlock
        kind="error"
        title="This page didn't load"
        description="Something went wrong fetching your event data. Try again — your changes are safe."
        retry={reset}
      />
    </div>
  );
}
