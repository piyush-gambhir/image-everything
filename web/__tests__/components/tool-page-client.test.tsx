import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ToolPageClient } from "@/components/tool-workspace/tool-page-client"
import { TOOL_MANIFEST, getToolById } from "@/lib/tools/manifest"

vi.mock("@/hooks/use-capabilities", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/hooks/use-capabilities")>()
  return {
    ...original,
    useCapabilities: () => ({
      status: "error" as const,
      data: null,
      error: "Capability discovery is intentionally disabled in this test.",
    }),
  }
})

describe("manifest tool workspace rendering", () => {
  it("gives every tool a real input, controls, and run action", () => {
    for (const tool of TOOL_MANIFEST) {
      const { unmount } = render(<ToolPageClient tool={tool} />)
      expect(
        screen.getByRole("heading", { name: tool.title })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", {
          name: new RegExp(`run ${escapeRegExp(tool.shortTitle)}`, "i"),
        })
      ).toBeInTheDocument()
      expect(
        screen.queryByText(/coming soon|placeholder/i)
      ).not.toBeInTheDocument()
      unmount()
    }
  })

  it("renders single, overlay, dual, multi, JSON, image, ZIP, and pipeline shapes", () => {
    const representativeIds = [
      "compress",
      "watermark",
      "compare",
      "collage",
      "metadata",
      "responsive",
      "process",
      "batch",
    ] as const

    for (const id of representativeIds) {
      const tool = getToolById(id)
      expect(tool).toBeDefined()
      const { unmount } = render(<ToolPageClient tool={tool!} />)
      expect(screen.getByText(`POST ${tool!.endpoint}`)).toBeInTheDocument()
      expect(
        screen.getByText(`${tool!.resultKind.toUpperCase()} result`)
      ).toBeInTheDocument()
      unmount()
    }
  })

  it("exposes accessible upload and pipeline actions", () => {
    render(<ToolPageClient tool={getToolById("process")!} />)
    expect(
      screen.getByRole("button", { name: /drop an image or browse/i })
    ).toHaveAttribute("tabindex", "0")
    expect(
      screen.getByRole("button", { name: /add step/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /enable resize/i })
    ).toBeInTheDocument()
  })
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
