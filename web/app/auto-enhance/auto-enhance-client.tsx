"use client"

import { Download, Sparkles } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type Options = {
  normalize?: boolean
  brightness?: number
  saturation?: number
  hue?: number
  sharpen?: boolean
}

export function AutoEnhanceClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("auto-enhance")
  const [normalize, setNormalize] = React.useState(true)
  const [sharpen, setSharpen] = React.useState(false)
  const [brightness, setBrightness] = React.useState<number>(100) // %
  const [saturation, setSaturation] = React.useState<number>(100)
  const [hue, setHue] = React.useState<number>(0)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    const options: Options = { normalize, sharpen }
    if (brightness !== 100) options.brightness = brightness / 100
    if (saturation !== 100) options.saturation = saturation / 100
    if (hue !== 0) options.hue = hue
    try {
      await op.run(upload.file, options)
      toast.success("Enhanced")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enhance failed")
    }
  }, [upload.file, normalize, sharpen, brightness, saturation, hue, op])

  const reset = () => {
    setNormalize(true)
    setSharpen(false)
    setBrightness(100)
    setSaturation(100)
    setHue(0)
  }

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
        icon={<Sparkles className="size-5" />}
        title="Auto-Enhance"
        description="Auto-orient, normalize contrast, modulate brightness/saturation/hue, sharpen. Sliders default to no-op."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        {op.result && upload.preview && (
          <BeforeAfterSlider before={upload.preview} after={op.result.url} />
        )}
        {op.result && (
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Result
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={op.result.url}
                alt="enhanced"
                className="max-h-[420px] max-w-full rounded-md border object-contain"
              />
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tone</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ToggleRow
              label="Normalize"
              hint="Stretch contrast across the full range."
              checked={normalize}
              onChange={setNormalize}
            />
            <ToggleRow
              label="Sharpen"
              hint="Apply default sharpening kernel."
              checked={sharpen}
              onChange={setSharpen}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Color</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <PercentSlider
              label="Brightness"
              value={brightness}
              onValueChange={setBrightness}
              min={20}
              max={300}
            />
            <PercentSlider
              label="Saturation"
              value={saturation}
              onValueChange={setSaturation}
              min={0}
              max={300}
            />
            <DegreeSlider
              label="Hue shift"
              value={hue}
              onValueChange={setHue}
            />
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button
            onClick={run}
            disabled={!upload.file || op.isLoading}
            className="flex-1"
          >
            {op.isLoading ? "Enhancing…" : "Enhance"}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
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

function PercentSlider({
  label,
  value,
  onValueChange,
  min,
  max,
}: {
  label: string
  value: number
  onValueChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={5}
        onValueChange={(v) => onValueChange(v[0])}
      />
    </div>
  )
}

function DegreeSlider({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: number
  onValueChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value > 0 ? "+" : ""}
          {value}°
        </span>
      </div>
      <Slider
        value={[value]}
        min={-180}
        max={180}
        step={5}
        onValueChange={(v) => onValueChange(v[0])}
      />
    </div>
  )
}
