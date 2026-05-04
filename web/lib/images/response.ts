import type { z } from "zod"

import { ImageRequestError } from "@/lib/images/parse-form"
import type { EngineResult } from "@/lib/images/types"
import { OUTPUT_FORMAT_TO_MIME } from "@/lib/images/types"

export function imageResponse(
  result: EngineResult,
  originalName: string
): Response {
  const ext = result.format
  const baseName = stripExtension(originalName)
  const filename = `${baseName}.${ext}`
  const contentType = OUTPUT_FORMAT_TO_MIME[result.format]
  const body = new Uint8Array(result.buffer)
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(result.size),
      "X-Output-Width": String(result.width),
      "X-Output-Height": String(result.height),
      "X-Output-Size": String(result.size),
      "X-Output-Format": result.format,
      "Cache-Control": "no-store",
    },
  })
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ImageRequestError) {
    return Response.json(
      { error: error.message, issues: error.issues },
      { status: error.status }
    )
  }
  if (isZodError(error)) {
    return Response.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 }
    )
  }
  const message = error instanceof Error ? error.message : "Internal error"
  console.error("[images] unexpected error:", error)
  return Response.json(
    { error: "Internal error", detail: message },
    { status: 500 }
  )
}

function stripExtension(name: string): string {
  const idx = name.lastIndexOf(".")
  return idx > 0 ? name.slice(0, idx) : name
}

function isZodError(value: unknown): value is z.ZodError {
  return (
    typeof value === "object" &&
    value !== null &&
    "issues" in value &&
    Array.isArray((value as { issues: unknown }).issues)
  )
}
