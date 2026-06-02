"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/app/loading-state"

/** Client-side fallback redirect to the landing page for signed-out users. */
export function RedirectToHome() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingState message="Redirecting…" />
    </div>
  )
}
