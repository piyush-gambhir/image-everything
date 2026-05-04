"use client"

import * as React from "react"

import { ACCEPTED_INPUT_MIMES } from "@/lib/images/types"

export type UseImageUploadOptions = {
  maxSizeMB?: number
  onError?: (message: string) => void
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { maxSizeMB = 25, onError } = options
  const maxBytes = maxSizeMB * 1024 * 1024

  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isOver, setIsOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const previewUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const setFromFile = React.useCallback(
    (next: File | null) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      if (!next) {
        setFile(null)
        setPreview(null)
        return
      }
      if (!ACCEPTED_INPUT_MIMES.includes(next.type)) {
        onError?.(`Unsupported file type: ${next.type || "unknown"}`)
        return
      }
      if (next.size > maxBytes) {
        onError?.(`File too large — max ${maxSizeMB} MB`)
        return
      }
      const url = URL.createObjectURL(next)
      previewUrlRef.current = url
      setFile(next)
      setPreview(url)
    },
    [maxBytes, maxSizeMB, onError]
  )

  const open = React.useCallback(() => inputRef.current?.click(), [])

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsOver(false)
      const dropped = event.dataTransfer.files?.[0]
      if (dropped) setFromFile(dropped)
    },
    [setFromFile]
  )

  const onDragOver = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsOver(true)
    },
    []
  )

  const onDragLeave = React.useCallback(() => setIsOver(false), [])

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = event.target.files?.[0]
      if (picked) setFromFile(picked)
      event.target.value = ""
    },
    [setFromFile]
  )

  const reset = React.useCallback(() => setFromFile(null), [setFromFile])

  return {
    file,
    preview,
    isOver,
    inputRef,
    open,
    reset,
    rootProps: { onDrop, onDragOver, onDragLeave },
    inputProps: {
      type: "file" as const,
      accept: ACCEPTED_INPUT_MIMES.join(","),
      onChange,
    },
  }
}

export type ImageUpload = ReturnType<typeof useImageUpload>
