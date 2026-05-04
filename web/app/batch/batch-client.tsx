"use client"

import { Download, ImageIcon, Package, Upload, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  ImageWorkspace,
  WorkspaceAside,
  WorkspaceHeader,
  WorkspaceMain,
} from "@/components/image-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { apiFetch } from "@/lib/api"
import { ACCEPTED_INPUT_MIMES } from "@/lib/images/types"
import { cn } from "@/lib/utils"

const MAX_FILES = 20
const MAX_SIZE = 25 * 1024 * 1024

type OpKind = "compress" | "resize" | "convert" | "auto-enhance" | "clean"

type TargetFormat = "auto" | "jpeg" | "png" | "webp" | "avif"

export function BatchClient() {
  const [files, setFiles] = React.useState<File[]>([])
  const [isOver, setIsOver] = React.useState(false)
  const [opKind, setOpKind] = React.useState<OpKind>("compress")
  const [quality, setQuality] = React.useState(80)
  const [targetFormat, setTargetFormat] = React.useState<TargetFormat>("webp")
  const [resizeWidth, setResizeWidth] = React.useState(1600)
  const [isLoading, setIsLoading] = React.useState(false)
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [resultCount, setResultCount] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    }
  }, [])

  const addFiles = React.useCallback((incoming: FileList | File[]) => {
    const valid: File[] = []
    const errors: string[] = []
    for (const f of Array.from(incoming)) {
      if (!ACCEPTED_INPUT_MIMES.includes(f.type)) {
        errors.push(`${f.name}: unsupported type`)
        continue
      }
      if (f.size > MAX_SIZE) {
        errors.push(`${f.name}: too large`)
        continue
      }
      valid.push(f)
    }
    setFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_FILES)
      if (prev.length + valid.length > MAX_FILES) {
        errors.push(`max ${MAX_FILES} files; extras dropped`)
      }
      return merged
    })
    for (const err of errors) toast.error(err)
  }, [])

  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsOver(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ""
  }

  const removeAt = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  const buildOps = React.useCallback(() => {
    switch (opKind) {
      case "compress":
        return [
          {
            op: "compress" as const,
            options: { format: targetFormat, quality, mozjpeg: true },
          },
        ]
      case "resize":
        return [
          {
            op: "resize" as const,
            options: {
              width: resizeWidth,
              fit: "inside",
              withoutEnlargement: true,
            },
          },
        ]
      case "convert":
        return [
          {
            op: "convert" as const,
            options: {
              targetFormat: targetFormat === "auto" ? "webp" : targetFormat,
              quality,
            },
          },
        ]
      case "auto-enhance":
        return [
          {
            op: "autoEnhance" as const,
            options: { normalize: true, sharpen: true },
          },
        ]
      case "clean":
        return [{ op: "clean" as const, options: {} }]
    }
  }, [opKind, quality, targetFormat, resizeWidth])

  const run = React.useCallback(async () => {
    if (files.length === 0) {
      toast.error("Add some files first")
      return
    }
    setIsLoading(true)
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setResultUrl(null)
    try {
      const fd = new FormData()
      for (const f of files) fd.append("files", f)
      fd.append("options", JSON.stringify({ ops: buildOps() }))
      const res = await apiFetch("/api/images/batch", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? "Batch failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      setResultUrl(url)
      setResultCount(Number(res.headers.get("X-Output-Files") ?? files.length))
      toast.success(`Processed ${files.length} files`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Batch failed")
    } finally {
      setIsLoading(false)
    }
  }, [files, buildOps])

  const download = () => {
    if (!resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    a.download = "batch.zip"
    a.click()
  }

  const showFormat = opKind === "compress" || opKind === "convert"
  const showQuality = opKind === "compress" || opKind === "convert"
  const showWidth = opKind === "resize"

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Package className="size-5" />}
        title="Batch"
        description={`Drop up to ${MAX_FILES} images, pick an operation, get a zip back. Max ${MAX_SIZE / 1024 / 1024} MB per file.`}
      />
      <WorkspaceMain>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsOver(true)
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={cn(
            "group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-card transition-colors hover:border-foreground/30 hover:bg-muted/40",
            isOver && "border-foreground/40 bg-muted/60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_INPUT_MIMES.join(",")}
            multiple
            className="sr-only"
            onChange={onChange}
          />
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isOver ? (
              <Upload className="size-5" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </div>
          <p className="text-sm font-medium">
            {isOver ? "Drop to add" : "Drop images here or click to add"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {files.length}/{MAX_FILES} files · {formatBytes(totalSize)}
          </p>
        </div>
        {files.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Files ({files.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                Clear
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-3 rounded bg-muted/30 px-2 py-1.5 text-xs"
                >
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatBytes(f.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => removeAt(i)}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {resultUrl && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="text-xs tracking-wide text-muted-foreground uppercase">
                  Done
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-lg font-semibold">{resultCount}</div>
                  <div className="text-xs text-muted-foreground">
                    files in batch.zip
                  </div>
                </div>
              </div>
              <Button onClick={download} size="sm" variant="outline">
                <Download />
                Download zip
              </Button>
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Operation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Select
              value={opKind}
              onValueChange={(v) => setOpKind(v as OpKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compress">Compress</SelectItem>
                <SelectItem value="resize">Resize</SelectItem>
                <SelectItem value="convert">Convert</SelectItem>
                <SelectItem value="auto-enhance">Auto-Enhance</SelectItem>
                <SelectItem value="clean">Clean metadata</SelectItem>
              </SelectContent>
            </Select>
            {showFormat && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">Format</Label>
                <Select
                  value={targetFormat}
                  onValueChange={(v) => setTargetFormat(v as TargetFormat)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opKind === "compress" && (
                      <SelectItem value="auto">Auto (keep source)</SelectItem>
                    )}
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                    <SelectItem value="avif">AVIF</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {showQuality && (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label className="text-xs font-medium">Quality</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {quality}
                  </span>
                </div>
                <Slider
                  value={[quality]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(v) => setQuality(v[0])}
                />
              </div>
            )}
            {showWidth && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium">Max width (px)</Label>
                <input
                  type="number"
                  min={1}
                  className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums"
                  value={resizeWidth}
                  onChange={(e) =>
                    setResizeWidth(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={files.length === 0 || isLoading}
          className="w-full"
        >
          {isLoading
            ? "Processing…"
            : `Process ${files.length} file${files.length === 1 ? "" : "s"}`}
        </Button>
        {files.length > 0 && (
          <Badge variant="secondary" className="mx-auto">
            Total: {formatBytes(totalSize)}
          </Badge>
        )}
      </WorkspaceAside>
    </ImageWorkspace>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
