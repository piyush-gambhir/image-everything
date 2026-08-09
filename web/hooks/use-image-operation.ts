"use client"

import * as React from "react"

import { apiFetch, imageApiPath } from "@/lib/api"

export type ImageOperationResult = {
  blob: Blob
  url: string
  filename: string
  size: number
  width?: number
  height?: number
  format?: string
}

export type ImageOperationError = {
  message: string
  status?: number
  issues?: { path: (string | number)[]; message: string }[]
}

export function useImageOperation(operation: string) {
  const endpoint = operation.startsWith("/")
    ? operation
    : imageApiPath(operation)
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<ImageOperationResult | null>(null)
  const [error, setError] = React.useState<ImageOperationError | null>(null)
  const urlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const reset = React.useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])

  const run = React.useCallback(
    async (
      file: File,
      options?: unknown,
      extras?: Record<string, File | undefined>
    ) => {
      setIsLoading(true)
      setError(null)
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      setResult(null)
      try {
        const formData = new FormData()
        formData.append("file", file)
        if (options !== undefined)
          formData.append("options", JSON.stringify(options))
        if (extras) {
          for (const [name, value] of Object.entries(extras)) {
            if (value) formData.append(name, value)
          }
        }
        const response = await apiFetch(endpoint, {
          method: "POST",
          body: formData,
        })
        if (!response.ok) {
          const errJson = await response.json().catch(() => null)
          const message =
            errJson?.error ?? `Request failed (${response.status})`
          const opError: ImageOperationError = {
            message,
            status: response.status,
            issues: errJson?.issues,
          }
          setError(opError)
          throw new Error(message)
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        const filename =
          parseContentDispositionFilename(
            response.headers.get("Content-Disposition")
          ) ?? "output"
        const width = numericHeader(response.headers, "X-Output-Width")
        const height = numericHeader(response.headers, "X-Output-Height")
        const size =
          numericHeader(response.headers, "X-Output-Size") ?? blob.size
        const format = response.headers.get("X-Output-Format") ?? undefined
        const out: ImageOperationResult = {
          blob,
          url,
          filename,
          size,
          width,
          height,
          format,
        }
        setResult(out)
        return out
      } finally {
        setIsLoading(false)
      }
    },
    [endpoint]
  )

  return { run, reset, isLoading, result, error }
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match) return decodeURIComponent(utf8Match[1])
  const plain = /filename="?([^"\n;]+)"?/i.exec(header)
  return plain ? plain[1] : null
}

function numericHeader(headers: Headers, name: string): number | undefined {
  const value = headers.get(name)
  if (!value) return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}
