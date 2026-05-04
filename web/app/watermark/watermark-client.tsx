"use client"

import { Download, Stamp } from "lucide-react"
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
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"

type WatermarkOptions = {
  kind: "text"
  text: string
  color: string
  opacity: number
  position: Position
  padding: number
}

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
  const [text, setText] = React.useState("© image-everything")
  const [color, setColor] = React.useState("#ffffff")
  const [opacity, setOpacity] = React.useState(70)
  const [position, setPosition] = React.useState<Position>("bottom-right")
  const [padding, setPadding] = React.useState(24)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    if (!text.trim()) {
      toast.error("Provide watermark text")
      return
    }
    const options: WatermarkOptions = {
      kind: "text",
      text,
      color,
      opacity: opacity / 100,
      position,
      padding,
    }
    try {
      await op.run(upload.file, options)
      toast.success("Watermarked")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Watermark failed")
    }
  }, [upload.file, text, color, opacity, position, padding, op])

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
        icon={<Stamp className="size-5" />}
        title="Watermark"
        description="Overlay text with a chosen color, opacity, and corner position. Image overlay is coming soon."
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
            <CardTitle className="text-sm">Text</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
