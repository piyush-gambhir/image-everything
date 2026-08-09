"use client"

import { Download, Replace } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { BeforeAfterSlider } from "@/components/before-after-slider"
import {
  ImageDropZone,
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
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"
import { apiFetch, imageApiPath } from "@/lib/api"
import type { ImageMetadata } from "@/lib/images/types"

type TargetFormat = "jpeg" | "png" | "webp" | "avif" | "gif"

type ConvertOptions = {
  targetFormat: TargetFormat
  quality?: number
  background?: string
}

const FORMAT_HAS_QUALITY: Record<TargetFormat, boolean> = {
  jpeg: true,
  webp: true,
  avif: true,
  png: false,
  gif: false,
}

async function fetchMetadata(file: File): Promise<ImageMetadata> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await apiFetch(imageApiPath("metadata"), {
    method: "POST",
    body: fd,
  })
  if (!res.ok) throw new Error("Failed to read source format")
  return (await res.json()) as ImageMetadata
}

export function ConvertClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("convert")
  const [target, setTarget] = React.useState<TargetFormat>("webp")
  const [quality, setQuality] = React.useState(85)
  const [background, setBackground] = React.useState("#ffffff")
  const [meta, setMeta] = React.useState<ImageMetadata | null>(null)

  React.useEffect(() => {
    if (!upload.file) {
      op.reset()
      setMeta(null)
      return
    }
    let cancelled = false
    fetchMetadata(upload.file)
      .then((md) => {
        if (!cancelled) setMeta(md)
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const showQuality = FORMAT_HAS_QUALITY[target]
  const showBackground = target === "jpeg" && (meta?.hasAlpha ?? false)

  const run = React.useCallback(async () => {
    if (!upload.file) return
    const options: ConvertOptions = {
      targetFormat: target,
      ...(showQuality ? { quality } : {}),
      ...(showBackground ? { background } : {}),
    }
    try {
      await op.run(upload.file, options)
      toast.success("Converted")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Convert failed")
    }
  }, [
    upload.file,
    target,
    quality,
    background,
    showQuality,
    showBackground,
    op,
  ])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  const inputSize = upload.file?.size ?? null
  const outputSize = op.result?.size ?? null

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Replace className="size-5" />}
        title="Convert Format"
        description="Re-encode between JPEG, PNG, WebP, AVIF, and GIF. Alpha is flattened against a background color when targeting JPEG."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        {op.result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Stat
                  label="Source"
                  value={meta?.format ?? "—"}
                  trailing={
                    inputSize !== null ? formatBytes(inputSize) : undefined
                  }
                />
                <Stat
                  label="Output"
                  value={op.result.format ?? target}
                  trailing={
                    outputSize !== null ? formatBytes(outputSize) : undefined
                  }
                  highlight
                />
                <Stat
                  label="Dimensions"
                  value={
                    op.result.width && op.result.height
                      ? `${op.result.width}×${op.result.height}`
                      : "—"
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
        {op.result && upload.preview && (
          <BeforeAfterSlider before={upload.preview} after={op.result.url} />
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium" htmlFor="target">
                Target format
              </Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as TargetFormat)}
              >
                <SelectTrigger id="target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="avif">AVIF</SelectItem>
                  <SelectItem value="gif">GIF</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {showBackground && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium" htmlFor="bg">
                    Alpha background
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    JPEG has no alpha; transparent pixels become this color.
                  </p>
                </div>
                <input
                  id="bg"
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border"
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading}
          className="w-full"
        >
          {op.isLoading ? "Converting…" : "Convert"}
        </Button>
        {op.result && (
          <Button onClick={download} variant="outline" className="w-full">
            <Download />
            Download
          </Button>
        )}
      </WorkspaceAside>
    </ImageWorkspace>
  )
}

function Stat({
  label,
  value,
  trailing,
  highlight,
}: {
  label: string
  value: React.ReactNode
  trailing?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <Badge
          variant={highlight ? "default" : "secondary"}
          className="text-[10px] uppercase"
        >
          {value}
        </Badge>
        {trailing && (
          <span className="text-xs text-muted-foreground">{trailing}</span>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
