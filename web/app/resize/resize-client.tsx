"use client"

import { Download, Lock, Maximize2, Unlock } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"
import { apiFetch } from "@/lib/api"
import type { ImageMetadata } from "@/lib/images/types"

type FitMode = "cover" | "contain" | "fill" | "inside" | "outside"

type ResizeOptions = {
  width?: number
  height?: number
  fit: FitMode
  background?: string
  withoutEnlargement?: boolean
}

async function fetchMetadata(file: File): Promise<ImageMetadata> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await apiFetch("/api/images/metadata", {
    method: "POST",
    body: fd,
  })
  if (!res.ok) throw new Error("Failed to read source dimensions")
  return (await res.json()) as ImageMetadata
}

export function ResizeClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("/api/images/resize")
  const [width, setWidth] = React.useState<string>("")
  const [height, setHeight] = React.useState<string>("")
  const [fit, setFit] = React.useState<FitMode>("cover")
  const [aspectLock, setAspectLock] = React.useState(true)
  const [withoutEnlargement, setWithoutEnlargement] = React.useState(true)
  const [bgEnabled, setBgEnabled] = React.useState(false)
  const [bg, setBg] = React.useState("#ffffff")
  const [source, setSource] = React.useState<{ w: number; h: number } | null>(
    null
  )

  React.useEffect(() => {
    if (!upload.file) {
      op.reset()
      setSource(null)
      setWidth("")
      setHeight("")
      return
    }
    let cancelled = false
    fetchMetadata(upload.file)
      .then((md) => {
        if (cancelled || !md.width || !md.height) return
        setSource({ w: md.width, h: md.height })
        setWidth(String(md.width))
        setHeight(String(md.height))
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const aspect = source ? source.w / source.h : null

  const onWidth = (value: string) => {
    setWidth(value)
    if (aspectLock && aspect) {
      const w = Number(value)
      if (Number.isFinite(w) && w > 0) {
        setHeight(String(Math.round(w / aspect)))
      } else {
        setHeight("")
      }
    }
  }

  const onHeight = (value: string) => {
    setHeight(value)
    if (aspectLock && aspect) {
      const h = Number(value)
      if (Number.isFinite(h) && h > 0) {
        setWidth(String(Math.round(h * aspect)))
      } else {
        setWidth("")
      }
    }
  }

  const run = React.useCallback(async () => {
    if (!upload.file) return
    const w = Number(width)
    const h = Number(height)
    const options: ResizeOptions = {
      ...(Number.isFinite(w) && w > 0 ? { width: w } : {}),
      ...(Number.isFinite(h) && h > 0 ? { height: h } : {}),
      fit,
      withoutEnlargement,
      ...(bgEnabled ? { background: bg } : {}),
    }
    if (options.width === undefined && options.height === undefined) {
      toast.error("Provide width or height")
      return
    }
    try {
      await op.run(upload.file, options)
      toast.success("Resized")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resize failed")
    }
  }, [upload.file, width, height, fit, withoutEnlargement, bgEnabled, bg, op])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Maximize2 className="size-5" />}
        title="Resize"
        description="Set width, height, and fit mode. Aspect ratio is locked by default — toggle the lock to set dimensions independently."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        {(source || op.result) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {source && (
                  <Stat label="Source" value={`${source.w} × ${source.h}`} />
                )}
                {op.result?.width && op.result.height && (
                  <Stat
                    label="Resized"
                    value={`${op.result.width} × ${op.result.height}`}
                  />
                )}
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
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium" htmlFor="w">
                  Width
                </Label>
                <Input
                  id="w"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={width}
                  onChange={(e) => onWidth(e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  aspectLock ? "Unlock aspect ratio" : "Lock aspect ratio"
                }
                onClick={() => setAspectLock((v) => !v)}
                className="mb-1"
              >
                {aspectLock ? <Lock /> : <Unlock />}
              </Button>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium" htmlFor="h">
                  Height
                </Label>
                <Input
                  id="h"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => onHeight(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium" htmlFor="fit">
                Fit
              </Label>
              <Select value={fit} onValueChange={(v) => setFit(v as FitMode)}>
                <SelectTrigger id="fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (crop to fill)</SelectItem>
                  <SelectItem value="contain">Contain (fit inside)</SelectItem>
                  <SelectItem value="fill">Fill (stretch)</SelectItem>
                  <SelectItem value="inside">Inside (only shrink)</SelectItem>
                  <SelectItem value="outside">Outside (only grow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow
              label="Don't enlarge"
              hint="Skip resize if larger than source."
              checked={withoutEnlargement}
              onChange={setWithoutEnlargement}
            />
            {fit === "contain" && (
              <ToggleRow
                label="Background color"
                hint="Fill the contain padding."
                checked={bgEnabled}
                onChange={setBgEnabled}
                trailing={
                  bgEnabled && (
                    <input
                      type="color"
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded border border-border"
                    />
                  )
                }
              />
            )}
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading}
          className="w-full"
        >
          {op.isLoading ? "Resizing…" : "Resize"}
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
  trailing,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  trailing?: React.ReactNode
}) {
  const id = React.useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
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
