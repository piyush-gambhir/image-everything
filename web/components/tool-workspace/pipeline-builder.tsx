"use client"

import { PipelineSchema } from "@image-everything/contracts"
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  PIPELINE_STEP_DEFINITIONS,
  getPipelineControls,
  type PipelineOperation,
} from "@/lib/tools/pipeline"
import {
  formatsForEncoderOption,
  getToolById,
  type ToolId,
} from "@/lib/tools/manifest"
import type {
  SerializableValue,
  ToolControl,
  ToolDefinition,
} from "@/lib/tools/types"

import { OptionControls, type OptionValues } from "./option-controls"

const MAX_STEPS = 20

export const OUTPUT_CONTROLS: readonly ToolControl[] = [
  {
    type: "select",
    path: "format",
    label: "Output format",
    options: [
      { label: "Keep input format", value: "auto" },
      { label: "JPEG", value: "jpeg" },
      { label: "PNG", value: "png" },
      { label: "WebP", value: "webp" },
      { label: "AVIF", value: "avif" },
      { label: "GIF", value: "gif" },
      { label: "TIFF", value: "tiff" },
    ],
  },
  {
    type: "range",
    path: "quality",
    label: "Quality",
    min: 1,
    max: 100,
    visibleWhen: { path: "format", oneOf: formatsForEncoderOption("quality") },
  },
  {
    type: "boolean",
    path: "lossless",
    label: "Lossless encoding",
    visibleWhen: { path: "format", oneOf: formatsForEncoderOption("lossless") },
  },
  {
    type: "boolean",
    path: "progressive",
    label: "Progressive JPEG",
    visibleWhen: { path: "format", equals: "jpeg" },
  },
  {
    type: "boolean",
    path: "mozjpeg",
    label: "MozJPEG",
    visibleWhen: { path: "format", equals: "jpeg" },
  },
  {
    type: "range",
    path: "effort",
    label: "Encoder effort",
    min: 0,
    max: 9,
    visibleWhen: { path: "format", oneOf: formatsForEncoderOption("effort") },
  },
  {
    type: "range",
    path: "compressionLevel",
    label: "PNG compression level",
    min: 0,
    max: 9,
    visibleWhen: { path: "format", equals: "png" },
  },
  {
    type: "select",
    path: "chromaSubsampling",
    label: "Chroma subsampling",
    options: [
      { label: "4:2:0", value: "4:2:0" },
      { label: "4:4:4", value: "4:4:4" },
    ],
    visibleWhen: { path: "format", equals: "jpeg" },
  },
  {
    type: "color",
    path: "background",
    label: "Flattening background",
    visibleWhen: { path: "format", equals: "jpeg" },
  },
  {
    type: "select",
    path: "metadata",
    label: "Metadata policy",
    options: [
      { label: "Strip", value: "strip" },
      { label: "Preserve", value: "preserve" },
      { label: "Privacy", value: "privacy" },
    ],
  },
  {
    type: "text",
    path: "metadataEdits.artist",
    label: "Output artist",
    maxLength: 200,
    optional: true,
  },
  {
    type: "text",
    path: "metadataEdits.copyright",
    label: "Output copyright",
    maxLength: 500,
    optional: true,
  },
  {
    type: "textarea",
    path: "metadataEdits.description",
    label: "Output description",
    maxLength: 2000,
    optional: true,
  },
  {
    type: "text",
    path: "metadataEdits.software",
    label: "Output software",
    maxLength: 200,
    optional: true,
  },
  {
    type: "date",
    path: "metadataEdits.capturedAt",
    label: "Capture date",
    optional: true,
  },
  {
    type: "number",
    path: "metadataEdits.density",
    label: "Output density",
    min: 1,
    max: 100000,
    step: 1,
    unit: "DPI",
    optional: true,
  },
  {
    type: "boolean",
    path: "metadataEdits.preserveExisting",
    label: "Preserve existing metadata",
  },
]

const BATCH_CONTROLS: readonly ToolControl[] = [
  {
    type: "boolean",
    path: "continueOnError",
    label: "Continue after a file fails",
    description: "The ZIP manifest records each individual success or error.",
  },
  {
    type: "text",
    path: "filenamePrefix",
    label: "Output filename prefix",
    maxLength: 80,
  },
]

type PipelineStepValue = {
  id?: string
  op: PipelineOperation
  enabled: boolean
  options: OptionValues
}

type PipelineValue = OptionValues & {
  version: 1
  steps: SerializableValue[]
  output: OptionValues
}

export function PipelineBuilder({
  tool,
  value,
  onChange,
  unavailableFormats = new Set(),
}: {
  tool: ToolDefinition
  value: OptionValues
  onChange: (value: OptionValues) => void
  unavailableFormats?: ReadonlySet<string>
}) {
  const isBatch = tool.id === "batch"
  const pipeline = getPipeline(value, isBatch)
  const steps = pipeline.steps
    .map(toPipelineStep)
    .filter((step): step is PipelineStepValue => step !== null)
  const [selectedOperation, setSelectedOperation] =
    React.useState<PipelineOperation>("resize")
  const [importError, setImportError] = React.useState<string | null>(null)
  const importRef = React.useRef<HTMLInputElement>(null)

  const updatePipeline = React.useCallback(
    (next: PipelineValue) => {
      onChange(isBatch ? { ...value, pipeline: next } : next)
    },
    [isBatch, onChange, value]
  )

  const updateSteps = (next: PipelineStepValue[]) =>
    updatePipeline({ ...pipeline, steps: next })

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return
    const definition = PIPELINE_STEP_DEFINITIONS.find(
      (candidate) => candidate.op === selectedOperation
    )
    if (!definition) return
    updateSteps([
      ...steps,
      {
        id: makeStepId(selectedOperation),
        op: selectedOperation,
        enabled: true,
        options: structuredClone(definition.defaults),
      },
    ])
  }

  const moveStep = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateSteps(next)
  }

  const replaceStep = (index: number, nextStep: PipelineStepValue) => {
    const next = [...steps]
    next[index] = nextStep
    updateSteps(next)
  }

  const duplicateStep = (index: number) => {
    if (steps.length >= MAX_STEPS) return
    const duplicate = structuredClone(steps[index])
    duplicate.id = makeStepId(duplicate.op)
    const next = [...steps]
    next.splice(index + 1, 0, duplicate)
    updateSteps(next)
  }

  const removeStep = (index: number) => {
    if (steps.length <= 1) return
    updateSteps(steps.filter((_, candidate) => candidate !== index))
  }

  const exportPipeline = () => {
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "image-everything-pipeline.json"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importPipeline = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const imported = validateImportedPipeline(parsed)
      updatePipeline(imported)
      setImportError(null)
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Invalid pipeline file"
      )
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="pipeline-steps-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pipeline-steps-heading" className="text-sm font-semibold">
              Pipeline steps
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {steps.length}/{MAX_STEPS} steps · executed from top to bottom
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import pipeline JSON"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importPipeline(file)
                event.target.value = ""
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => importRef.current?.click()}
            >
              <Upload /> Import
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportPipeline}
            >
              <Download /> Export
            </Button>
          </div>
        </div>

        {importError && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {importError}
          </p>
        )}

        <div className="flex gap-2">
          <Label htmlFor="pipeline-operation" className="sr-only">
            Step type
          </Label>
          <select
            id="pipeline-operation"
            value={selectedOperation}
            onChange={(event) =>
              setSelectedOperation(event.target.value as PipelineOperation)
            }
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          >
            {PIPELINE_STEP_DEFINITIONS.map((definition) => (
              <option key={definition.op} value={definition.op}>
                {definition.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={addStep}
            disabled={steps.length >= MAX_STEPS}
          >
            <Plus /> Add step
          </Button>
        </div>

        <ol className="space-y-3" aria-label="Ordered image pipeline">
          {steps.map((step, index) => {
            const definition = PIPELINE_STEP_DEFINITIONS.find(
              (candidate) => candidate.op === step.op
            )
            const controls = getPipelineControls(
              step.op,
              (id) => getToolById(id)?.controls ?? []
            )
            return (
              <li key={step.id ?? `${step.op}-${index}`}>
                <details
                  className="group rounded-xl border bg-background"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {definition?.label ?? step.op}
                    </span>
                    {!step.enabled && (
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        disabled
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1"
                      onClick={(event) => event.preventDefault()}
                    >
                      <input
                        type="checkbox"
                        checked={step.enabled}
                        aria-label={`Enable ${definition?.label ?? step.op}`}
                        onChange={(event) =>
                          replaceStep(index, {
                            ...step,
                            enabled: event.target.checked,
                          })
                        }
                        className="mr-1 size-4 accent-primary"
                      />
                      <IconButton
                        label="Move step up"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ArrowUp />
                      </IconButton>
                      <IconButton
                        label="Move step down"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ArrowDown />
                      </IconButton>
                      <IconButton
                        label="Duplicate step"
                        disabled={steps.length >= MAX_STEPS}
                        onClick={() => duplicateStep(index)}
                      >
                        <Copy />
                      </IconButton>
                      <IconButton
                        label="Remove step"
                        disabled={steps.length <= 1}
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 />
                      </IconButton>
                    </span>
                  </summary>
                  <div className="border-t px-4 py-4">
                    <OptionControls
                      controls={controls}
                      value={step.options}
                      fallbackValue={
                        (definition?.defaults ?? {}) as OptionValues
                      }
                      onChange={(options) =>
                        replaceStep(index, { ...step, options })
                      }
                    />
                  </div>
                </details>
              </li>
            )
          })}
        </ol>
      </section>

      <section
        aria-labelledby="pipeline-output-heading"
        className="space-y-4 border-t pt-5"
      >
        <div>
          <h2 id="pipeline-output-heading" className="text-sm font-semibold">
            Terminal output
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Encoding and metadata settings run once after every enabled pixel
            step.
          </p>
        </div>
        <OptionControls
          controls={OUTPUT_CONTROLS}
          value={pipeline.output}
          unavailableFormats={unavailableFormats}
          onChange={(output) => updatePipeline({ ...pipeline, output })}
        />
      </section>

      {isBatch && (
        <section
          aria-labelledby="batch-policy-heading"
          className="space-y-4 border-t pt-5"
        >
          <h2 id="batch-policy-heading" className="text-sm font-semibold">
            Batch policy
          </h2>
          <OptionControls
            controls={BATCH_CONTROLS}
            value={value}
            onChange={onChange}
          />
        </section>
      )}
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
    >
      {children}
    </Button>
  )
}

function getPipeline(value: OptionValues, isBatch: boolean): PipelineValue {
  const candidate = isBatch ? value.pipeline : value
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Pipeline options are missing")
  }
  const pipeline = candidate as OptionValues
  return {
    ...pipeline,
    version: 1,
    steps: Array.isArray(pipeline.steps) ? pipeline.steps : [],
    output:
      pipeline.output &&
      typeof pipeline.output === "object" &&
      !Array.isArray(pipeline.output)
        ? pipeline.output
        : {},
  }
}

function toPipelineStep(value: SerializableValue): PipelineStepValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  if (
    typeof value.op !== "string" ||
    !PIPELINE_STEP_DEFINITIONS.some((definition) => definition.op === value.op)
  ) {
    return null
  }
  return {
    id: typeof value.id === "string" ? value.id : undefined,
    op: value.op as PipelineOperation,
    enabled: value.enabled !== false,
    options:
      value.options &&
      typeof value.options === "object" &&
      !Array.isArray(value.options)
        ? value.options
        : {},
  }
}

export function validateImportedPipeline(value: unknown): PipelineValue {
  const parsed = PipelineSchema.safeParse(value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.length ? `${issue.path.join(".")}: ` : ""
    throw new Error(`${path}${issue?.message ?? "Invalid pipeline JSON."}`)
  }
  return structuredClone(parsed.data) as unknown as PipelineValue
}

function makeStepId(operation: PipelineOperation): string {
  return `${operation}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const TOOL_CONTROL_REGISTRY: Record<ToolId, "fields" | "pipeline"> = {
  compress: "fields",
  "compress-to-size": "fields",
  resize: "fields",
  convert: "fields",
  responsive: "fields",
  "quick-enhance": "fields",
  crop: "fields",
  rotate: "fields",
  trim: "fields",
  extend: "fields",
  alpha: "fields",
  adjust: "fields",
  normalize: "fields",
  filter: "fields",
  "blur-sharpen": "fields",
  pixelate: "fields",
  watermark: "fields",
  frame: "fields",
  collage: "fields",
  metadata: "fields",
  "metadata-clean": "fields",
  "metadata-edit": "fields",
  stats: "fields",
  palette: "fields",
  histogram: "fields",
  compare: "fields",
  process: "pipeline",
  batch: "pipeline",
}
