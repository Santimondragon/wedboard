"use client"

import { useCallback, useState } from "react"
import { useMutation } from "convex/react"
import { FunctionReference } from "convex/server"
import { toast } from "sonner"

interface ToastMutationOptions {
  /** Success toast text. Omit to skip the success toast (e.g. silent saves). */
  success?: string
  /** Error toast text. */
  error: string
}

type ToastMutationResult<T> = { ok: true; value: T } | { ok: false }

/**
 * Wraps a Convex mutation with the app-wide convention: try/catch with a
 * sonner toast on each side, plus a pending flag. `run` never throws — it
 * toasts the error and returns `{ ok: false }` so callers can branch.
 */
export function useToastMutation<M extends FunctionReference<"mutation">>(
  mutationRef: M,
  options: ToastMutationOptions,
) {
  const mutate = useMutation(mutationRef)
  const [pending, setPending] = useState(false)
  const { success, error } = options

  const run = useCallback(
    async (
      args: M["_args"],
    ): Promise<ToastMutationResult<M["_returnType"]>> => {
      setPending(true)
      try {
        const value = await mutate(args)
        if (success) toast.success(success)
        return { ok: true, value }
      } catch {
        toast.error(error)
        return { ok: false }
      } finally {
        setPending(false)
      }
    },
    [mutate, success, error],
  )

  return { run, pending }
}
