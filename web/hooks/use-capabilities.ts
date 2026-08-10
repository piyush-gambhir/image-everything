"use client"

import {
  OUTPUT_FORMATS,
  WorkerCapabilitiesSchema,
  type ToolId,
  type WorkerCapabilities,
} from "@image-everything/contracts"
import * as React from "react"

import { apiFetch } from "@/lib/api"

type CapabilityState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: WorkerCapabilities; error: null }
  | { status: "error"; data: null; error: string }

export function useCapabilities(): CapabilityState {
  const [state, setState] = React.useState<CapabilityState>({
    status: "loading",
    data: null,
    error: null,
  })

  React.useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await apiFetch("/api/v2/capabilities", {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Capability discovery failed (${response.status})`)
        }
        const parsed = WorkerCapabilitiesSchema.safeParse(await response.json())
        if (!parsed.success) {
          throw new Error("The server returned an invalid capability document.")
        }
        if (!controller.signal.aborted) {
          setState({ status: "ready", data: parsed.data, error: null })
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: "error",
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Capability discovery failed.",
        })
      }
    })()
    return () => controller.abort()
  }, [])

  return state
}

export function unavailableOutputFormats(
  capabilities: WorkerCapabilities | null
): ReadonlySet<string> {
  if (!capabilities) return new Set()
  const available = new Set(capabilities.formats.encode)
  return new Set(OUTPUT_FORMATS.filter((format) => !available.has(format)))
}

export function getToolCapability(
  capabilities: WorkerCapabilities | null,
  toolId: ToolId
): { available: boolean; reason?: string } | null {
  return (
    capabilities?.operations.find((operation) => operation.id === toolId) ??
    null
  )
}
