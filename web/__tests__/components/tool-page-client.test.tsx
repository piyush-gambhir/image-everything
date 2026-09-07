import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ToolPageClient } from "@/components/tool-workspace/tool-page-client"
import {
  TOOL_MANIFEST,
  cloneToolDefaults,
  getToolById,
} from "@/lib/tools/manifest"
import { EXTENDED_TOOL_MANIFEST } from "@/lib/tools/extensions"

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
  afterEach(() => vi.unstubAllGlobals())

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

  it.each([
    {
      id: "encode",
      name: "pixels.rgba",
      type: "application/octet-stream",
      options: {
        width: 1,
        height: 1,
        channels: "rgba",
        format: "png",
        lossless: true,
      },
    },
    {
      id: "from-base64",
      name: "encoded.base64",
      type: "text/plain",
      options: { format: "png" },
    },
    {
      id: "decode",
      name: "source.png",
      type: "image/png",
      options: { channels: "rgba" },
    },
    {
      id: "to-base64",
      name: "source.png",
      type: "image/png",
      options: { dataUrl: true },
    },
    { id: "validate", name: "source.png", type: "image/png", options: {} },
  ] as const)(
    "uploads and submits $id through its API contract",
    async ({ id, name, type, options }) => {
      const tool = getToolById(id)!
      const fetcher = vi.fn(async () =>
        tool.resultKind === "json"
          ? Response.json(
              id === "validate"
                ? { valid: true, format: "png" }
                : { encoding: "data-url", data: "data:image/png;base64,AAAA" }
            )
          : new Response(
              new Blob(["output"], {
                type:
                  tool.resultKind === "zip" ? "application/zip" : "image/png",
              }),
              {
                headers: {
                  "Content-Disposition": `attachment; filename="result.${tool.resultKind === "zip" ? "zip" : "png"}"`,
                },
              }
            )
      )
      vi.stubGlobal("fetch", fetcher)
      render(<ToolPageClient tool={tool} />)
      const file = new File([new Uint8Array([0, 0, 0, 255])], name, { type })
      fireEvent.change(
        screen.getByLabelText(
          `Choose ${(tool.inputLabel ?? "Source image").toLowerCase()}`
        ),
        {
          target: { files: [file] },
        }
      )
      if (id === "encode") {
        fireEvent.change(screen.getByRole("spinbutton", { name: /^width/i }), {
          target: { value: "1" },
        })
        fireEvent.change(screen.getByRole("spinbutton", { name: /^height/i }), {
          target: { value: "1" },
        })
      }
      if (id === "to-base64") {
        fireEvent.click(
          screen.getByRole("checkbox", { name: /include data url prefix/i })
        )
      }
      const run = screen.getByRole("button", { name: `Run ${tool.shortTitle}` })
      expect(run).toBeEnabled()
      fireEvent.click(run)
      await waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
      const [url, init] = fetcher.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ]
      expect(url).toContain(`/api/v2/images/${id}`)
      expect(init.method).toBe("POST")
      const body = init.body as FormData
      expect(body.get("file")).toBe(file)
      expect(body.getAll("files")).toHaveLength(0)
      expect(
        JSON.parse((body.get("options") as string | null) ?? "{}")
      ).toMatchObject(options)
      expect(
        await screen.findByText(
          tool.resultKind === "json" ? "Structured result" : "Processed result"
        )
      ).toBeInTheDocument()
      if (tool.inputFileKind) {
        expect(
          screen.queryByRole("img", { name: `Preview of ${name}` })
        ).not.toBeInTheDocument()
      }
    }
  )

  it.each(EXTENDED_TOOL_MANIFEST)(
    "submits $id with its contracted options, multipart field, and result type",
    async (tool) => {
      const fetcher = vi.fn(async () =>
        tool.resultKind === "json"
          ? Response.json({ pixels: [], fingerprint: "0000000000000000" })
          : new Response(new Blob(["output"]), {
              headers: {
                "Content-Type":
                  tool.resultKind === "zip" ? "application/zip" : "image/png",
                "Content-Disposition": `attachment; filename="${tool.id}.${tool.resultKind === "zip" ? "zip" : "png"}"`,
              },
            })
      )
      vi.stubGlobal("fetch", fetcher)
      render(<ToolPageClient tool={tool} />)
      const files = [
        new File([new Uint8Array([0, 0, 0, 255])], "source.png", {
          type: "image/png",
        }),
      ]
      if (tool.inputKind === "multi") {
        files.push(
          new File([new Uint8Array([255, 0, 0, 255])], "second.png", {
            type: "image/png",
          })
        )
      }
      const label =
        tool.inputLabel ??
        (tool.inputKind === "multi" ? "Input images" : "Source image")
      fireEvent.change(screen.getByLabelText(`Choose ${label.toLowerCase()}`), {
        target: { files },
      })
      const run = screen.getByRole("button", { name: `Run ${tool.shortTitle}` })
      expect(run).toBeEnabled()
      fireEvent.click(run)
      await waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
      const [url, init] = fetcher.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ]
      expect(url).toContain(tool.endpoint)
      expect(init.method).toBe("POST")
      const body = init.body as FormData
      expect(
        body.getAll(tool.inputKind === "multi" ? "files" : "file")
      ).toEqual(files)
      expect(
        JSON.parse((body.get("options") as string | null) ?? "{}")
      ).toEqual(cloneToolDefaults(tool))
      expect(
        await screen.findByText(
          tool.resultKind === "json" ? "Structured result" : "Processed result"
        )
      ).toBeInTheDocument()
    }
  )

  it("disables requests while a structured JSON option is malformed", () => {
    render(<ToolPageClient tool={getToolById("color-matrix")!} />)
    fireEvent.change(screen.getByLabelText("Choose source image"), {
      target: {
        files: [new File(["image"], "source.png", { type: "image/png" })],
      },
    })
    const run = screen.getByRole("button", { name: "Run Color matrix" })
    expect(run).toBeEnabled()
    const matrix = screen.getByRole("textbox", { name: "Color matrix" })
    fireEvent.change(matrix, { target: { value: "[[" } })
    expect(run).toBeDisabled()
    fireEvent.change(matrix, { target: { value: "[1,0,0,0,1,0,0,0,1]" } })
    expect(run).toBeEnabled()
  })

  it("keeps invalid icon-size drafts from submitting an older valid list", () => {
    render(<ToolPageClient tool={getToolById("icon-set")!} />)
    fireEvent.change(screen.getByLabelText("Choose source image"), {
      target: {
        files: [new File(["image"], "source.png", { type: "image/png" })],
      },
    })
    const run = screen.getByRole("button", { name: "Run Icon set" })
    const sizes = screen.getByRole("textbox", { name: "Icon sizes" })
    expect(run).toBeEnabled()
    fireEvent.change(sizes, { target: { value: "4, 2048" } })
    expect(run).toBeDisabled()
    expect(sizes).toHaveAttribute("aria-invalid", "true")
    fireEvent.change(sizes, { target: { value: "32, 32, 64" } })
    expect(run).toBeEnabled()
    fireEvent.blur(sizes)
    expect(sizes).toHaveValue("32, 64")
  })

  it.each([
    {
      id: "duotone",
      field: "Shadow color",
      role: "textbox",
      invalid: "#zzzzzz",
      valid: "#112233",
    },
    {
      id: "posterize",
      field: "Levels per channel exact value",
      role: "spinbutton",
      invalid: "",
      valid: "4",
    },
    {
      id: "affine",
      field: "Matrix a",
      role: "spinbutton",
      invalid: "",
      valid: "1",
    },
  ])(
    "blocks malformed or empty drafts in $id",
    ({ id, field, role, invalid, valid }) => {
      const tool = getToolById(id)!
      render(<ToolPageClient tool={tool} />)
      fireEvent.change(screen.getByLabelText("Choose source image"), {
        target: {
          files: [new File(["image"], "source.png", { type: "image/png" })],
        },
      })
      const run = screen.getByRole("button", { name: `Run ${tool.shortTitle}` })
      const input = screen.getByRole(role, { name: field })
      expect(run).toBeEnabled()
      fireEvent.change(input, { target: { value: invalid } })
      expect(run).toBeDisabled()
      fireEvent.change(input, { target: { value: valid } })
      expect(run).toBeEnabled()
    }
  )
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
