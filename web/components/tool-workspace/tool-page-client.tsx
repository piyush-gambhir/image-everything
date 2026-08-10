"use client"

import { TOOL_OPTION_SCHEMAS } from "@image-everything/contracts"
import { Loader2, Play, RotateCcw, Server, ShieldAlert } from "lucide-react"
import * as React from "react"

import {
  ImageWorkspace,
  WorkspaceAside,
  WorkspaceHeader,
  WorkspaceMain,
} from "@/components/image-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToolOperation } from "@/hooks/use-image-operation"
import {
  getToolCapability,
  unavailableOutputFormats,
  useCapabilities,
} from "@/hooks/use-capabilities"
import { MAX_OVERLAY_BYTES } from "@/lib/files"
import { PUBLIC_API_KEY_NOTICE } from "@/lib/api"
import {
  CATEGORY_META,
  cloneToolDefaults,
  type ToolId,
} from "@/lib/tools/manifest"
import { TOOL_ICON_REGISTRY } from "@/lib/tools/registry"
import type { ToolRequestInput } from "@/lib/tools/request"
import type { ToolDefinition } from "@/lib/tools/types"

import { OptionControls, type OptionValues } from "./option-controls"
import { PipelineBuilder, TOOL_CONTROL_REGISTRY } from "./pipeline-builder"
import { ToolFileInput } from "./tool-file-input"
import { ToolResult } from "./tool-result"

export function ToolPageClient({ tool }: { tool: ToolDefinition }) {
  const [primaryFiles, setPrimaryFiles] = React.useState<File[]>([])
  const [secondaryFiles, setSecondaryFiles] = React.useState<File[]>([])
  const [multiFiles, setMultiFiles] = React.useState<File[]>([])
  const [options, setOptions] = React.useState<OptionValues>(() =>
    cloneToolDefaults(tool)
  )
  const [revision, setRevision] = React.useState(0)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const capabilities = useCapabilities()

  const operation = useToolOperation({
    endpoint: tool.endpoint,
    resultKind: tool.resultKind,
    revision,
    auxiliary: tool.auxiliaryResult
      ? {
          endpoint: tool.auxiliaryResult.endpoint,
          kind: tool.auxiliaryResult.kind,
        }
      : undefined,
  })
  const cancelOperation = operation.cancel

  React.useEffect(() => {
    cancelOperation()
  }, [revision, cancelOperation])

  const updateOptions = React.useCallback((next: OptionValues) => {
    setOptions(next)
    setRevision((current) => current + 1)
  }, [])

  const updatePrimary = React.useCallback((next: File[]) => {
    setPrimaryFiles(next)
    setRevision((current) => current + 1)
  }, [])

  const updateSecondary = React.useCallback((next: File[]) => {
    setSecondaryFiles(next)
    setRevision((current) => current + 1)
  }, [])

  const updateMulti = React.useCallback((next: File[]) => {
    setMultiFiles(next)
    setRevision((current) => current + 1)
  }, [])

  const input = buildRequestInput(
    tool,
    options,
    primaryFiles,
    secondaryFiles,
    multiFiles
  )
  const minimumFiles = tool.minimumFiles ?? 1
  const maximumFiles = tool.maximumFiles ?? 20
  const enoughMultiFiles =
    multiFiles.length >= minimumFiles && multiFiles.length <= maximumFiles
  const parsedOptions = TOOL_OPTION_SCHEMAS[tool.id].safeParse(options)
  const optionIssue = parsedOptions.success
    ? null
    : parsedOptions.error.issues[0]
  const unavailableFormats = unavailableOutputFormats(capabilities.data)
  const toolCapability = getToolCapability(capabilities.data, tool.id)
  const selectedUnavailable = findUnavailableSelectedFormat(
    tool,
    options,
    unavailableFormats
  )
  const canRun =
    Boolean(input) &&
    (tool.inputKind !== "multi" || enoughMultiFiles) &&
    parsedOptions.success &&
    capabilities.status !== "loading" &&
    toolCapability?.available !== false &&
    selectedUnavailable === null &&
    !operation.isLoading
  const Icon = TOOL_ICON_REGISTRY[tool.id as ToolId]
  const controlMode = TOOL_CONTROL_REGISTRY[tool.id as ToolId]

  const run = async () => {
    if (!input) return
    if (!parsedOptions.success) return
    await operation.run(input, parsedOptions.data as unknown as OptionValues)
  }

  const resetOptions = () => updateOptions(cloneToolDefaults(tool))

  return (
    <ImageWorkspace className="max-w-7xl">
      <WorkspaceHeader
        icon={Icon ? <Icon className="size-5" /> : undefined}
        title={tool.title}
        description={tool.description}
      />
      <WorkspaceMain>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {CATEGORY_META[tool.category].label}
          </Badge>
          <Badge variant="outline">POST {tool.endpoint}</Badge>
          <Badge variant="outline">
            {tool.resultKind.toUpperCase()} result
          </Badge>
        </div>

        {tool.inputKind === "single" || tool.inputKind === "overlay" ? (
          <ToolFileInput
            files={primaryFiles}
            onChange={updatePrimary}
            label={tool.inputLabel ?? "Source image"}
            onError={setUploadError}
          />
        ) : null}

        {tool.inputKind === "dual" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <ToolFileInput
              files={primaryFiles}
              onChange={updatePrimary}
              label={tool.inputLabel ?? "First image"}
              onError={setUploadError}
            />
            <ToolFileInput
              files={secondaryFiles}
              onChange={updateSecondary}
              label={tool.secondaryInputLabel ?? "Second image"}
              onError={setUploadError}
            />
          </div>
        ) : null}

        {tool.inputKind === "overlay" && options.kind === "image" ? (
          <ToolFileInput
            files={secondaryFiles}
            onChange={updateSecondary}
            label={tool.secondaryInputLabel ?? "Overlay image"}
            maxBytes={MAX_OVERLAY_BYTES}
            onError={setUploadError}
          />
        ) : null}

        {tool.inputKind === "multi" ? (
          <ToolFileInput
            files={multiFiles}
            onChange={updateMulti}
            label={tool.inputLabel ?? "Input images"}
            multiple
            minimumFiles={minimumFiles}
            maximumFiles={maximumFiles}
            onError={setUploadError}
          />
        ) : null}

        {uploadError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {uploadError}
          </div>
        )}

        {operation.error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 p-4"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{operation.error.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {operation.error.detail}
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {operation.error.code}
                  {operation.error.status
                    ? ` · HTTP ${operation.error.status}`
                    : ""}
                </p>
              </div>
              {operation.error.retryable && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!input}
                  onClick={() => void run()}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {operation.result && (
          <ToolResult result={operation.result} stale={operation.isStale} />
        )}
      </WorkspaceMain>

      <WorkspaceAside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm">Options</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {controlMode === "pipeline"
                  ? "Build a reusable processing recipe."
                  : "Configure this operation."}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Reset options"
              onClick={resetOptions}
            >
              <RotateCcw />
            </Button>
          </CardHeader>
          <CardContent>
            {controlMode === "pipeline" ? (
              <PipelineBuilder
                tool={tool}
                value={options}
                unavailableFormats={unavailableFormats}
                onChange={updateOptions}
              />
            ) : (
              <OptionControls
                controls={tool.controls}
                value={options}
                fallbackValue={tool.defaults}
                unavailableFormats={unavailableFormats}
                onChange={updateOptions}
              />
            )}
          </CardContent>
        </Card>

        <Button
          type="button"
          size="lg"
          disabled={!canRun}
          onClick={() => void run()}
          className="w-full"
        >
          {operation.isLoading ? (
            <>
              <Loader2 className="animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Play /> Run {tool.shortTitle}
            </>
          )}
        </Button>
        {optionIssue && (
          <p
            role="alert"
            className="rounded-xl border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning"
          >
            <span className="font-semibold">Check options:</span>{" "}
            {optionIssue.path.length > 0
              ? `${optionIssue.path.join(".")}: `
              : ""}
            {optionIssue.message}
          </p>
        )}
        {capabilities.status === "loading" && (
          <p
            role="status"
            className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground"
          >
            Checking this server’s codecs and operation support…
          </p>
        )}
        {capabilities.status === "error" && (
          <p
            role="status"
            className="rounded-xl border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning"
          >
            Capability discovery was unavailable: {capabilities.error} You can
            still submit the request; the API will report unavailable codecs
            safely.
          </p>
        )}
        {toolCapability?.available === false && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive"
          >
            This server cannot run {tool.shortTitle}. {toolCapability.reason}
          </p>
        )}
        {selectedUnavailable && (
          <p
            role="alert"
            className="rounded-xl border border-warning/20 bg-warning-soft px-3 py-2 text-xs leading-5 text-warning"
          >
            {selectedUnavailable.toUpperCase()} encoding is unavailable on this
            server. Choose one of the enabled formats.
          </p>
        )}
        {operation.isLoading && (
          <Button
            type="button"
            variant="outline"
            onClick={operation.cancel}
            className="w-full"
          >
            Cancel request
          </Button>
        )}

        <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Server className="size-4" /> Server upload
          </p>
          <p className="mt-1">{PUBLIC_API_KEY_NOTICE}</p>
        </div>

        {tool.notes?.map((note) => (
          <p
            key={note}
            className="rounded-xl bg-info-soft px-3 py-2 text-xs leading-5 text-info"
          >
            {note}
          </p>
        ))}
      </WorkspaceAside>
    </ImageWorkspace>
  )
}

function findUnavailableSelectedFormat(
  tool: ToolDefinition,
  options: OptionValues,
  unavailable: ReadonlySet<string>
): string | null {
  if (unavailable.size === 0) return null
  const candidates: string[] = []
  const direct = options.format
  if (typeof direct === "string" && direct !== "auto") candidates.push(direct)
  if (Array.isArray(options.formats)) {
    candidates.push(
      ...options.formats.filter(
        (item): item is string => typeof item === "string"
      )
    )
  }

  const pipelineCandidate =
    tool.id === "batch" &&
    options.pipeline &&
    typeof options.pipeline === "object" &&
    !Array.isArray(options.pipeline)
      ? options.pipeline
      : tool.id === "process"
        ? options
        : null
  if (
    pipelineCandidate &&
    pipelineCandidate.output &&
    typeof pipelineCandidate.output === "object" &&
    !Array.isArray(pipelineCandidate.output) &&
    typeof pipelineCandidate.output.format === "string" &&
    pipelineCandidate.output.format !== "auto"
  ) {
    candidates.push(pipelineCandidate.output.format)
  }
  return candidates.find((format) => unavailable.has(format)) ?? null
}

function buildRequestInput(
  tool: ToolDefinition,
  options: OptionValues,
  primaryFiles: readonly File[],
  secondaryFiles: readonly File[],
  multiFiles: readonly File[]
): ToolRequestInput | null {
  if (tool.inputKind === "single") {
    return primaryFiles[0] ? { kind: "single", file: primaryFiles[0] } : null
  }
  if (tool.inputKind === "overlay") {
    if (!primaryFiles[0]) return null
    if (options.kind === "image" && !secondaryFiles[0]) return null
    return {
      kind: "overlay",
      file: primaryFiles[0],
      overlay: secondaryFiles[0],
    }
  }
  if (tool.inputKind === "dual") {
    return primaryFiles[0] && secondaryFiles[0]
      ? { kind: "dual", files: [primaryFiles[0], secondaryFiles[0]] }
      : null
  }
  return multiFiles.length > 0 ? { kind: "multi", files: multiFiles } : null
}
