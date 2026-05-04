"use client"

import { Download, Image as ImageIcon, Stamp, Type, X } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"

type WatermarkKind = "text" | "image"

const POSITIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "center", label: "Center" },
]

export function WatermarkClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("/api/images/watermark")
  const [kind, setKind] = React.useState<WatermarkKind>("text")
  const [text, setText] = React.useState("© image-everything")
  const [color, setColor] = React.useState("#ffffff")
  const [opacity, setOpacity] = React.useState(70)
  const [position, setPosition] = React.useState<Position>("bottom-right")
  const [padding, setPadding] = React.useState(24)
  const [overlay, setOverlay] = React.useState<File | null>(null)
  const [overlayPreview, setOverlayPreview] = React.useState<string | null>(
    null
  )
  const overlayInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  React.useEffect(() => {
    if (!overlay) {
      setOverlayPreview(null)
      return
    }
    const url = URL.createObjectURL(overlay)
    setOverlayPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [overlay])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    if (kind === "text" && !text.trim()) {
      toast.error("Provide watermark text")
      return
    }
    if (kind === "image" && !overlay) {
      toast.error("Pick an overlay image")
      return
    }
    const options =
      kind === "text"
        ? {
            kind: "text" as const,
            text,
            color,
            opacity: opacity / 100,
            position,
            padding,
          }
        : {
            kind: "image" as const,
            opacity: opacity / 100,
            position,
            padding,
          }
    try {
      await op.run(
        upload.file,
        options,
        kind === "image" && overlay ? { overlay } : undefined
      )
      toast.success("Watermarked")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Watermark failed")
    }
  }, [upload.file, kind, text, color, opacity, position, padding, overlay, op])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  const onPickOverlay = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setOverlay(file)
    event.target.value = ""
  }

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<Stamp className="size-5" />}
        title="Watermark"
        description="Overlay text or an image. Pick a corner, set opacity, ship."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        {op.result && (
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Preview
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={op.result.url}
                alt="watermarked"
                className="max-h-[420px] max-w-full rounded-md border object-contain"
              />
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Watermark</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs
              value={kind}
              onValueChange={(v) => setKind(v as WatermarkKind)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <Type />
                  Text
                </TabsTrigger>
                <TabsTrigger value="image">
                  <ImageIcon />
                  Image
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="flex flex-col gap-4 pt-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" htmlFor="wm-text">
                    Content
                  </Label>
                  <Input
                    id="wm-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="© your name"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-medium" htmlFor="wm-color">
                    Color
                  </Label>
                  <input
                    id="wm-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-border"
                  />
                </div>
              </TabsContent>
              <TabsContent value="image" className="flex flex-col gap-3 pt-3">
                <input
                  ref={overlayInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onPickOverlay}
                />
                {overlay && overlayPreview ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={overlayPreview}
                      alt={overlay.name}
                      className="h-12 w-12 rounded border bg-white object-contain"
                    />
                    <div className="min-w-0 flex-1 truncate text-xs">
                      <div className="truncate font-medium">{overlay.name}</div>
                      <div className="text-muted-foreground">
                        {formatBytes(overlay.size)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove overlay"
                      onClick={() => setOverlay(null)}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => overlayInputRef.current?.click()}
                  >
                    <ImageIcon />
                    Pick overlay image
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG with transparency works best. The overlay is auto-resized
                  to ~25% of the source width.
                </p>
              </TabsContent>
            </Tabs>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-medium">Opacity</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {opacity}%
                </span>
              </div>
              <Slider
                value={[opacity]}
                min={5}
                max={100}
                step={1}
                onValueChange={(v) => setOpacity(v[0])}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Placement</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium" htmlFor="wm-pos">
                Position
              </Label>
              <Select
                value={position}
                onValueChange={(v) => setPosition(v as Position)}
              >
                <SelectTrigger id="wm-pos">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium" htmlFor="wm-pad">
                Padding (px)
              </Label>
              <Input
                id="wm-pad"
                type="number"
                min={0}
                max={500}
                inputMode="numeric"
                value={padding}
                onChange={(e) =>
                  setPadding(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading}
          className="w-full"
        >
          {op.isLoading ? "Stamping…" : "Apply watermark"}
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
