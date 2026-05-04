"use client"

import { ImageIcon, Upload, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ImageUpload } from "@/hooks/use-image-upload"

type Props = {
  upload: ImageUpload
  className?: string
}

export function ImageDropZone({ upload, className }: Props) {
  const {
    file,
    preview,
    isOver,
    inputRef,
    inputProps,
    rootProps,
    open,
    reset,
  } = upload

  return (
    <div
      {...rootProps}
      onClick={(e) => {
        if (file) return
        if ((e.target as HTMLElement).tagName === "BUTTON") return
        open()
      }}
      role={file ? undefined : "button"}
      tabIndex={file ? undefined : 0}
      onKeyDown={(e) => {
        if (file) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          open()
        }
      }}
      className={cn(
        "group relative flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-card transition-colors",
        file
          ? "cursor-default"
          : "cursor-pointer hover:border-foreground/30 hover:bg-muted/40 focus-visible:border-foreground/40 focus-visible:outline-none",
        isOver && "border-foreground/40 bg-muted/60",
        className
      )}
    >
      <input ref={inputRef} className="sr-only" {...inputProps} />
      {file && preview ? (
        <>
          <img
            src={preview}
            alt={file.name}
            className="max-h-[260px] max-w-full rounded-md object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-lg border-t bg-background/80 px-3 py-2 backdrop-blur">
            <div className="min-w-0 truncate text-xs">
              <span className="font-medium">{file.name}</span>
              <span className="ml-2 text-muted-foreground">
                {formatBytes(file.size)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="xs" onClick={open}>
                Replace
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remove image"
                onClick={reset}
              >
                <X />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isOver ? (
              <Upload className="size-5" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isOver ? "Drop to upload" : "Drop an image here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse. JPEG, PNG, WebP, AVIF, GIF, TIFF, HEIC. Up to
              25 MB.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
