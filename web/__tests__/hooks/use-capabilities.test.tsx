import { LIMITS, type WorkerCapabilities } from "@image-everything/contracts"
import { render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ToolPageClient } from "@/components/tool-workspace/tool-page-client"
import { useCapabilities } from "@/hooks/use-capabilities"
import { getToolById } from "@/lib/tools/manifest"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("runtime capability discovery", () => {
  it("parses the capability document with the shared schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(capabilityFixture()))
    )
    const { result } = renderHook(() => useCapabilities())
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.data?.formats.encode).toEqual(["png"])
  })

  it("fails gracefully when the server returns an invalid document", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ apiVersion: "v2" }))
    )
    const { result } = renderHook(() => useCapabilities())
    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.error).toMatch(/invalid capability document/i)
  })

  it("marks unavailable formats and operations in the workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          capabilityFixture({
            operations: [
              { id: "convert", available: false, reason: "disabled in test" },
            ],
          })
        )
      )
    )
    render(<ToolPageClient tool={getToolById("convert")!} />)

    expect(
      await screen.findByRole("option", {
        name: "JPEG (unavailable on this server)",
      })
    ).toBeDisabled()
    expect(screen.getByRole("option", { name: "PNG" })).not.toBeDisabled()
    expect(
      await screen.findByText(/cannot run convert.*disabled in test/i)
    ).toBeInTheDocument()
  })
})

function capabilityFixture(
  overrides: Partial<WorkerCapabilities> = {}
): WorkerCapabilities {
  return {
    apiVersion: "v2",
    protocolVersion: "2.0",
    workerVersion: "test",
    runtime: {
      node: "22.0.0",
      sharp: "test",
      libvips: "test",
      versions: {},
    },
    codecs: [],
    formats: { decode: ["jpeg", "png"], encode: ["png"] },
    operations: [{ id: "convert", available: true }],
    animationSupported: false,
    limits: { ...LIMITS },
    capabilityFingerprint: "test",
    ...overrides,
  }
}
