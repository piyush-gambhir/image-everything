"use client"

import * as React from "react"

import { imageApiPath } from "@/lib/api"
import {
  executeToolRequest,
  type BinaryToolResponse,
  type ToolProblem,
  ToolRequestError,
  type ToolRequestInput,
  type ToolResponse,
} from "@/lib/tools/request"
import type { SerializableValue, ToolResultKind } from "@/lib/tools/types"

export type ImageOperationResult = BinaryToolResponse & { url: string }

export type ImageOperationError = ToolProblem

export type ToolOperationResult = {
  primary: ToolResponseWithUrl
  auxiliary?: ToolResponseWithUrl
  revision: number
}

export type ToolResponseWithUrl =
  | (BinaryToolResponse & { url: string })
  | Extract<ToolResponse, { kind: "json" }>

type OperationStatus = "idle" | "running" | "success" | "error"

export function useToolOperation({
  endpoint,
  resultKind,
  revision,
  auxiliary,
}: {
  endpoint: string
  resultKind: ToolResultKind
  revision: number
  auxiliary?: { endpoint: string; kind: ToolResultKind }
}) {
  const [status, setStatus] = React.useState<OperationStatus>("idle")
  const [result, setResult] = React.useState<ToolOperationResult | null>(null)
  const [error, setError] = React.useState<ToolProblem | null>(null)
  const activeRef = React.useRef<
    { id: number; controller: AbortController } | undefined
  >(undefined)
  const requestIdRef = React.useRef(0)
  const urlsRef = React.useRef(new Set<string>())

  const revokeUrls = React.useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
    urlsRef.current.clear()
  }, [])

  const cancel = React.useCallback(() => {
    activeRef.current?.controller.abort()
    activeRef.current = undefined
    setStatus((current) => (current === "running" ? "idle" : current))
  }, [])

  const reset = React.useCallback(() => {
    cancel()
    requestIdRef.current += 1
    revokeUrls()
    setResult(null)
    setError(null)
    setStatus("idle")
  }, [cancel, revokeUrls])

  React.useEffect(() => {
    const urls = urlsRef.current
    return () => {
      activeRef.current?.controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  const run = React.useCallback(
    async (
      input: ToolRequestInput,
      options?: Record<string, SerializableValue>
    ): Promise<ToolOperationResult | undefined> => {
      cancel()
      const id = ++requestIdRef.current
      const controller = new AbortController()
      activeRef.current = { id, controller }
      setStatus("running")
      setError(null)

      try {
        const primary = await executeToolRequest({
          endpoint,
          input,
          options,
          resultKind,
          signal: controller.signal,
        })
        const auxiliaryResponse = auxiliary
          ? await executeToolRequest({
              endpoint: auxiliary.endpoint,
              input,
              options,
              resultKind: auxiliary.kind,
              signal: controller.signal,
            })
          : undefined

        if (controller.signal.aborted || requestIdRef.current !== id) return

        revokeUrls()
        const next: ToolOperationResult = {
          primary: withObjectUrl(primary, urlsRef.current),
          auxiliary: auxiliaryResponse
            ? withObjectUrl(auxiliaryResponse, urlsRef.current)
            : undefined,
          revision,
        }
        setResult(next)
        setStatus("success")
        activeRef.current = undefined
        return next
      } catch (cause) {
        if (controller.signal.aborted || requestIdRef.current !== id) return
        const problem = toProblem(cause)
        setError(problem)
        setStatus("error")
        activeRef.current = undefined
        return undefined
      }
    },
    [auxiliary, cancel, endpoint, resultKind, revision, revokeUrls]
  )

  return {
    run,
    reset,
    cancel,
    status,
    isLoading: status === "running",
    result,
    error,
    isStale: result !== null && result.revision !== revision,
  }
}

/**
 * Compatibility wrapper for the v1 clients. New pages use useToolOperation.
 */
export function useImageOperation(operation: string) {
  const endpoint = operation.startsWith("/")
    ? operation
    : imageApiPath(operation)
  const operationState = useToolOperation({
    endpoint,
    resultKind: "image",
    revision: 0,
  })

  const run = React.useCallback(
    async (
      file: File,
      options?: unknown,
      extras?: Record<string, File | undefined>
    ) => {
      const result = await operationState.run(
        extras?.overlay
          ? { kind: "overlay", file, overlay: extras.overlay }
          : { kind: "single", file },
        options as Record<string, SerializableValue> | undefined
      )
      return result?.primary.kind === "image" || result?.primary.kind === "zip"
        ? result.primary
        : undefined
    },
    [operationState]
  )

  return {
    run,
    reset: operationState.reset,
    isLoading: operationState.isLoading,
    result:
      operationState.result?.primary.kind === "image" ||
      operationState.result?.primary.kind === "zip"
        ? operationState.result.primary
        : null,
    error: operationState.error,
  }
}

function withObjectUrl(
  response: ToolResponse,
  urls: Set<string>
): ToolResponseWithUrl {
  if (response.kind === "json") return response
  const url = URL.createObjectURL(response.blob)
  urls.add(url)
  return { ...response, url }
}

function toProblem(cause: unknown): ToolProblem {
  if (cause instanceof ToolRequestError) return cause.problem
  return {
    code: "NETWORK_ERROR",
    title: "Unable to reach the image server",
    detail:
      cause instanceof Error
        ? cause.message
        : "The image request could not be completed.",
    retryable: true,
  }
}
