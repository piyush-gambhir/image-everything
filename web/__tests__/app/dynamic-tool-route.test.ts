import { V2_ROUTE_REGISTRY } from "@image-everything/contracts"
import { describe, expect, it } from "vitest"

import { generateStaticParams } from "@/app/[tool]/page"
import { API_ENDPOINTS } from "@/app/api-reference/page"
import { resolveToolSlug, TOOL_MANIFEST } from "@/lib/tools/manifest"

describe("dynamic v2 tool route", () => {
  it("pre-renders every manifest slug and only those slugs", () => {
    expect(generateStaticParams()).toEqual(
      TOOL_MANIFEST.map((tool) => ({ tool: tool.slug }))
    )
    expect(generateStaticParams()).toHaveLength(28)
    for (const tool of TOOL_MANIFEST) {
      expect(resolveToolSlug(tool.id)).toBe(tool.slug)
    }
  })

  it("publishes all 29 canonical v2 endpoints in the API reference", () => {
    expect(API_ENDPOINTS.map((operation) => operation.endpoint)).toEqual(
      V2_ROUTE_REGISTRY.map((route) => route.path)
    )
  })
})
