import { TOOL_MANIFEST, cloneToolDefaults } from "./manifest"
import type { ToolControl, ToolDefinition } from "./types"

function optionDetails(tool: ToolDefinition) {
  return tool.controls
    .filter(
      (control, index, controls) =>
        controls.findIndex((candidate) => candidate.path === control.path) ===
        index
    )
    .map((control) => ({
      path: control.path,
      description: [
        control.description ?? control.label,
        controlDomain(control),
      ]
        .filter(Boolean)
        .join(" "),
    }))
}

function controlDomain(control: ToolControl): string {
  if (control.type === "select" || control.type === "choice-list") {
    return `Values: ${(control.options ?? []).map((option) => JSON.stringify(option.value)).join(", ")}.`
  }
  if (
    control.type === "number" ||
    control.type === "range" ||
    control.type === "number-list"
  ) {
    return control.min !== undefined && control.max !== undefined
      ? `Range: ${control.min}–${control.max}.`
      : ""
  }
  if (control.type === "boolean") return "Boolean: true or false."
  if (control.type === "color")
    return control.alpha === false
      ? "Hex color: #RRGGBB."
      : "Hex color: #RRGGBB or #RRGGBBAA."
  return ""
}

export const API_ENDPOINTS = TOOL_MANIFEST.flatMap((tool: ToolDefinition) => [
  {
    key: tool.id,
    endpoint: tool.endpoint,
    description: tool.description,
    inputKind: tool.inputKind,
    resultKind: tool.resultKind,
    defaults: cloneToolDefaults(tool),
    optionDetails: optionDetails(tool),
    notes: tool.notes ?? [],
  },
  ...(tool.auxiliaryResult
    ? [
        {
          key: `${tool.id}-auxiliary`,
          endpoint: tool.auxiliaryResult.endpoint,
          description: `${tool.auxiliaryResult.label} for ${tool.shortTitle.toLowerCase()}.`,
          inputKind: tool.inputKind,
          resultKind: tool.auxiliaryResult.kind,
          defaults: cloneToolDefaults(tool),
          optionDetails: optionDetails(tool),
          notes: tool.notes ?? [],
        },
      ]
    : []),
])
