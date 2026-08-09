"use client";

import { StateBlock } from "@/components/app/state-block";

interface LoadingStateProps {
  message?: string;
}

/**
 * Thin compatibility wrapper over {@link StateBlock} with `kind="loading"`.
 * Kept because ~8 call sites import it; prefer `StateBlock` in new code.
 */
export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return <StateBlock kind="loading" title={message} />;
}
