import { ProblemSchema } from "@image-everything/contracts"

import { apiFetch } from "@/lib/api"

import type { SerializableValue, ToolResultKind } from "./types"

export type SingleToolInput = { kind: "single"; file: File }
export type OverlayToolInput = {
  kind: "overlay"
  file: File
  overlay?: File
}
export type DualToolInput = { kind: "dual"; files: readonly [File, File] }
export type MultiToolInput = { kind: "multi"; files: readonly File[] }

export type ToolRequestInput =
  | SingleToolInput
  | OverlayToolInput
  | DualToolInput
  | MultiToolInput

export type ToolProblem = {
  code: string
  title: string
  detail: string
  status?: number
  instance?: string
  retryable?: boolean
  errors?: { path: string; message: string }[]
}

export class ToolRequestError extends Error {
  readonly problem: ToolProblem

  constructor(problem: ToolProblem) {
    super(problem.detail)
    this.name = "ToolRequestError"
    this.problem = problem
  }
}

export type BinaryToolResponse = {
  kind: "image" | "zip"
  blob: Blob
  filename: string
  size: number
  width?: number
  height?: number
  format?: string
  fileCount?: number
}

export type JsonToolResponse = {
  kind: "json"
  data: unknown
}

export type ToolResponse = BinaryToolResponse | JsonToolResponse

export function buildToolFormData(
  input: ToolRequestInput,
  options?: Record<string, SerializableValue>
): FormData {
  const formData = new FormData()

  switch (input.kind) {
    case "single":
      formData.append("file", input.file)
      break
    case "overlay":
      formData.append("file", input.file)
      if (input.overlay) formData.append("overlay", input.overlay)
      break
    case "dual":
      formData.append("file", input.files[0])
      formData.append("other", input.files[1])
      break
    case "multi":
      for (const file of input.files) formData.append("files", file)
      break
  }

  if (options) {
    const normalized = compactSerializable(options)
    if (Object.keys(normalized).length > 0) {
      formData.append("options", JSON.stringify(normalized))
    }
  }

  return formData
}

export async function executeToolRequest({
  endpoint,
  input,
  options,
  resultKind,
  signal,
  fetcher = apiFetch,
}: {
  endpoint: string
  input: ToolRequestInput
  options?: Record<string, SerializableValue>
  resultKind: ToolResultKind
  signal?: AbortSignal
  fetcher?: typeof apiFetch
}): Promise<ToolResponse> {
  const response = await fetcher(endpoint, {
    method: "POST",
    body: buildToolFormData(input, options),
    signal,
  })

  if (!response.ok) throw new ToolRequestError(await readProblem(response))

  if (resultKind === "json") {
    return { kind: "json", data: await response.json() }
  }

  const blob = await response.blob()
  return {
    kind: resultKind,
    blob,
    filename:
      parseContentDispositionFilename(
        response.headers.get("Content-Disposition")
      ) ?? (resultKind === "zip" ? "image-everything.zip" : "output"),
    size: numericHeader(response.headers, "X-Output-Size") ?? blob.size,
    width: numericHeader(response.headers, "X-Output-Width"),
    height: numericHeader(response.headers, "X-Output-Height"),
    format: response.headers.get("X-Output-Format") ?? undefined,
    fileCount: numericHeader(response.headers, "X-Output-Files"),
  }
}

export function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const plain = /filename="?([^"\n;]+)"?/i.exec(header)
  return plain?.[1]?.trim() || null
}

export function compactSerializable<
  T extends Record<string, SerializableValue>,
>(value: T): T {
  return compactValue(value) as T
}

function compactValue(value: SerializableValue): SerializableValue | undefined {
  if (value === null || value === "") return undefined
  if (Array.isArray(value)) {
    return value
      .map((item) => compactValue(item))
      .filter((item): item is SerializableValue => item !== undefined)
  }
  if (typeof value === "object") {
    const output: Record<string, SerializableValue> = {}
    for (const [key, item] of Object.entries(value)) {
      const compacted = compactValue(item)
      if (compacted !== undefined) output[key] = compacted
    }
    return output
  }
  return value
}

async function readProblem(response: Response): Promise<ToolProblem> {
  const body = await response.json().catch(() => null)
  const sharedProblem = ProblemSchema.safeParse(body)
  if (sharedProblem.success) return sharedProblem.data
  const detail =
    asString(body?.detail) ??
    asString(body?.error) ??
    asString(body?.message) ??
    `Request failed (${response.status})`

  return {
    code: asString(body?.code) ?? `HTTP_${response.status}`,
    title: asString(body?.title) ?? "Image request failed",
    detail,
    status: response.status,
    instance: asString(body?.instance),
    retryable:
      typeof body?.retryable === "boolean" ? body.retryable : undefined,
    errors: Array.isArray(body?.errors)
      ? body.errors
      : Array.isArray(body?.issues)
        ? body.issues
        : undefined,
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function numericHeader(headers: Headers, name: string): number | undefined {
  const value = headers.get(name)
  if (!value) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
