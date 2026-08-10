"use client"

import {
  ArrowDown,
  ArrowUp,
  FileImage,
  ImagePlus,
  Upload,
  X,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  MAX_AGGREGATE_BYTES,
  MAX_PRIMARY_BYTES,
  canPreviewInBrowser,
  formatBytes,
  validateFileCollection,
  validateImageFile,
} from "@/lib/files"
import { cn } from "@/lib/utils"

const ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/tiff",
  "image/heic",
  "image/heif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
].join(",")

export function ToolFileInput({
  files,
  onChange,
  label,
  multiple = false,
  minimumFiles = 1,
  maximumFiles = 1,
  maxBytes = MAX_PRIMARY_BYTES,
  onError,
}: {
  files: readonly File[]
  onChange: (files: File[]) => void
  label: string
  multiple?: boolean
  minimumFiles?: number
  maximumFiles?: number
  maxBytes?: number
  onError: (message: string | null) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isOver, setIsOver] = React.useState(false)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  const acceptFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      const picked = Array.from(incoming)
      if (!multiple) {
        const file = picked[0]
        if (!file) return
        const issue = validateImageFile(file, { maxBytes })
        if (issue) {
          onError(issue)
          return
        }
        onChange([file])
        onError(null)
        return
      }

      const next = [...files, ...picked]
      const issue = validateFileCollection(next, {
        maximumFiles,
        maxBytes,
        maxAggregateBytes: MAX_AGGREGATE_BYTES,
      })
      if (issue) {
        onError(issue)
        return
      }
      onChange(next)
      onError(null)
    },
    [files, maxBytes, maximumFiles, multiple, onChange, onError]
  )

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= files.length) return
    const next = [...files]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <section aria-label={label} className="space-y-3">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        aria-label={`Choose ${label.toLowerCase()}`}
        onChange={(event) => {
          if (event.target.files) acceptFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{label}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {multiple
              ? `${files.length}/${maximumFiles} files · ${formatBytes(totalSize)}`
              : `One still image · up to ${formatBytes(maxBytes)}`}
          </p>
        </div>
        {files.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange([])
              onError(null)
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {(!files.length || multiple) && files.length < maximumFiles && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setIsOver(true)
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsOver(false)
            acceptFiles(event.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            "grid min-h-36 cursor-pointer place-items-center rounded-xl border border-dashed bg-card px-5 py-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isOver ? "border-primary bg-brand-soft" : "hover:bg-muted/40"
          )}
        >
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
              {isOver ? (
                <Upload className="size-5" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </span>
            <p className="mt-3 text-sm font-medium">
              {isOver
                ? "Drop to add"
                : files.length
                  ? "Add more images"
                  : "Drop an image or browse"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              JPEG, PNG, WebP, AVIF, GIF, TIFF, HEIC, or HEIF
            </p>
          </div>
        </div>
      )}

      {!multiple && files[0] && (
        <SingleFileCard
          file={files[0]}
          onReplace={() => inputRef.current?.click()}
          onRemove={() => onChange([])}
        />
      )}

      {multiple && files.length > 0 && (
        <ol className="space-y-2" aria-label={`${label} files`}>
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2"
            >
              <FileImage className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {file.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${file.name} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${file.name} down`}
                disabled={index === files.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  onChange(files.filter((_, candidate) => candidate !== index))
                }
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}

      {multiple && files.length > 0 && files.length < minimumFiles && (
        <p className="text-xs text-warning">
          Add {minimumFiles - files.length} more image
          {minimumFiles - files.length === 1 ? "" : "s"} to continue.
        </p>
      )}
    </section>
  )
}

function SingleFileCard({
  file,
  onReplace,
  onRemove,
}: {
  file: File
  onReplace: () => void
  onRemove: () => void
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = React.useState(false)

  React.useEffect(() => {
    setPreviewFailed(false)
    if (!canPreviewInBrowser(file)) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid min-h-56 place-items-center bg-muted/30 p-4">
        {url && !previewFailed ? (
          // Blob URLs are local and cannot use the Next image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Preview of ${file.name}`}
            onError={() => setPreviewFailed(true)}
            className="max-h-72 max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="max-w-sm text-center">
            <FileImage className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Preview unavailable</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your browser cannot preview this codec, but the configured server
              can process it when runtime capabilities allow.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">
            {file.name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onReplace}>
          Replace
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${file.name}`}
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
