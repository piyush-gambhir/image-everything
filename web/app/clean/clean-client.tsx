"use client"

import { Download, Eraser } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useImageOperation } from "@/hooks/use-image-operation"
import { useImageUpload } from "@/hooks/use-image-upload"
import { apiFetch } from "@/lib/api"
import type { ImageMetadata } from "@/lib/images/types"

type CleanOptions = {
  keep: ("orientation" | "colorProfile")[]
}

async function fetchMetadata(
  blob: Blob | File,
  filename = "input"
): Promise<ImageMetadata> {
  const fd = new FormData()
  fd.append("file", blob, filename)
  const res = await apiFetch("/api/images/metadata", {
    method: "POST",
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error ?? "Failed to read metadata")
  }
  return (await res.json()) as ImageMetadata
}

export function CleanClient() {
  const upload = useImageUpload({ onError: (m) => toast.error(m) })
  const op = useImageOperation("/api/images/clean")
  const [keepOrientation, setKeepOrientation] = React.useState(false)
  const [keepIcc, setKeepIcc] = React.useState(false)
  const [beforeMeta, setBeforeMeta] = React.useState<ImageMetadata | null>(null)
  const [afterMeta, setAfterMeta] = React.useState<ImageMetadata | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (!upload.file) {
      setBeforeMeta(null)
      setAfterMeta(null)
      op.reset()
      return
    }
    let cancelled = false
    fetchMetadata(upload.file)
      .then((md) => {
        if (!cancelled) setBeforeMeta(md)
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.file])

  const run = React.useCallback(async () => {
    if (!upload.file) return
    setPending(true)
    setAfterMeta(null)
    const options: CleanOptions = {
      keep: [
        ...(keepOrientation ? (["orientation"] as const) : []),
        ...(keepIcc ? (["colorProfile"] as const) : []),
      ],
    }
    try {
      const result = await op.run(upload.file, options)
      const meta = await fetchMetadata(result.blob, result.filename)
      setAfterMeta(meta)
      toast.success("Metadata stripped")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clean failed")
    } finally {
      setPending(false)
    }
  }, [upload.file, keepOrientation, keepIcc, op])

  const beforeCount = beforeMeta ? countTags(beforeMeta) : null
  const afterCount = afterMeta ? countTags(afterMeta) : null

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
        icon={<Eraser className="size-5" />}
        title="Clean Metadata"
        description="Remove EXIF, IPTC, XMP, and ICC blocks. Orientation is baked into pixels by default so photos stay upright."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        <DiffPanel
          beforeCount={beforeCount}
          afterCount={afterCount}
          loading={pending}
          ran={!!op.result}
        />
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleRow
              label="Keep orientation tag"
              hint="Don't bake rotation into pixels."
              checked={keepOrientation}
              onChange={setKeepOrientation}
            />
            <ToggleRow
              label="Keep color profile"
              hint="Preserve ICC for wide-gamut accuracy."
              checked={keepIcc}
              onChange={setKeepIcc}
            />
          </CardContent>
        </Card>
        <Button
          onClick={run}
          disabled={!upload.file || pending || op.isLoading}
          className="w-full"
        >
          {pending ? "Cleaning…" : "Clean metadata"}
        </Button>
        {op.result && (
          <Button onClick={download} variant="outline" className="w-full">
            <Download />
            Download cleaned
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

function DiffPanel({
  beforeCount,
  afterCount,
  loading,
  ran,
}: {
  beforeCount: number | null
  afterCount: number | null
  loading: boolean
  ran: boolean
}) {
  if (beforeCount === null) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Before" value={beforeCount} />
          {loading ? (
            <div>
              <div className="text-xs text-muted-foreground">After</div>
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ) : (
            <Stat
              label="After"
              value={ran ? (afterCount ?? "—") : "—"}
              accent={ran && afterCount === 0 ? "success" : "default"}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string
  value: React.ReactNode
  accent?: "default" | "success"
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">tags</div>
        {accent === "success" && (
          <Badge variant="secondary" className="text-[10px]">
            cleaned
          </Badge>
        )}
      </div>
    </div>
  )
}

function countTags(md: ImageMetadata): number {
  return (
    md.categorized.camera.length +
    md.categorized.lens.length +
    md.categorized.exposure.length +
    md.categorized.image.length +
    md.categorized.location.length +
    md.categorized.other.length
  )
}
