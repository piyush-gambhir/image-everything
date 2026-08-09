"use client"

import { Download, Layers, Sparkles, Workflow } from "lucide-react"
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
import { Input } from "@/components/ui/input"
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

type FitMode = "cover" | "contain" | "fill" | "inside" | "outside"
type TargetFormat = "jpeg" | "png" | "webp" | "avif" | "gif"

type Preset = {
  label: string
  hint: string
  resize?: { width: number; fit: FitMode }
  format?: TargetFormat
  quality?: number
  enhance?: { normalize?: boolean; sharpen?: boolean }
}

const PRESETS: Preset[] = [
  {
    label: "Instagram Square",
    hint: "1080×1080 JPEG q90",
    resize: { width: 1080, fit: "cover" },
    format: "jpeg",
    quality: 90,
  },
  {
    label: "Web Hero",
    hint: "1920w WebP q80",
    resize: { width: 1920, fit: "inside" },
    format: "webp",
    quality: 80,
  },
  {
    label: "Avatar",
    hint: "256×256 WebP q85",
    resize: { width: 256, fit: "cover" },
    format: "webp",
    quality: 85,
  },
  {
    label: "Email-friendly",
    hint: "800w JPEG q75",
    resize: { width: 800, fit: "inside" },
    format: "jpeg",
    quality: 75,
  },
  {
    label: "AVIF max-compress",
    hint: "1600w AVIF q55",
    resize: { width: 1600, fit: "inside" },
    format: "avif",
    quality: 55,
    enhance: { normalize: false, sharpen: true },
  },
]

type Op =
  | {
      op: "resize"
      options: {
        width?: number
        height?: number
        fit: FitMode
        withoutEnlargement?: boolean
      }
    }
  | { op: "autoEnhance"; options: { normalize: boolean; sharpen?: boolean } }
  | {
      op: "convert"
      options: { targetFormat: TargetFormat; quality?: number }
    }
  | {
      op: "compress"
      options: {
        format: "auto" | TargetFormat
        quality: number
        mozjpeg?: boolean
      }
    }

export function TransformClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("transform")

  const [resizeOn, setResizeOn] = React.useState(true)
  const [width, setWidth] = React.useState("1600")
  const [fit, setFit] = React.useState<FitMode>("inside")

  const [enhanceOn, setEnhanceOn] = React.useState(false)
  const [normalize, setNormalize] = React.useState(true)
  const [sharpen, setSharpen] = React.useState(false)

  const [convertOn, setConvertOn] = React.useState(false)
  const [target, setTarget] = React.useState<TargetFormat>("webp")

  const [compressOn, setCompressOn] = React.useState(true)
  const [quality, setQuality] = React.useState(80)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const applyPreset = (preset: Preset) => {
    setResizeOn(preset.resize !== undefined)
    if (preset.resize) {
      setWidth(String(preset.resize.width))
      setFit(preset.resize.fit)
    }
    setEnhanceOn(!!preset.enhance)
    if (preset.enhance) {
      setNormalize(preset.enhance.normalize ?? true)
      setSharpen(preset.enhance.sharpen ?? false)
    }
    setConvertOn(!!preset.format)
    if (preset.format) setTarget(preset.format)
    setCompressOn(true)
    setQuality(preset.quality ?? 80)
    toast.success(`Loaded preset: ${preset.label}`)
  }

  const ops = React.useMemo<Op[]>(() => {
    const out: Op[] = []
    if (resizeOn && Number(width) > 0) {
      out.push({
        op: "resize",
        options: {
          width: Number(width),
          fit,
          withoutEnlargement: true,
        },
      })
    }
    if (enhanceOn) {
      out.push({
        op: "autoEnhance",
        options: { normalize, sharpen },
      })
    }
    if (convertOn) {
      out.push({
        op: "convert",
        options: { targetFormat: target, quality },
      })
    }
    if (compressOn) {
      out.push({
        op: "compress",
        options: {
          format: convertOn ? target : "auto",
          quality,
          mozjpeg: true,
        },
      })
    }
    return out
  }, [
    resizeOn,
    width,
    fit,
    enhanceOn,
    normalize,
    sharpen,
    convertOn,
    target,
    compressOn,
    quality,
  ])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    if (ops.length === 0) {
      toast.error("Enable at least one operation")
      return
    }
    try {
      await op.run(upload.file, { ops })
      toast.success("Pipeline applied")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pipeline failed")
    }
  }, [upload.file, ops, op])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  const inputSize = upload.file?.size ?? null
  const outputSize = op.result?.size ?? null
  const savedPct =
    inputSize && outputSize
      ? Math.round(((inputSize - outputSize) / inputSize) * 100)
      : null

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Layers className="size-5" />}
        title="Pipeline"
        description="Chain multiple ops into a single sharp pipeline. One decode, one encode."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Quick presets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-auto flex-col items-start py-2"
                onClick={() => applyPreset(preset)}
              >
                <span className="font-medium">{preset.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {preset.hint}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
        {ops.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pipeline ({ops.length} {ops.length === 1 ? "step" : "steps"})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ops.map((step, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <Workflow className="size-3" />
                  {step.op}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
        {op.result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Format" value={op.result.format ?? "—"} />
                <Stat
                  label="Dimensions"
                  value={
                    op.result.width && op.result.height
                      ? `${op.result.width}×${op.result.height}`
                      : "—"
                  }
                />
                <Stat
                  label="Size"
                  value={`${formatBytes(outputSize ?? 0)} ${
                    savedPct !== null
                      ? `(${savedPct >= 0 ? "−" : "+"}${Math.abs(savedPct)}%)`
                      : ""
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <SectionCard title="Resize" enabled={resizeOn} onToggle={setResizeOn}>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium" htmlFor="tx-w">
              Width (px)
            </Label>
            <Input
              id="tx-w"
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium" htmlFor="tx-fit">
              Fit
            </Label>
            <Select value={fit} onValueChange={(v) => setFit(v as FitMode)}>
              <SelectTrigger id="tx-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
                <SelectItem value="inside">Inside</SelectItem>
                <SelectItem value="outside">Outside</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>
        <SectionCard
          title="Enhance"
          icon={<Sparkles className="size-3" />}
          enabled={enhanceOn}
          onToggle={setEnhanceOn}
        >
          <ToggleRow
            label="Normalize"
            checked={normalize}
            onChange={setNormalize}
          />
          <ToggleRow label="Sharpen" checked={sharpen} onChange={setSharpen} />
        </SectionCard>
        <SectionCard
          title="Convert"
          enabled={convertOn}
          onToggle={setConvertOn}
        >
          <Select
            value={target}
            onValueChange={(v) => setTarget(v as TargetFormat)}
          >
            <SelectTrigger>
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
        </SectionCard>
        <SectionCard
          title="Compress"
          enabled={compressOn}
          onToggle={setCompressOn}
        >
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
        </SectionCard>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading || ops.length === 0}
          className="w-full"
        >
          {op.isLoading
            ? "Running…"
            : `Run pipeline${ops.length ? ` (${ops.length})` : ""}`}
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

function SectionCard({
  title,
  icon,
  enabled,
  onToggle,
  children,
}: {
  title: string
  icon?: React.ReactNode
  enabled: boolean
  onToggle: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {icon}
          {title}
        </CardTitle>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </CardHeader>
      {enabled && (
        <CardContent className="flex flex-col gap-3">{children}</CardContent>
      )}
    </Card>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
