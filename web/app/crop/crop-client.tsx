"use client"

import { Crop, Download } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  ImageDropZone,
  ImageWorkspace,
  WorkspaceAside,
  WorkspaceHeader,
  WorkspaceMain,
} from "@/components/image-workspace"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type CropOptions = {
  left: number
  top: number
  width: number
  height: number
}

const ASPECT_PRESETS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "3:2", ratio: 3 / 2 },
]

export function CropClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("crop")
  const [source, setSource] = React.useState<{ w: number; h: number } | null>(
    null
  )
  const [region, setRegion] = React.useState<CropOptions>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const [aspectIdx, setAspectIdx] = React.useState(0)
  const [dragging, setDragging] = React.useState<null | "start" | "move">(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragStartRef = React.useRef<{
    pointerX: number
    pointerY: number
    region: CropOptions
  } | null>(null)

  React.useEffect(() => {
    if (!upload.file) {
      op.reset()
      setSource(null)
      setRegion({ left: 0, top: 0, width: 0, height: 0 })
      return
    }
    const img = new window.Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setSource({ w, h })
      const sideW = Math.round(w * 0.6)
      const sideH = Math.round(h * 0.6)
      setRegion({
        left: Math.round((w - sideW) / 2),
        top: Math.round((h - sideH) / 2),
        width: sideW,
        height: sideH,
      })
    }
    if (upload.preview) img.src = upload.preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file, upload.preview])

  const aspect = ASPECT_PRESETS[aspectIdx].ratio

  const onChange = (key: keyof CropOptions, raw: string) => {
    const v = Math.max(0, Math.round(Number(raw) || 0))
    setRegion((prev) => {
      const next = { ...prev, [key]: v }
      if (aspect && (key === "width" || key === "height")) {
        if (key === "width") next.height = Math.round(v / aspect)
        else next.width = Math.round(v * aspect)
      }
      return clampRegion(next, source)
    })
  }

  const onPickAspect = (idx: number) => {
    setAspectIdx(idx)
    const ratio = ASPECT_PRESETS[idx].ratio
    if (!ratio || !source) return
    setRegion((prev) => {
      const w = prev.width || Math.round(source.w * 0.6)
      const h = Math.round(w / ratio)
      const next = { ...prev, width: w, height: h }
      return clampRegion(next, source)
    })
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!source || !containerRef.current) return
    event.preventDefault()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = source.w / rect.width
    const scaleY = source.h / rect.height
    const target = event.target as HTMLElement
    const isInside = target.dataset.role === "region"
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      region,
    }
    if (isInside) {
      setDragging("move")
    } else {
      const startX = (event.clientX - rect.left) * scaleX
      const startY = (event.clientY - rect.top) * scaleY
      setRegion({
        left: clamp(Math.round(startX), 0, source.w),
        top: clamp(Math.round(startY), 0, source.h),
        width: 1,
        height: 1,
      })
      dragStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        region: {
          left: Math.round(startX),
          top: Math.round(startY),
          width: 0,
          height: 0,
        },
      }
      setDragging("start")
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !source || !containerRef.current || !dragStartRef.current)
      return
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = source.w / rect.width
    const scaleY = source.h / rect.height
    const dx = (event.clientX - dragStartRef.current.pointerX) * scaleX
    const dy = (event.clientY - dragStartRef.current.pointerY) * scaleY
    if (dragging === "move") {
      const r = dragStartRef.current.region
      const next = clampRegion(
        {
          left: r.left + dx,
          top: r.top + dy,
          width: r.width,
          height: r.height,
        },
        source
      )
      setRegion(next)
    } else {
      const r = dragStartRef.current.region
      let w = Math.abs(dx)
      let h = Math.abs(dy)
      if (aspect) {
        if (w / aspect > h) h = w / aspect
        else w = h * aspect
      }
      const left = dx < 0 ? r.left - w : r.left
      const top = dy < 0 ? r.top - h : r.top
      const next = clampRegion({ left, top, width: w, height: h }, source)
      setRegion(next)
    }
  }

  const onPointerUp = () => {
    setDragging(null)
    dragStartRef.current = null
  }

  const run = React.useCallback(async () => {
    if (!upload.file) return
    if (region.width < 1 || region.height < 1) {
      toast.error("Crop region is empty")
      return
    }
    const options: CropOptions = {
      left: Math.round(region.left),
      top: Math.round(region.top),
      width: Math.round(region.width),
      height: Math.round(region.height),
    }
    try {
      await op.run(upload.file, options)
      toast.success("Cropped")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crop failed")
    }
  }, [upload.file, region, op])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  const overlayPercent = source && {
    left: `${(region.left / source.w) * 100}%`,
    top: `${(region.top / source.h) * 100}%`,
    width: `${(region.width / source.w) * 100}%`,
    height: `${(region.height / source.h) * 100}%`,
  }

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Crop className="size-5" />}
        title="Crop"
        description="Drag to draw a crop region or type exact pixel values. Pick an aspect ratio to lock proportions."
      />
      <WorkspaceMain>
        {!upload.file ? (
          <ImageDropZone upload={upload} />
        ) : (
          <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative inline-block w-full max-w-full touch-none overflow-hidden rounded-lg border bg-muted/40 select-none"
            style={{
              aspectRatio: source ? `${source.w} / ${source.h}` : undefined,
            }}
          >
            {upload.preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={upload.preview}
                alt="source"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
            {source && overlayPercent && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-black/40" />
                <div
                  data-role="region"
                  className="absolute cursor-move ring-2 ring-white outline outline-1 outline-black/40"
                  style={{
                    ...overlayPercent,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                  }}
                />
              </>
            )}
          </div>
        )}
        {op.result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Source"
                  value={source ? `${source.w} × ${source.h}` : "—"}
                />
                <Stat
                  label="Cropped"
                  value={
                    op.result.width && op.result.height
                      ? `${op.result.width} × ${op.result.height}`
                      : "—"
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Aspect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_PRESETS.map((preset, i) => (
                <Button
                  key={preset.label}
                  variant={aspectIdx === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPickAspect(i)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Region (pixels)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <NumberField
              label="Left"
              value={region.left}
              onChange={(v) => onChange("left", v)}
            />
            <NumberField
              label="Top"
              value={region.top}
              onChange={(v) => onChange("top", v)}
            />
            <NumberField
              label="Width"
              value={region.width}
              onChange={(v) => onChange("width", v)}
            />
            <NumberField
              label="Height"
              value={region.height}
              onChange={(v) => onChange("height", v)}
            />
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={
            !upload.file ||
            op.isLoading ||
            region.width < 1 ||
            region.height < 1
          }
          className="w-full"
        >
          {op.isLoading ? "Cropping…" : "Crop"}
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  const id = React.useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={Math.round(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampRegion(
  region: CropOptions,
  source: { w: number; h: number } | null
): CropOptions {
  if (!source) return region
  const width = clamp(region.width, 1, source.w)
  const height = clamp(region.height, 1, source.h)
  const left = clamp(region.left, 0, source.w - width)
  const top = clamp(region.top, 0, source.h - height)
  return { left, top, width, height }
}
