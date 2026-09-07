import {
  EXTENSION_TOOL_IDS,
  TOOL_OPTION_SCHEMAS,
  V2_ROUTE_REGISTRY,
} from "@image-everything/contracts"
import { describe, expect, it } from "vitest"

import { generateStaticParams } from "@/app/[tool]/page"
import { API_ENDPOINTS } from "@/lib/tools/api-reference"
import { resolveToolSlug, TOOL_MANIFEST } from "@/lib/tools/manifest"

describe("dynamic v2 tool route", () => {
  it("pre-renders every manifest slug and only those slugs", () => {
    expect(generateStaticParams()).toEqual(
      TOOL_MANIFEST.map((tool) => ({ tool: tool.slug }))
    )
    expect(generateStaticParams()).toHaveLength(TOOL_MANIFEST.length)
    for (const tool of TOOL_MANIFEST) {
      expect(resolveToolSlug(tool.id)).toBe(tool.slug)
    }
  })

  it("publishes all canonical v2 endpoints in the API reference", () => {
    expect(API_ENDPOINTS.map((operation) => operation.endpoint)).toEqual(
      V2_ROUTE_REGISTRY.map((route) => route.path)
    )
  })

  it("documents usable options and every field for each added API", () => {
    for (const id of EXTENSION_TOOL_IDS) {
      const entry = API_ENDPOINTS.find((operation) => operation.key === id)!
      expect(TOOL_OPTION_SCHEMAS[id].safeParse(entry.defaults).success).toBe(
        true
      )
      expect(new Set(entry.optionDetails.map((option) => option.path))).toEqual(
        new Set(Object.keys(entry.defaults))
      )
    }
    expect(
      API_ENDPOINTS.find((operation) => operation.key === "color-space")?.notes
    ).toContain("CMYK output requires JPEG or TIFF.")
  })
})
