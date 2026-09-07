"use client"

import { AlertTriangle, Download, FileArchive, ImageIcon } from "lucide-react"
import { Base64ResultSchema } from "@image-everything/contracts"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/lib/files"
import type {
  ToolOperationResult,
  ToolResponseWithUrl,
} from "@/hooks/use-image-operation"

export function ToolResult({
  result,
  stale,
}: {
  result: ToolOperationResult
  stale: boolean
}) {
  return (
    <section aria-labelledby="tool-result-heading" className="space-y-3">
      {stale && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-5 text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This result belongs to an earlier file or option state. Run the tool
          again before downloading.
        </div>
      )}
      <ResultCard
        result={result.primary}
        title={
          result.primary.kind === "json"
            ? "Structured result"
            : "Processed result"
        }
        stale={stale}
      />
      {result.auxiliary && (
        <ResultCard
          result={result.auxiliary}
          title="Difference view"
          stale={stale}
        />
      )}
    </section>
  )
}

function ResultCard({
  result,
  title,
  stale,
}: {
  result: ToolResponseWithUrl
  title: string
  stale: boolean
}) {
  if (result.kind === "json") {
    return <JsonResult value={result.data} title={title} stale={stale} />
  }

  const isZip = result.kind === "zip"
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle id="tool-result-heading" className="text-sm">
            {title}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.filename} · {formatBytes(result.size)}
            {result.width && result.height
              ? ` · ${result.width}×${result.height}`
              : ""}
            {result.fileCount ? ` · ${result.fileCount} files` : ""}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={stale}
          onClick={() => download(result.url, result.filename)}
        >
          <Download /> Download
        </Button>
      </CardHeader>
      <CardContent>
        {isZip ? (
          <div className="grid min-h-36 place-items-center rounded-xl bg-muted/50 p-6 text-center">
            <div>
              <FileArchive className="mx-auto size-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">ZIP archive ready</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The archive includes the generated assets and its result
                manifest.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-xl bg-muted/30 p-4">
            {result.url ? (
              // Binary result URLs are local and cannot use Next image optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.url}
                alt="Processed image result"
                className="max-h-[32rem] max-w-full rounded-lg object-contain"
              />
            ) : (
              <ImageIcon className="size-9 text-muted-foreground" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const MAX_JSON_PREVIEW_CHARACTERS = 64 * 1024

function JsonResult({
  value,
  title,
  stale,
}: {
  value: unknown
  title: string
  stale: boolean
}) {
  const preview = React.useMemo(() => buildJsonPreview(value), [value])
  const base64 = React.useMemo(
    () => Base64ResultSchema.safeParse(value),
    [value]
  )
  const downloads = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )

  React.useEffect(() => {
    const pending = downloads.current
    return () => {
      for (const [url, timer] of pending) {
        clearTimeout(timer)
        URL.revokeObjectURL(url)
      }
      pending.clear()
    }
  }, [value])

  const downloadText = (text: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      downloads.current.delete(url)
    }, 1000)
    downloads.current.set(url, timer)
    download(url, filename)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle id="tool-result-heading" className="text-sm">
          {title}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {base64.success && (
            <Button
              type="button"
              size="sm"
              disabled={stale}
              onClick={() =>
                downloadText(
                  base64.data.data,
                  "image-base64.txt",
                  "text/plain;charset=utf-8"
                )
              }
            >
              <Download /> Download Base64 text
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={stale}
            onClick={() =>
              downloadText(
                JSON.stringify(value, null, 2),
                "result.json",
                "application/json"
              )
            }
          >
            <Download /> Download JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {preview.truncated && (
          <p className="text-xs leading-5 text-muted-foreground">
            Preview limited to{" "}
            {MAX_JSON_PREVIEW_CHARACTERS.toLocaleString("en-US")} characters.
            Download the complete result above.
          </p>
        )}
        <div className="max-h-[34rem] overflow-auto rounded-xl bg-neutral-950 p-4 text-neutral-100">
          <pre className="text-xs leading-6 break-all whitespace-pre-wrap">
            <code>{preview.text}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

function buildJsonPreview(value: unknown): {
  text: string
  truncated: boolean
} {
  let truncated = false
  // Bound individual strings before serialization so a large Base64 value is
  // not duplicated just to display its preview. Serialize the full result only
  // when the user requests the JSON download.
  const text =
    JSON.stringify(
      value,
      (_key, item: unknown) => {
        if (
          typeof item === "string" &&
          item.length > MAX_JSON_PREVIEW_CHARACTERS
        ) {
          truncated = true
          return item.slice(0, MAX_JSON_PREVIEW_CHARACTERS)
        }
        return item
      },
      2
    ) ?? "null"
  return {
    text: text.slice(0, MAX_JSON_PREVIEW_CHARACTERS),
    truncated: truncated || text.length > MAX_JSON_PREVIEW_CHARACTERS,
  }
}

function download(url: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
}
