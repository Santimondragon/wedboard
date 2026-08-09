"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

/**
 * Server-authored message for a failed mutation, when there is one.
 *
 * Convex functions signal expected failures with `ConvexError`, whose payload
 * lands on `err.data`. Anything else (network blips, bugs) has no message worth
 * showing a user, so the caller's generic copy is used instead.
 */
function serverMessage(err: unknown): string | undefined {
  if (!(err instanceof ConvexError)) return undefined;
  const data: unknown = err.data;
  if (typeof data === "string" && data.trim()) return data;
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string" &&
    (data as { message: string }).message.trim()
  ) {
    return (data as { message: string }).message;
  }
  return undefined;
}

interface ToastMutationOptions {
  /** Success toast text. Omit to skip the success toast (e.g. silent saves). */
  success?: string;
  /** Error toast text. */
  error: string;
}

type ToastMutationResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Wraps a Convex mutation with the app-wide convention: try/catch with a
 * sonner toast on each side, plus a pending flag. `run` never throws — it
 * toasts the error and returns `{ ok: false }` so callers can branch.
 */
export function useToastMutation<M extends FunctionReference<"mutation">>(
  mutationRef: M,
  options: ToastMutationOptions,
) {
  const mutate = useMutation(mutationRef);
  const [pending, setPending] = useState(false);
  const { success, error } = options;

  const run = useCallback(
    async (
      args: M["_args"],
    ): Promise<ToastMutationResult<M["_returnType"]>> => {
      setPending(true);
      try {
        const value = await mutate(args);
        if (success) toast.success(success);
        return { ok: true, value };
      } catch (err) {
        toast.error(serverMessage(err) ?? error);
        return { ok: false };
      } finally {
        setPending(false);
      }
    },
    [mutate, success, error],
  );

  return { run, pending };
}
