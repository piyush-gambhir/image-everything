"use client"

import { Copy, Download, ScanSearch } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useImageUpload } from "@/hooks/use-image-upload"
import { apiFetch, imageApiPath } from "@/lib/api"
import type { CategorizedMetadata, ImageMetadata } from "@/lib/images/types"

const CATEGORY_ORDER: { key: keyof CategorizedMetadata; title: string }[] = [
  { key: "camera", title: "Camera" },
  { key: "lens", title: "Lens" },
  { key: "exposure", title: "Exposure" },
  { key: "image", title: "Image" },
  { key: "location", title: "Location" },
  { key: "other", title: "Other" },
]

export function MetadataClient() {
  const upload = useImageUpload({ onError: (msg) => toast.error(msg) })
  const [data, setData] = React.useState<ImageMetadata | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!upload.file) {
      setData(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    const fd = new FormData()
    fd.append("file", upload.file)
    apiFetch(imageApiPath("metadata"), { method: "POST", body: fd })
      .then(async (response) => {
        if (!response.ok) {
          const err = await response.json().catch(() => null)
          throw new Error(err?.error ?? "Failed to read metadata")
        }
        return (await response.json()) as ImageMetadata
      })
      .then((md) => {
        if (!cancelled) setData(md)
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [upload.file])

  const totalTags = React.useMemo(() => {
    if (!data) return 0
    return CATEGORY_ORDER.reduce(
      (sum, { key }) => sum + data.categorized[key].length,
      0
    )
  }, [data])

  const downloadJson = () => {
    if (!data || !upload.file) return
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    triggerDownload(blob, `${stripExt(upload.file.name)}-metadata.json`)
  }

  const downloadTxt = () => {
    if (!data || !upload.file) return
    const text = formatAsText(data)
    const blob = new Blob([text], { type: "text/plain" })
    triggerDownload(blob, `${stripExt(upload.file.name)}-metadata.txt`)
  }

  const copyJson = async () => {
    if (!data) return
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast.success("Metadata JSON copied")
  }

  return (
    <ImageWorkspace>
      <WorkspaceHeader
        icon={<ScanSearch className="size-5" />}
        title="Read Metadata"
        description="Drop in a photo and see every embedded tag — camera, lens, exposure, location, color profile."
      />
      <WorkspaceMain>
        <ImageDropZone upload={upload} />
        {data && (
          <Card>
            <CardContent className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-xs text-muted-foreground">
              <Stat label="Format" value={data.format ?? "—"} />
              <Stat
                label="Dimensions"
                value={
                  data.width && data.height
                    ? `${data.width} × ${data.height}`
                    : "—"
                }
              />
              <Stat label="Size" value={formatBytes(data.size)} />
              <Stat label="Channels" value={data.channels ?? "—"} />
              <Stat label="Alpha" value={data.hasAlpha ? "yes" : "no"} />
              <Stat label="Orientation" value={data.orientation ?? "—"} />
              <Stat label="Tags" value={totalTags} />
            </CardContent>
          </Card>
        )}
      </WorkspaceMain>
      <WorkspaceAside>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Export</CardTitle>
            {totalTags > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totalTags} tag{totalTags === 1 ? "" : "s"}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyJson}
              disabled={!data}
            >
              <Copy />
              Copy JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadJson}
              disabled={!data}
            >
              <Download />
              Download .json
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTxt}
              disabled={!data}
            >
              <Download />
              Download .txt
            </Button>
          </CardContent>
        </Card>
      </WorkspaceAside>
      <div className="lg:col-span-2">
        {isLoading ? (
          <CategorySkeleton />
        ) : data ? (
          <CategoryGrid data={data.categorized} />
        ) : null}
      </div>
    </ImageWorkspace>
  )
}

function CategoryGrid({ data }: { data: CategorizedMetadata }) {
  const visible = CATEGORY_ORDER.filter(({ key }) => data[key].length > 0)
  if (visible.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No metadata tags found in this file.
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map(({ key, title }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {data[key].map((tag) => (
                <div
                  key={tag.label}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="shrink-0 text-xs text-muted-foreground">
                    {tag.label}
                  </dt>
                  <dd className="truncate text-right font-medium">
                    {tag.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="opacity-70">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function stripExt(name: string): string {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(0, i) : name
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatAsText(data: ImageMetadata): string {
  const lines: string[] = []
  lines.push("IMAGE METADATA")
  lines.push("==============")
  lines.push("")
  lines.push(`Format: ${data.format ?? "unknown"}`)
  if (data.width && data.height)
    lines.push(`Dimensions: ${data.width} × ${data.height}`)
  lines.push(`Size: ${formatBytes(data.size)}`)
  if (data.channels !== null) lines.push(`Channels: ${data.channels}`)
  if (data.hasAlpha !== null) lines.push(`Alpha: ${data.hasAlpha}`)
  if (data.density !== null) lines.push(`Density: ${data.density}`)
  if (data.orientation !== null) lines.push(`Orientation: ${data.orientation}`)
  lines.push("")
  for (const { key, title } of CATEGORY_ORDER) {
    const tags = data.categorized[key]
    if (tags.length === 0) continue
    lines.push(title.toUpperCase())
    lines.push("-".repeat(title.length))
    for (const tag of tags) lines.push(`${tag.label}: ${tag.value}`)
    lines.push("")
  }
  return lines.join("\n")
}
