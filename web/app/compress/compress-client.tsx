"use client"

import { Download, Minimize2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

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
import { Switch } from "@/components/ui/switch"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type CompressFormat = "auto" | "jpeg" | "png" | "webp" | "avif"

type CompressOptions = {
  format: CompressFormat
  quality: number
  lossless?: boolean
  mozjpeg?: boolean
}

export function CompressClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("/api/images/compress")
  const [format, setFormat] = React.useState<CompressFormat>("auto")
  const [quality, setQuality] = React.useState(80)
  const [lossless, setLossless] = React.useState(false)
  const [mozjpeg, setMozjpeg] = React.useState(true)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const showLossless =
    format === "webp" || format === "avif" || format === "png"
  const showMozjpeg = format === "jpeg" || format === "auto"

  const run = React.useCallback(async () => {
    if (!upload.file) return
    const options: CompressOptions = {
      format,
      quality,
      ...(showLossless ? { lossless } : {}),
      ...(showMozjpeg ? { mozjpeg } : {}),
    }
    try {
      await op.run(upload.file, options)
      toast.success("Compressed")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compress failed")
    }
  }, [
    upload.file,
    format,
    quality,
    lossless,
    mozjpeg,
    showLossless,
    showMozjpeg,
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
  const savedBytes =
    inputSize !== null && outputSize !== null ? inputSize - outputSize : null
  const savedPercent =
    inputSize && outputSize
      ? Math.round(((inputSize - outputSize) / inputSize) * 100)
      : null

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Minimize2 className="size-5" />}
        title="Compress"
        description="Quality-controlled re-encoding with MozJPEG, modern WebP, and AVIF. Shows the bytes saved."
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
                <Stat label="Before" value={formatBytes(inputSize ?? 0)} />
                <Stat
                  label="After"
                  value={formatBytes(outputSize ?? 0)}
                  format={op.result.format}
                />
                <SavingStat
                  saved={savedBytes ?? 0}
                  percent={savedPercent ?? 0}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium" htmlFor="format">
                Format
              </Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as CompressFormat)}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (keep source)</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="avif">AVIF</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {showMozjpeg && (
              <ToggleRow
                label="MozJPEG"
                hint="Better JPEG compression."
                checked={mozjpeg}
                onChange={setMozjpeg}
              />
            )}
            {showLossless && (
              <ToggleRow
                label="Lossless"
                hint="Preserve every pixel exactly."
                checked={lossless}
                onChange={setLossless}
              />
            )}
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading}
          className="w-full"
        >
          {op.isLoading ? "Compressing…" : "Compress"}
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

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function Stat({
  label,
  value,
  format,
}: {
  label: string
  value: React.ReactNode
  format?: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-xl font-semibold">{value}</div>
        {format && (
          <Badge variant="secondary" className="text-[10px] uppercase">
            {format}
          </Badge>
        )}
      </div>
    </div>
  )
}

function SavingStat({ saved, percent }: { saved: number; percent: number }) {
  const positive = saved > 0
  const negative = saved < 0
  return (
    <div>
      <div className="text-xs text-muted-foreground">Saved</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-xl font-semibold">
          {formatBytes(Math.abs(saved))}
        </div>
        <Badge
          variant={positive ? "default" : "secondary"}
          className="text-[10px] tabular-nums"
        >
          {negative ? "+" : "−"}
          {Math.abs(percent)}%
        </Badge>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
