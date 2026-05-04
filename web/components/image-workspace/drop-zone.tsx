"use client"

import { ImageIcon, RefreshCw, Upload, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import type { ImageUpload } from "@/hooks/use-image-upload"
import { cn } from "@/lib/utils"

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
        "group relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-card transition-all duration-200",
        file
          ? "cursor-default border-border/60"
          : "cursor-pointer hover:border-foreground/30 hover:bg-muted/30 focus-visible:border-foreground/40 focus-visible:outline-none",
        isOver && "scale-[1.005] border-foreground/50 bg-muted/50 shadow-md",
        className
      )}
    >
      {!file && (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-500/[0.04] via-blue-500/[0.04] to-emerald-500/[0.04] opacity-0 transition-opacity duration-300",
              isOver ? "opacity-100" : "group-hover:opacity-60"
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--muted)_1px,_transparent_1px)] bg-[length:18px_18px] opacity-30 transition-opacity",
              isOver && "opacity-50"
            )}
          />
        </>
      )}
      <input ref={inputRef} className="sr-only" {...inputProps} />
      {file && preview ? (
        <>
          <div className="flex w-full flex-1 items-center justify-center p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={file.name}
              className="max-h-[260px] max-w-full animate-in rounded-lg object-contain shadow-sm duration-300 zoom-in-95 fade-in"
            />
          </div>
          <div className="flex w-full items-center justify-between gap-2 border-t bg-background/85 px-4 py-2.5 backdrop-blur">
            <div className="min-w-0 flex-1 truncate text-xs">
              <span className="font-medium">{file.name}</span>
              <span className="ml-2 text-muted-foreground tabular-nums">
                {formatBytes(file.size)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="xs" onClick={open}>
                <RefreshCw />
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
        <div className="relative flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div
            className={cn(
              "relative flex size-14 items-center justify-center rounded-full bg-background ring-1 ring-border/60 transition-transform duration-200",
              isOver ? "scale-110" : "group-hover:scale-105"
            )}
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500/30 via-blue-500/30 to-emerald-500/30 opacity-0 blur-xl transition-opacity",
                isOver ? "opacity-100" : "group-hover:opacity-60"
              )}
            />
            <div className="relative">
              {isOver ? (
                <Upload className="size-6" />
              ) : (
                <ImageIcon className="size-6 text-foreground/70" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium">
              {isOver ? "Drop to upload" : "Drop an image here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse · up to 25 MB
            </p>
            <p className="text-[11px] tracking-wide text-muted-foreground/70 uppercase">
              JPEG · PNG · WebP · AVIF · GIF · TIFF · HEIC
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
