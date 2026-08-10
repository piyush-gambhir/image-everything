import {
  TOOL_IDS,
  TOOL_OPTION_SCHEMAS,
  V2_ROUTE_REGISTRY,
} from "@image-everything/contracts"
import { describe, expect, it } from "vitest"

import {
  TOOL_MANIFEST,
  cloneToolDefaults,
  getToolById,
  getToolBySlug,
} from "@/lib/tools/manifest"
import { TOOL_ICON_REGISTRY } from "@/lib/tools/registry"
import { TOOL_CONTROL_REGISTRY } from "@/components/tool-workspace/pipeline-builder"
import {
  getValueAtPath,
  matchesCondition,
  setValueAtPath,
  type OptionValues,
} from "@/components/tool-workspace/option-controls"
import type { SerializableValue, ToolControl } from "@/lib/tools/types"

describe("v2 tool manifest", () => {
  it("is the complete, unique, functional 28-tool contract surface", () => {
    expect(TOOL_MANIFEST).toHaveLength(28)
    expect(TOOL_MANIFEST.map((tool) => tool.id)).toEqual(TOOL_IDS)
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.id))).toHaveLength(28)
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.slug))).toHaveLength(28)
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.endpoint))).toHaveLength(28)

    for (const tool of TOOL_MANIFEST) {
      expect(tool.title).not.toMatch(/coming soon|placeholder/i)
      expect(tool.description).not.toMatch(/coming soon|placeholder/i)
      expect(getToolById(tool.id)).toBe(tool)
      expect(getToolBySlug(tool.slug)).toBe(tool)
      expect(TOOL_ICON_REGISTRY[tool.id]).toBeDefined()
      expect(TOOL_CONTROL_REGISTRY[tool.id]).toBe(tool.controlMode)

      const contractRoute = V2_ROUTE_REGISTRY.find(
        (route) => route.toolId === tool.id && route.id !== "compare-diff"
      )
      expect(contractRoute?.path).toBe(tool.endpoint)
      expect(contractRoute?.resultKind).toBe(tool.resultKind)
      expect(contractRoute?.inputKind).toBe(
        {
          single: "single",
          overlay: "single-overlay",
          dual: "compare",
          multi: "multiple",
        }[tool.inputKind]
      )
    }
  })

  it("parses every default option object with the shared contract schema", () => {
    for (const tool of TOOL_MANIFEST) {
      const parsed = TOOL_OPTION_SCHEMAS[tool.id].safeParse(tool.defaults)
      expect(
        parsed.success,
        parsed.success
          ? undefined
          : `${tool.id}: ${JSON.stringify(parsed.error.issues)}`
      ).toBe(true)
    }
  })

  it("hydrates every initially exposed non-optional control from schema defaults", () => {
    for (const tool of TOOL_MANIFEST) {
      const defaults = cloneToolDefaults(tool)
      for (const control of tool.controls) {
        if (
          !matchesCondition(
            defaults,
            "visibleWhen" in control ? control.visibleWhen : undefined
          )
        )
          continue
        if ("optional" in control && control.optional) continue
        expect(
          getValueAtPath(defaults, control.path),
          `${tool.id}.${control.path}`
        ).not.toBeUndefined()
      }
    }
  })

  it("keeps every selectable value and numeric UI boundary inside its schema", () => {
    for (const tool of TOOL_MANIFEST) {
      const controls: readonly ToolControl[] = tool.controls
      for (const control of controls) {
        const branchValues =
          control.visibleWhen?.oneOf ??
          (control.visibleWhen?.equals === undefined
            ? [undefined]
            : [control.visibleWhen.equals])

        for (const branchValue of branchValues) {
          let branch: OptionValues = structuredClone(tool.defaults)
          if (control.visibleWhen && branchValue !== undefined) {
            branch = setValueAtPath(
              branch,
              control.visibleWhen.path,
              branchValue
            )
          }

          const candidates: SerializableValue[] = []
          if (control.type === "select") {
            candidates.push(...control.options.map((option) => option.value))
          } else if (control.type === "choice-list") {
            candidates.push(
              ...(control.options ?? []).map((option) => [option.value])
            )
          } else if (control.type === "number" || control.type === "range") {
            if (control.min !== undefined) candidates.push(control.min)
            if (control.max !== undefined) candidates.push(control.max)
            if (
              control.min !== undefined &&
              control.step !== undefined &&
              control.min + control.step <=
                (control.max ?? Number.POSITIVE_INFINITY)
            ) {
              candidates.push(control.min + control.step)
            }
          } else if (control.type === "number-list") {
            if (control.minItems !== undefined) {
              candidates.push(
                Array.from(
                  { length: control.minItems },
                  (_, index) => index + 1
                )
              )
            }
          } else if (
            (control.type === "text" || control.type === "textarea") &&
            control.maxLength !== undefined
          ) {
            candidates.push("x".repeat(control.maxLength))
          }

          for (const candidate of candidates) {
            let options = setValueAtPath(branch, control.path, candidate)
            options = satisfyCrossFieldConstraints(
              tool.id,
              control.path,
              candidate,
              options
            )
            const parsed = TOOL_OPTION_SCHEMAS[tool.id].safeParse(options)
            expect(
              parsed.success,
              parsed.success
                ? undefined
                : `${tool.id}.${control.path}=${JSON.stringify(candidate)}: ${JSON.stringify(parsed.error.issues)}`
            ).toBe(true)
          }
        }
      }
    }
  })
})

function satisfyCrossFieldConstraints(
  toolId: string,
  path: string,
  candidate: SerializableValue,
  options: OptionValues
): OptionValues {
  if (toolId === "resize" && path === "percent") {
    const adjusted = structuredClone(options)
    delete adjusted.width
    delete adjusted.height
    return adjusted
  }
  if (toolId === "resize" && (path === "width" || path === "height")) {
    const adjusted = structuredClone(options)
    delete adjusted.percent
    return adjusted
  }
  if (typeof candidate !== "number") return options
  if (toolId === "compress-to-size" && path === "minQuality") {
    return setValueAtPath(options, "maxQuality", Math.max(candidate, 100))
  }
  if (toolId === "compress-to-size" && path === "maxQuality") {
    return setValueAtPath(options, "minQuality", Math.min(candidate, 1))
  }
  if (toolId === "normalize" && path === "lower") {
    return setValueAtPath(options, "upper", Math.min(100, candidate + 1))
  }
  if (toolId === "normalize" && path === "upper") {
    return setValueAtPath(options, "lower", Math.max(0, candidate - 1))
  }
  return options
}
