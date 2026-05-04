"use client"

import { Download, FlipHorizontal, FlipVertical, RotateCw } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"

type Angle = 0 | 90 | 180 | 270

type RotateOptions = {
  angle: Angle
  flipH?: boolean
  flipV?: boolean
}

export function RotateClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("/api/images/rotate")
  const [angle, setAngle] = React.useState<Angle>(0)
  const [flipH, setFlipH] = React.useState(false)
  const [flipV, setFlipV] = React.useState(false)

  React.useEffect(() => {
    if (!upload.file) op.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    const options: RotateOptions = {
      angle,
      ...(flipH ? { flipH: true } : {}),
      ...(flipV ? { flipV: true } : {}),
    }
    try {
      await op.run(upload.file, options)
      toast.success("Applied")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rotate failed")
    }
  }, [upload.file, angle, flipH, flipV, op])

  const download = () => {
    if (!op.result) return
    const a = document.createElement("a")
    a.href = op.result.url
    a.download = op.result.filename
    a.click()
  }

  const noChange = angle === 0 && !flipH && !flipV

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<RotateCw className="size-5" />}
        title="Rotate / Flip"
        description="Rotate in 90° increments and mirror horizontally or vertically. Output dimensions update automatically."
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
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Dimensions"
                  value={
                    op.result.width && op.result.height
                      ? `${op.result.width} × ${op.result.height}`
                      : "—"
                  }
                />
                <Stat label="Format" value={op.result.format ?? "—"} />
              </div>
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rotation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map((a) => (
                <Button
                  key={a}
                  variant={angle === a ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAngle(a as Angle)}
                  className="tabular-nums"
                >
                  {a}°
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Mirror</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleRow
              icon={<FlipHorizontal className="size-4" />}
              label="Flip horizontal"
              hint="Mirror left ↔ right."
              checked={flipH}
              onChange={setFlipH}
            />
            <ToggleRow
              icon={<FlipVertical className="size-4" />}
              label="Flip vertical"
              hint="Mirror top ↔ bottom."
              checked={flipV}
              onChange={setFlipV}
            />
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || op.isLoading || noChange}
          className="w-full"
        >
          {op.isLoading ? "Applying…" : "Apply"}
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
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
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
