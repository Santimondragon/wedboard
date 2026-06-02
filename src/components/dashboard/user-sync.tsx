"use client"

import { useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "convex/_generated/api"

export function UserSync() {
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser)

  useEffect(() => {
    upsertCurrentUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
