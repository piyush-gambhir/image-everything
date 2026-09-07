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
  it("is the complete, unique, functional contract surface", () => {
    expect(TOOL_MANIFEST).toHaveLength(TOOL_IDS.length)
    expect(TOOL_MANIFEST.map((tool) => tool.id)).toEqual(TOOL_IDS)
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.id))).toHaveLength(
      TOOL_IDS.length
    )
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.slug))).toHaveLength(
      TOOL_IDS.length
    )
    expect(new Set(TOOL_MANIFEST.map((tool) => tool.endpoint))).toHaveLength(
      TOOL_IDS.length
    )

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

  it("hydrates codec controls with the API defaults", () => {
    expect(cloneToolDefaults(getToolById("decode")!)).toEqual({
      channels: "rgba",
    })
    expect(cloneToolDefaults(getToolById("encode")!)).toMatchObject({
      width: 256,
      height: 256,
      channels: "rgba",
      format: "png",
      lossless: true,
    })
    expect(cloneToolDefaults(getToolById("to-base64")!)).toEqual({
      dataUrl: false,
    })
    expect(cloneToolDefaults(getToolById("from-base64")!)).toMatchObject({
      format: "png",
      lossless: false,
    })
    expect(cloneToolDefaults(getToolById("validate")!)).toEqual({})
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
                  (_, index) => index + (control.min ?? 1)
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
  if (toolId === "color-space" && candidate === "cmyk") {
    return setValueAtPath(options, "format", "jpeg")
  }
  if (
    toolId === "levels" &&
    path === "black" &&
    typeof candidate === "number"
  ) {
    return setValueAtPath(options, "white", candidate + 1)
  }
  if (
    toolId === "levels" &&
    path === "white" &&
    typeof candidate === "number"
  ) {
    return setValueAtPath(options, "black", candidate - 1)
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
