import type { ToolId as ContractToolId } from "@image-everything/contracts"

export const TOOL_CATEGORIES = [
  "optimize",
  "geometry",
  "color",
  "composition",
  "metadata",
  "automation",
] as const

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export type ToolInputKind = "single" | "dual" | "multi" | "overlay"
export type ToolResultKind = "image" | "json" | "zip"
export type ToolControlMode = "fields" | "pipeline"

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue }

export type ControlCondition = {
  path: string
  equals?: SerializableValue
  oneOf?: SerializableValue[]
}

type BaseControl = {
  path: string
  label: string
  description?: string
  group?: string
  visibleWhen?: ControlCondition
}

type NumericControl = BaseControl & {
  min?: number
  max?: number
  step?: number
  unit?: string
  optional?: boolean
}

export type NumberControl = NumericControl & { type: "number" }
export type RangeControl = NumericControl & { type: "range" }

export type SelectControl = BaseControl & {
  type: "select"
  options: readonly { label: string; value: string | number }[]
}

export type BooleanControl = BaseControl & {
  type: "boolean"
}

type TextualControl = BaseControl & {
  placeholder?: string
  maxLength?: number
  optional?: boolean
}

export type TextControl = TextualControl & { type: "text" }
export type TextareaControl = TextualControl & { type: "textarea" }
export type DateControl = TextualControl & { type: "date" }
export type ColorControl = TextualControl & { type: "color" }

type ListControlBase = BaseControl & {
  options?: readonly { label: string; value: string }[]
  minItems?: number
  maxItems?: number
}

export type NumberListControl = ListControlBase & { type: "number-list" }
export type ChoiceListControl = ListControlBase & { type: "choice-list" }

export type ToolControl =
  | NumberControl
  | RangeControl
  | SelectControl
  | BooleanControl
  | TextControl
  | TextareaControl
  | DateControl
  | ColorControl
  | NumberListControl
  | ChoiceListControl

export type ToolDefinition = {
  id: ContractToolId
  slug: string
  title: string
  shortTitle: string
  description: string
  category: ToolCategory
  endpoint: string
  inputKind: ToolInputKind
  resultKind: ToolResultKind
  controlMode: ToolControlMode
  controls: readonly ToolControl[]
  defaults: Record<string, SerializableValue>
  keywords: readonly string[]
  inputLabel?: string
  secondaryInputLabel?: string
  minimumFiles?: number
  maximumFiles?: number
  auxiliaryResult?: {
    endpoint: string
    kind: ToolResultKind
    label: string
  }
  notes?: readonly string[]
}

export type ToolManifest = readonly ToolDefinition[]
